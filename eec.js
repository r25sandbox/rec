// eec.js — Equity Extraction Calculator
// v1.4.0 | 2026-04-18 | Remove LOAD FROM REI CALC (UI + JS); math verified correct
//                        Commit: rm RIC load feature; math confirmed via spot-check
// v1.3.0 | 2026-04-18 | Collapsible panels; fix Load bug; fix loantype mapping; fix slider state
// v1.2.0 | 2026-04-18 | Remove vacancy; remove 2x2 metric tiles
// v1.1.x | 2026-04-18 | Compact inputs; slider; save card fixes
// v1.0.0 | 2026-04-18 | Initial build

(function(){

  // ── Helpers ───────────────────────────────────────────────────────────────
  function gi(id){ return document.getElementById(id); }
  function gv(id){ var el=gi(id); return el ? parseFloat(el.value)||0 : 0; }
  function gs(id){ var el=gi(id); return el ? el.value : '30fixed'; }
  function fm(n){ return '$'+Math.round(Math.abs(n)).toLocaleString(); }
  function fms(n){ return (n>=0?'+':'-')+fm(n); }
  function setTxt(id,val){ var el=gi(id); if(el) el.innerHTML=val; }
  function setColor(id,col){ var el=gi(id); if(el) el.color=col; }

  function applyInputStyles(){
    var s='width:100%;margin-top:4px;padding:6px 7px;background:#0d1b2e;color:#ffffff;'+
          'border:1px solid #2a4a6b;border-radius:6px;font-size:12px;font-family:inherit;box-sizing:border-box';
    var els=document.getElementsByClassName('ei');
    for(var i=0;i<els.length;i++) els[i].setAttribute('style',s);
  }

  // ── Collapsible panels ────────────────────────────────────────────────────
  function initToggle(hdrId, bodyId, arrId){
    var hdr=gi(hdrId), body=gi(bodyId), arr=gi(arrId);
    if(!hdr||!body||!arr) return;
    hdr.style.cursor='pointer';
    hdr.addEventListener('click', function(){
      var open = body.style.display==='block';
      body.style.display = open ? 'none' : 'block';
      arr.innerHTML = open ? '&#9658;' : '&#9660;';
    });
  }

  // ── Mortgage payment ──────────────────────────────────────────────────────
  function calcPmt(loanAmt, annualRate, loanType){
    if(loanAmt<=0) return 0;
    var mr=annualRate/100/12;
    if(loanType==='30io') return loanAmt*mr;
    if(mr<=0) return loanAmt/360;
    var np=360;
    return loanAmt*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);
  }

  // ── Core calc ─────────────────────────────────────────────────────────────
  var _state = {};

  function run(){
    var balance  = gv('balance')  || 320000;
    var propval  = gv('propval')  || 450000;
    var refirate = gv('refirate') || 6.75;
    var loanType = gs('loantype') || '30fixed';
    var rent     = gv('rent')     || 2400;
    var taxes    = gv('taxes')    || 3600;
    var ins      = gv('ins')      || 1800;
    var hoa      = gv('hoa')      || 150;
    var mgmt     = gv('mgmt')     || 0;
    var maint    = gv('maint')    || 1200;

    var effRent      = rent;
    var taxIns       = (taxes+ins)/12;
    var hoaMgmtMaint = hoa + mgmt + maint/12;
    var fixedExp     = taxIns + hoaMgmtMaint;
    var incomeAvail  = effRent - fixedExp;

    var maxLoanLTV = propval * 0.80;
    var mr = refirate/100/12;
    var maxLoanCF;
    if(incomeAvail <= 0){
      maxLoanCF = 0;
    } else if(loanType==='30io'){
      maxLoanCF = mr>0 ? incomeAvail/mr : 0;
    } else {
      var np=360;
      var ppd = mr>0 ? (mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1) : 1/360;
      maxLoanCF = incomeAvail/ppd;
    }

    var maxNewLoan = Math.max(Math.min(maxLoanLTV, maxLoanCF), 0);
    var maxCashOut = Math.max(maxNewLoan - balance, 0);
    var newPmt     = calcPmt(maxNewLoan, refirate, loanType);
    var newCF      = effRent - fixedExp - newPmt;
    var binding    = (maxLoanCF<=maxLoanLTV && maxLoanCF>=0) ? 'cash flow limit' : '80% LTV cap';
    if(maxCashOut===0) binding='no cash-out available';

    _state = {
      effRent:effRent, fixedExp:fixedExp, refirate:refirate,
      loanType:loanType, balance:balance, maxCashOut:maxCashOut,
      propval:propval, taxIns:taxIns, hoaMgmtMaint:hoaMgmtMaint,
      newPmt:newPmt, newCF:newCF
    };

    // Monthly breakdown
    setTxt('br-rent', fm(effRent));
    setTxt('br-pmt',  '&#8722;'+fm(newPmt));
    setTxt('br-ti',   '&#8722;'+fm(taxIns));
    setTxt('br-hm',   '&#8722;'+fm(hoaMgmtMaint));
    setTxt('br-cf',   fms(newCF));
    setColor('br-cf', newCF>=0?'#2ecc71':'#e74c3c');

    // Slider bounds
    var sliderEl=gi('slider');
    if(sliderEl){
      var sliderMax=Math.max(Math.ceil(maxCashOut/1000)*1000, 10000);
      sliderEl.max=sliderMax;
      if(parseFloat(sliderEl.value)>sliderMax) sliderEl.value=sliderMax;
    }

    updateSlider();
  }

  // ── Slider ────────────────────────────────────────────────────────────────
  function updateSlider(){
    var s=_state;
    if(!s||!s.refirate) return;
    var sliderEl=gi('slider');
    if(!sliderEl) return;
    var extract=parseFloat(sliderEl.value)||0;

    var newLoan = s.balance + extract;
    var newPmt  = calcPmt(newLoan, s.refirate, s.loanType);
    var cf      = s.effRent - s.fixedExp - newPmt;
    var ltv80   = s.propval*0.80;

    setTxt('slider-label', fm(extract)+' extracted');
    setTxt('slider-loan', fm(newLoan));
    setTxt('slider-pmt', fm(newPmt));
    setTxt('slider-cf', fms(cf));
    setColor('slider-cf', cf>=0?'#2ecc71':'#e74c3c');

    var pct=s.maxCashOut>0 ? Math.min(extract/s.maxCashOut*100,100) : 0;
    var barEl=gi('slider-bar');
    if(barEl){ barEl.style.width=pct+'%'; barEl.style.background=cf>=0?'#2ecc71':'#e74c3c'; }

    var statusEl=gi('slider-status');
    if(statusEl){
      if(newLoan>ltv80){
        statusEl.innerHTML='&#9888; Exceeds 80% LTV &#8212; lender approval unlikely';
        statusEl.color='#e74c3c';
      } else if(cf>=0){
        statusEl.innerHTML='&#10003; Cash flow positive at this extraction';
        statusEl.color='#2ecc71';
      } else {
        statusEl.innerHTML='&#10007; Cash flow negative &#8212; reduce extraction';
        statusEl.color='#e74c3c';
      }
    }
  }

  // ── Wire events ───────────────────────────────────────────────────────────
  function wireInputs(){
    ['balance','propval','refirate','rent','taxes','ins','hoa','mgmt','maint'].forEach(function(id){
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
    initToggle('hdr-breakdown','body-breakdown','arr-breakdown');
    run();
    setTimeout(run, 300);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
