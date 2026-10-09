package com.bookish.app;

import android.app.ActivityManager;
import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Android clears only this package's sandbox and terminates its workers. */
@CapacitorPlugin(name = "AppReset")
public class AppResetPlugin extends Plugin {
    @PluginMethod
    public void reset(PluginCall call) {
        if (!call.getBoolean("confirmed", false)) {
            call.reject("Reset requires confirmation.");
            return;
        }
        ActivityManager manager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null || !manager.clearApplicationUserData()) {
            call.reject("Android could not reset the app.");
        }
        // On success Android kills this process. No callback can survive it.
    }
}
