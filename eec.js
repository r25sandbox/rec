// eec.js — Equity Extraction Calculator
// v1.8.11 | 2026-04-20 | PDF hero: cash-out equal to CF — two columns, labeled, matching panel
//                         Commit: PDF cash-out elevated to match CF prominence
//                         slider-ltv replaces CF in stats row; print opens new tab, no dialog;
//                         report title "Cash Out" not "Equity Extraction"
//                         Commit: cash out UX + print open-tab no dialog
//                        Commit: report download, no auto-print dialog
//                        gold left-border cards, 3-col alternating input grid, split footer
//                        Commit: EEC print report matches RIC style
//                        Commit: overwrite save confirmation flash
// v1.8.6 | 2026-04-18 | savedLTV in card row and PDF; plain English binding labels
//                        Commit: fix slider restore on load — remove setTimeout re-run
// v1.8.3 | 2026-04-18 | Save slider position as savedExtract; Load restores to savedExtract
//                        fix applyInputs (remove renderSaves/scroll — click handler owns UI);
//                        reset slider to 0 on load for clean predictable state;
//                        add ?v=18 cache-bust in HTML
//                        Commit: fix load/overwrite/del ID bug; clean applyInputs
// v1.8.0 | 2026-04-18 | Port RIC save/load pattern exactly

(function(){

  // ── Helpers ───────────────────────────────────────────────────────────────
  function gi(id){ return document.getElementById(id); }
  function gvd(id){ var el=gi(id); if(!el) return null; var v=parseFloat(el.value); return isNaN(v)?null:v; }
  function gvf(id,def){ var v=gvd(id); return v!==null?v:def; }
  function gs(id){ var el=gi(id); return el?el.value:'30fixed'; }
  function fm(n){ return '$'+Math.round(Math.abs(n)).toLocaleString(); }
  function fms(n){ return (n>=0?'+':'-')+fm(n); }
  function pc(n){ return (Math.round(n*10)/10)+'%'; }
  function setTxt(id,val){ var el=gi(id); if(el) el.innerHTML=val; }
  function setColor(id,col){ var el=gi(id); if(el) el.color=col; }
  function escHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function applyInputStyles(){
    var s='width:100%;margin-top:4px;padding:6px 7px;background:#0d1b2e;color:#ffffff;'+
          'border:1px solid #2a4a6b;border-radius:6px;font-size:12px;font-family:inherit;box-sizing:border-box';
    var els=document.getElementsByClassName('ei');
    for(var i=0;i<els.length;i++) els[i].setAttribute('style',s);
  }

  function initToggle(hdrId,bodyId,arrId){
    var hdr=gi(hdrId),body=gi(bodyId),arr=gi(arrId);
    if(!hdr||!body||!arr) return;
    hdr.style.cursor='pointer';
    hdr.addEventListener('click',function(){
      var open=body.style.display==='block';
      body.style.display=open?'none':'block';
      arr.innerHTML=open?'&#9658;':'&#9660;';
    });
  }

  // ── Mortgage payment ──────────────────────────────────────────────────────
  function calcPmt(loanAmt,annualRate,loanType){
    if(loanAmt<=0) return 0;
    var mr=annualRate/100/12;
    if(loanType==='30io') return loanAmt*mr;
    if(mr<=0) return loanAmt/360;
    var np=360;
    return loanAmt*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);
  }

  // ── Inputs + Results (RIC pattern) ────────────────────────────────────────
  function currentInputs(){
    return {
      balance:  gvf('balance',  320000),
      propval:  gvf('propval',  450000),
      refirate: gvf('refirate', 6.75),
      loantype: gs('loantype')||'30fixed',
      rent:     gvf('rent',     2400),
      taxes:    gvf('taxes',    3600),
      ins:      gvf('ins',      1800),
      hoa:      gvf('hoa',      0),
      mgmt:     gvf('mgmt',     0),
      maint:    gvf('maint',    1200)
    };
  }

  function computeResults(inp){
    var effRent      = inp.rent;
    var taxIns       = (inp.taxes+inp.ins)/12;
    var hoaMgmtMaint = inp.hoa+inp.mgmt+inp.maint/12;
    var fixedExp     = taxIns+hoaMgmtMaint;
    var incomeAvail  = effRent-fixedExp;
    var maxLoanLTV   = inp.propval*0.80;
    var mr           = inp.refirate/100/12;
    var maxLoanCF;
    if(incomeAvail<=0){
      maxLoanCF=0;
    } else if(inp.loantype==='30io'){
      maxLoanCF=mr>0?incomeAvail/mr:0;
    } else {
      var np=360,ppd=mr>0?(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1):1/360;
      maxLoanCF=incomeAvail/ppd;
    }
    var maxNewLoan=Math.max(Math.min(maxLoanLTV,maxLoanCF),0);
    var maxCashOut=Math.max(maxNewLoan-inp.balance,0);
    var newPmt=calcPmt(maxNewLoan,inp.refirate,inp.loantype);
    var newCF=effRent-fixedExp-newPmt;
    var binding=(maxLoanCF<=maxLoanLTV&&maxLoanCF>=0)?'cash flow limited':'LTV limited';
    if(maxCashOut===0) binding='no cash-out available';
    return {maxCashOut:maxCashOut,newCF:newCF,binding:binding,
            effRent:effRent,fixedExp:fixedExp,maxNewLoan:maxNewLoan};
  }

  // ── Core run ──────────────────────────────────────────────────────────────
  var _state={};

  function run(){
    var inp=currentInputs();
    var res=computeResults(inp);
    _state={
      effRent:res.effRent,fixedExp:res.fixedExp,refirate:inp.refirate,
      loanType:inp.loantype,balance:inp.balance,maxCashOut:res.maxCashOut,propval:inp.propval
    };
    var sliderEl=gi('slider');
    if(sliderEl){
      var sliderMax=Math.max(Math.ceil(res.maxCashOut/1000)*1000,10000);
      sliderEl.max=sliderMax;
      if(parseFloat(sliderEl.value)>sliderMax) sliderEl.value=sliderMax;
    }
    updateSlider();
  }

  function updateSlider(){
    var s=_state;
    if(!s||!s.refirate) return;
    var sliderEl=gi('slider');
    if(!sliderEl) return;
    var extract=parseFloat(sliderEl.value)||0;
    var newLoan=s.balance+extract;
    var newPmt=calcPmt(newLoan,s.refirate,s.loanType);
    var cf=s.effRent-s.fixedExp-newPmt;
    var ltv80=s.propval*0.80;
    setTxt('slider-label',fm(extract));           // header: cash-out amount, no "extracted"
    setTxt('slider-cf',fms(cf));                  // header: cash flow (color set below)
    setColor('slider-cf',cf>=0?'#2ecc71':'#e74c3c');
    setTxt('slider-loan',fm(newLoan));
    setTxt('slider-pmt',fm(newPmt));
    // LTV in stats row
    var ltv=s.propval>0?Math.round(newLoan/s.propval*100):0;
    setTxt('slider-ltv',ltv+'%');
    setColor('slider-ltv',ltv<=80?'#2ecc71':'#e74c3c');
    var pct=s.maxCashOut>0?Math.min(extract/s.maxCashOut*100,100):0;
    var barEl=gi('slider-bar');
    if(barEl){barEl.style.width=pct+'%';barEl.style.background=cf>=0?'#2ecc71':'#e74c3c';}
    var statusEl=gi('slider-status');
    if(statusEl){
      if(newLoan>ltv80){statusEl.innerHTML='&#9888; Exceeds 80% LTV &#8212; lender approval unlikely';statusEl.color='#e74c3c';}
      else if(cf>=0){statusEl.innerHTML='&#10003; Cash flow positive at this extraction';statusEl.color='#2ecc71';}
      else{statusEl.innerHTML='&#10007; Cash flow negative &#8212; reduce extraction';statusEl.color='#e74c3c';}
    }
  }

  // ── Save / Load (RIC pattern exactly) ────────────────────────────────────
  var LS_KEY='eec_saves';
  var activeId=null;

  function loadSaves(){try{var r=localStorage.getItem(LS_KEY);return r?JSON.parse(r):[];}catch(e){return[];}}
  function writeSaves(arr){try{localStorage.setItem(LS_KEY,JSON.stringify(arr));}catch(e){}}

  function doSave(){
    var label=prompt('Name this scenario (e.g. property address):','');
    if(!label||!label.trim()) return;
    var inp=currentInputs();
    var res=computeResults(inp);
    // Capture current slider position as the saved working state
    var sl=gi('slider');
    var savedExtract=sl?parseFloat(sl.value)||0:0;
    var savedLoan=inp.balance+savedExtract;
    var savedPmt=calcPmt(savedLoan,inp.refirate,inp.loantype);
    var savedCF=res.effRent-res.fixedExp-savedPmt;
    var savedLTV=inp.propval>0?Math.round(savedLoan/inp.propval*100):0;
    var rec={
      id:Date.now(), label:label.trim(), savedAt:new Date().toLocaleDateString(),
      loantype:inp.loantype, inp:inp,
      maxCashOut:res.maxCashOut, newCF:res.newCF, binding:res.binding,
      savedExtract:savedExtract, savedCF:savedCF, savedLTV:savedLTV
    };
    var arr=loadSaves(); arr.unshift(rec); writeSaves(arr);
    activeId=null;
    renderSaves();
    var body=gi('body-sv'),arr_el=gi('arr-sv');
    if(body&&body.style.display!=='block'){body.style.display='block';if(arr_el)arr_el.innerHTML='&#9660;';}
  }

  function applyInputs(inp,id,targetExtract){
    function sv(elId,v){var el=gi(elId);if(el&&v!==undefined&&v!==null)el.value=v;}
    sv('balance',inp.balance); sv('propval',inp.propval); sv('refirate',inp.refirate);
    sv('rent',inp.rent); sv('taxes',inp.taxes); sv('ins',inp.ins);
    sv('hoa',inp.hoa); sv('mgmt',inp.mgmt); sv('maint',inp.maint);
    var lt=gi('loantype'); if(lt&&inp.loantype) lt.value=inp.loantype;
    activeId=id||null;
    run();
    // Set slider AFTER run() — run() may clamp it, so force the value here
    var sl=gi('slider');
    if(sl && targetExtract!==undefined){
      sl.value=targetExtract;
      updateSlider();
    }
  }

  // overwrite — identical pattern to RIC
  function doOverwrite(id){
    var arr=loadSaves();
    var idx=-1; for(var i=0;i<arr.length;i++){if(String(arr[i].id)===String(id)){idx=i;break;}}
    if(idx<0) return;
    var inp=currentInputs();
    var res=computeResults(inp);
    var sl=gi('slider');
    var savedExtract=sl?parseFloat(sl.value)||0:0;
    var savedLoan=inp.balance+savedExtract;
    var savedPmt=calcPmt(savedLoan,inp.refirate,inp.loantype);
    var savedCF=res.effRent-res.fixedExp-savedPmt;
    var savedLTV=inp.propval>0?Math.round(savedLoan/inp.propval*100):0;
    arr[idx].inp=inp; arr[idx].maxCashOut=res.maxCashOut;
    arr[idx].newCF=res.newCF; arr[idx].binding=res.binding;
    arr[idx].loantype=inp.loantype; arr[idx].savedAt=new Date().toLocaleDateString();
    arr[idx].savedExtract=savedExtract; arr[idx].savedCF=savedCF; arr[idx].savedLTV=savedLTV;
    writeSaves(arr); renderSaves(); flashRow(id);
  }

  // Brief green background flash on the saved row — fades out in 600ms
  function flashRow(id){
    var list=gi('eec-saves-list');
    if(!list) return;
    var divs=list.querySelectorAll('[data-act="overwrite"]');
    for(var i=0;i<divs.length;i++){
      if(divs[i].getAttribute('data-id')===String(id)){
        var row=divs[i].closest('div[style]');
        if(!row) return;
        var orig=row.style.background||'';
        row.style.transition='background 0.1s';
        row.style.background='rgba(46,204,113,0.25)';
        setTimeout(function(r,o){ r.style.background=o; r.style.transition='background 0.6s'; },120,row,orig);
        setTimeout(function(r,o){ r.style.transition=''; },720,row,orig);
        return;
      }
    }
  }

  // ── Export / Import ───────────────────────────────────────────────────────
  function doExport(){
    var arr=loadSaves();
    if(!arr.length){alert('No saved scenarios to export.');return;}
    var blob=new Blob([JSON.stringify(arr,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='eec-scenarios-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},10000);
  }

  function handleImportFile(file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var imported=JSON.parse(e.target.result);
        if(!Array.isArray(imported)) throw new Error('Invalid format');
        var existing=loadSaves();
        var existingIds=existing.map(function(s){return s.id;});
        var merged=existing.slice(); var added=0;
        for(var i=0;i<imported.length;i++){
          if(existingIds.indexOf(imported[i].id)<0){merged.push(imported[i]);added++;}
        }
        writeSaves(merged); renderSaves();
        var body=gi('body-sv'),arr_el=gi('arr-sv');
        if(body){body.style.display='block';if(arr_el)arr_el.innerHTML='&#9660;';}
        alert('Imported '+added+' scenario'+(added!==1?'s':'')+'. '+(merged.length-added)+' duplicates skipped.');
      }catch(err){alert('Import failed: '+err.message);}
    };
    reader.readAsText(file);
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function printReport(ids){
    var arr=loadSaves();
    var subset=ids?arr.filter(function(s){return ids.indexOf(String(s.id))>=0;}):arr;
    if(!subset.length) return;
    var rows='';
    for(var i=0;i<subset.length;i++){
      var s=subset[i]; var inp=s.inp||{};
      var dispExtract=s.savedExtract!==undefined?s.savedExtract:s.maxCashOut;
      var dispCF=s.savedCF!==undefined?s.savedCF:s.newCF;
      var cfCol=dispCF>=0?'#16a34a':'#dc2626';
      var ltLabel=inp.loantype==='30io'?'Interest Only':'30yr Fixed';
      var ltvStr=s.savedLTV!==undefined?' &middot; '+s.savedLTV+'% LTV':'';
      // 3-col input grid rows — alternating background matching RIC
      var r0='border-bottom:1px solid #e8e5e0';
      var ra='background:#f8f8f8;'+r0;
      rows+=''
        +'<div style="border:1px solid #e2e8f0;border-left:4px solid #c5a050;border-radius:6px;padding:20px 20px 16px;margin-bottom:20px;page-break-inside:avoid">'
        // Card header: name left, hero metrics right
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">'
        +'<div>'
        +'<div style="font-size:17px;font-weight:700;color:#0d1b2e">'+escHtml(s.label)+'</div>'
        +'<div style="font-size:10px;color:#888;margin-top:3px">'+ltLabel+' &middot; Saved '+escHtml(s.savedAt)+ltvStr+'</div>'
        +'</div>'
        +'<div style="display:flex;gap:24px;flex-shrink:0;align-items:flex-start">'
        +'<div style="text-align:right">'
        +'<div style="font-size:11px;color:#888;margin-bottom:2px">Cash out</div>'
        +'<div style="font-size:26px;font-weight:700;color:#c5a050">'+fm(dispExtract)+'</div>'
        +'</div>'
        +'<div style="text-align:right">'
        +'<div style="font-size:11px;color:#888;margin-bottom:2px">Cash flow</div>'
        +'<div style="font-size:26px;font-weight:700;color:'+cfCol+'">'+fms(dispCF)+'/mo</div>'
        +'</div>'
        +'</div></div>'
        // 3-col input grid
        +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<tr style="'+r0+'">'
        +'<td style="padding:6px 8px;color:#888;width:17%">Loan balance</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e;width:16%">'+fm(inp.balance)+'</td>'
        +'<td style="padding:6px 8px;color:#888;width:17%">Property value</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e;width:16%">'+fm(inp.propval)+'</td>'
        +'<td style="padding:6px 8px;color:#888;width:17%">Refi rate</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+inp.refirate+'%</td>'
        +'</tr>'
        +'<tr style="'+ra+'">'
        +'<td style="padding:6px 8px;color:#888">Gross rent</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(inp.rent)+'/mo</td>'
        +'<td style="padding:6px 8px;color:#888">Taxes/yr</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(inp.taxes)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Insur./yr</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(inp.ins)+'</td>'
        +'</tr>'
        +'<tr style="'+r0+'">'
        +'<td style="padding:6px 8px;color:#888">HOA/mo</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(inp.hoa)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Mgmt/mo</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(inp.mgmt)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Maint./yr</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(inp.maint)+'</td>'
        +'</tr>'
        +'</table>'
        +'</div>';
    }
    var dateStr=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8">'
      +'<title>Cash Out &#8212; Scenario Comparison</title>'
      +'<style>'
      +'*{box-sizing:border-box;margin:0;padding:0}'
      +'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#0d1b2e;padding:32px;max-width:860px;margin:0 auto}'
      +'.page-hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;margin-bottom:28px;border-bottom:3px solid #0d1b2e}'
      +'.brand{font-size:20px;font-weight:700;color:#0d1b2e;letter-spacing:-.01em}'
      +'.brand span{color:#c5a050}'
      +'.brand-sub{font-size:10px;color:#888;margin-top:3px;letter-spacing:.04em}'
      +'.page-title{font-size:13px;font-weight:700;color:#0d1b2e;text-align:right}'
      +'.page-date{font-size:11px;color:#888;text-align:right;margin-top:3px}'
      +'.page-ftr{margin-top:28px;padding-top:12px;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center}'
      +'.page-ftr span{font-size:9px;color:#aaa}'
      +'@media print{body{padding:16px}@page{margin:14mm}}'
      +'</style></head><body>'
      +'<div class="page-hdr">'
      +'<div><div class="brand">Realty <span>25 AZ</span></div>'
      +'<div class="brand-sub">ALIK LEVIN, BROKER &middot; 480.920.2273 &middot; REALTY25AZ.COM</div></div>'
      +'<div><div class="page-title">Cash Out &#8212; Scenario Comparison</div>'
      +'<div class="page-date">'+dateStr+'</div></div>'
      +'</div>'
      +rows
      +'<div class="page-ftr">'
      +'<span>Realty 25 AZ &middot; realty25az.com &middot; 480.920.2273</span>'
      +'<span>For informational purposes only. Not financial or investment advice.</span>'
      +'</div>'
      +'</body></html>';
    var blob=new Blob([html],{type:'text/html'});
    var url=URL.createObjectURL(blob);
    var w=window.open(url,'_blank');
    if(!w){
      // Popup blocked — fall back to download
      var a=document.createElement('a');
      a.href=url; a.download='CashOut-Report-'+new Date().toISOString().slice(0,10)+'.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  }

  // ── Save card (RIC pattern) ───────────────────────────────────────────────
  function saveCard(s,isActive){
    // Display what was saved at the slider position, fall back to maxCashOut for old saves
    var dispExtract = s.savedExtract!==undefined ? s.savedExtract : s.maxCashOut;
    var dispCF      = s.savedCF!==undefined      ? s.savedCF      : s.newCF;
    var cfCol=dispCF>=0?'#2ecc71':'#e74c3c';
    var ltLabel=s.loantype==='30io'?'IO':'Fixed';
    var rowStyle=isActive
      ?'border-top:1px solid #1e3a5f;padding:10px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;background:rgba(197,160,80,0.08);border-left:3px solid #c5a050;padding-left:8px;margin-left:-8px'
      :'border-top:1px solid #1e3a5f;padding:10px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px';
    var loadBtn=isActive
      ?'<span data-id="'+s.id+'" data-act="load" style="padding:4px 10px;background:#c5a050;color:#0d1b2e;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Active</span>'
      :'<span data-id="'+s.id+'" data-act="load" style="padding:4px 10px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Load</span>';
    var saveBtn=isActive
      ?'<span data-id="'+s.id+'" data-act="overwrite" style="padding:4px 9px;background:#1e3a5f;color:#2ecc71;border-radius:4px;font-size:13px;cursor:pointer" title="Update save">&#128190;</span>'
      :'';
    return '<div style="'+rowStyle+'">'
      +'<div style="flex:1;min-width:0">'
      +'<font color="#ffffff" style="font-size:12px;font-weight:600">'+escHtml(s.label)+'</font>'
      +'<font color="#7a9bbf" style="font-size:10px"> &#183; '+ltLabel+'</font><br>'
      +'<font color="'+cfCol+'" style="font-size:11px;font-weight:700">'+fms(dispCF)+'/mo</font>'
      +'<font color="#7a9bbf" style="font-size:10px"> &#183; '+fm(dispExtract)+' out'
      +(s.savedLTV!==undefined?' &#183; '+s.savedLTV+'% LTV':'')+'</font>'
      +'</div>'
      +'<span style="display:flex;gap:5px;flex-shrink:0">'
      +loadBtn+saveBtn
      +'<span data-id="'+s.id+'" data-act="print" style="padding:4px 9px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:13px;cursor:pointer" title="Print">&#128424;</span>'
      +'<span data-id="'+s.id+'" data-act="del" style="padding:4px 9px;background:#1e3a5f;color:#e74c3c;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer" title="Delete">&#10005;</span>'
      +'</span>'
      +'</div>';
  }

  function renderSaves(){
    var arr=loadSaves();
    var list=gi('eec-saves-list');
    if(!list) return;
    var countEl=gi('eec-saves-count');
    if(countEl) countEl.innerHTML='SAVED: '+arr.length;
    if(!arr.length){list.innerHTML='<font color="#7a9bbf" style="font-size:11px">No saved scenarios yet.</font>';return;}
    var html=''; for(var i=0;i<arr.length;i++) html+=saveCard(arr[i],String(arr[i].id)===String(activeId));
    list.innerHTML=html;
  }

  // ── Inject saves UI (RIC pattern) ─────────────────────────────────────────
  function injectSavesUI(){
    var panelAnchor=gi('eec-saves-panel-anchor');
    if(panelAnchor){
      panelAnchor.innerHTML=''
        +'<input type="file" id="eec-import-input" accept=".json,application/json" style="display:none">'
        +'<div style="background:#162236;border-radius:10px;margin-bottom:12px;overflow:hidden">'
        +'<div id="hdr-sv" style="padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between">'
        +'<font id="eec-saves-count" color="#ffffff" style="font-size:11px;font-weight:700;letter-spacing:.08em">SAVED: 0</font>'
        +'<span style="display:flex;align-items:center;gap:8px">'
        +'<span id="eec-print-all" style="font-size:14px;cursor:pointer;padding:3px 7px;background:#1e3a5f;color:#c5a050;border-radius:4px" title="Print all">&#128424;</span>'
        +'<span id="eec-btn-export" style="font-size:15px;cursor:pointer;padding:2px 7px;background:#1e3a5f;color:#c5a050;border-radius:4px;line-height:1.4" title="Export JSON">&#11014;</span>'
        +'<label for="eec-import-input" style="font-size:15px;cursor:pointer;padding:2px 7px;background:#1e3a5f;color:#c5a050;border-radius:4px;line-height:1.4;display:inline-block" title="Import JSON">&#11015;</label>'
        +'<font id="arr-sv" color="#7a9bbf" style="font-size:13px">&#9658;</font>'
        +'</span></div>'
        +'<div id="body-sv" style="display:none;padding:0 16px 16px">'
        +'<div id="eec-saves-list"><font color="#7a9bbf" style="font-size:11px">No saved scenarios yet.</font></div>'
        +'</div></div>';

      initToggle('hdr-sv','body-sv','arr-sv');
      gi('eec-print-all').addEventListener('click',function(e){e.stopPropagation();printReport(null);});
      gi('eec-btn-export').addEventListener('click',function(e){e.stopPropagation();doExport();});
      gi('eec-import-input').addEventListener('change',function(){handleImportFile(this.files[0]);this.value='';});

      gi('body-sv').addEventListener('click',function(e){
        var el=e.target.closest('[data-act]');
        if(!el) return;
        var id=el.getAttribute('data-id');  // keep as STRING — parseInt corrupts large timestamps
        var act=el.getAttribute('data-act');
        if(act==='load'){
          var arr=loadSaves();
          for(var k=0;k<arr.length;k++){
            if(String(arr[k].id)===id){
              applyInputs(arr[k].inp, arr[k].id, arr[k].savedExtract||0);
              renderSaves();
              var wrap=gi('eec-wrap'); if(wrap) wrap.scrollIntoView({behavior:'smooth',block:'start'});
              break;
            }
          }
        } else if(act==='overwrite'){
          doOverwrite(id);
        } else if(act==='print'){
          printReport([id]);
        } else if(act==='del'){
          if(String(activeId)===id) activeId=null;
          writeSaves(loadSaves().filter(function(x){return String(x.id)!==id;})); renderSaves();
        }
      });
      renderSaves();
    }

    var saveAnchor=gi('eec-save-btn-anchor');
    if(saveAnchor){
      saveAnchor.innerHTML='<span id="eec-btn-save" style="display:inline-block;font-size:18px;cursor:pointer;padding:3px 9px;background:#c5a050;color:#0d1b2e;border-radius:6px;line-height:1.3" title="Save scenario">&#128190;</span>';
      gi('eec-btn-save').addEventListener('click',doSave);
    }
  }

  function wireInputs(){
    ['balance','propval','refirate','rent','taxes','ins','hoa','mgmt','maint'].forEach(function(id){
      var el=gi(id); if(el) el.addEventListener('input',run);
    });
    var lt=gi('loantype'); if(lt) lt.addEventListener('change',run);
    var sl=gi('slider'); if(sl) sl.addEventListener('input',updateSlider);
  }

  function init(){
    applyInputStyles();
    injectSavesUI();
    wireInputs();
    run();
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}
  else{init();}

})();
