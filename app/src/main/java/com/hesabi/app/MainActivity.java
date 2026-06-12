package com.hesabi.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
import android.content.BroadcastReceiver;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.CookieManager;
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
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.common.InputImage;


import com.google.firebase.FirebaseException;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.PhoneAuthCredential;
import com.google.firebase.auth.PhoneAuthOptions;
import com.google.firebase.auth.PhoneAuthProvider;
import org.json.JSONObject;import java.io.File;
import java.util.Objects;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.Executor;

import java.util.concurrent.TimeUnit;
public class MainActivity extends FragmentActivity {
    private static final String APP_URL = "https://hesabi-app-edc7e.web.app/";
    private static final String LATEST_APK_URL = "https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk";
    private static final int REQ_MEDIA_PERMISSIONS = 7001;
    private static final int REQ_FILE_CHOOSER = 7002;
    private static final int REQ_EXTERNAL_BARCODE = 7003;
    private static final int REQ_ITEM_OCR = 7004;
    private static final String BADGE_CHANNEL_ID = "hesabi_status_badge";
    private static final int BADGE_NOTIFICATION_ID = 7474;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraImageUri;
    private Uri itemOcrImageUri;
    private String lastSessionJson = "{}";
    private long latestApkDownloadId = -1L;
    private File latestApkFile;
    private boolean pendingPostInstallWebRefresh = false;
    private boolean postInstallWebRefreshDone = false;


        private FirebaseAuth firebaseAuth;
    private PhoneAuthProvider.ForceResendingToken nativeSmsResendToken;
    private String nativeSmsVerificationId = "";
    private String nativeSmsPhone = "";
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
        createBadgeNotificationChannel();
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }

        initNativeFirebaseAuth();


        webView = new WebView(this);
        setContentView(webView);
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadsImagesAutomatically(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }

        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        int currentVersionCode = getInstalledVersionCodeSafe();
        int lastVersionCode = getPreferences(Context.MODE_PRIVATE).getInt("last_opened_version_code", -1);
        pendingPostInstallWebRefresh = lastVersionCode != currentVersionCode;
        if (pendingPostInstallWebRefresh) {
            try { webView.clearCache(true); } catch (Exception ignored) {}
            try { webView.clearFormData(); } catch (Exception ignored) {}
            getPreferences(Context.MODE_PRIVATE).edit().putInt("last_opened_version_code", currentVersionCode).apply();
        }

        WebView.setWebContentsDebuggingEnabled(false);
        webView.addJavascriptInterface(new HesabiAndroidBridge(), "HesabiAndroid");
        webView.setWebViewClient(new HesabiWebViewClient());
        webView.setWebChromeClient(new HesabiChromeClient());

        webView.loadUrl(buildAppUrl(currentVersionCode));
    }

    private int getInstalledVersionCodeSafe() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return (int) info.getLongVersionCode();
            return info.versionCode;
        } catch (Exception e) {
            return 1;
        }
    }

    private String buildAppUrl(int versionCode) {
        return APP_URL + "?apkVersion=" + versionCode + "&nativeTs=" + System.currentTimeMillis();
    }

    
    private void initNativeFirebaseAuth() {
        try {
            FirebaseApp.initializeApp(this);
            firebaseAuth = FirebaseAuth.getInstance();
        } catch (Exception e) {
            firebaseAuth = null;
        }
    }

    private String friendlyNativeSmsError(Exception e) {
        String message = e == null ? "" : String.valueOf(e.getMessage());
        String lower = message.toLowerCase(Locale.US);
        if (lower.contains("billing")) return "\u062E\u062F\u0645\u0629 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0647\u0627\u062A\u0641 \u0641\u064A Firebase \u062A\u062D\u062A\u0627\u062C \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0641\u0648\u062A\u0631\u0629 Blaze \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 SMS \u062D\u0642\u064A\u0642\u064A.";
        if (lower.contains("operation") && lower.contains("allowed")) return "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0645\u0641\u0639\u0651\u0644 \u0641\u064A Firebase Authentication.";
        if (lower.contains("too many") || lower.contains("quota")) return "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062B\u064A\u0631\u0629. \u0627\u0646\u062A\u0638\u0631 \u0642\u0644\u064A\u0644\u064B\u0627 \u062B\u0645 \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.";
        if (lower.contains("network") || lower.contains("timeout")) return "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u062F\u0645\u0629 Firebase. \u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u062B\u0645 \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.";
        if (lower.contains("invalid") && lower.contains("phone")) return "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0635\u064A\u063A\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0645\u062B\u0644 +967771749776.";
        if (lower.contains("app") && lower.contains("not authorized")) return "\u062A\u0637\u0628\u064A\u0642 Android \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0641\u064A Firebase. \u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0636\u0627\u0641\u0629 SHA-1 \u0648 SHA-256 \u0644\u0644\u062D\u0632\u0645\u0629 com.hesabi.app \u062B\u0645 \u0646\u0632\u0651\u0644 google-services.json \u0627\u0644\u062C\u062F\u064A\u062F.";
        return message == null || message.trim().isEmpty() ? "\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F SMS \u0645\u0646 Firebase Android Auth." : message;
    }

    private void sendNativeSmsAuthEvent(String type, String phone, String verificationId, String smsCode, String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("type", type == null ? "" : type);
            payload.put("phone", phone == null ? "" : phone);
            payload.put("verificationId", verificationId == null ? "" : verificationId);
            payload.put("smsCode", smsCode == null ? "" : smsCode);
            payload.put("message", message == null ? "" : message);
            String js = "window.hesabiReceiveNativeSmsAuth && window.hesabiReceiveNativeSmsAuth(" + jsQuote(payload.toString()) + ")";
            runOnUiThread(() -> {
                try { if (webView != null) webView.evaluateJavascript(js, null); } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }

    private void startNativeSmsCode(String phone) {
        runOnUiThread(() -> {
            try {
                if (firebaseAuth == null) initNativeFirebaseAuth();
                if (firebaseAuth == null) {
                    sendNativeSmsAuthEvent("failed", phone, "", "", "Firebase Android Auth \u063A\u064A\u0631 \u062C\u0627\u0647\u0632. \u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F google-services.json \u0627\u0644\u0635\u062D\u064A\u062D \u062B\u0645 \u0627\u0628\u0646\u0650 APK \u062C\u062F\u064A\u062F.");
                    return;
                }
                String safePhone = phone == null ? "" : phone.trim();
                if (!safePhone.startsWith("+") || safePhone.length() < 8) {
                    sendNativeSmsAuthEvent("failed", safePhone, "", "", "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u0627\u0644\u0635\u064A\u063A\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0645\u062B\u0644 +967771749776.");
                    return;
                }
                nativeSmsPhone = safePhone;
                nativeSmsVerificationId = "";
                sendNativeSmsAuthEvent("sending", safePhone, "", "", "\u062C\u0627\u0631\u064A \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 Firebase Android Auth...");
                PhoneAuthOptions options = PhoneAuthOptions.newBuilder(firebaseAuth)
                        .setPhoneNumber(safePhone)
                        .setTimeout(60L, TimeUnit.SECONDS)
                        .setActivity(MainActivity.this)
                        .setCallbacks(new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                            @Override
                            public void onVerificationCompleted(@NonNull PhoneAuthCredential credential) {
                                String smsCode = "";
                                try { smsCode = credential.getSmsCode(); } catch (Exception ignored) {}
                                sendNativeSmsAuthEvent("autoCompleted", nativeSmsPhone, nativeSmsVerificationId, smsCode, smsCode == null || smsCode.isEmpty() ? "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0645\u0646 Android. \u0625\u0630\u0627 \u0644\u0645 \u064A\u0643\u062A\u0645\u0644 \u0627\u0644\u062F\u062E\u0648\u0644\u060C \u0623\u062F\u062E\u0644 \u0627\u0644\u0643\u0648\u062F \u064A\u062F\u0648\u064A\u064B\u0627." : "\u062A\u0645 \u0627\u0644\u062A\u0642\u0627\u0637 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627.");
                            }

                            @Override
                            public void onVerificationFailed(@NonNull FirebaseException e) {
                                sendNativeSmsAuthEvent("failed", nativeSmsPhone, "", "", friendlyNativeSmsError(e));
                            }

                            @Override
                            public void onCodeSent(@NonNull String verificationId, @NonNull PhoneAuthProvider.ForceResendingToken token) {
                                nativeSmsVerificationId = verificationId;
                                nativeSmsResendToken = token;
                                sendNativeSmsAuthEvent("codeSent", nativeSmsPhone, verificationId, "", "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 " + nativeSmsPhone);
                            }
                        })
                        .build();
                PhoneAuthProvider.verifyPhoneNumber(options);
            } catch (Exception e) {
                sendNativeSmsAuthEvent("failed", phone, "", "", friendlyNativeSmsError(e));
            }
        });
    }
private class HesabiWebViewClient extends WebViewClient {
        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            runPostInstallWebRefreshIfNeeded();
        }
    }

    private void runPostInstallWebRefreshIfNeeded() {
        if (!pendingPostInstallWebRefresh || postInstallWebRefreshDone || webView == null) return;
        postInstallWebRefreshDone = true;
        String js = "(async function(){"
                + "try{if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister().catch(()=>{})));}}catch(e){}"
                + "try{if('caches' in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k).catch(()=>{})));}}catch(e){}"
                + "try{sessionStorage.setItem('hesabi_native_apk_refresh', String(Date.now()));}catch(e){}"
                + "setTimeout(function(){ location.replace('" + APP_URL + "?apkVersion=" + getInstalledVersionCodeSafe() + "&nativeRefresh=" + System.currentTimeMillis() + "'); }, 250);"
                + "})();";
        try { webView.evaluateJavascript(js, null); } catch (Exception ignored) {}
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

            String[] acceptTypes = params != null ? params.getAcceptTypes() : new String[0];
            boolean wantsImage = false;
            boolean wantsAudio = false;
            boolean wantsExcel = false;
            if (acceptTypes != null) {
                for (String a : acceptTypes) {
                    if (a == null) continue;
                    String t = a.toLowerCase(Locale.US);
                    if (t.contains("image") || t.contains(".jpg") || t.contains(".png")) wantsImage = true;
                    if (t.contains("audio") || t.contains(".mp3") || t.contains(".m4a")) wantsAudio = true;
                    if (t.contains("sheet") || t.contains("excel") || t.contains(".xlsx") || t.contains(".xls") || t.contains("csv")) wantsExcel = true;
                }
            }

            Intent fileIntent = new Intent(Intent.ACTION_GET_CONTENT);
            fileIntent.addCategory(Intent.CATEGORY_OPENABLE);
            fileIntent.setType("*/*");

            if (wantsExcel) {
                fileIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "application/vnd.ms-excel",
                        "text/csv",
                        "application/octet-stream",
                        "*/*"
                });
            } else if (wantsImage && !wantsAudio) {
                fileIntent.setType("image/*");
            } else if (wantsAudio && !wantsImage) {
                fileIntent.setType("audio/*");
            } else {
                fileIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "audio/*", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"});
            }

            Intent cameraIntent = null;
            if (wantsImage || (!wantsExcel && !wantsAudio)) {
                cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                try {
                    File photoFile = createCameraImageFile();
                    cameraImageUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", photoFile);
                    cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
                    cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                } catch (Exception e) {
                    cameraIntent = null;
                }
            }

            String title = wantsExcel ? "\u0627\u062E\u062A\u0631 \u0645\u0644\u0641 Excel \u0644\u0644\u0623\u0635\u0646\u0627\u0641" : "\u0627\u062E\u062A\u0631 \u0645\u0644\u0641";
            Intent chooser = Intent.createChooser(fileIntent, title);
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
        // Use the embedded scanner inside this APK by default.
        // External scanner apps are optional and only work if they support the ZXing scan intent.
        startEmbeddedItemBarcodeScanner();
    }

    private boolean startExternalItemBarcodeScanner() {
        try {
            Intent intent = new Intent("com.google.zxing.client.android.SCAN");
            intent.putExtra("SCAN_MODE", "ONE_D_MODE");
            intent.putExtra("SCAN_FORMATS", "CODE_128,CODE_39,CODE_93,EAN_13,EAN_8,UPC_A,UPC_E,ITF,CODABAR,QR_CODE");
            intent.putExtra("SAVE_HISTORY", false);
            intent.putExtra("BEEP_ENABLED", true);
            intent.putExtra("ORIENTATION_LOCKED", false);
            intent.putExtra("PROMPT_MESSAGE", "\u0642\u0631\u0651\u0628 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062F \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0641\u0642\u0637 \u062F\u0627\u062E\u0644 \u0627\u0644\u0625\u0637\u0627\u0631. \u0625\u0630\u0627 \u0638\u0647\u0631\u062A \u0639\u062F\u0629 \u0623\u0643\u0648\u0627\u062F\u060C \u063A\u0637\u0651\u0650 \u0627\u0644\u0623\u0643\u0648\u0627\u062F \u0627\u0644\u0623\u062E\u0631\u0649.");
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
                Toast.makeText(this, "\u0627\u0633\u0645\u062D \u0628\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627 \u062B\u0645 \u062D\u0627\u0648\u0644 \u0645\u0633\u062D \u0627\u0644\u0643\u0648\u062F \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.", Toast.LENGTH_LONG).show();
                return;
            }
            IntentIntegrator integrator = new IntentIntegrator(this);
            integrator.setPrompt("\u0648\u062C\u0651\u0647 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627 \u0646\u062D\u0648 \u0628\u0627\u0631\u0643\u0648\u062F \u0627\u0644\u0635\u0646\u0641");
            integrator.setBeepEnabled(true);
            integrator.setBarcodeImageEnabled(false);
            integrator.setOrientationLocked(false);
            integrator.setDesiredBarcodeFormats(IntentIntegrator.ALL_CODE_TYPES);
            integrator.initiateScan();
        } catch (Exception e) {
            sendItemBarcodeResult("", "\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0645\u0627\u0633\u062D \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062F \u0627\u0644\u0623\u0635\u0644\u064A: " + e.getMessage());
        }
    }

    private void openExternalScannerOrStore() {
        // Android does not have one standard barcode-scan intent supported by all scanner apps.
        // Only ZXing-compatible scanner apps respond to com.google.zxing.client.android.SCAN.
        // If no compatible app is found, fall back immediately to the embedded scanner inside this APK.
        try {
            if (startExternalItemBarcodeScanner()) return;
        } catch (Exception ignored) {}
        Toast.makeText(this, "\u0644\u0627 \u064A\u0648\u062C\u062F \u062A\u0637\u0628\u064A\u0642 \u0645\u0627\u0633\u062D \u062E\u0627\u0631\u062C\u064A \u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639 ZXing. \u0633\u064A\u062A\u0645 \u0641\u062A\u062D \u0627\u0644\u0645\u0627\u0633\u062D \u0627\u0644\u062F\u0627\u062E\u0644\u064A.", Toast.LENGTH_LONG).show();
        startEmbeddedItemBarcodeScanner();
    }


    private void startItemOcrCamera() {
        try {
            if (!hasCameraPermission()) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_MEDIA_PERMISSIONS);
                Toast.makeText(this, "\u0627\u0633\u0645\u062D \u0628\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627 \u062B\u0645 \u062D\u0627\u0648\u0644 \u0642\u0631\u0627\u0621\u0629 \u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.", Toast.LENGTH_LONG).show();
                return;
            }
            File photoFile = createCameraImageFile();
            itemOcrImageUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoFile);
            Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, itemOcrImageUri);
            cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(cameraIntent, REQ_ITEM_OCR);
        } catch (Exception e) {
            sendItemOcrResult("", "\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0643\u0627\u0645\u064A\u0631\u0627 OCR: " + e.getMessage());
        }
    }

    private void processItemOcrImage(Uri uri) {
        try {
            if (uri == null) {
                sendItemOcrResult("", "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u0642\u0627\u0637 \u0635\u0648\u0631\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629.");
                return;
            }
            InputImage image = InputImage.fromFilePath(this, uri);
            TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            recognizer.process(image)
                    .addOnSuccessListener(text -> sendItemOcrResult(text == null ? "" : text.getText(), "\u062A\u0645\u062A \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0646\u0635 \u0645\u0646 \u0627\u0644\u0635\u0648\u0631\u0629"))
                    .addOnFailureListener(e -> sendItemOcrResult("", "\u0641\u0634\u0644 OCR: " + e.getMessage()));
        } catch (Exception e) {
            sendItemOcrResult("", "\u062A\u0639\u0630\u0631 \u0645\u0639\u0627\u0644\u062C\u0629 \u0635\u0648\u0631\u0629 OCR: " + e.getMessage());
        }
    }

    private void sendItemOcrResult(String text, String message) {
        if (webView == null) return;
        String js = "window.hesabiReceiveItemOcr && window.hesabiReceiveItemOcr(" + jsQuote(text) + "," + jsQuote(message) + ")";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }


    private static String jsQuote(String value) {
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
        if (requestCode == REQ_ITEM_OCR) {
            if (resultCode == Activity.RESULT_OK) {
                processItemOcrImage(itemOcrImageUri);
            } else {
                sendItemOcrResult("", "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0642\u0631\u0627\u0621\u0629 \u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641.");
            }
            return;
        }

        if (requestCode == REQ_EXTERNAL_BARCODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                String code = data.getStringExtra("SCAN_RESULT");
                if (code == null || code.trim().isEmpty()) code = data.getStringExtra("com.google.zxing.client.android.SCAN.SCAN_RESULT");
                if (code == null || code.trim().isEmpty()) code = data.getStringExtra("barcode");
                if (code != null && !code.trim().isEmpty()) {
                    sendItemBarcodeResult(code.trim(), "\u062A\u0645 \u0642\u0631\u0627\u0621\u0629 \u0643\u0648\u062F \u0627\u0644\u0635\u0646\u0641 \u0628\u0627\u0644\u0645\u0627\u0633\u062D \u0627\u0644\u062E\u0627\u0631\u062C\u064A");
                } else {
                    sendItemBarcodeResult("", "\u0644\u0645 \u064A\u0631\u062C\u0639 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0645\u0627\u0633\u062D \u0631\u0642\u0645\u064B\u0627 \u0648\u0627\u0636\u062D\u064B\u0627.");
                }
            } else {
                sendItemBarcodeResult("", "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0645\u0633\u062D \u0643\u0648\u062F \u0627\u0644\u0635\u0646\u0641.");
            }
            return;
        }

        IntentResult scanResult = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (scanResult != null) {
            if (scanResult.getContents() != null) {
                sendItemBarcodeResult(scanResult.getContents(), "\u062A\u0645 \u0642\u0631\u0627\u0621\u0629 \u0643\u0648\u062F \u0627\u0644\u0635\u0646\u0641");
            } else {
                sendItemBarcodeResult("", "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0645\u0633\u062D \u0627\u0644\u0643\u0648\u062F");
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
        public void scanItemOcrNative() {
            runOnUiThread(MainActivity.this::startItemOcrCamera);
        }
        @JavascriptInterface
        public boolean hasNativePhoneAuth() {
            return firebaseAuth != null;
        }

        @JavascriptInterface
        public void sendNativeSmsCode(String phone) {
            startNativeSmsCode(phone);
        }

        @JavascriptInterface
        public String getNativeSmsVerificationId() {
            return nativeSmsVerificationId == null ? "" : nativeSmsVerificationId;
        }


        @JavascriptInterface
        public void openAppInExternalBrowser() {
            runOnUiThread(() -> {
                try {
                    Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL));
                    startActivity(browser);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0627\u0644\u062E\u0627\u0631\u062C\u064A: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }
        @JavascriptInterface
        public int getVersionCode() {
            return getInstalledVersionCodeSafe();
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
        public void clearWebCacheForUpdate() {
            runOnUiThread(() -> {
                try { webView.clearCache(true); } catch (Exception ignored) {}
                try {
                    webView.evaluateJavascript("(async function(){try{if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister().catch(()=>{})));}}catch(e){} try{if('caches' in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k).catch(()=>{})));}}catch(e){}})();", null);
                } catch (Exception ignored) {}
                Toast.makeText(MainActivity.this, "\u062A\u0645 \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0648\u0627\u062C\u0647\u0627\u062A \u0644\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0643\u0627\u0645\u0644.", Toast.LENGTH_SHORT).show();
            });
        }

        @JavascriptInterface
        public void updateLauncherBadge(int count, String detail) {
            runOnUiThread(() -> updateLauncherBadgeNative(count, detail));
        }

        @JavascriptInterface
        public void openLatestApk() {
            runOnUiThread(() -> downloadApkFromUrl(LATEST_APK_URL));
        }

        @JavascriptInterface
        public void openApkUrl(String url) {
            final String safeUrl = (url == null || url.trim().isEmpty()) ? LATEST_APK_URL : url.trim();
            runOnUiThread(() -> downloadApkFromUrl(safeUrl));
        }
    }


    private void createBadgeNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    BADGE_CHANNEL_ID,
                    "\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u062D\u0633\u0627\u0628\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("\u0639\u062F\u0651\u0627\u062F \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0648\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0639\u0644\u0649 \u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u062A\u0637\u0628\u064A\u0642");
            channel.setShowBadge(true);
            channel.enableVibration(false);
            channel.setSound(null, null);
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void updateLauncherBadgeNative(int count, String detail) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            int safeCount = Math.max(0, Math.min(count, 999));
            if (safeCount <= 0) {
                manager.cancel(BADGE_NOTIFICATION_ID);
                return;
            }
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent == null) launchIntent = new Intent(this, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getActivity(this, 0, launchIntent, flags);
            String text = (detail == null || detail.trim().isEmpty()) ? "\u0644\u062F\u064A\u0643 \u0645\u0631\u0627\u062C\u0639\u0627\u062A \u062C\u062F\u064A\u062F\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642" : detail;
            NotificationCompat.Builder b = new NotificationCompat.Builder(this, BADGE_CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_hesabi_notification)
                    .setContentTitle("\u062D\u0633\u0627\u0628\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A")
                    .setContentText(text)
                    .setNumber(safeCount)
                    .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_STATUS)
                    .setOnlyAlertOnce(true)
                    .setSilent(true)
                    .setAutoCancel(false)
                    .setContentIntent(pi);
            manager.notify(BADGE_NOTIFICATION_ID, b.build());
        } catch (Exception ignored) {}
    }

    private void startBiometric(String reason, String token) {
        int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        BiometricManager manager = BiometricManager.from(this);
        int status = manager.canAuthenticate(authenticators);
        if (status != BiometricManager.BIOMETRIC_SUCCESS) {
            sendBiometricResult(false, "\u0627\u0644\u0628\u0635\u0645\u0629 \u0623\u0648 \u0642\u0641\u0644 \u0627\u0644\u062C\u0647\u0627\u0632 \u063A\u064A\u0631 \u062C\u0627\u0647\u0632. \u0641\u0639\u0651\u0644 \u0628\u0635\u0645\u0629/\u0648\u062C\u0647 \u0623\u0648 \u0642\u0641\u0644 \u0634\u0627\u0634\u0629 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0647\u0627\u062A\u0641.", token);
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt prompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                sendBiometricResult(true, "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642", token);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                sendBiometricResult(false, errString.toString(), token);
            }

            @Override
            public void onAuthenticationFailed() {
                Toast.makeText(MainActivity.this, "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649", Toast.LENGTH_SHORT).show();
            }
        });

        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("\u062D\u0633\u0627\u0628\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A")
                .setSubtitle(reason == null || reason.trim().isEmpty() ? "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0647\u0648\u064A\u062A\u0643" : reason)
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

    private void downloadApkFromUrl(String apkUrl) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                Toast.makeText(this, "\u0627\u0633\u0645\u062D \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0628\u062A\u062B\u0628\u064A\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0635\u062F\u0631 \u062B\u0645 \u0627\u0636\u063A\u0637 \u062A\u062D\u062F\u064A\u062B \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.", Toast.LENGTH_LONG).show();
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
                startActivity(settingsIntent);
                return;
            }

            latestApkFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hesabi-app-latest-" + System.currentTimeMillis() + ".apk");
            if (latestApkFile.exists()) latestApkFile.delete();

            Uri uri = Uri.parse(apkUrl == null || apkUrl.trim().isEmpty() ? LATEST_APK_URL : apkUrl.trim());
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("\u062A\u062D\u062F\u064A\u062B \u062D\u0633\u0627\u0628\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A");
            request.setDescription("\u062A\u062D\u0645\u064A\u0644 \u0622\u062E\u0631 \u0625\u0635\u062F\u0627\u0631 \u0645\u062A\u0648\u0641\u0631 \u0645\u0646 \u0627\u0644\u062A\u0637\u0628\u064A\u0642");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setMimeType("application/vnd.android.package-archive");
            request.addRequestHeader("Cache-Control", "no-cache");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationUri(Uri.fromFile(latestApkFile));
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            latestApkDownloadId = dm.enqueue(request);
            Toast.makeText(this, "\u0628\u062F\u0623 \u062A\u062D\u0645\u064A\u0644 \u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B. \u0633\u062A\u0638\u0647\u0631 \u0634\u0627\u0634\u0629 \u0627\u0644\u062A\u062B\u0628\u064A\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0628\u0639\u062F \u0627\u0643\u062A\u0645\u0627\u0644 \u0627\u0644\u062A\u062D\u0645\u064A\u0644.", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl == null ? LATEST_APK_URL : apkUrl))); }
            catch (Exception ignored) { Toast.makeText(this, "\u062A\u0639\u0630\u0631 \u0628\u062F\u0621 \u062A\u0646\u0632\u064A\u0644 \u0627\u0644\u062A\u062D\u062F\u064A\u062B: " + e.getMessage(), Toast.LENGTH_LONG).show(); }
        }
    }

    private boolean isLatestDownloadSuccessful() {
        try {
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Query q = new DownloadManager.Query();
            q.setFilterById(latestApkDownloadId);
            Cursor c = dm.query(q);
            if (c == null) return latestApkFile != null && latestApkFile.exists();
            try {
                if (!c.moveToFirst()) return latestApkFile != null && latestApkFile.exists();
                int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                if (status == DownloadManager.STATUS_SUCCESSFUL) return true;
                if (status == DownloadManager.STATUS_FAILED) {
                    Toast.makeText(this, "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u062D\u062F\u064A\u062B. \u0627\u0641\u062D\u0635 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0648\u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.", Toast.LENGTH_LONG).show();
                    return false;
                }
            } finally { c.close(); }
        } catch (Exception ignored) {}
        return latestApkFile != null && latestApkFile.exists();
    }

    private void openDownloadedApk() {
        try {
            if (!isLatestDownloadSuccessful()) return;
            if (latestApkFile == null || !latestApkFile.exists()) {
                Toast.makeText(this, "\u062A\u0645 \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u060C \u0644\u0643\u0646 \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u062A\u062D\u062F\u064A\u062B. \u0627\u0641\u062A\u062D \u0627\u0644\u062A\u0646\u0632\u064A\u0644\u0627\u062A.", Toast.LENGTH_LONG).show();
                return;
            }
            Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", latestApkFile);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apkUri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(install);
        } catch (Exception e) {
            Toast.makeText(this, "\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0634\u0627\u0634\u0629 \u0627\u0644\u062A\u062B\u0628\u064A\u062A: " + e.getMessage(), Toast.LENGTH_LONG).show();
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
