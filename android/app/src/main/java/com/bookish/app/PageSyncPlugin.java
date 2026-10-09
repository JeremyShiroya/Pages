package com.bookish.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

@CapacitorPlugin(name = "PageSync")
public class PageSyncPlugin extends Plugin {
    @PluginMethod
    public void recognize(PluginCall call) {
        String encoded = call.getString("image");
        if (encoded == null || encoded.isEmpty()) {
            call.reject("No page image was supplied.");
            return;
        }
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("The page image could not be opened.");
                return;
            }
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                .process(InputImage.fromBitmap(bitmap, 0))
                .addOnSuccessListener(result -> {
                    JSObject response = new JSObject();
                    response.put("text", result.getText());
                    call.resolve(response);
                    bitmap.recycle();
                })
                .addOnFailureListener(error -> {
                    bitmap.recycle();
                    call.reject("Could not read text from this photo.", error);
                });
        } catch (Exception error) {
            call.reject("The page image could not be processed.", error);
        }
    }
}
