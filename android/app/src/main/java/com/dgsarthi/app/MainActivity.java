package com.dgsarthi.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // <- This forces Android to layout content BELOW system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
