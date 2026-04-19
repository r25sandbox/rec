// eec.js — Equity Extraction Calculator
// v1.3.0 | 2026-04-18 | Collapsible breakdown+RIC panels; fix Load (s.inp not s.inputs);
//                        fix loantype '30fix'→'30fixed' mapping; fix effRent vacancy remnant;
//                        fix slider math (was computing on stale state before run() completed)
//                        Commit: collapsible panels, fix Load bug, fix loantype map, fix math
// v1.2.0 | 2026-04-18 | Remove vacancy; remove 2x2 metric tiles
// v1.1.1 | 2026-04-18 | Save card: replace RIC mcf/CoC with rent/mo
// v1.1.0 | 2026-04-18 | 3-col compact inputs; remove slider breakdown; load RIC saves
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
  var _state = {};  // single authoritative state object

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

    // Gross rent used directly — no vacancy adjustment
    var effRent     = rent;
    var taxIns      = (taxes+ins)/12;
    var hoaMgmtMaint= hoa + mgmt + maint/12;
    var fixedExp    = taxIns + hoaMgmtMaint;
    var incomeAvail = effRent - fixedExp;

    // Max loan: smaller of 80% LTV cap and cash-flow breakeven loan
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

    var maxNewLoan  = Math.max(Math.min(maxLoanLTV, maxLoanCF), 0);
    var maxCashOut  = Math.max(maxNewLoan - balance, 0);
    var newPmt      = calcPmt(maxNewLoan, refirate, loanType);
    var newCF       = effRent - fixedExp - newPmt;
    var ltv         = propval>0 ? (balance/propval*100) : 0;
    var binding     = (maxLoanCF<=maxLoanLTV && maxLoanCF>=0) ? 'cash flow limit' : '80% LTV cap';
    if(maxCashOut===0) binding='no cash-out available';

    // Store state for slider (must be set BEFORE updateSlider)
    _state = {
      effRent:effRent, fixedExp:fixedExp, refirate:refirate,
      loanType:loanType, balance:balance, maxCashOut:maxCashOut,
      propval:propval, taxIns:taxIns, hoaMgmtMaint:hoaMgmtMaint,
      newPmt:newPmt, newCF:newCF, maxNewLoan:maxNewLoan, binding:binding
    };

    // Monthly breakdown (at max cash-out)
    setTxt('br-rent', fm(effRent));
    setTxt('br-pmt',  '−'+fm(newPmt));
    setTxt('br-ti',   '−'+fm(taxIns));
    setTxt('br-hm',   '−'+fm(hoaMgmtMaint));
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
    if(!s || !s.refirate) return;
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
        statusEl.innerHTML='&#9888; Exceeds 80% LTV — lender approval unlikely';
        statusEl.color='#e74c3c';
      } else if(cf>=0){
        statusEl.innerHTML='&#10003; Cash flow positive at this extraction';
        statusEl.color='#2ecc71';
      } else {
        statusEl.innerHTML='&#10007; Cash flow negative — reduce extraction';
        statusEl.color='#e74c3c';
      }
    }
  }

  // ── RIC saves ─────────────────────────────────────────────────────────────
  function loadRicSaves(){
    try{ var r=localStorage.getItem('rc_saves'); return r?JSON.parse(r):[]; }
    catch(e){ return []; }
  }

  function setVal(id,val){
    var el=gi(id);
    if(el !== null && val !== undefined){ el.value=val; }
  }

  // Map RIC loantype strings to EEC strings
  function mapLoanType(lt){
    if(!lt) return '30fixed';
    if(lt==='30io' || lt==='io') return '30io';
    // '30fix', '30fixed', 'fixed', or anything else → 30fixed
    return '30fixed';
  }

  function populateFromRic(save){
    // RIC stores inputs under save.inp (NOT save.inputs)
    var inp = save.inp || save.inputs || {};
    setVal('rent',  inp.rent);
    setVal('taxes', inp.taxes);
    setVal('ins',   inp.ins);
    setVal('hoa',   inp.hoa);
    setVal('mgmt',  inp.mgmt);
    setVal('maint', inp.maint);
    // Loan type — normalize across RIC/RentalComp variants
    var ltEl=gi('loantype');
    if(ltEl) ltEl.value = mapLoanType(save.loantype || inp.loantype);
    // balance + propval intentionally left untouched — must reflect current state
    run();
    var wrap=gi('eec-wrap');
    if(wrap) wrap.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function escHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderRicSaves(){
    var arr=loadRicSaves();
    var countEl=gi('ric-count');
    var listEl=gi('ric-saves-list');
    if(!listEl) return;
    if(!arr.length){
      if(countEl) countEl.innerHTML='none found';
      listEl.innerHTML='<font color="#4a6a8a" style="font-size:11px">No REI Calc saves in this browser.</font>';
      return;
    }
    if(countEl) countEl.innerHTML=arr.length+' saved';
    var html='';
    for(var i=0;i<arr.length;i++){
      var s=arr[i];
      var inp=s.inp||s.inputs||{};
      var ltLabel=mapLoanType(s.loantype||inp.loantype)==='30io'?'IO':'Fixed';
      var rentStr=inp.rent ? fm(inp.rent)+'/mo rent' : '—';
      html+='<div style="border-top:1px solid #1e3a5f;padding:9px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
        +'<div style="flex:1;min-width:0">'
        +'<font color="#ffffff" style="font-size:12px;font-weight:600">'+escHtml(s.label)+'</font>'
        +' <font color="#7a9bbf" style="font-size:9px">&#183; '+ltLabel+'</font><br>'
        +'<font color="#7a9bbf" style="font-size:10px">'+rentStr+'</font>'
        +'</div>'
        +'<span data-rid="'+s.id+'" style="padding:4px 12px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Load</span>'
        +'</div>';
    }
    listEl.innerHTML=html;
    // Wire load buttons via delegation
    listEl.addEventListener('click', function(e){
      var btn=e.target.closest('[data-rid]');
      if(!btn) return;
      var id=btn.getAttribute('data-rid');
      var saves=loadRicSaves();
      for(var k=0;k<saves.length;k++){
        // id can be numeric (RIC) or string (RentalComp) — compare loosely
        if(String(saves[k].id)===String(id)){ populateFromRic(saves[k]); break; }
      }
    });
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
    // Collapsible panels
    initToggle('hdr-breakdown','body-breakdown','arr-breakdown');
    initToggle('hdr-ric','body-ric','arr-ric');
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
