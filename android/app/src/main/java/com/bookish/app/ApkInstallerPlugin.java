package com.bookish.app;

import android.content.Intent;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Handles APK files the app deals with directly: the update it downloads for
 * itself, and its own installer file when the reader shares the app.
 *
 * Pages installs outside the Play Store, so it ships its own update flow. The
 * web layer downloads the APK itself (so the progress bar lives in the app's
 * own modal instead of the browser's notification shade) and then calls in here
 * to open it.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: install anything. Android does not allow
 * a normal app to install a package silently — the system installer dialog
 * always appears and the user confirms it there. That is enforced by the OS for
 * every non-system app, so the most an update flow can do is put the right file
 * in front of that dialog with one tap. This class does exactly that and no
 * more.
 *
 * Two things are required and are checked rather than assumed:
 *   - REQUEST_INSTALL_PACKAGES in the manifest (a manifest permission, granted
 *     at install time), AND
 *   - the per-app "install unknown apps" toggle, which the USER must grant in
 *     system settings from Android 8 onwards. canInstall() reports it and
 *     openInstallSettings() takes them straight to the right screen, because a
 *     failed install intent is otherwise completely silent.
 *
 * The APK is served through the app's existing FileProvider: a raw file:// uri
 * would throw FileUriExposedException on Android 7+.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private static final String APK_MIME = "application/vnd.android.package-archive";

    /**
     * Whether this app may currently ask to install packages. Below Android 8
     * the manifest permission is enough; from 8 onwards the user holds a
     * per-app toggle that can be off even with the permission declared.
     */
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasInstallPermission());
        call.resolve(result);
    }

    /**
     * Opens the "install unknown apps" screen for THIS app. Without the package
     * uri Android drops the user on the full list of every installed app, which
     * is a much worse place to land.
     */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve();
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                .setData(Uri.parse("package:" + getContext().getPackageName()))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not open the install-permission screen.", error);
        }
    }

    /**
     * @param call `path` — where the downloaded APK is, as an absolute path or
     *             a file:// uri (Capacitor's Filesystem returns the latter).
     */
    @PluginMethod
    public void install(PluginCall call) {
        final String path = call.getString("path");
        if (path == null || path.trim().isEmpty()) {
            call.reject("No APK path was provided.");
            return;
        }

        final File apk = resolveFile(path);
        // Fail loudly here: a missing or empty file otherwise surfaces as
        // Android's generic "There was a problem parsing the package", which
        // says nothing about what actually went wrong.
        if (!apk.exists()) {
            call.reject("The downloaded update could not be found on this device.");
            return;
        }
        if (apk.length() <= 0) {
            call.reject("The downloaded update is empty — the download did not finish.");
            return;
        }
        if (!hasInstallPermission()) {
            call.reject("PERMISSION_REQUIRED");
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apk
            );

            Intent intent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, APK_MIME)
                // The installer runs in another process, so it needs explicit
                // permission to read a uri that belongs to us.
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not open the installer for this update.", error);
        }
    }

    /**
     * Share this app's own APK through the system share sheet, so it reaches
     * WhatsApp, Gmail, Bluetooth, Nearby Share — whatever the phone offers.
     *
     * The installed APK lives under /data/app in a directory another app cannot
     * read, so it cannot be shared in place: it is copied into our cache, where
     * the FileProvider can grant per-recipient read access. The copy is named
     * for the app and version rather than "base.apk", because that filename is
     * what the recipient sees and has to trust enough to install.
     *
     * Split APKs are deliberately not handled. A build produced by this project
     * is a single APK; a split install would need every part plus a session
     * install on the far side, and sharing only the base would hand someone a
     * file that fails to install with no useful explanation.
     */
    @PluginMethod
    public void shareApk(PluginCall call) {
        try {
            android.content.pm.ApplicationInfo info = getContext().getApplicationInfo();

            String[] splits = info.splitSourceDirs;
            if (splits != null && splits.length > 0) {
                call.reject("SPLIT_APK");
                return;
            }

            File source = new File(info.sourceDir);
            if (!source.exists() || source.length() <= 0) {
                call.reject("This app's installer file could not be found on the device.");
                return;
            }

            String version = call.getString("version", "");
            String label = "Pages" + (version == null || version.isEmpty() ? "" : "-" + version) + ".apk";

            File dir = new File(getContext().getCacheDir(), "shared-apk");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not prepare the app file for sharing.");
                return;
            }

            // One copy, replaced each time: this is a ~10MB file and there is no
            // reason to accumulate one per share.
            File target = new File(dir, label);
            for (File stale : dir.listFiles() != null ? dir.listFiles() : new File[0]) {
                if (!stale.equals(target)) stale.delete();
            }
            copy(source, target);

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                target
            );

            Intent send = new Intent(Intent.ACTION_SEND)
                .setType(APK_MIME)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, call.getString("subject", "Pages"))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            final String text = call.getString("text", "");
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);

            Intent chooser = Intent.createChooser(send, call.getString("title", "Share Pages"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                // Bluetooth and some mail clients read the stream from the
                // chooser intent rather than the inner one, and get a
                // SecurityException without their own grant.
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getContext().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("shared", true);
            result.put("bytes", target.length());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("The app could not be shared.", error);
        }
    }

    /**
     * Share any file owned by Pages through Android's real system share sheet.
     *
     * The Web Share API is inconsistent inside Android WebView, especially for
     * file payloads. The app already has a FileProvider for updates/app sharing,
     * so book files use the same native route and grant read access only to the
     * chosen recipient.
     */
    @PluginMethod
    public void shareFile(PluginCall call) {
        final String path = call.getString("path");
        if (path == null || path.trim().isEmpty()) {
            call.reject("No file path was provided.");
            return;
        }

        final File sourceFile = resolveFile(path);
        if (!sourceFile.exists()) {
            call.reject("The book file could not be found on this device.");
            return;
        }
        if (sourceFile.length() <= 0) {
            call.reject("The book file is empty.");
            return;
        }

        try {
            // FileProvider exposes the underlying filename to recipients. Copy
            // to a small share cache so a legacy internal name such as
            // "123.pdf" is delivered as the real title and extension.
            File dir = new File(getContext().getCacheDir(), "shared-books");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not prepare the book file for sharing.");
                return;
            }
            String requestedName = call.getString("fileName", sourceFile.getName());
            File file = new File(dir, safeSharedFileName(requestedName));
            if (!sourceFile.getCanonicalFile().equals(file.getCanonicalFile())) {
                copy(sourceFile, file);
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            String mimeType = call.getString("mimeType", "application/octet-stream");
            Intent send = new Intent(Intent.ACTION_SEND)
                .setType(mimeType)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, call.getString("subject", "Book"))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            final String text = call.getString("text", "");
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);

            Intent chooser = Intent.createChooser(send, call.getString("title", "Share book"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getContext().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("shared", true);
            result.put("bytes", file.length());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("The book could not be shared.", error);
        }
    }

    /** Saves a generated PNG into Pictures/Pages so it is indexed by Gallery. */
    @PluginMethod
    public void saveImage(PluginCall call) {
        final byte[] image = decodeImage(call);
        if (image == null) return;
        final String fileName = safePngName(call.getString("fileName", "pages-streak.png"));

        try {
            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Pages");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new java.io.IOException("Gallery did not provide a destination.");
                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new java.io.IOException("Gallery image could not be opened.");
                    out.write(image);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Pages");
                if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("Pictures/Pages could not be created.");
                File target = new File(dir, fileName);
                try (OutputStream out = new FileOutputStream(target)) { out.write(image); }
                android.media.MediaScannerConnection.scanFile(
                    getContext(), new String[] { target.getAbsolutePath() }, new String[] { "image/png" }, null
                );
                uri = Uri.fromFile(target);
            }

            JSObject result = new JSObject();
            result.put("saved", true);
            result.put("uri", uri.toString());
            result.put("bytes", image.length);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("The streak image could not be saved to your gallery.", error);
        }
    }

    /** Shares a generated image through Android's native chooser. */
    @PluginMethod
    public void shareImage(PluginCall call) {
        final byte[] image = decodeImage(call);
        if (image == null) return;
        final String fileName = safePngName(call.getString("fileName", "pages-streak.png"));

        try {
            File dir = new File(getContext().getCacheDir(), "shared-images");
            if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("Share cache could not be created.");
            File target = new File(dir, fileName);
            try (OutputStream out = new FileOutputStream(target)) { out.write(image); }

            Uri uri = FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", target
            );
            Intent send = new Intent(Intent.ACTION_SEND)
                .setType("image/png")
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, call.getString("subject", "My Pages reading streak"))
                .putExtra(Intent.EXTRA_TEXT, call.getString("text", ""))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, call.getString("title", "Share reading streak"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("shared", true);
            result.put("bytes", image.length);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("The streak image could not be shared.", error);
        }
    }

    /**
     * Native text-only fallback. This still opens Android's share sheet for
     * books whose original EPUB/PDF bytes are not available to the app.
     */
    @PluginMethod
    public void shareText(PluginCall call) {
        try {
            String text = call.getString("text", "");
            if (text == null || text.trim().isEmpty()) {
                call.reject("No share text was provided.");
                return;
            }

            Intent send = new Intent(Intent.ACTION_SEND)
                .setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, call.getString("subject", "Book"))
                .putExtra(Intent.EXTRA_TEXT, text);

            Intent chooser = Intent.createChooser(send, call.getString("title", "Share book"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception error) {
            call.reject("The book could not be shared.", error);
        }
    }

    private void copy(File from, File to) throws java.io.IOException {
        try (java.io.InputStream in = new java.io.FileInputStream(from);
             java.io.OutputStream out = new java.io.FileOutputStream(to)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            out.flush();
        }
    }

    private byte[] decodeImage(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.trim().isEmpty()) {
            call.reject("No image data was provided.");
            return null;
        }
        try {
            return Base64.decode(data, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("The generated image data was invalid.", error);
            return null;
        }
    }

    private String safePngName(String name) {
        String clean = name == null ? "pages-streak.png" : name.replaceAll("[^a-zA-Z0-9._-]", "-");
        if (clean.isEmpty()) clean = "pages-streak.png";
        return clean.toLowerCase().endsWith(".png") ? clean : clean + ".png";
    }

    private String safeSharedFileName(String name) {
        String clean = name == null ? "book" : name.replaceAll("[^a-zA-Z0-9._ -]", "-").trim();
        return clean.isEmpty() ? "book" : clean;
    }

    private boolean hasInstallPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        try {
            return getContext().getPackageManager().canRequestPackageInstalls();
        } catch (Exception error) {
            return false;
        }
    }

    private File resolveFile(String path) {
        String trimmed = path.trim();
        if (trimmed.startsWith("file://")) {
            Uri uri = Uri.parse(trimmed);
            String resolved = uri.getPath();
            if (resolved != null) return new File(resolved);
        }
        return new File(trimmed);
    }
}
