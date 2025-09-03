package com.dgsarthi.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

// 👇 imports required by @capgo/capacitor-social-login
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Your existing edge-to-edge insets code
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        final View webview = findViewById(R.id.webview);   // <- from activity_main.xml
        if (webview != null) {
            ViewCompat.setOnApplyWindowInsetsListener(webview, (v, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);  // <- SafeArea applied
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(webview);
        }
    }

    // 👇 forward the Google login result back to the plugin
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN &&
            requestCode <  GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {

            PluginHandle handle = getBridge().getPlugin("SocialLogin");
            if (handle == null) return;

            Plugin plugin = handle.getInstance();
            if (plugin instanceof SocialLoginPlugin) {
                ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
            }
        }
    }

    // required marker method for the plugin
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
