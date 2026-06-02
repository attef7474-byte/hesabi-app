package com.hesabi.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.FragmentActivity;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.Executor;

public class MainActivity extends FragmentActivity {
    private static final String APP_URL = "https://hesabi-app-edc7e.web.app/";
    private static final String LATEST_APK_URL = "https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk";
    private static final int REQ_MEDIA_PERMISSIONS = 7001;
    private static final int REQ_FILE_CHOOSER = 7002;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraImageUri;
    private String lastSessionJson = "{}";

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestBasePermissions();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }

        WebView.setWebContentsDebuggingEnabled(false);
        webView.addJavascriptInterface(new HesabiAndroidBridge(), "HesabiAndroid");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new HesabiChromeClient());

        webView.loadUrl(APP_URL);
    }

    private void requestBasePermissions() {
        String[] permissions;
        if (Build.VERSION.SDK_INT >= 33) {
            permissions = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.POST_NOTIFICATIONS
            };
        } else {
            permissions = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.READ_EXTERNAL_STORAGE
            };
        }
        ActivityCompat.requestPermissions(this, permissions, REQ_MEDIA_PERMISSIONS);
    }

    private boolean hasCameraMicPermissions() {
        boolean camera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean mic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        return camera && mic;
    }

    private void grantPendingWebPermissionIfReady() {
        if (pendingPermissionRequest == null) return;
        if (!hasCameraMicPermissions()) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO},
                    REQ_MEDIA_PERMISSIONS);
            return;
        }
        pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
        pendingPermissionRequest = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private class HesabiChromeClient extends WebChromeClient {
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(() -> {
                pendingPermissionRequest = request;
                grantPendingWebPermissionIfReady();
            });
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;

            Intent galleryIntent = new Intent(Intent.ACTION_GET_CONTENT);
            galleryIntent.addCategory(Intent.CATEGORY_OPENABLE);
            galleryIntent.setType("*/*");
            galleryIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "audio/*"});

            Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            try {
                File photoFile = createCameraImageFile();
                cameraImageUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", photoFile);
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
                cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception e) {
                cameraIntent = null;
            }

            Intent chooser = Intent.createChooser(galleryIntent, "اختر صورة أو ملف صوت");
            if (cameraIntent != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
            startActivityForResult(chooser, REQ_FILE_CHOOSER);
            return true;
        }
    }

    private File createCameraImageFile() throws Exception {
        String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dir = getExternalCacheDir() != null ? getExternalCacheDir() : getCacheDir();
        return File.createTempFile("HESABI_" + stamp + "_", ".jpg", dir);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK) {
                if (data == null || data.getData() == null) {
                    if (cameraImageUri != null) results = new Uri[]{cameraImageUri};
                } else {
                    results = new Uri[]{data.getData()};
                }
            }
            if (filePathCallback != null) filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            cameraImageUri = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    public class HesabiAndroidBridge {
        @JavascriptInterface
        public void requestMediaPermissions() {
            runOnUiThread(MainActivity.this::requestBasePermissions);
        }

        @JavascriptInterface
        public String getPlatform() {
            return "android-webview-native";
        }

        @JavascriptInterface
        public void registerSession(String json) {
            lastSessionJson = json == null ? "{}" : json;
        }

        @JavascriptInterface
        public void authenticateBiometric(String reason, String token) {
            runOnUiThread(() -> startBiometric(reason, token));
        }

        @JavascriptInterface
        public void openLatestApk() {
            runOnUiThread(MainActivity.this::downloadLatestApk);
        }
    }

    private void startBiometric(String reason, String token) {
        int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        BiometricManager manager = BiometricManager.from(this);
        int status = manager.canAuthenticate(authenticators);
        if (status != BiometricManager.BIOMETRIC_SUCCESS) {
            sendBiometricResult(false, "البصمة أو قفل الجهاز غير جاهز. فعّل بصمة/وجه أو قفل شاشة من إعدادات الهاتف.", token);
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt prompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                sendBiometricResult(true, "تم التحقق", token);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                sendBiometricResult(false, errString.toString(), token);
            }

            @Override
            public void onAuthenticationFailed() {
                Toast.makeText(MainActivity.this, "لم يتم التعرف، حاول مرة أخرى", Toast.LENGTH_SHORT).show();
            }
        });

        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("حسابي التجاري")
                .setSubtitle(reason == null || reason.trim().isEmpty() ? "تحقق من هويتك" : reason)
                .setAllowedAuthenticators(authenticators)
                .build();

        prompt.authenticate(info);
    }

    private void sendBiometricResult(boolean ok, String message, String token) {
        String safeMessage = message == null ? "" : message.replace("\\", "\\\\").replace("'", "\\'");
        String safeToken = token == null ? "" : token.replace("\\", "\\\\").replace("'", "\\'");
        String js = "window.hesabiAndroidBiometricResult && window.hesabiAndroidBiometricResult(" + ok + ", '" + safeMessage + "', '" + safeToken + "')";
        webView.evaluateJavascript(js, null);
    }

    private void downloadLatestApk() {
        try {
            Uri uri = Uri.parse(LATEST_APK_URL);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("تحديث حسابي التجاري");
            request.setDescription("تحميل آخر إصدار من GitHub");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "hesabi-app-latest.apk");
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            dm.enqueue(request);
            Toast.makeText(this, "بدأ تحميل التحديث. افتح الإشعار بعد اكتمال التحميل للتثبيت.", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(LATEST_APK_URL)));
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_MEDIA_PERMISSIONS) {
            grantPendingWebPermissionIfReady();
        }
    }
}
