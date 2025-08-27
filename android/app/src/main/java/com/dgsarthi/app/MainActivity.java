package com.dgsarthi.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw edge-to-edge so we can read real insets:
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        final View webview = findViewById(R.id.webview);   // <- from activity_main.xml
        if (webview != null) {
            ViewCompat.setOnApplyWindowInsetsListener(webview, (v, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);  // <- SafeArea applied
                return WindowInsetsCompat.CONSUMED;
            });
            // Request first pass
            ViewCompat.requestApplyInsets(webview);
        }
    }
}
