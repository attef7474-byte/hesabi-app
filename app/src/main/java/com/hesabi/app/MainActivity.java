package com.hesabi.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
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

import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;

import java.io.File;
import java.util.Objects;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.Executor;

public class MainActivity extends FragmentActivity {
    private static final String APP_URL = "https://hesabi-app-edc7e.web.app/";
    private static final String LATEST_APK_URL = "https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk";
    private static final int REQ_MEDIA_PERMISSIONS = 7001;
    private static final int REQ_FILE_CHOOSER = 7002;
    private static final int REQ_EXTERNAL_BARCODE = 7003;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraImageUri;
    private String lastSessionJson = "{}";
    private long latestApkDownloadId = -1L;
    private File latestApkFile;

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (id == latestApkDownloadId) {
                openDownloadedApk();
            }
        }
    };

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestBasePermissions();
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }

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

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
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

    private void startNativeItemBarcodeScanner() {
        // Use the external scanner first because it often has better autofocus/decoding.
        // If no compatible scanner is installed, fall back to the embedded ZXing scanner.
        if (startExternalItemBarcodeScanner()) return;
        startEmbeddedItemBarcodeScanner();
    }

    private boolean startExternalItemBarcodeScanner() {
        try {
            Intent intent = new Intent("com.google.zxing.client.android.SCAN");
            intent.putExtra("SCAN_MODE", "ONE_D_MODE");
            intent.putExtra("SAVE_HISTORY", false);
            intent.putExtra("PROMPT_MESSAGE", "وجّه الكاميرا نحو باركود الصنف");
            startActivityForResult(intent, REQ_EXTERNAL_BARCODE);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private void startEmbeddedItemBarcodeScanner() {
        try {
            if (!hasCameraPermission()) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_MEDIA_PERMISSIONS);
                Toast.makeText(this, "اسمح بصلاحية الكاميرا ثم حاول مسح الكود مرة أخرى.", Toast.LENGTH_LONG).show();
                return;
            }
            IntentIntegrator integrator = new IntentIntegrator(this);
            integrator.setPrompt("وجّه الكاميرا نحو باركود الصنف");
            integrator.setBeepEnabled(true);
            integrator.setBarcodeImageEnabled(false);
            integrator.setOrientationLocked(false);
            integrator.setDesiredBarcodeFormats(IntentIntegrator.ALL_CODE_TYPES);
            integrator.initiateScan();
        } catch (Exception e) {
            sendItemBarcodeResult("", "تعذر فتح ماسح الباركود الأصلي: " + e.getMessage());
        }
    }

    private void openExternalScannerOrStore() {
        try {
            if (startExternalItemBarcodeScanner()) return;
            Toast.makeText(this, "لم يتم العثور على تطبيق ماسح متوافق. ثبّت Barcode Scanner أو استخدم الماسح الداخلي.", Toast.LENGTH_LONG).show();
            Intent market = new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=barcode%20scanner"));
            startActivity(market);
        } catch (Exception e) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/search?q=barcode%20scanner&c=apps")));
            } catch (Exception ignored) {}
        }
    }

    private static String jsQuoteprivate static String jsQuote(String value) {
        if (value == null) return "''";
        String s = value
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
        return "'" + s + "'";
    }

    private void sendItemBarcodeResult(String code, String message) {
        if (webView == null) return;
        String js = "window.hesabiReceiveItemBarcode && window.hesabiReceiveItemBarcode(" + jsQuote(code) + "," + jsQuote(message) + ")";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_EXTERNAL_BARCODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                String code = data.getStringExtra("SCAN_RESULT");
                if (code == null || code.trim().isEmpty()) code = data.getStringExtra("com.google.zxing.client.android.SCAN.SCAN_RESULT");
                if (code == null || code.trim().isEmpty()) code = data.getStringExtra("barcode");
                if (code != null && !code.trim().isEmpty()) {
                    sendItemBarcodeResult(code.trim(), "تم قراءة كود الصنف بالماسح الخارجي");
                } else {
                    sendItemBarcodeResult("", "لم يرجع تطبيق الماسح رقمًا واضحًا.");
                }
            } else {
                sendItemBarcodeResult("", "تم إلغاء مسح كود الصنف.");
            }
            return;
        }

        IntentResult scanResult = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (scanResult != null) {
            if (scanResult.getContents() != null) {
                sendItemBarcodeResult(scanResult.getContents(), "تم قراءة كود الصنف");
            } else {
                sendItemBarcodeResult("", "تم إلغاء مسح الكود");
            }
            return;
        }

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
        public void scanItemBarcodeNative() {
            runOnUiThread(MainActivity.this::startNativeItemBarcodeScanner);
        }

        @JavascriptInterface
        public void scanItemBarcodeExternal() {
            runOnUiThread(MainActivity.this::openExternalScannerOrStore);
        }

        @JavascriptInterface
        public void scanItemBarcodeEmbedded() {
            runOnUiThread(MainActivity.this::startEmbeddedItemBarcodeScanner);
        }

        @JavascriptInterface
        public int getVersionCode() {
            try {
                PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return (int) info.getLongVersionCode();
                return info.versionCode;
            } catch (Exception e) {
                return 1;
            }
        }

        @JavascriptInterface
        public String getVersionName() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0.0";
            }
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                Toast.makeText(this, "اسمح للتطبيق بتثبيت التحديثات من هذا المصدر ثم اضغط تحديث مرة أخرى.", Toast.LENGTH_LONG).show();
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
                startActivity(settingsIntent);
                return;
            }

            latestApkFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hesabi-app-latest.apk");
            if (latestApkFile.exists()) latestApkFile.delete();

            Uri uri = Uri.parse(LATEST_APK_URL);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("تحديث حسابي التجاري");
            request.setDescription("تحميل آخر إصدار من GitHub");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationUri(Uri.fromFile(latestApkFile));
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            latestApkDownloadId = dm.enqueue(request);
            Toast.makeText(this, "بدأ تحميل التحديث. ستظهر شاشة التثبيت تلقائيًا بعد اكتمال التحميل.", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(LATEST_APK_URL)));
        }
    }

    private void openDownloadedApk() {
        try {
            if (latestApkFile == null || !latestApkFile.exists()) {
                Toast.makeText(this, "تم التحميل، لكن لم يتم العثور على ملف التحديث. افتح التنزيلات.", Toast.LENGTH_LONG).show();
                return;
            }
            Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", latestApkFile);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apkUri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(install);
        } catch (Exception e) {
            Toast.makeText(this, "تعذر فتح شاشة التثبيت: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_MEDIA_PERMISSIONS) {
            grantPendingWebPermissionIfReady();
        }
    }
}
