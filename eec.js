// eec.js — Equity Extraction Calculator
// v1.0.0 | 2026-04-18 | Initial build
// Changelog:
//   v1.0.0 — Initial build: max cash-out solver, extraction slider,
//            monthly breakdown, 80% LTV cap, 30yr fixed + interest-only support,
//            Carrd-safe patterns (hardcoded defaults, addEventListener, no onclick)

(function(){

  // ── Helpers ───────────────────────────────────────────────────────────────
  function gi(id){ return document.getElementById(id); }
  function gv(id){ var el=gi(id); return el ? parseFloat(el.value)||0 : 0; }
  function gs(id){ var el=gi(id); return el ? el.value : '30fixed'; }
  function fm(n){ return '$'+Math.round(Math.abs(n)).toLocaleString(); }
  function fms(n){ return (n<0?'−':'')+fm(n); }
  function setTxt(id,val){ var el=gi(id); if(el) el.innerHTML=val; }
  function setColor(id,col){ var el=gi(id); if(el) el.color=col; }

  // ── Mortgage payment calculator ───────────────────────────────────────────
  // Returns monthly payment for a given loan amount, annual rate, loan type
  function calcPmt(loanAmt, annualRate, loanType){
    if(loanAmt<=0) return 0;
    var mr = annualRate/100/12;
    if(loanType==='30io'){
      return loanAmt * mr; // interest only: flat monthly interest
    } else {
      // 30yr fixed amortizing
      if(mr<=0) return loanAmt/360;
      var np=360;
      return loanAmt*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);
    }
  }

  // ── Core run function ─────────────────────────────────────────────────────
  function run(){
    // Read inputs — always use hardcoded fallback for Carrd safety
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

    // ── Derived base figures ─────────────────────────────────────────────
    var currentEquity = propval - balance;
    var ltv = propval>0 ? (balance/propval*100) : 0;

    // Non-mortgage monthly expenses (same regardless of refi)
    var effRent  = rent * (1 - vacancy/100);
    var taxIns   = (taxes+ins)/12;
    var hoaMgmt  = hoa+mgmt;
    var maintMo  = maint/12;
    var fixedExp = taxIns + hoaMgmt + maintMo;

    // Income available to cover mortgage
    var incomeAvail = effRent - fixedExp;

    // ── LTV cap: max loan = 80% of property value ────────────────────────
    var maxLoanLTV = propval * 0.80;

    // ── Solve: max loan where payment ≤ incomeAvail ──────────────────────
    // For 30yr fixed:  pmt = L * mr*(1+mr)^360 / ((1+mr)^360 - 1)
    //   → L_max = incomeAvail / pmt_per_dollar
    // For IO:          pmt = L * mr
    //   → L_max = incomeAvail / mr
    var maxLoanCF;
    var mr = refirate/100/12;
    if(incomeAvail<=0){
      maxLoanCF=0; // already cash-flow negative with no mortgage
    } else {
      if(loanType==='30io'){
        maxLoanCF = mr>0 ? incomeAvail/mr : 0;
      } else {
        // 30yr fixed
        var np=360;
        var pmtPerDollar = mr>0 ? (mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1) : 1/360;
        maxLoanCF = incomeAvail/pmtPerDollar;
      }
    }

    // Final max loan = min of LTV cap and cash-flow cap
    var maxNewLoan = Math.min(maxLoanLTV, maxLoanCF);
    maxNewLoan = Math.max(maxNewLoan, 0);

    // Max cash-out = new loan minus current balance (can't be negative)
    var maxCashOut = Math.max(maxNewLoan - balance, 0);

    // Payment and cash flow at max cash-out
    var newPmt = calcPmt(maxNewLoan, refirate, loanType);
    var newCF  = effRent - fixedExp - newPmt;

    // ── Update metric cards ──────────────────────────────────────────────
    setTxt('out-equity', fm(currentEquity));
    setColor('out-equity', currentEquity>=0?'#E8C96A':'#e74c3c');

    setTxt('out-ltv', Math.round(ltv)+'% LTV');

    setTxt('out-maxco', fm(maxCashOut));
    setColor('out-maxco', maxCashOut>0?'#2ecc71':'#e74c3c');

    // Sub-label: indicate whether LTV or CF was the binding constraint
    var binding = (maxLoanCF <= maxLoanLTV && maxLoanCF>=0) ? 'cash flow limit' : '80% LTV cap';
    if(maxCashOut===0) binding='no cash-out available';
    setTxt('out-maxco-sub', binding);

    setTxt('out-newpmt', fm(newPmt));
    setTxt('out-newpmt-sub', (loanType==='30io'?'interest only':'30yr fixed')+' refi');

    setTxt('out-cf', fms(newCF));
    setColor('out-cf', newCF>=0?'#2ecc71':'#e74c3c');

    // ── Monthly breakdown ────────────────────────────────────────────────
    setTxt('br-rent', fm(effRent));
    setTxt('br-pmt',  '−'+fm(newPmt));
    setTxt('br-ti',   '−'+fm(taxIns));
    setTxt('br-hm',   '−'+fm(hoaMgmt));
    setTxt('br-cf',   fms(newCF));
    setColor('br-cf', newCF>=0?'#2ecc71':'#e74c3c');

    // ── Update slider bounds ─────────────────────────────────────────────
    var sliderEl = gi('slider');
    if(sliderEl){
      var sliderMax = Math.max(Math.ceil(maxCashOut/1000)*1000, 10000);
      sliderEl.max = sliderMax;
      // Clamp slider value if needed
      if(parseFloat(sliderEl.value)>sliderMax) sliderEl.value=sliderMax;
      updateSlider(effRent, fixedExp, refirate, loanType, balance, maxCashOut, propval);
    }

    // Store for slider use
    window._eecState = {
      effRent:effRent, fixedExp:fixedExp, refirate:refirate,
      loanType:loanType, balance:balance, maxCashOut:maxCashOut, propval:propval
    };
  }

  // ── Slider updater ────────────────────────────────────────────────────────
  function updateSlider(effRent, fixedExp, refirate, loanType, balance, maxCashOut, propval){
    var sliderEl = gi('slider');
    if(!sliderEl) return;
    var extract = parseFloat(sliderEl.value)||0;

    var newLoan = balance + extract;
    var newPmt  = calcPmt(newLoan, refirate, loanType);
    var cf      = effRent - fixedExp - newPmt;
    var ltv80   = propval*0.80;

    setTxt('slider-label', fm(extract)+' extracted');
    setTxt('slider-loan', fm(newLoan));
    setTxt('slider-pmt', fm(newPmt));
    setTxt('slider-cf', fms(cf));
    setColor('slider-cf', cf>=0?'#2ecc71':'#e74c3c');

    // Progress bar: % of max cash-out used
    var pct = maxCashOut>0 ? Math.min(extract/maxCashOut*100,100) : 0;
    var barEl = gi('slider-bar');
    if(barEl){
      barEl.style.width = pct+'%';
      barEl.style.background = cf>=0 ? '#2ecc71' : '#e74c3c';
    }

    // Status message
    var statusEl = gi('slider-status');
    if(statusEl){
      var overLTV = newLoan > ltv80;
      if(overLTV){
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

  // ── Wire up events ────────────────────────────────────────────────────────
  function wireInputs(){
    var ids=['balance','propval','refirate','rent','vacancy','taxes','ins','hoa','mgmt','maint'];
    ids.forEach(function(id){
      var el=gi(id);
      if(el) el.addEventListener('input', run);
    });
    var lt=gi('loantype');
    if(lt) lt.addEventListener('change', run);

    var sl=gi('slider');
    if(sl){
      sl.addEventListener('input', function(){
        var s=window._eecState||{};
        updateSlider(s.effRent||0,s.fixedExp||0,s.refirate||6.75,
                     s.loanType||'30fixed',s.balance||0,s.maxCashOut||0,s.propval||0);
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ wireInputs(); run(); setTimeout(run,300); });
  } else {
    wireInputs(); run(); setTimeout(run,300);
  }

})();
