package com.bookish.app;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.media.PlaybackParams;
import android.os.Handler;
import android.os.HandlerThread;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Gapless narration for the on-device voices.
 *
 * The old path synthesized each sentence separately, shipped it to the WebView
 * as a base64 WAV and played it in its own audio element, so EVERY sentence
 * boundary paid element start-up latency, and a sentence slower to synthesize
 * than its predecessor took to play left silence. Here sentences are
 * synthesized in reading order into ONE continuous AudioTrack stream: a
 * boundary is just more samples, pieces of a long sentence play as soon as the
 * engine produces them, and playback speed is a pitch-preserving AudioTrack
 * parameter that never touches the queue. The WebView only receives
 * "sentence started/ended" events (for highlighting and progress).
 */
final class LocalSpeechStream {
    interface Synthesizer {
        /** Synthesize one sentence, handing audio pieces to `sink` as they are produced. */
        void synthesize(String voice, String text, float speed, PieceSink sink) throws Exception;
        /** Engines that can speak faster themselves (Kokoro) do less work at high speed. */
        boolean nativeSpeed(String voice);
        int sampleRate(String voice);
        /** Engines with a fixed-cost decoder (Pocket TTS) generate frames and decode in batches. */
        boolean batches(String voice);
        java.util.List<float[]> generateFrames(String voice, String text) throws Exception;
        float[] decodeFrames(String voice, java.util.List<float[]> frames) throws Exception;
        int samplesPerFrame(String voice);
    }
    interface PieceSink { boolean accept(float[] samples); }
    interface Events { void emit(String type, int index, String message); }

    private static final class Item { final int index; final String text; Item(int i, String t) { index = i; text = t; } }
    private static final class Mark { final int index; final boolean start; Mark(int i, boolean s) { index = i; start = s; } }
    private static final class Pcm { final short[] data; Pcm(short[] d) { data = d; } }
    private static final class Boundary { final int index; final long frame; final boolean start; Boundary(int i, long f, boolean s) { index = i; frame = f; start = s; } }

    private final Synthesizer synth;
    private final java.util.concurrent.Executor synthExecutor;
    private final Events events;
    private final AtomicInteger generation = new AtomicInteger();

    private AudioTrack track;
    private Thread writer;
    private LinkedBlockingQueue<Object> playQueue;
    private final ArrayDeque<Boundary> boundaries = new ArrayDeque<>();
    private volatile long framesWritten;
    private volatile float speed = 1f;
    private volatile float volume = 1f;
    private volatile boolean paused;
    // play() is deferred until the first audio is in the track: a track started
    // empty underruns at once, Android disables it, and its playback clock
    // then lags — sentence-ended events arrived seconds late after every start.
    private volatile boolean awaitingFirstAudio;
    // Audio handed to the stream but not yet played, in samples: the buffer
    // the batching decoder watches.
    private final java.util.concurrent.atomic.AtomicLong samplesQueued = new java.util.concurrent.atomic.AtomicLong();
    private final AtomicInteger itemsPending = new AtomicInteger();
    private final List<Item> batchItems = new ArrayList<>();
    private final List<java.util.List<float[]>> batchFrames = new ArrayList<>();
    private int batchFrameCount;
    private String voice;
    private int sampleRate;
    private final HandlerThread monitorThread = new HandlerThread("speech-stream-monitor");
    private final Handler monitor;

    // Loudness envelope of the audio written to the track: one RMS value per
    // LEVEL_WINDOW frames, keyed by the frame it starts at. The monitor reads
    // the entry at the hardware playback head, so the reported level is what
    // is coming out of the speaker NOW — silent during pauses and while the
    // engine is still synthesizing, loud while the narrator speaks. The Listen
    // view's orb moves with it.
    private static final int LEVEL_WINDOW = 480;            // ~20 ms at 24 kHz
    private static final int LEVEL_CAPACITY = 4096;          // ~80 s of envelope
    private final long[] levelFrames = new long[LEVEL_CAPACITY];
    private final float[] levelValues = new float[LEVEL_CAPACITY];
    private int levelHead;                                   // next slot to fill
    private int levelCount;
    private float lastLevelSent = -1f;
    private long pendingLevelFrame = -1;
    private double pendingLevelSum;
    private int pendingLevelSamples;

    LocalSpeechStream(Synthesizer synth, java.util.concurrent.Executor synthExecutor, Events events) {
        this.synth = synth;
        this.synthExecutor = synthExecutor;
        this.events = events;
        monitorThread.start();
        monitor = new Handler(monitorThread.getLooper());
    }

    /** Replace whatever is playing with a new stream starting at items[0]. */
    synchronized void start(String voice, int[] indexes, String[] texts, float speed, float volume) {
        stopLocked();
        final int gen = generation.incrementAndGet();
        this.voice = voice;
        this.speed = speed;
        this.volume = volume;
        this.paused = false;
        this.sampleRate = synth.sampleRate(voice);
        int minBuffer = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
        track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setTransferMode(AudioTrack.MODE_STREAM)
            // ~250 ms of hardware buffer: enough to ride out scheduling hiccups,
            // small enough that pause and highlighting stay responsive.
            .setBufferSizeInBytes(Math.max(minBuffer, sampleRate / 2))
            .build();
        applySpeed();
        track.setVolume(volume);
        framesWritten = 0;
        samplesQueued.set(0);
        itemsPending.set(0);
        synchronized (batchItems) { batchItems.clear(); batchFrames.clear(); batchFrameCount = 0; }
        synchronized (boundaries) { boundaries.clear(); }
        resetLevels();
        playQueue = new LinkedBlockingQueue<>();
        final AudioTrack current = track;
        final LinkedBlockingQueue<Object> queue = playQueue;
        writer = new Thread(() -> writeLoop(gen, current, queue), "speech-stream-writer");
        awaitingFirstAudio = true;
        writer.start();
        enqueue(gen, indexes, texts);
        monitor.post(() -> poll(gen));
    }

    /** Add upcoming sentences to the running stream. */
    synchronized void append(int[] indexes, String[] texts) {
        if (track == null) return;
        enqueue(generation.get(), indexes, texts);
    }

    synchronized void pause() {
        paused = true;
        if (track != null) track.pause();
    }

    synchronized void resume() {
        paused = false;
        if (track != null && !awaitingFirstAudio) track.play();
    }

    synchronized void stop() { stopLocked(); }

    synchronized void setSpeed(float value) {
        speed = value;
        applySpeed();
    }

    synchronized void setVolume(float value) {
        volume = value;
        if (track != null) track.setVolume(value);
    }

    void release() {
        stop();
        monitorThread.quitSafely();
    }

    // An engine with native speed is told the speed and played at 1x; others
    // are time-stretched by the AudioTrack.
    private float synthSpeed() { return voice != null && synth.nativeSpeed(voice) ? speed : 1f; }

    private synchronized void startPlaybackIfReady(AudioTrack target) {
        if (!awaitingFirstAudio || target != track) return;
        awaitingFirstAudio = false;
        if (!paused) target.play();
    }

    private void applySpeed() {
        if (track == null) return;
        float playback = voice != null && synth.nativeSpeed(voice) ? 1f : speed;
        try {
            // Pitch 1.0 = time-stretch: faster speech at the narrator's own pitch.
            track.setPlaybackParams(new PlaybackParams().setSpeed(Math.max(0.5f, Math.min(4f, playback))).setPitch(1f));
        } catch (Exception ignored) {
            // A device that cannot time-stretch plays at 1x rather than failing.
        }
    }

    private void stopLocked() {
        generation.incrementAndGet();
        if (playQueue != null) { playQueue.clear(); playQueue.offer(this); } // `this` = stop sentinel
        if (track != null) {
            try { track.pause(); track.flush(); } catch (Exception ignored) {}
            final AudioTrack old = track;
            final Thread oldWriter = writer;
            // Release once the writer has left its blocking write.
            new Thread(() -> {
                try { if (oldWriter != null) oldWriter.join(1000); } catch (InterruptedException ignored) {}
                try { old.release(); } catch (Exception ignored) {}
            }, "speech-stream-release").start();
        }
        track = null;
        writer = null;
        playQueue = null;
        synchronized (boundaries) { boundaries.clear(); }
    }

    private void enqueue(int gen, int[] indexes, String[] texts) {
        final LinkedBlockingQueue<Object> queue = playQueue;
        for (int i = 0; i < texts.length; i++) {
            final Item item = new Item(indexes[i], texts[i]);
            itemsPending.incrementAndGet();
            synthExecutor.execute(() -> {
                try { synthesizeItem(gen, queue, item); } finally { itemsPending.decrementAndGet(); }
            });
        }
    }

    // Decode the pending batch once there is enough to amortize the decoder's
    // fixed cost — unless playback would otherwise run dry first.
    private static final int BATCH_MAX_FRAMES = 192;          // ~15 s of speech
    // Measured costs (exponential moving averages, seconds), used to decide
    // when the batch must be decoded so audio arrives before the buffer
    // empties: generating one more sentence, plus decoding, plus a margin.
    private double genSecondsEstimate = 2.5;
    private double decodeSecondsEstimate = 2.5;
    private static final double SAFETY_SECONDS = 0.8;

    private void batchItem(int gen, LinkedBlockingQueue<Object> queue, Item item) throws Exception {
        long started = System.nanoTime();
        java.util.List<float[]> frames = synth.generateFrames(voice, item.text);
        if (generation.get() != gen) return;
        genSecondsEstimate = 0.7 * genSecondsEstimate + 0.3 * ((System.nanoTime() - started) / 1e9);
        synchronized (batchItems) { batchItems.add(item); batchFrames.add(frames); batchFrameCount += frames.size(); }
        double bufferedSeconds = (samplesQueued.get() + Math.max(0, framesWritten - headFrames())) / (double) sampleRate;
        boolean nothingElseQueued = itemsPending.get() <= 1;
        int batched;
        synchronized (batchItems) { batched = batchItems.size(); }
        // The very first sentence of a stream decodes at once: fast start.
        boolean firstAudio = framesWritten == 0 && samplesQueued.get() == 0;
        // Would the buffer survive generating ANOTHER sentence and then decoding?
        boolean cannotWaitAnother = bufferedSeconds - genSecondsEstimate < decodeSecondsEstimate + SAFETY_SECONDS;
        // Decoding single sentences costs more than real time on mid-range
        // phones (the decoder's fixed cost dominates), so once playing, a batch
        // holds at least two sentences — unless the buffer is already empty.
        boolean batchWorthIt = batched >= 2 || bufferedSeconds < decodeSecondsEstimate * 0.5;
        if (firstAudio || nothingElseQueued || batchFrameCount >= BATCH_MAX_FRAMES || (cannotWaitAnother && batchWorthIt)) {
            flushBatch(gen, queue);
        }
    }

    private void flushBatch(int gen, LinkedBlockingQueue<Object> queue) throws Exception {
        List<Item> items; List<java.util.List<float[]>> framesPerItem;
        synchronized (batchItems) {
            if (batchItems.isEmpty()) return;
            items = new ArrayList<>(batchItems); framesPerItem = new ArrayList<>(batchFrames);
            batchItems.clear(); batchFrames.clear(); batchFrameCount = 0;
        }
        java.util.List<float[]> all = new ArrayList<>();
        for (java.util.List<float[]> f : framesPerItem) all.addAll(f);
        long started = System.nanoTime();
        float[] audio = synth.decodeFrames(voice, all);
        if (generation.get() != gen) return;
        decodeSecondsEstimate = 0.6 * decodeSecondsEstimate + 0.4 * ((System.nanoTime() - started) / 1e9);
        int spf = synth.samplesPerFrame(voice);
        int offset = 0;
        for (int i = 0; i < items.size(); i++) {
            int length = framesPerItem.get(i).size() * spf;
            float[] segment = new float[Math.max(0, Math.min(length, audio.length - offset))];
            System.arraycopy(audio, offset, segment, 0, segment.length);
            offset += length;
            queue.offer(new Mark(items.get(i).index, true));
            offerPcm(queue, LocalSpeechPlugin.trimSilence(segment, sampleRate, true));
            queue.offer(new Mark(items.get(i).index, false));
        }
    }

    private void offerPcm(LinkedBlockingQueue<Object> queue, float[] samples) {
        short[] pcm = toPcm(samples);
        samplesQueued.addAndGet(pcm.length);
        queue.offer(new Pcm(pcm));
    }

    private long headFrames() {
        AudioTrack current = track;
        try { return current == null ? 0 : current.getPlaybackHeadPosition() & 0xffffffffL; } catch (Exception e) { return 0; }
    }

    // Runs on the plugin's single inference thread, in reading order.
    private void synthesizeItem(int gen, LinkedBlockingQueue<Object> queue, Item item) {
        if (generation.get() != gen || queue == null) return;
        if (synth.batches(voice)) {
            try { batchItem(gen, queue, item); }
            catch (Exception error) {
                if (generation.get() != gen) return;
                events.emit("error", item.index, error.getMessage());
                // Flush what was batched so earlier sentences still play, then
                // mark this one done so narration moves on.
                try { flushBatch(gen, queue); } catch (Exception ignored) {}
                queue.offer(new Mark(item.index, true));
                queue.offer(new Mark(item.index, false));
            }
            return;
        }
        final boolean[] first = { true };
        try {
            queue.offer(new Mark(item.index, true));
            synth.synthesize(voice, item.text, synthSpeed(), samples -> {
                if (generation.get() != gen) return false;
                float[] trimmed = LocalSpeechPlugin.trimSilence(samples, sampleRate, first[0]);
                first[0] = false;
                offerPcm(queue, trimmed);
                return true;
            });
            if (generation.get() == gen) queue.offer(new Mark(item.index, false));
        } catch (Exception error) {
            if (generation.get() != gen) return;
            // Keep going: one sentence the engine cannot say must not stop the book.
            queue.offer(new Mark(item.index, false));
            events.emit("error", item.index, error.getMessage());
        }
    }

    private void writeLoop(int gen, AudioTrack target, LinkedBlockingQueue<Object> queue) {
        try {
            while (generation.get() == gen) {
                Object next = queue.take();
                if (next == this || generation.get() != gen) return;
                if (next instanceof Mark) {
                    Mark mark = (Mark) next;
                    synchronized (boundaries) { boundaries.add(new Boundary(mark.index, framesWritten, mark.start)); }
                } else if (next instanceof Pcm) {
                    short[] data = ((Pcm) next).data;
                    int offset = 0;
                    while (offset < data.length && generation.get() == gen) {
                        int written = target.write(data, offset, data.length - offset);
                        if (written < 0) return; // ERROR_DEAD_OBJECT and friends: track is gone
                        if (written == 0) {
                            // A paused track accepts nothing once its buffer is full
                            // (write returns 0 instead of blocking). Wait for resume;
                            // exiting here silenced the stream after every pause.
                            Thread.sleep(25);
                            continue;
                        }
                        recordLevels(data, offset, written, framesWritten);
                        offset += written;
                        framesWritten += written;
                        samplesQueued.addAndGet(-written);
                        if (awaitingFirstAudio) startPlaybackIfReady(target);
                    }
                }
            }
        } catch (InterruptedException ignored) {
        } catch (IllegalStateException ignored) {
            // Track released under us by a newer stream.
        }
    }

    // Converts the hardware playback position into sentence start/end events.
    private void poll(int gen) {
        if (generation.get() != gen) return;
        AudioTrack current = track;
        if (current != null) {
            long head;
            try { head = current.getPlaybackHeadPosition() & 0xffffffffL; } catch (Exception e) { head = -1; }
            List<Boundary> due = new ArrayList<>();
            synchronized (boundaries) {
                while (!boundaries.isEmpty() && head >= 0 && boundaries.peekFirst().frame <= head) {
                    // An end boundary is due once everything written before it has played.
                    due.add(boundaries.pollFirst());
                }
            }
            int underruns = 0;
            try { underruns = current.getUnderrunCount(); } catch (Exception ignored) {}
            for (Boundary b : due) events.emit(b.start ? "started" : "ended", b.index, b.start ? null : ("underruns=" + underruns));

            // Loudness at the playback head. Nothing is playing while paused, or
            // when the head has caught up with everything written (a stall).
            float level = 0f;
            boolean playing = !paused && current.getPlayState() == AudioTrack.PLAYSTATE_PLAYING;
            if (playing && head >= 0 && head < framesWritten) level = levelAt(head);
            // Only meaningful changes cross the bridge (plus the drop to silence).
            if (Math.abs(level - lastLevelSent) >= 0.03f || (level == 0f && lastLevelSent != 0f)) {
                lastLevelSent = level;
                events.emit("level", -1, String.format(java.util.Locale.US, "%.3f", level));
            }
        }
        monitor.postDelayed(() -> poll(gen), 30);
    }

    private void resetLevels() {
        synchronized (levelFrames) {
            levelHead = 0;
            levelCount = 0;
            pendingLevelFrame = -1;
            pendingLevelSum = 0;
            pendingLevelSamples = 0;
        }
        lastLevelSent = -1f;
    }

    // Writer thread: fold the samples just written into ~20 ms RMS windows.
    private void recordLevels(short[] data, int offset, int count, long startFrame) {
        synchronized (levelFrames) {
            for (int i = 0; i < count; i++) {
                if (pendingLevelFrame < 0) pendingLevelFrame = startFrame + i;
                double v = data[offset + i] / 32768.0;
                pendingLevelSum += v * v;
                if (++pendingLevelSamples >= LEVEL_WINDOW) {
                    levelFrames[levelHead] = pendingLevelFrame;
                    levelValues[levelHead] = (float) Math.sqrt(pendingLevelSum / pendingLevelSamples);
                    levelHead = (levelHead + 1) % LEVEL_CAPACITY;
                    if (levelCount < LEVEL_CAPACITY) levelCount++;
                    pendingLevelFrame = -1;
                    pendingLevelSum = 0;
                    pendingLevelSamples = 0;
                }
            }
        }
    }

    // Monitor thread: RMS of the window containing `frame`, scaled to 0–1
    // (speech RMS sits around 0.05–0.25), with a square-root soft knee.
    private float levelAt(long frame) {
        synchronized (levelFrames) {
            for (int n = 0; n < levelCount; n++) {
                int slot = ((levelHead - 1 - n) % LEVEL_CAPACITY + LEVEL_CAPACITY) % LEVEL_CAPACITY;
                if (levelFrames[slot] <= frame) {
                    if (frame - levelFrames[slot] > LEVEL_WINDOW * 2L) return 0f;
                    // Gate out the noise floor so pauses read as true silence.
                    double voiced = Math.max(0.0, levelValues[slot] - 0.008) * 6.0;
                    return (float) Math.min(1.0, Math.sqrt(voiced));
                }
            }
        }
        return 0f;
    }

    private static short[] toPcm(float[] samples) {
        short[] out = new short[samples.length];
        for (int i = 0; i < samples.length; i++) {
            float v = samples[i];
            if (!Float.isFinite(v)) v = 0f;
            out[i] = (short) (Math.max(-1f, Math.min(1f, v)) * 32767);
        }
        return out;
    }
}
