


# Keep all Capacitor classes
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Keep all Capacitor plugins
-keep class com.getcapacitor.plugin.** { *; }
-dontwarn com.getcapacitor.plugin.**

# Keep all classes that use @CapacitorPlugin annotations
-keep @com.getcapacitor.Plugin class * {
    *;
}

# Keep Plugin configuration
-keepclassmembers class ** {
    @com.getcapacitor.PluginMethod <methods>;
}

# React specific: keep ReactActivity & related bridge
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# For JSON serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Optional: keep WebView and JS bridge behavior
-keep class android.webkit.** { *; }

# If you're using Camera plugin or similar with FileProvider
-keep class androidx.core.content.FileProvider { *; }

# Prevent removal of JavaScriptInterface (used in bridge)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Optional: If using any community plugin, check their docs
