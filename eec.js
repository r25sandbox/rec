// eec.js — Equity Extraction Calculator
// v1.1.1 | 2026-04-18 | Save card: replace RIC cash flow/CoC with rent/mo (purchase metrics
//                        are irrelevant in refi context; rent is the meaningful preview field)
//                        Commit: fix save card — show rent not RIC mcf/CoC
// v1.1.0 | 2026-04-18 | 3-col compact inputs; remove slider breakdown section;
//                        load from RIC localStorage saves (rc_saves); applyInputStyles()
//                        Commit: compact inputs, rm slider breakdown, load RIC saves
// v1.0.0 | 2026-04-18 | Initial build

(function(){

  // ── Helpers ───────────────────────────────────────────────────────────────
  function gi(id){ return document.getElementById(id); }
  function gv(id){ var el=gi(id); return el ? parseFloat(el.value)||0 : 0; }
  function gs(id){ var el=gi(id); return el ? el.value : '30fixed'; }
  function fm(n){ return '$'+Math.round(Math.abs(n)).toLocaleString(); }
  function fms(n){ return (n<0?'−':'+')+fm(n); }
  function setTxt(id,val){ var el=gi(id); if(el) el.innerHTML=val; }
  function setColor(id,col){ var el=gi(id); if(el) el.color=col; }

  // Apply styles to all class="ei" inputs/selects (keeps embed HTML lean)
  function applyInputStyles(){
    var s='width:100%;margin-top:4px;padding:6px 7px;background:#0d1b2e;color:#ffffff;'+
          'border:1px solid #2a4a6b;border-radius:6px;font-size:12px;font-family:inherit;box-sizing:border-box';
    var els=document.getElementsByClassName('ei');
    for(var i=0;i<els.length;i++) els[i].setAttribute('style',s);
  }

  // ── Mortgage payment calculator ───────────────────────────────────────────
  function calcPmt(loanAmt, annualRate, loanType){
    if(loanAmt<=0) return 0;
    var mr=annualRate/100/12;
    if(loanType==='30io') return loanAmt*mr;
    if(mr<=0) return loanAmt/360;
    var np=360;
    return loanAmt*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);
  }

  // ── Core run function ─────────────────────────────────────────────────────
  function run(){
    var balance  = gv('balance')  || 320000;
    var propval  = gv('propval')  || 450000;
    var refirate = gv('refirate') || 6.75;
    var loanType = gs('loantype') || '30fixed';
    var rent     = gv('rent')     || 2400;
    var vacancy  = gv('vacancy')  || 5;
    var taxes    = gv('taxes')    || 3600;
    var ins      = gv('ins')      || 1800;
    var hoa      = gv('hoa')      || 150;
    var mgmt     = gv('mgmt')     || 0;
    var maint    = gv('maint')    || 1200;

    var currentEquity = propval - balance;
    var ltv = propval>0 ? (balance/propval*100) : 0;
    var effRent  = rent*(1-vacancy/100);
    var taxIns   = (taxes+ins)/12;
    var hoaMgmtMaint = hoa+mgmt+maint/12;
    var fixedExp = taxIns+hoaMgmtMaint;
    var incomeAvail = effRent-fixedExp;

    var maxLoanLTV = propval*0.80;
    var mr=refirate/100/12;
    var maxLoanCF;
    if(incomeAvail<=0){
      maxLoanCF=0;
    } else if(loanType==='30io'){
      maxLoanCF = mr>0 ? incomeAvail/mr : 0;
    } else {
      var np=360;
      var ppd = mr>0 ? (mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1) : 1/360;
      maxLoanCF = incomeAvail/ppd;
    }

    var maxNewLoan = Math.max(Math.min(maxLoanLTV, maxLoanCF), 0);
    var maxCashOut = Math.max(maxNewLoan-balance, 0);
    var newPmt = calcPmt(maxNewLoan, refirate, loanType);
    var newCF  = effRent-fixedExp-newPmt;

    // Metric cards
    setTxt('out-equity', fm(currentEquity));
    setColor('out-equity', currentEquity>=0?'#E8C96A':'#e74c3c');
    setTxt('out-ltv', Math.round(ltv)+'% LTV');
    setTxt('out-maxco', fm(maxCashOut));
    setColor('out-maxco', maxCashOut>0?'#2ecc71':'#e74c3c');
    var binding = (maxLoanCF<=maxLoanLTV&&maxLoanCF>=0) ? 'cash flow limit' : '80% LTV cap';
    if(maxCashOut===0) binding='no cash-out available';
    setTxt('out-maxco-sub', binding);
    setTxt('out-newpmt', fm(newPmt));
    setTxt('out-newpmt-sub', (loanType==='30io'?'interest only':'30yr fixed')+' refi');
    setTxt('out-cf', fms(newCF));
    setColor('out-cf', newCF>=0?'#2ecc71':'#e74c3c');

    // Monthly breakdown
    setTxt('br-rent', fm(effRent));
    setTxt('br-pmt',  '−'+fm(newPmt));
    setTxt('br-ti',   '−'+fm(taxIns));
    setTxt('br-hm',   '−'+fm(hoaMgmtMaint));
    setTxt('br-cf',   fms(newCF));
    setColor('br-cf', newCF>=0?'#2ecc71':'#e74c3c');

    // Update slider bounds
    var sliderEl=gi('slider');
    if(sliderEl){
      var sliderMax=Math.max(Math.ceil(maxCashOut/1000)*1000,10000);
      sliderEl.max=sliderMax;
      if(parseFloat(sliderEl.value)>sliderMax) sliderEl.value=sliderMax;
    }
    window._eecState={effRent:effRent,fixedExp:fixedExp,refirate:refirate,
      loanType:loanType,balance:balance,maxCashOut:maxCashOut,propval:propval};
    updateSlider();
  }

  // ── Slider ────────────────────────────────────────────────────────────────
  function updateSlider(){
    var s=window._eecState||{};
    var sliderEl=gi('slider');
    if(!sliderEl) return;
    var extract=parseFloat(sliderEl.value)||0;
    var effRent=s.effRent||0, fixedExp=s.fixedExp||0;
    var refirate=s.refirate||6.75, loanType=s.loanType||'30fixed';
    var balance=s.balance||0, maxCashOut=s.maxCashOut||0, propval=s.propval||0;

    var newLoan=balance+extract;
    var newPmt=calcPmt(newLoan,refirate,loanType);
    var cf=effRent-fixedExp-newPmt;
    var ltv80=propval*0.80;

    setTxt('slider-label', fm(extract)+' extracted');
    setTxt('slider-loan', fm(newLoan));
    setTxt('slider-pmt', fm(newPmt));
    setTxt('slider-cf', fms(cf));
    setColor('slider-cf', cf>=0?'#2ecc71':'#e74c3c');

    var pct=maxCashOut>0?Math.min(extract/maxCashOut*100,100):0;
    var barEl=gi('slider-bar');
    if(barEl){ barEl.style.width=pct+'%'; barEl.style.background=cf>=0?'#2ecc71':'#e74c3c'; }

    var statusEl=gi('slider-status');
    if(statusEl){
      if(newLoan>ltv80){
        statusEl.innerHTML='⚠ Exceeds 80% LTV — lender approval unlikely';
        statusEl.color='#e74c3c';
      } else if(cf>=0){
        statusEl.innerHTML='✓ Cash flow positive at this extraction';
        statusEl.color='#2ecc71';
      } else {
        statusEl.innerHTML='✗ Cash flow negative — reduce extraction';
        statusEl.color='#e74c3c';
      }
    }
  }

  // ── Load from RIC saves ───────────────────────────────────────────────────
  // RIC localStorage key: 'rc_saves'
  // RIC save schema: { id, label, savedAt, loantype, mcf, coc, cagr3,
  //                    inputs: { price, down, rent, rate, appr, vac, taxes, ins, maint, hoa, mgmt } }
  function loadRicSaves(){
    try{
      var raw=localStorage.getItem('rc_saves');
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }

  function setVal(id, val){
    var el=gi(id);
    if(el){ el.value=val; }
  }

  function populateFromRic(save){
    var inp=save.inputs||{};
    // Fields that map directly to EEC
    if(inp.rent    !== undefined) setVal('rent',    inp.rent);
    if(inp.vac     !== undefined) setVal('vacancy', inp.vac);
    if(inp.taxes   !== undefined) setVal('taxes',   inp.taxes);
    if(inp.ins     !== undefined) setVal('ins',     inp.ins);
    if(inp.hoa     !== undefined) setVal('hoa',     inp.hoa);
    if(inp.mgmt    !== undefined) setVal('mgmt',    inp.mgmt);
    if(inp.maint   !== undefined) setVal('maint',   inp.maint);
    // Loan type maps directly
    var ltEl=gi('loantype');
    if(ltEl && save.loantype) ltEl.value=save.loantype;
    // Note: balance and propval are NOT in RIC saves (it uses price/down for purchase calc)
    // They remain as user-entered — user should update to current balance/value
    run();
    // Scroll to top of calc
    var wrap=gi('eec-wrap');
    if(wrap) wrap.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderRicSaves(){
    var arr=loadRicSaves();
    var countEl=gi('ric-count');
    var listEl=gi('ric-saves-list');
    if(!listEl) return;

    if(!arr.length){
      if(countEl) countEl.innerHTML='none found';
      listEl.innerHTML='<font color="#4a6a8a" style="font-size:11px">No REI Calc saves found in this browser.</font>';
      return;
    }

    if(countEl) countEl.innerHTML=arr.length+' saved';

    var html='';
    for(var i=0;i<arr.length;i++){
      var s=arr[i];
      var inp=s.inputs||{};
      var ltLabel=s.loantype==='30io'?'IO':'Fixed';
      var rentStr=inp.rent ? '$'+Math.round(inp.rent).toLocaleString()+'/mo rent' : '';
      html+='<div style="border-top:1px solid #1e3a5f;padding:9px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
        +'<div style="flex:1;min-width:0">'
        +'<font color="#ffffff" style="font-size:12px;font-weight:600">'+escHtml(s.label)+'</font>'
        +' <font color="#7a9bbf" style="font-size:9px">· '+ltLabel+'</font><br>'
        +'<font color="#7a9bbf" style="font-size:10px">'+rentStr+'</font>'
        +'</div>'
        +'<span data-rid="'+s.id+'" style="padding:4px 12px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Load</span>'
        +'</div>';
    }
    listEl.innerHTML=html;

    // Wire load buttons
    var btns=listEl.querySelectorAll('[data-rid]');
    for(var j=0;j<btns.length;j++){
      (function(btn){
        btn.addEventListener('click',function(){
          var id=btn.getAttribute('data-rid');
          var saves=loadRicSaves();
          for(var k=0;k<saves.length;k++){
            if(saves[k].id===id){ populateFromRic(saves[k]); break; }
          }
        });
      })(btns[j]);
    }
  }

  function escHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function pc(n){ return (n!==undefined&&n!==null) ? (Math.round(n*10)/10)+'%' : '—'; }

  // ── Wire events ───────────────────────────────────────────────────────────
  function wireInputs(){
    var ids=['balance','propval','refirate','rent','vacancy','taxes','ins','hoa','mgmt','maint'];
    ids.forEach(function(id){
      var el=gi(id);
      if(el) el.addEventListener('input', run);
    });
    var lt=gi('loantype');
    if(lt) lt.addEventListener('change', run);
    var sl=gi('slider');
    if(sl) sl.addEventListener('input', updateSlider);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(){
    applyInputStyles();
    wireInputs();
    run();
    renderRicSaves();
    setTimeout(function(){ run(); renderRicSaves(); }, 300);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
