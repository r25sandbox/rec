// ric.js — REI Calc external script
// v5.0  2026-04-19  Clean rewrite matching EEC v1.8.7 pattern exactly.
//                   No getLoanSelect, no data-rid, no run(inp), no setTimeout.
//                   applyInputs uses sv() then run() — identical to EEC.
//                   wireInputs uses forEach. initToggle ignores button clicks.
//                   taxes/ins/maint styled inline in HTML (no class=ri) to
//                   prevent setAttribute rebuilding hint-sibling inputs.
//                   // Commit: v5.0 clean rewrite matching EEC pattern exactly

(function(){

  // ── Helpers ───────────────────────────────────────────────────────────────
  function gi(id){ return document.getElementById(id); }
  function gv(id){ var el=gi(id); return el?parseFloat(el.value)||0:0; }
  function gs(id){ var el=gi(id); return el?el.value:'30fixed'; }
  function fm(n){ return '$'+Math.round(Math.abs(n)).toLocaleString(); }
  function fms(n){ return (n<0?'-':'')+fm(n); }
  function pc(n){ return n.toFixed(2)+'%'; }
  function set(id,txt,col){ var el=gi(id); if(!el)return; el.textContent=txt; if(col)el.color=col; }
  function escHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function applyInputStyles(){
    var s='width:100%;margin-top:4px;padding:7px 8px;background:#0d1b2e;color:#ffffff;'+
          'border:1px solid #2a4a6b;border-radius:6px;font-size:12px;font-family:inherit;box-sizing:border-box';
    var els=document.getElementsByClassName('ri');
    for(var i=0;i<els.length;i++) els[i].setAttribute('style',s);
  }

  function initToggle(hdrId,bodyId,arrId){
    var hdr=gi(hdrId),body=gi(bodyId),arr=gi(arrId);
    if(!hdr||!body||!arr) return;
    hdr.addEventListener('click',function(e){
      if(e.target.closest('[data-act],[id^="btn-"],[id$="-btn"]')) return;
      var open=body.style.display==='block';
      body.style.display=open?'none':'block';
      arr.textContent=open?'\u25B6':'\u25BC';
    });
  }

  // ── Equity calc ───────────────────────────────────────────────────────────
  function eqAt(yr,loan,mr,mpi,price,appr,io){
    var pv=price*Math.pow(1+appr/100,yr),bal=loan;
    if(!io){ for(var m=0;m<yr*12;m++){var i=bal*mr;bal=Math.max(0,bal-(mpi-i));} }
    return{pv:pv,eq:pv-bal};
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  function run(){
    var price=gv('price'),down=gv('down'),rent=gv('rent'),rate=gv('rate'),appr=gv('appr'),
        vac=gv('vacancy'),taxes=gv('taxes'),ins=gv('ins'),maint=gv('maint'),
        hoa=gv('hoa'),mgmt=gv('mgmt');
    var ltEl=gi('loantype'),loantype=ltEl?ltEl.value:'30fixed';
    if(!price){price=500000;down=100000;rent=3000;rate=6.5;appr=5;vac=5;
               taxes=3000;ins=1200;maint=1200;hoa=150;mgmt=0;loantype='30fixed';}

    set('th','\u2248 '+fm(taxes/12)+'/mo');
    set('ih','\u2248 '+fm(ins/12)+'/mo');
    set('mh','\u2248 '+fm(maint/12)+'/mo');
    var ltvEl=gi('ltv-pct'),downEl=gi('down-pct');
    if(ltvEl&&price>0) ltvEl.textContent=Math.round((price-down)/price*100)+'%';
    if(downEl&&price>0) downEl.textContent=Math.round(down/price*100)+'%';

    var loan=Math.max(price-down,0),mr=rate/100/12,np=360,mpi=0;
    var io=loantype==='30io';
    if(io){ mpi=loan*mr; }
    else{ if(mr>0&&loan>0) mpi=loan*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1); }

    var effRent=rent*(1-vac/100),mgmtFee=mgmt;
    var totalExp=mpi+taxes/12+ins/12+maint/12+hoa+mgmtFee;
    var mcf=effRent-totalExp,coc=down>0?(mcf*12/down)*100:0;

    var e3=eqAt(3,loan,mr,mpi,price,appr,io);
    var e5=eqAt(5,loan,mr,mpi,price,appr,io);
    var e7=eqAt(7,loan,mr,mpi,price,appr,io);
    function cagr(e,yr){return down>0&&e.eq>0?(Math.pow(e.eq/down,1/yr)-1)*100:0;}

    set('m1v',fms(mcf),mcf>=0?'#2ecc71':'#e74c3c');
    set('m1s',pc(coc)+' CoC');
    set('m2v',fm(e3.eq)); set('m2s',pc(cagr(e3,3))+' CAGR');
    set('m3v',fm(e5.eq)); set('m3s',pc(cagr(e5,5))+' CAGR');
    set('m4v',fm(e7.eq)); set('m4s',pc(cagr(e7,7))+' CAGR');

    set('p3',fm(price*Math.pow(1+appr/100,3)));
    set('p5',fm(price*Math.pow(1+appr/100,5)));
    set('p7',fm(price*Math.pow(1+appr/100,7)));

    set('b1',fm(effRent)); set('b1h',vac+'% vacancy applied');
    set('b2',fm(mpi)); set('b3',fm(taxes/12+ins/12));
    set('b4',fm(maint/12)); set('b5',fm(hoa+mgmtFee)); set('b6',fm(totalExp));
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  var SAVES_KEY='rc_saves';
  var activeId=null;

  function loadSaves(){ try{return JSON.parse(localStorage.getItem(SAVES_KEY)||'[]');}catch(e){return[];} }
  function writeSaves(arr){ try{localStorage.setItem(SAVES_KEY,JSON.stringify(arr));}catch(e){} }

  function currentInputs(){
    var ltEl=gi('loantype');
    return{price:gv('price'),down:gv('down'),rent:gv('rent'),rate:gv('rate'),appr:gv('appr'),
           vac:gv('vacancy'),taxes:gv('taxes'),ins:gv('ins'),maint:gv('maint'),
           hoa:gv('hoa'),mgmt:gv('mgmt'),loantype:ltEl?ltEl.value:'30fixed'};
  }

  function computeSnapshot(inp){
    var loan=Math.max(inp.price-inp.down,0),mr=inp.rate/100/12,np=360,mpi=0;
    var io=inp.loantype==='30io';
    if(io){mpi=loan*mr;}else{if(mr>0&&loan>0)mpi=loan*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);}
    var effRent=inp.rent*(1-inp.vac/100),mgmtFee=inp.mgmt;
    var totalExp=mpi+inp.taxes/12+inp.ins/12+inp.maint/12+inp.hoa+mgmtFee;
    var mcf=effRent-totalExp,coc=inp.down>0?(mcf*12/inp.down)*100:0;
    var e3=eqAt(3,loan,mr,mpi,inp.price,inp.appr,io);
    var cagr3=inp.down>0&&e3.eq>0?(Math.pow(e3.eq/inp.down,1/3)-1)*100:0;
    return{mcf:mcf,coc:coc,cagr3:cagr3};
  }

  function applyInputs(inp,id){
    function sv(elId,v){var el=gi(elId);if(el&&v!==undefined&&v!==null)el.value=v;}
    sv('price',inp.price); sv('down',inp.down); sv('rent',inp.rent);
    sv('rate',inp.rate); sv('appr',inp.appr); sv('vacancy',inp.vac);
    sv('taxes',inp.taxes); sv('ins',inp.ins); sv('maint',inp.maint);
    sv('hoa',inp.hoa); sv('mgmt',inp.mgmt);
    var lt=gi('loantype'); if(lt&&inp.loantype) lt.value=inp.loantype;
    activeId=id||null;
    run();
    renderSaves();
  }

  function doSave(){
    var label=prompt('Name this calculation (e.g. address or scenario):','');
    if(!label||!label.trim()) return;
    var inp=currentInputs();
    var snap=computeSnapshot(inp);
    var rec={id:Date.now(),label:label.trim(),savedAt:new Date().toLocaleDateString(),
             loantype:inp.loantype,inp:inp,mcf:snap.mcf,coc:snap.coc,cagr3:snap.cagr3};
    var arr=loadSaves(); arr.unshift(rec); writeSaves(arr);
    activeId=null;
    renderSaves();
    var body=gi('body-sv'),arrEl=gi('arr-sv');
    if(body&&body.style.display!=='block'){body.style.display='block';if(arrEl)arrEl.textContent='\u25BC';}
  }

  function doOverwrite(id){
    var arr=loadSaves();
    var idx=-1; for(var i=0;i<arr.length;i++){if(String(arr[i].id)===String(id)){idx=i;break;}}
    if(idx<0) return;
    var inp=currentInputs();
    var snap=computeSnapshot(inp);
    arr[idx].inp=inp; arr[idx].mcf=snap.mcf; arr[idx].coc=snap.coc; arr[idx].cagr3=snap.cagr3;
    arr[idx].loantype=inp.loantype; arr[idx].savedAt=new Date().toLocaleDateString();
    writeSaves(arr); renderSaves(); flashRow(id);
  }

  function flashRow(id){
    var list=gi('saves-list'); if(!list) return;
    var btns=list.querySelectorAll('[data-act="overwrite"]');
    for(var i=0;i<btns.length;i++){
      if(String(btns[i].getAttribute('data-id'))===String(id)){
        var row=btns[i].closest('div'); if(!row) return;
        var orig=row.style.background||'';
        row.style.transition='background 0.1s';
        row.style.background='rgba(46,204,113,0.25)';
        setTimeout(function(r,o){r.style.transition='background 0.6s';r.style.background=o;},120,row,orig);
        setTimeout(function(r){r.style.transition='';},720,row);
        return;
      }
    }
  }

  function doExport(){
    var arr=loadSaves();
    if(!arr.length){alert('No saved calculations to export.');return;}
    var blob=new Blob([JSON.stringify(arr,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='rei-calcs-'+new Date().toISOString().slice(0,10)+'.json';
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
        var body=gi('body-sv'),arrEl=gi('arr-sv');
        if(body){body.style.display='block';if(arrEl)arrEl.textContent='\u25BC';}
        alert('Imported '+added+' calculation'+(added!==1?'s':'')+'. '+(merged.length-added)+' duplicate(s) skipped.');
      }catch(err){alert('Import failed: '+err.message);}
    };
    reader.readAsText(file);
  }

  function printReport(ids){
    var all=loadSaves();
    var items=ids?all.filter(function(s){return ids.indexOf(String(s.id))>=0;}):all;
    if(!items.length) return;
    var rows='';
    for(var i=0;i<items.length;i++){
      var s=items[i];
      var mcfCol=s.mcf>=0?'#16a34a':'#dc2626';
      var ltLabel=s.loantype==='30io'?'Interest Only':'30yr Fixed';
      rows+='<div style="background:#fff;border:1px solid #e0ddd8;border-left:4px solid #c5a050;border-radius:0 10px 10px 0;overflow:hidden;margin-bottom:24px;page-break-inside:avoid">'
        +'<div style="padding:14px 20px;border-bottom:1px solid #e8e5e0;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-size:15px;font-weight:700;color:#0d1b2e">'+escHtml(s.label)+'</div>'
        +'<div style="font-size:10px;color:#999;margin-top:2px">'+ltLabel+' &middot; Saved '+escHtml(s.savedAt)+'</div></div>'
        +'<div style="text-align:right"><div style="font-size:26px;font-weight:700;color:'+mcfCol+'">'+fms(s.mcf)+'/mo</div>'
        +'<div style="font-size:10px;color:#888">'+pc(s.coc)+' Cash-on-Cash</div></div>'
        +'</div>'
        +'<div style="padding:14px 20px;background:#f9f8f5">'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<tr style="border-bottom:1px solid #e8e5e0">'
        +'<td style="padding:6px 8px;color:#888;width:16%">Price</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.price)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Down</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.down)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Rent/mo</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.rent)+'</td></tr>'
        +'<tr style="border-bottom:1px solid #e8e5e0">'
        +'<td style="padding:6px 8px;color:#888">Interest</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+s.inp.rate+'%</td>'
        +'<td style="padding:6px 8px;color:#888">Appr.</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+s.inp.appr+'%</td>'
        +'<td style="padding:6px 8px;color:#888">Vacancy</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+s.inp.vac+'%</td></tr>'
        +'<tr style="border-bottom:1px solid #e8e5e0">'
        +'<td style="padding:6px 8px;color:#888">Taxes/yr</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.taxes)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Insur./yr</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.ins)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Maint./yr</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.maint)+'</td></tr>'
        +'<tr>'
        +'<td style="padding:6px 8px;color:#888">HOA/mo</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.hoa)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Mgmt/mo</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+fm(s.inp.mgmt)+'</td>'
        +'<td style="padding:6px 8px;color:#888">Loan</td><td style="padding:6px 8px;font-weight:600;color:#0d1b2e">'+ltLabel+'</td></tr>'
        +'<tr style="background:#f4f2ec">'
        +'<td style="padding:6px 8px;color:#888">LTV</td><td style="padding:6px 8px;font-weight:700;color:#0d1b2e">'+Math.round((s.inp.price-s.inp.down)/s.inp.price*100)+'%</td>'
        +'<td style="padding:6px 8px;color:#888">Down</td><td style="padding:6px 8px;font-weight:700;color:#0d1b2e">'+Math.round(s.inp.down/s.inp.price*100)+'%</td>'
        +'<td></td><td></td></tr>'
        +'</table></div></div>';
    }
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>REI Calc - Property Comparison</title>'
      +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#0d1b2e;padding:32px;max-width:860px;margin:0 auto}'
      +'.page-hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;margin-bottom:28px;border-bottom:3px solid #0d1b2e}'
      +'.brand{font-size:20px;font-weight:700;color:#0d1b2e}.brand span{color:#c5a050}'
      +'.brand-sub{font-size:10px;color:#888;margin-top:3px;letter-spacing:.04em}'
      +'.page-date{font-size:11px;color:#888;text-align:right}'
      +'.page-ftr{margin-top:28px;padding-top:14px;border-top:1px solid #ddd;display:flex;justify-content:space-between}'
      +'.page-ftr span{font-size:9px;color:#aaa}'
      +'@media print{body{padding:16px}@page{margin:14mm}}</style></head><body>'
      +'<div class="page-hdr"><div><div class="brand">Realty <span>25 AZ</span></div>'
      +'<div class="brand-sub">ALIK LEVIN, BROKER &middot; 480.920.2273 &middot; REALTY25AZ.COM</div></div>'
      +'<div class="page-date"><strong style="font-size:13px">REI Property Comparison</strong><br>'+new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})+'</div>'
      +'</div>'+rows
      +'<div class="page-ftr"><span>Realty 25 AZ &middot; realty25az.com &middot; 480.920.2273</span>'
      +'<span>For informational purposes only. Not financial or investment advice.</span></div>'
      +'</body></html>';
    var blob=new Blob([html],{type:'text/html'});
    var url=URL.createObjectURL(blob);
    var w=window.open(url,'_blank');
    if(w){w.addEventListener('load',function(){w.print();});}
    else{var a=document.createElement('a');a.href=url;a.download='REI-Comparison.html';document.body.appendChild(a);a.click();document.body.removeChild(a);}
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  }

  function saveCard(s,isActive){
    var mcfCol=s.mcf>=0?'#2ecc71':'#e74c3c';
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
      +'<font color="#7a9bbf" style="font-size:10px"> &middot; '+ltLabel+'</font><br>'
      +'<font color="'+mcfCol+'" style="font-size:11px;font-weight:700">'+fms(s.mcf)+'/mo</font>'
      +'<font color="#7a9bbf" style="font-size:10px"> &middot; '+pc(s.coc)+' CoC &middot; '+pc(s.cagr3)+' CAGR@3Y</font>'
      +'</div>'
      +'<span style="display:flex;gap:5px;flex-shrink:0">'
      +loadBtn+saveBtn
      +'<span data-id="'+s.id+'" data-act="print" style="padding:4px 9px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:13px;cursor:pointer">&#128424;</span>'
      +'<span data-id="'+s.id+'" data-act="del" style="padding:4px 9px;background:#1e3a5f;color:#e74c3c;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">&#10005;</span>'
      +'</span></div>';
  }

  function renderSaves(){
    var arr=loadSaves();
    var list=gi('saves-list'); if(!list) return;
    var titleEl=gi('sv-title');
    if(titleEl) titleEl.textContent='SAVED: '+arr.length;
    if(!arr.length){list.innerHTML='<font color="#7a9bbf" style="font-size:11px">No saved calculations yet.</font>';return;}
    var html=''; for(var i=0;i<arr.length;i++) html+=saveCard(arr[i],String(arr[i].id)===String(activeId));
    list.innerHTML=html;
  }

  function injectSavesUI(){
    var panelAnchor=gi('saved-panel-anchor');
    if(panelAnchor){
      panelAnchor.innerHTML=''
        +'<input type="file" id="import-file-input" accept=".json,application/json" style="display:none">'
        +'<div style="background:#162236;border-radius:10px;margin-bottom:12px;overflow:hidden">'
        +'<div id="hdr-sv" style="padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between">'
        +'<font id="sv-title" color="#ffffff" style="font-size:11px;font-weight:700;letter-spacing:.08em">SAVED: 0</font>'
        +'<span style="display:flex;align-items:center;gap:8px">'
        +'<span id="print-all-btn" style="font-size:14px;cursor:pointer;padding:3px 8px;background:#1e3a5f;color:#c5a050;border-radius:4px;line-height:1" title="Print all">&#128424;</span>'
        +'<span id="btn-export" style="font-size:14px;cursor:pointer;padding:3px 8px;background:#1e3a5f;color:#c5a050;border-radius:4px;line-height:1" title="Export">&#11014;</span>'
        +'<label for="import-file-input" style="font-size:14px;cursor:pointer;padding:3px 8px;background:#1e3a5f;color:#c5a050;border-radius:4px;line-height:1;display:inline-block" title="Import">&#11015;</label>'
        +'<font id="arr-sv" color="#7a9bbf" style="font-size:13px">&#9658;</font>'
        +'</span></div>'
        +'<div id="body-sv" style="display:none;padding:0 16px 16px">'
        +'<div id="saves-list"><font color="#7a9bbf" style="font-size:11px">No saved calculations yet.</font></div>'
        +'</div></div>';

      initToggle('hdr-sv','body-sv','arr-sv');
      gi('print-all-btn').addEventListener('click',function(e){e.stopPropagation();printReport(null);});
      gi('btn-export').addEventListener('click',function(e){e.stopPropagation();doExport();});
      gi('import-file-input').addEventListener('change',function(){handleImportFile(this.files[0]);this.value='';});

      gi('body-sv').addEventListener('click',function(e){
        var el=e.target.closest('[data-act]'); if(!el) return;
        var id=el.getAttribute('data-id'); // keep as STRING
        var act=el.getAttribute('data-act');
        if(act==='load'){
          var arr=loadSaves();
          for(var k=0;k<arr.length;k++){
            if(String(arr[k].id)===id){
              applyInputs(arr[k].inp,arr[k].id);
              break;
            }
          }
        } else if(act==='overwrite'){
          doOverwrite(id);
        } else if(act==='print'){
          printReport([id]);
        } else if(act==='del'){
          if(String(activeId)===id) activeId=null;
          writeSaves(loadSaves().filter(function(x){return String(x.id)!==id;}));
          renderSaves();
        }
      });
      renderSaves();
    }

    var floatAnchor=gi('save-float-anchor');
    if(floatAnchor){
      floatAnchor.innerHTML='<div style="text-align:right;margin-bottom:8px">'
        +'<span id="btn-save" style="display:inline-block;font-size:18px;cursor:pointer;padding:4px 10px;background:#c5a050;color:#0d1b2e;border-radius:6px;line-height:1" title="Save current calc">&#128190;</span>'
        +'</div>';
      gi('btn-save').addEventListener('click',doSave);
    }
  }

  // ── Wire + Init ───────────────────────────────────────────────────────────
  function wireInputs(){
    ['price','down','rent','rate','appr','vacancy','taxes','ins','maint','hoa','mgmt'].forEach(function(id){
      var el=gi(id); if(el) el.addEventListener('input',run);
    });
    var lt=gi('loantype'); if(lt) lt.addEventListener('change',run);
  }

  function init(){
    applyInputStyles();
    injectSavesUI();
    document.addEventListener('touchmove',function(e){e.stopPropagation();},{passive:true});
    wireInputs();
    initToggle('hdr-eq','body-eq','arr-eq');
    initToggle('hdr-mo','body-mo','arr-mo');
    run();
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}
  else{init();}

})();
