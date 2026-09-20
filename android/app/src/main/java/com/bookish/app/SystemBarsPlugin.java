package com.bookish.app;

import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the status- and navigation-bar ICONS readable.
 *
 * The bars themselves are transparent (see MainActivity.enableEdgeToEdge), so
 * the app's own background shows through them and they always match the theme.
 * Their icons do not follow automatically though: on a light background they
 * must be dark, and on a dark background light. Android only exposes that as a
 * window flag, so the web layer — which is the only thing that knows which
 * theme is active — calls in here whenever the theme changes.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    private View statusBarScrim;
    private View navigationBarScrim;

    /**
     * @param call `dark` — true when the app is showing its dark theme, i.e.
     *             the bars sit on a dark background and need LIGHT icons.
     */
    @PluginMethod
    public void setAppearance(PluginCall call) {
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        final boolean statusBarDark = Boolean.TRUE.equals(call.getBoolean("statusBarDark", dark));
        final boolean navigationBarDark = Boolean.TRUE.equals(call.getBoolean("navigationBarDark", dark));
        final String statusBarColor = call.getString("statusBarColor");
        final String navigationBarColor = call.getString("navigationBarColor");

        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                getActivity().getWindow().setStatusBarContrastEnforced(false);
                getActivity().getWindow().setNavigationBarContrastEnforced(false);
            }
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );
            if (controller != null) {
                // "Light bars" means light BACKGROUND, so dark icons — the
                // opposite of the app's dark theme.
                controller.setAppearanceLightStatusBars(!statusBarDark);
                controller.setAppearanceLightNavigationBars(!navigationBarDark);
            }
            if (statusBarColor != null && !statusBarColor.isEmpty()) {
                applyBarScrim(statusBarColor, true);
            }
            if (navigationBarColor != null && !navigationBarColor.isEmpty()) {
                applyBarScrim(navigationBarColor, false);
            }
            call.resolve();
        });
    }

    /**
     * Android 15 enforces edge-to-edge and can ignore Window#setStatusBarColor.
     * Paint a non-interactive view inside the status-bar inset instead, above
     * the WebView but below Android's clock/network icons.
     */
    private void applyBarScrim(String colorValue, boolean statusBar) {
        final View decor = getActivity().getWindow().getDecorView();
        if (!(decor instanceof FrameLayout)) return;

        final int color;
        try {
            color = Color.parseColor(colorValue);
        } catch (IllegalArgumentException ignored) {
            return;
        }

        int height = 0;
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
        if (insets != null) {
            height = statusBar
                ? insets.getInsets(WindowInsetsCompat.Type.statusBars()).top
                : insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        }
        if (height <= 0) {
            String resourceName = statusBar ? "status_bar_height" : "navigation_bar_height";
            int resourceId = getContext().getResources().getIdentifier(resourceName, "dimen", "android");
            if (resourceId > 0) height = getContext().getResources().getDimensionPixelSize(resourceId);
        }
        if (height <= 0) return;

        FrameLayout root = (FrameLayout) decor;
        View scrim = statusBar ? statusBarScrim : navigationBarScrim;
        if (scrim == null) {
            scrim = new View(getContext());
            scrim.setClickable(false);
            scrim.setFocusable(false);
            scrim.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                height,
                statusBar ? Gravity.TOP : Gravity.BOTTOM
            );
            root.addView(scrim, params);
            if (statusBar) statusBarScrim = scrim;
            else navigationBarScrim = scrim;
        } else {
            ViewGroup.LayoutParams params = scrim.getLayoutParams();
            if (params.height != height) {
                params.height = height;
                scrim.setLayoutParams(params);
            }
            scrim.bringToFront();
        }
        scrim.setBackgroundColor(color);
    }
}
