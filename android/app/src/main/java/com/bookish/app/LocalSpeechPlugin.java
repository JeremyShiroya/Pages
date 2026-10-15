package com.bookish.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.k2fsa.sherpa.onnx.*;
import com.pockettts.PocketTtsSynthesizer;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream;
import android.util.Base64;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.security.MessageDigest;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

/** One serial inference worker; only the selected model occupies memory. */
@CapacitorPlugin(name = "LocalSpeech")
public class LocalSpeechPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicInteger generation = new AtomicInteger();
    private OfflineTts engine;
    private String engineVoice;
    private PocketTtsSynthesizer pocketEngine;
    private static final String POCKET_REVISION = "e0e68d4fb79feb529d7d0f8d0bbfad8d15a18a1e";
    private static final String KOKORO = "kokoro-multi-lang-v1_0";

    private boolean isPocket(String voice) throws IOException {
        if ("pocket:charles".equals(voice)) return true;
        if ("kokoro:af_nicole".equals(voice)) return false;
        throw new IOException("Unsupported narrator");
    }
    private File root() { return new File(getContext().getFilesDir(), "speech-v1"); }
    private void check(int token) throws IOException {
        if (generation.get() != token) throw new IOException("Speech request cancelled");
    }
    private void progress(String voice, String phase, int percent) {
        JSObject event = new JSObject();
        event.put("voice", voice); event.put("phase", phase); event.put("percent", percent);
        notifyListeners("progress", event);
    }
    @PluginMethod public void cancel(PluginCall call) {
        generation.incrementAndGet(); call.resolve();
    }
    @PluginMethod public void prepare(PluginCall call) { enqueue(call, false); }
    @PluginMethod public void synthesize(PluginCall call) { enqueue(call, true); }
    private void enqueue(PluginCall call, boolean synthesize) {
        final int token = generation.get();
        final String voice = call.getString("voice", "");
        final String text = call.getString("text", "");
        worker.execute(() -> {
            try {
                check(token);
                boolean pocket = isPocket(voice);
                if (synthesize && (text.trim().isEmpty() || text.length() > 5000)) throw new IOException("Invalid speech text");
                prepareVoice(voice, pocket, token);
                check(token);
                if (!synthesize) { call.resolve(); return; }
                long started = System.nanoTime();
                float[] samples;
                int sampleRate;
                if (pocket) {
                    samples = pocketEngine.synthesize(text, "charles").getAudio();
                    sampleRate = PocketTtsSynthesizer.SAMPLE_RATE;
                } else {
                    GenerationConfig config = new GenerationConfig();
                    config.setSpeed(1f);
                    config.setSid(6); // af_nicole in the pinned Kokoro v1.0 speaker table.
                    // JNI looks up invoke(float[]) explicitly. A Java lambda only
                    // exposes the erased invoke(Object) and aborts inside JNI.
                    GeneratedAudio audio = engine.generateWithConfigAndCallback(text, config,
                        new kotlin.jvm.functions.Function1<float[], Integer>() {
                            @Override public Integer invoke(float[] values) {
                                return generation.get() == token ? 1 : 0;
                            }
                        });
                    samples = audio.getSamples();
                    sampleRate = audio.getSampleRate();
                }
                check(token);
                if (samples.length == 0) throw new IOException("Narrator returned no audio");
                JSObject result = new JSObject();
                result.put("audio", "data:audio/wav;base64," + Base64.encodeToString(wav(samples, sampleRate), Base64.NO_WRAP));
                result.put("duration", samples.length / (double) sampleRate);
                result.put("generationMs", (System.nanoTime() - started) / 1_000_000);
                call.resolve(result);
            } catch (Exception error) {
                if (generation.get() == token) progress(voice, "error", 0);
                call.reject(error.getMessage(), error);
            }
        });
    }
    private void prepareVoice(String voice, boolean pocket, int token) throws Exception {
        if (voice.equals(engineVoice) && (pocket ? pocketEngine != null : engine != null)) return;
        if (pocket) {
            preparePocket(voice, token);
            return;
        }
        root().mkdirs();
        String name = KOKORO;
        File dir = new File(root(), name);
        if (!new File(dir, ".ready").isFile()) {
            File archive = new File(root(), name + ".tar.bz2");
            String hash = "c5f7e2d2caf082bc1d20fb70334a61d99d20b484500aad32e7cf84c128ea3298";
            long size = 349906910L;
            if (root().getUsableSpace() < size * 3) throw new IOException("Not enough free space for this voice download");
            download("https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/" + name + ".tar.bz2", archive, hash, size, voice, token);
            progress(voice, "installing", 100);
            extract(archive, root(), token);
            check(token);
            try (FileOutputStream marker = new FileOutputStream(new File(dir, ".ready"))) { marker.write(1); marker.getFD().sync(); }
            archive.delete();
        }
        progress(voice, "loading", 100);
        if (engine != null) { engine.release(); engine = null; }
        if (pocketEngine != null) { pocketEngine.close(); pocketEngine = null; }
        engineVoice = null;
        OfflineTtsModelConfig model = new OfflineTtsModelConfig();
        model.setNumThreads(4);
        model.setProvider("cpu");
        {
            OfflineTtsKokoroModelConfig config = new OfflineTtsKokoroModelConfig();
            config.setModel(new File(dir, "model.onnx").toString());
            config.setVoices(new File(dir, "voices.bin").toString());
            config.setTokens(new File(dir, "tokens.txt").toString());
            config.setDataDir(new File(dir, "espeak-ng-data").toString());
            config.setLexicon(new File(dir, "lexicon-us-en.txt").toString());
            config.setLang("en-us");
            model.setKokoro(config);
        }
        check(token);
        OfflineTtsConfig config = new OfflineTtsConfig();
        config.setModel(model); config.setMaxNumSentences(1);
        engine = new OfflineTts(null, config);
        engineVoice = voice;
        check(token);
        progress(voice, "ready", 100);
    }
    // These are the exact preset-state LiteRT graphs used by the public Android
    // Pocket TTS port. The Charles state is Kyutai's published preset, not a
    // clone inferred from a short sample and not pitch-modified after generation.
    private static final String[][] POCKET_FILES = {
        {"pt_bos_input_f32.bin", "184ae4fee2f3c629cc9908a351c8152204c5c076ea1ceae36c23badf8e7cacc8", "4096"},
        {"pt_embed_f16.bin", "82c06e512863fc5b45b14e55e55a911fa2bede6df50e2a7472206af74fc0ac78", "8194048"},
        {"pt_flowlm_fused_fp16.tflite", "3e9297e8c997226941b6d21149e7dec96168e08207a07e5a5d972da7d85574a7", "169234128"},
        {"pt_input_linear_f32.bin", "5f4738bbdba5b4c75ab64c5dfae1e37b884b5e1c7f93c0a1d487dcd5250f17fb", "131072"},
        {"pt_mimi_dec_tx_fp16.tflite", "5e4b277385bb7a2e5c7475d7421479a4b77431d6aa0ded535ae8c067c6edfa38", "17431184"},
        {"pt_mimi_deconly_fp16.tflite", "ea7bd858b8e2841b30be7599e4bfedce7a751d23a9e1946d14101b0440de4e7e", "10550208"},
        {"pt_neutral_latent_f32.bin", "d5f0df1e55dcfcc01ab1f9e7ec41e799bad751911e3adda7f3833cfb7d0aa596", "128"},
        {"pt_tokenizer.tsv", "459022ec19619b30fa5cc807c2c756bf19cbfc14571e64f9fe51e20807a33092", "126498"},
        {"voices/pt_voice_charles.bin", "1ab35c90e580a4413b7391419c854b1bd644329692e3a0b15caa76c816aec32a", "3096580"}
    };
    private void preparePocket(String voice, int token) throws Exception {
        File dir = getContext().getExternalFilesDir(null);
        if (dir == null) throw new IOException("App storage unavailable for Charles");
        File marker = new File(dir, "pocket-charles-" + POCKET_REVISION + ".ready");
        if (!marker.isFile()) {
            if (dir.getUsableSpace() < 260_000_000L) throw new IOException("Not enough free space for Charles voice download");
            for (String[] item : POCKET_FILES) {
                check(token);
                File file = new File(dir, item[0].replace("voices/", ""));
                if (file.isFile() && file.length() == Long.parseLong(item[2])) continue;
                download("https://huggingface.co/mlboydaisuke/Pocket-TTS-LiteRT/resolve/" + POCKET_REVISION + "/" + item[0],
                    file, item[1], Long.parseLong(item[2]), voice, token);
            }
            try (FileOutputStream done = new FileOutputStream(marker)) { done.write(1); done.getFD().sync(); }
        }
        progress(voice, "loading", 100);
        if (engine != null) { engine.release(); engine = null; }
        if (pocketEngine != null) pocketEngine.close();
        engineVoice = null;
        pocketEngine = new PocketTtsSynthesizer(getContext());
        pocketEngine.loadVoice("charles");
        engineVoice = voice;
        check(token);
        progress(voice, "ready", 100);
    }
    private void download(String url, File destination, String hash, long maxBytes, String voice, int token) throws Exception {
        File part = new File(destination + ".part");
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(30_000); connection.setReadTimeout(30_000);
        try {
            if (connection.getResponseCode() != 200) throw new IOException("Voice download failed: HTTP " + connection.getResponseCode());
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long length = connection.getContentLengthLong(); long total = 0; int lastPercent = -1;
            try (InputStream input = new BufferedInputStream(connection.getInputStream()); FileOutputStream output = new FileOutputStream(part)) {
                byte[] buffer = new byte[65536]; int count;
                while ((count = input.read(buffer)) != -1) {
                    check(token); total += count;
                    if (total > maxBytes) throw new IOException("Voice download exceeded expected size");
                    digest.update(buffer, 0, count); output.write(buffer, 0, count);
                    int percent = length > 0 ? (int) (100 * total / length) : 0;
                    if (percent != lastPercent) { progress(voice, "downloading", percent); lastPercent = percent; }
                }
                output.getFD().sync();
            }
            StringBuilder actual = new StringBuilder();
            for (byte b : digest.digest()) actual.append(String.format("%02x", b & 255));
            if (hash != null && !hash.equals(actual.toString())) throw new IOException("Voice download checksum mismatch");
            if (length > 0 && total != length) throw new IOException("Incomplete voice download");
            if (!part.renameTo(destination)) throw new IOException("Could not save downloaded voice");
        } finally { connection.disconnect(); part.delete(); }
    }
    private void extract(File archive, File destination, int token) throws Exception {
        String rootPath = destination.getCanonicalPath() + File.separator;
        long total = 0;
        try (TarArchiveInputStream tar = new TarArchiveInputStream(new BZip2CompressorInputStream(new BufferedInputStream(new FileInputStream(archive))))) {
            TarArchiveEntry entry; byte[] buffer = new byte[65536];
            while ((entry = tar.getNextTarEntry()) != null) {
                check(token);
                File file = new File(destination, entry.getName());
                if (!file.getCanonicalPath().startsWith(rootPath) || entry.isSymbolicLink() || entry.isLink()) throw new IOException("Invalid voice archive entry");
                if (entry.isDirectory()) { file.mkdirs(); continue; }
                if (!entry.isFile()) continue;
                total += entry.getSize();
                if (total > 1_500_000_000L) throw new IOException("Voice archive is too large");
                file.getParentFile().mkdirs();
                try (FileOutputStream output = new FileOutputStream(file)) {
                    int count;
                    while ((count = tar.read(buffer)) != -1) { check(token); output.write(buffer, 0, count); }
                    output.getFD().sync();
                }
            }
        }
    }
    private byte[] wav(float[] samples, int rate) throws IOException {
        ByteBuffer out = ByteBuffer.allocate(44 + samples.length * 2).order(ByteOrder.LITTLE_ENDIAN);
        out.put("RIFF".getBytes()).putInt(36 + samples.length * 2).put("WAVEfmt ".getBytes());
        out.putInt(16).putShort((short) 1).putShort((short) 1).putInt(rate).putInt(rate * 2).putShort((short) 2).putShort((short) 16);
        out.put("data".getBytes()).putInt(samples.length * 2);
        for (float value : samples) {
            if (!Float.isFinite(value)) throw new IOException("Narrator returned invalid audio");
            out.putShort((short) (Math.max(-1f, Math.min(1f, value)) * 32767));
        }
        return out.array();
    }
    @Override protected void handleOnDestroy() {
        generation.incrementAndGet();
        worker.execute(() -> {
            if (engine != null) { engine.release(); engine = null; }
            if (pocketEngine != null) { pocketEngine.close(); pocketEngine = null; }
        });
        worker.shutdown();
    }
}
