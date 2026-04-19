// eec.js — Equity Extraction Calculator
// v1.8.4 | 2026-04-18 | Remove setTimeout(run,300) — was overwriting slider after Load;
//                        force slider.value+updateSlider() after run() in applyInputs
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
    var binding=(maxLoanCF<=maxLoanLTV&&maxLoanCF>=0)?'CF limit':'80% LTV';
    if(maxCashOut===0) binding='no cash-out';
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
    setTxt('slider-label',fm(extract)+' extracted');
    setTxt('slider-loan',fm(newLoan));
    setTxt('slider-pmt',fm(newPmt));
    setTxt('slider-cf',fms(cf));
    setColor('slider-cf',cf>=0?'#2ecc71':'#e74c3c');
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
    var rec={
      id:Date.now(), label:label.trim(), savedAt:new Date().toLocaleDateString(),
      loantype:inp.loantype, inp:inp,
      maxCashOut:res.maxCashOut, newCF:res.newCF, binding:res.binding,
      savedExtract:savedExtract, savedCF:savedCF
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
    arr[idx].inp=inp; arr[idx].maxCashOut=res.maxCashOut;
    arr[idx].newCF=res.newCF; arr[idx].binding=res.binding;
    arr[idx].loantype=inp.loantype; arr[idx].savedAt=new Date().toLocaleDateString();
    arr[idx].savedExtract=savedExtract; arr[idx].savedCF=savedCF;
    writeSaves(arr); renderSaves();
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
      var cfCol=s.newCF>=0?'#16a34a':'#dc2626';
      var ltLabel=inp.loantype==='30io'?'Interest Only':'30yr Fixed';
      rows+='<div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;page-break-inside:avoid">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">'
        +'<div><h2 style="margin:0;font-size:16px;color:#0d1b2e">'+escHtml(s.label)+'</h2>'
        +'<p style="margin:3px 0 0;font-size:11px;color:#64748b">Saved '+escHtml(s.savedAt)+' &middot; '+ltLabel+' &middot; '+escHtml(s.binding)+'</p></div>'
        +'<div style="display:flex;gap:20px;flex-shrink:0">'
        +'<div style="text-align:right;border-right:1px solid #e2e8f0;padding-right:20px">'
        +'<div style="font-size:22px;font-weight:700;color:#0d1b2e">'+fm(s.maxCashOut)+'</div>'
        +'<div style="font-size:11px;color:#64748b">max cash-out</div></div>'
        +'<div style="text-align:right">'
        +'<div style="font-size:22px;font-weight:700;color:'+cfCol+'">'+fms(s.newCF)+'/mo</div>'
        +'<div style="font-size:11px;color:#64748b">CF at max extraction</div></div>'
        +'</div></div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<tr><td style="padding:5px 8px;color:#555;width:35%">Loan balance</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm(inp.balance)+'</td>'
        +'<td style="padding:5px 8px;color:#555;width:35%">Property value</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm(inp.propval)+'</td></tr>'
        +'<tr style="background:#f8fafc"><td style="padding:5px 8px;color:#555">Refi rate</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+inp.refirate+'%</td>'
        +'<td style="padding:5px 8px;color:#555">Gross rent</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm(inp.rent)+'/mo</td></tr>'
        +'<tr><td style="padding:5px 8px;color:#555">Taxes + ins</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm((inp.taxes+inp.ins)/12)+'/mo</td>'
        +'<td style="padding:5px 8px;color:#555">HOA/mo</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm(inp.hoa)+'</td></tr>'
        +'<tr style="background:#f8fafc"><td style="padding:5px 8px;color:#555">Mgmt/mo</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm(inp.mgmt)+'</td>'
        +'<td style="padding:5px 8px;color:#555">Maint/yr</td>'
        +'<td style="padding:5px 8px;font-weight:600">'+fm(inp.maint)+'</td></tr>'
        +'</table></div>';
    }
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Equity Extraction &#8212; Scenarios</title>'
      +'<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#0d1b2e}'
      +'.hdr{text-align:center;border-bottom:3px solid #c5a050;padding-bottom:14px;margin-bottom:24px}'
      +'.hdr h1{font-size:20px;margin:0}.hdr p{font-size:11px;color:#666;margin:4px 0 0}'
      +'@media print{body{padding:0}}</style></head><body>'
      +'<div class="hdr"><h1>Equity Extraction &#8212; Scenario Comparison</h1>'
      +'<p>Realty 25 AZ &middot; '+new Date().toLocaleDateString()+'</p></div>'
      +rows
      +'<p style="font-size:9px;color:#999;text-align:center;margin-top:20px">For informational purposes only. Not financial advice. Realty 25 AZ &middot; realty25az.com</p>'
      +'</body></html>';
    var blob=new Blob([html],{type:'text/html'});
    var url=URL.createObjectURL(blob);
    var w=window.open(url,'_blank');
    if(w){w.addEventListener('load',function(){w.print();});}
    else{var a=document.createElement('a');a.href=url;a.download='EEC-Report.html';document.body.appendChild(a);a.click();document.body.removeChild(a);}
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
      +'<font color="#7a9bbf" style="font-size:10px"> &#183; '+fm(dispExtract)+' out</font>'
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
