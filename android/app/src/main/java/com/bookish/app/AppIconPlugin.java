package com.bookish.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Switches the home-screen icon between the Launcher* activity-aliases in the
 * manifest (Settings → Theme → App Icon). Exactly one alias is enabled at a
 * time; the new one is enabled BEFORE the old one is disabled, so there is
 * never a moment with no launcher entry at all.
 *
 * Android removes the old icon and adds the new one itself. Some launchers
 * (One UI among them) close the app when the alias it was opened from is
 * disabled, so the web side only calls this while the app is in the background.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    // Same ids as ACCENT_COLOR_OPTIONS in composables/usePagesSettings.js.
    static final String[] ICONS = {
        "purple", "pastel-purple", "pastel-blue", "pastel-pink", "pastel-yellow",
        "burgundy", "sage", "green", "pastel-green", "mono",
    };

    private static String aliasFor(String id) {
        StringBuilder name = new StringBuilder("com.bookish.app.Launcher");
        for (String word : id.split("-")) {
            name.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return name.toString();
    }

    private ComponentName component(String id) {
        return new ComponentName(getContext().getPackageName(), aliasFor(id));
    }

    private boolean isEnabled(PackageManager pm, String id) {
        int state = pm.getComponentEnabledSetting(component(id));
        if (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return "purple".equals(id);
        return state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }

    @PluginMethod
    public void getIcon(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        String current = "purple";
        for (String id : ICONS) {
            if (isEnabled(pm, id)) { current = id; break; }
        }
        JSObject result = new JSObject();
        result.put("name", current);
        call.resolve(result);
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String target = call.getString("name", "purple");
        boolean known = false;
        for (String id : ICONS) if (id.equals(target)) known = true;
        if (!known) {
            call.reject("Unknown app icon: " + target);
            return;
        }
        PackageManager pm = getContext().getPackageManager();
        try {
            pm.setComponentEnabledSetting(component(target),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (String id : ICONS) {
                if (id.equals(target)) continue;
                pm.setComponentEnabledSetting(component(id),
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
            JSObject result = new JSObject();
            result.put("name", target);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not change the app icon", error);
        }
    }
}
