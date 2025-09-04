package com.dgsarthi.app;

import android.content.Intent;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.activity.OnBackPressedCallback;

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

        // ✅ Force Android to place webview inside safe area (status bar + nav bar)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        // ✅ Handle Android back button
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    // Send event to WebView
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new Event('androidBackButton'));",
                        null
                    );
                } else {
                    finish(); // fallback
                }
            }
        });

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
