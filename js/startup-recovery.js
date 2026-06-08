(function(){
  window.hesabiHideDialog=function(){var b=document.getElementById('hesabiDialogBackdrop'); if(b)b.classList.add('hidden');};
  window.hesabiShowNativeRecovery=function(message){
    var b=document.getElementById('hesabiDialogBackdrop'), body=document.getElementById('hesabiDialogBody'), title=document.getElementById('hesabiDialogTitle'), icon=document.getElementById('hesabiDialogIcon'), actions=document.getElementById('hesabiDialogActions');
    if(!b||!body||!title||!actions){var m=document.getElementById('msg'); if(m)m.innerHTML='<div class="notice error">'+String(message||'حدث خطأ في تشغيل التطبيق')+'</div>'; return;}
    b.className='hesabi-dialog-backdrop dialog-warn'; title.textContent='التطبيق يحتاج تحديث أو تنظيف'; icon.textContent='🧹'; body.textContent=message||'حدث خطأ في تشغيل التطبيق.';
    actions.className='hesabi-dialog-actions three';
    actions.innerHTML='<button class="btn ok" id="dlgReloadBtn" type="button">تحديث الواجهات</button><button class="btn warn" id="dlgClearBtn" type="button">تنظيف الكاش</button><button class="btn secondary" id="dlgApkBtn" type="button">تحديث APK</button>';
    document.getElementById('dlgReloadBtn').onclick=async function(){try{await (window.refreshWebUiNow?window.refreshWebUiNow():Promise.resolve());}catch(e){} try{location.replace(location.pathname+'?v='+Date.now());}catch(e){location.reload();}};
    document.getElementById('dlgClearBtn').onclick=async function(){try{await (window.refreshWebUiNow?window.refreshWebUiNow():Promise.resolve());}catch(e){} try{location.replace(location.pathname+'?clean='+Date.now());}catch(e){location.reload();}};
    var apkBtn=document.getElementById('dlgApkBtn'); if(apkBtn) apkBtn.onclick=function(){try{ if(window.downloadApkUpdate) window.downloadApkUpdate(); else location.href='https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk'; }catch(e){location.href='https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk';}};
  };
  function setBadge(text, cls){var b=document.getElementById('netBadge'); if(b){b.className='badge '+(cls||''); b.textContent=text;}}
  setTimeout(function(){
    var main=document.getElementById('main'), auth=document.getElementById('authSetup'), role=document.getElementById('roleSetup'), profile=document.getElementById('profileSetup'), lock=document.getElementById('appLockScreen');
    var anyVisible = (main && !main.classList.contains('hidden')) || (auth && !auth.classList.contains('hidden')) || (role && !role.classList.contains('hidden')) || (profile && !profile.classList.contains('hidden')) || (lock && !lock.classList.contains('hidden'));
    if(!anyVisible){
      var rt=window.__hesabiRuntime||{};
      var loadingPhases=['starting','loading-manifest','loading-parts','importing-runtime','running-self-check'];
      if(loadingPhases.indexOf(rt.phase)>=0){
        setBadge('جاري تحميل ملفات التطبيق...', 'online');
        setTimeout(function(){
          var main2=document.getElementById('main'), auth2=document.getElementById('authSetup'), role2=document.getElementById('roleSetup'), profile2=document.getElementById('profileSetup'), lock2=document.getElementById('appLockScreen');
          var visible2=(main2 && !main2.classList.contains('hidden')) || (auth2 && !auth2.classList.contains('hidden')) || (role2 && !role2.classList.contains('hidden')) || (profile2 && !profile2.classList.contains('hidden')) || (lock2 && !lock2.classList.contains('hidden'));
          if(!visible2 && (!window.__hesabiRuntime || window.__hesabiRuntime.phase==='failed')){
            window.hesabiShowNativeRecovery && window.hesabiShowNativeRecovery('لم يكتمل تشغيل التطبيق بعد تحميل ملفات الواجهة. حدّث الواجهات أو ثبّت آخر APK.');
          }
        },12000);
        return;
      }
      setBadge(navigator.onLine?'متصل - جاري تحميل Firebase':'غير متصل', navigator.onLine?'online':'offline');
      window.hesabiShowNativeRecovery && window.hesabiShowNativeRecovery('لم يكتمل تشغيل التطبيق تلقائيًا. اختر تحديث الواجهات أو تنظيف الكاش، وإذا استمرت المشكلة حدّث APK إلى آخر نسخة.');
    }
  },25000);
})();

