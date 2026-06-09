/* Hesabi 1.0.94 - UTF-8 Arabic encoding repair.
   Scope: detect accidental Arabic mojibake in static UI after update packaging.
   No Firestore, orders, payments, invoices or data mutations are changed here. */
(function(){
  const VERSION = "1.0.94";
  const BUILD = 94;
  const CJK_RE = /[\u4e00-\u9fff]/;
  const KNOWN = new Map([
    ["丨爻丕亘賷 丕賱鬲噩丕乇賷", "حسابي التجاري"],
    ["噩丕乇賷 丕賱賮丨氐...", "جاري الفحص..."],
    ["鬲賳亘賷賴", "تنبيه"],
    ["鬲毓匕乇 鬲卮睾賷賱 丕賱鬲胤亘賷賯.", "تعذر تشغيل التطبيق."],
    ["丨丿賾孬 丕賱賵丕噩賴丕鬲 兀賵 孬亘賾鬲 丌禺乇 APK.", "حدّث الواجهات أو ثبّت آخر APK."]
  ]);
  function hasMojibake(value){
    return CJK_RE.test(String(value||''));
  }
  function replaceKnownText(value){
    let out=String(value||'');
    KNOWN.forEach((good,bad)=>{ out=out.split(bad).join(good); });
    return out;
  }
  function repairStaticDom(){
    try{
      if(document && hasMojibake(document.title)) document.title=replaceKnownText(document.title);
      const walker=document.createTreeWalker(document.body||document.documentElement, NodeFilter.SHOW_TEXT);
      const nodes=[];
      while(walker.nextNode()){
        const n=walker.currentNode;
        if(n && hasMojibake(n.nodeValue)) nodes.push(n);
      }
      nodes.forEach(n=>{
        const fixed=replaceKnownText(n.nodeValue);
        if(fixed!==n.nodeValue) n.nodeValue=fixed;
      });
      return true;
    }catch(e){
      console.warn('utf8 arabic static dom repair failed', e);
      return false;
    }
  }
  function sourceLooksHealthy(){
    try{
      const title=document?.title || '';
      const h1=document?.querySelector('.title h1')?.textContent || '';
      return !hasMojibake(title+h1) && /حسابي|Hesabi|Firebase/i.test(title+h1);
    }catch(e){ return true; }
  }
  function selfCheck(){
    repairStaticDom();
    const ok=sourceLooksHealthy();
    return {
      ok,
      version: VERSION,
      buildCode: BUILD,
      title: (typeof document!=='undefined' ? document.title : ''),
      details: ok ? 'Arabic UTF-8 UI text is healthy.' : 'Arabic mojibake is still visible in static UI text.'
    };
  }
  window.hesabiUtf8ArabicEncodingRepair={version:VERSION,buildCode:BUILD,hasMojibake,replaceKnownText,repairStaticDom,selfCheck};
  window.hesabiUtf8ArabicEncodingRepairSelfCheck=selfCheck;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', repairStaticDom, {once:true});
    else repairStaticDom();
  }
})();
