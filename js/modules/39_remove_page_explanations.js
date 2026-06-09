/* === 1.0.100 Remove Page Explanations / Clean Page Headers ===
   الهدف: إزالة الشروحات والنصوص التوضيحية العامة من الصفحات، مع إبقاء العناوين والجداول والأزرار والبيانات.
   لا يغير Firestore أو العمليات الحساسة. */
(function(){
  const HIDE_SELECTORS = [
    '.page-workspace-head .page-help',
    '.page-workspace-head .phase-note',
    '.phase-note',
    '.page-help',
    '.safe-placeholder',
    '.mini-help',
    '.form-help',
    '.help-text',
    '.page-description',
    '.page-caption',
    '.setup-help',
    '.workflow-help'
  ];

  function stripPageExplanations(root){
    const base = root && root.querySelectorAll ? root : document;
    try{
      HIDE_SELECTORS.forEach(sel=>{
        base.querySelectorAll(sel).forEach(el=>{
          el.setAttribute('hidden','hidden');
          el.style.display='none';
        });
      });
      // أكثر الشروحات العامة في التطبيق تأتي كفقرة muted مباشرة تحت البطاقة.
      base.querySelectorAll('.card > p.muted, section.card > p.muted').forEach(el=>{
        el.setAttribute('hidden','hidden');
        el.style.display='none';
      });
      // لا نلمس .muted داخل الجداول أو الصفوف لأنها غالبًا بيانات فرعية مثل الوحدة/الهاتف/التصنيف.
    }catch(e){ console.warn('strip page explanations failed', e); }
  }

  window.hesabiRemovePageExplanations = {
    strip: stripPageExplanations,
    selectors: HIDE_SELECTORS.slice()
  };

  const oldPageHead = (typeof pageHead === 'function') ? pageHead : null;
  pageHead = function(title){
    return `<div class="card page-workspace-head clean-page-head"><h2>${typeof esc==='function'?esc(title):String(title||'')}</h2></div>`;
  };

  function afterUiUpdate(){
    stripPageExplanations(document);
  }

  if(typeof render === 'function'){
    const baseRender = render;
    render = function(){
      const out = baseRender.apply(this, arguments);
      setTimeout(afterUiUpdate, 0);
      setTimeout(afterUiUpdate, 80);
      return out;
    };
  }

  if(typeof show === 'function'){
    const baseShow = show;
    show = function(){
      const out = baseShow.apply(this, arguments);
      setTimeout(afterUiUpdate, 0);
      setTimeout(afterUiUpdate, 120);
      return out;
    };
  }

  if(typeof bindPageTabs === 'function'){
    const baseBindPageTabs = bindPageTabs;
    bindPageTabs = function(){
      const out = baseBindPageTabs.apply(this, arguments);
      setTimeout(afterUiUpdate, 0);
      return out;
    };
  }

  if(typeof MutationObserver !== 'undefined'){
    try{
      const obs = new MutationObserver(()=>stripPageExplanations(document));
      obs.observe(document.documentElement, {childList:true, subtree:true});
      window.__hesabiRemovePageExplanationsObserver = obs;
    }catch(e){}
  }

  setTimeout(afterUiUpdate, 0);
  setTimeout(afterUiUpdate, 250);
  setTimeout(afterUiUpdate, 1000);

  window.hesabiRemovePageExplanationsSelfCheck = function(){
    const sample = pageHead('اختبار', 'شرح يجب ألا يظهر');
    const ok = /اختبار/.test(sample) && !/شرح يجب ألا يظهر|page-help|phase-note|نظام موحد/.test(sample);
    return {ok, module:'remove_page_explanations', version:'1.0.100', wrapped:{pageHead: typeof pageHead==='function', render: typeof render==='function', show: typeof show==='function'}};
  };
})();
