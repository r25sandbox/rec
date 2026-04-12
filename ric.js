// ric.js — REI Calc external script
// v2.9  2026-04-12  Cache bust: script src ?v=29 in HTML embed
//                   Scroll fix: touch-action:pan-y + overscroll-behavior on outer div;
//                   touchmove stopPropagation in init() for Carrd sandbox scroll trap
//                   Control buttons: icons only, text labels removed (💾 🖨)
//                   // Commit: scroll fix, icon-only buttons, cache bust
// v2.8  2026-04-12  Saved panel moved to topmost position (above Cash Flow);
//                   Save + Print All buttons merged into panel header row
//                   // Commit: saved panel to top, save+print in header
// v2.7  2026-04-12  Saved calculations feature:
//                   - localStorage bookmarks (SAVES_KEY='rc_saves')
//                   - Save prompts free-text label, snapshots all inputs + results
//                   - Load restores all inputs + recalculates
//                   - Delete per save
//                   - Print one / Print all: Blob HTML → window.open → window.print()
//                   - UI fully injected by JS via saved-panel-anchor div
//                   // Commit: saved calculations - save, load, delete, print
// v2.6  2026-04-12  Removed dpct (down payment %) display entirely —
//                   persistent mobile alignment breaker across two sessions
//                   // Commit: remove dpct
// v2.5  2026-04-12  Label abbreviations: Purchase price→Price, Down payment→Down,
//                   Monthly rent→Rent/mo, Interest rate→Interest, Appreciation→Appr.,
//                   Annual taxes→Taxes/yr, Annual insurance→Insur./yr,
//                   Annual maintenance→Maint./yr, Monthly HOA→HOA/mo, Loan term→Term(yrs)
//                   // Commit: brutal label abbreviations for mobile alignment
// v2.4  2026-04-12  Monthly Payment→Monthly Breakdown; Cash Flow panel one-line layout;
//                   Term(yrs) number input→Loan dropdown (30yr Fixed / Interest Only);
//                   IO calc: mpi=loan*mr, balance flat, equity via appreciation only
//                   // Commit: monthly breakdown rename, one-line CF, loan dropdown
// v2.3  2026-04-12  Saved calculations: localStorage bookmarks, load, delete, print one / print all
//                   UI injected via JS (saves-anchor + saved-panel-anchor divs in HTML)
//                   // Commit: saved calculations feature
// v2.2  2026-04-11  Restored loan type dropdown (30yr fixed vs interest only);
//                   loantype change listener added; term input removed;
//                   cash flow panel one-line layout support
//                   // Commit: restore loantype dropdown + IO calc logic
// v2.1  2026-04-11  applyInputStyles(): styles all class="ri" inputs so HTML embed stays
//                   under Carrd's ~10k char Code embed limit
//                   // Commit: move input styles to JS to shrink embed
// v2.0  2026-04-11  Restructured layout support:
//                   - initToggle() for collapsible panels (addEventListener, Carrd-safe)
//                   - Equity now 3Y/5Y/7Y (matches value projection periods)
//                   - run() unchanged except e10→e7
//                   // Commit: collapsible panels + 7Y equity
// v1.x  2026-04-06  Initial external JS split, hardcoded defaults, setTimeout safety re-run
(function(){
  function gi(id){return document.getElementById(id);}
  function gv(id){var el=gi(id);return el?parseFloat(el.value)||0:0;}
  function fm(n){return '$'+Math.round(Math.abs(n)).toLocaleString();}
  function fms(n){return(n<0?'-':'')+fm(n);}
  function pc(n){return n.toFixed(2)+'%';}
  function set(id,txt,col){var el=gi(id);if(!el)return;el.textContent=txt;if(col)el.color=col;}

  function initToggle(hdrId,bodyId,arrId){
    var hdr=gi(hdrId),body=gi(bodyId),arr=gi(arrId);
    if(!hdr||!body||!arr)return;
    hdr.addEventListener('click',function(){
      var open=body.style.display==='block';
      body.style.display=open?'none':'block';
      arr.textContent=open?'\u25B6':'\u25BC';
    });
  }

  function eqAt(yr,loan,mr,mpi,price,appr,io){
    var pv=price*Math.pow(1+appr/100,yr),bal=loan;
    if(!io){
      for(var m=0;m<yr*12;m++){var i=bal*mr;bal=Math.max(0,bal-(mpi-i));}
    }
    return{pv:pv,eq:pv-bal};
  }

  function run(){
    var price=gv('price'),down=gv('down'),rent=gv('rent'),rate=gv('rate'),appr=gv('appr'),
        vac=gv('vacancy'),taxes=gv('taxes'),ins=gv('ins'),maint=gv('maint'),
        hoa=gv('hoa'),mgmt=gv('mgmt');
    var ltEl=gi('loantype'),loantype=ltEl?ltEl.value:'30fixed';
    if(!price){price=500000;down=100000;rent=3000;rate=6.5;appr=5;vac=5;taxes=3000;ins=1200;maint=1200;hoa=150;mgmt=0;}

    set('th','\u2248 '+fm(taxes/12)+'/mo');
    set('ih','\u2248 '+fm(ins/12)+'/mo');
    set('mh','\u2248 '+fm(maint/12)+'/mo');

    var loan=Math.max(price-down,0),mr=rate/100/12,np=360,mpi=0;
    var io=loantype==='30io';
    if(io){
      mpi=loan*mr;
    } else {
      if(mr>0&&loan>0)mpi=loan*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);
    }

    var effRent=rent*(1-vac/100),mgmtFee=effRent*mgmt/100;
    var totalExp=mpi+taxes/12+ins/12+maint/12+hoa+mgmtFee;
    var mcf=effRent-totalExp,coc=down>0?(mcf*12/down)*100:0;

    var e3=eqAt(3,loan,mr,mpi,price,appr,io);
    var e5=eqAt(5,loan,mr,mpi,price,appr,io);
    var e7=eqAt(7,loan,mr,mpi,price,appr,io);
    function cagr(e,yr){return down>0&&e.eq>0?(Math.pow(e.eq/down,1/yr)-1)*100:0;}

    set('m1v',fms(mcf),mcf>=0?'#2ecc71':'#e74c3c');
    set('m1s',pc(coc)+' CoC');
    set('m2v',fm(e3.eq));set('m2s',pc(cagr(e3,3))+' CAGR');
    set('m3v',fm(e5.eq));set('m3s',pc(cagr(e5,5))+' CAGR');
    set('m4v',fm(e7.eq));set('m4s',pc(cagr(e7,7))+' CAGR');

    set('p3',fm(price*Math.pow(1+appr/100,3)));
    set('p5',fm(price*Math.pow(1+appr/100,5)));
    set('p7',fm(price*Math.pow(1+appr/100,7)));

    set('b1',fm(effRent));set('b1h',vac+'% vacancy applied');
    set('b2',fm(mpi));set('b3',fm(taxes/12+ins/12));
    set('b4',fm(maint/12));set('b5',fm(hoa+mgmtFee));set('b6',fm(totalExp));
  }

  function applyInputStyles(){
    var s='width:100%;margin-top:4px;padding:7px 8px;background:#0d1b2e;color:#ffffff;border:1px solid #2a4a6b;border-radius:6px;font-size:12px;font-family:inherit;box-sizing:border-box';
    var els=document.getElementsByClassName('ri');
    for(var i=0;i<els.length;i++){els[i].setAttribute('style',s);}
  }

  // ── Saved calculations ──
  var SAVES_KEY='rc_saves';

  function loadSaves(){
    try{return JSON.parse(localStorage.getItem(SAVES_KEY)||'[]');}catch(e){return[];}
  }
  function writeSaves(arr){
    try{localStorage.setItem(SAVES_KEY,JSON.stringify(arr));}catch(e){}
  }

  function currentInputs(){
    var ltEl=gi('loantype');
    return{
      price:gv('price'),down:gv('down'),rent:gv('rent'),rate:gv('rate'),appr:gv('appr'),
      vac:gv('vacancy'),taxes:gv('taxes'),ins:gv('ins'),maint:gv('maint'),
      hoa:gv('hoa'),mgmt:gv('mgmt'),loantype:ltEl?ltEl.value:'30fixed'
    };
  }

  function applyInputs(inp){
    var map={price:'price',down:'down',rent:'rent',rate:'rate',appr:'appr',
             vac:'vacancy',taxes:'taxes',ins:'ins',maint:'maint',hoa:'hoa',mgmt:'mgmt'};
    for(var k in map){var el=gi(map[k]);if(el)el.value=inp[k]||0;}
    var lt=gi('loantype');if(lt)lt.value=inp.loantype||'30fixed';
    run();
  }

  function saveCard(s){
    var mcfCol=s.mcf>=0?'#2ecc71':'#e74c3c';
    var ltLabel=s.loantype==='30io'?'IO':'Fixed';
    return '<div style="border-top:1px solid #1e3a5f;padding:10px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">'
      +'<div style="flex:1;min-width:0">'
      +'<font color="#ffffff" style="font-size:12px;font-weight:600">'+escHtml(s.label)+'</font>'
      +'<font color="#7a9bbf" style="font-size:10px"> &middot; '+ltLabel+'</font><br>'
      +'<font color="'+mcfCol+'" style="font-size:11px;font-weight:700">'+fms(s.mcf)+'/mo</font>'
      +'<font color="#7a9bbf" style="font-size:10px"> &middot; '+pc(s.coc)+' CoC'
      +' &middot; '+pc(s.cagr3)+' CAGR@3Y</font>'
      +'</div>'
      +'<span style="display:flex;gap:6px;flex-shrink:0">'
      +'<span data-id="'+s.id+'" data-act="load" style="padding:4px 10px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Load</span>'
      +'<span data-id="'+s.id+'" data-act="print" style="padding:4px 10px;background:#1e3a5f;color:#c5a050;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">&#128424;</span>'
      +'<span data-id="'+s.id+'" data-act="del" style="padding:4px 10px;background:#1e3a5f;color:#e74c3c;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">&#10005;</span>'
      +'</span>'
      +'</div>';
  }

  function escHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  function renderSaves(){
    var arr=loadSaves();
    var list=gi('saves-list');
    if(!list)return;
    if(!arr.length){
      list.innerHTML='<font color="#7a9bbf" style="font-size:11px">No saved calculations yet.</font>';
      return;
    }
    var html='';
    for(var i=0;i<arr.length;i++)html+=saveCard(arr[i]);
    list.innerHTML=html;
  }

  function doSave(){
    var label=prompt('Name this calculation (e.g. address or scenario):','');
    if(!label||!label.trim())return;
    var inp=currentInputs();
    // compute results snapshot
    var loan=Math.max(inp.price-inp.down,0),mr=inp.rate/100/12,np=360,mpi=0;
    var io=inp.loantype==='30io';
    if(io){mpi=loan*mr;}else{if(mr>0&&loan>0)mpi=loan*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);}
    var effRent=inp.rent*(1-inp.vac/100),mgmtFee=effRent*inp.mgmt/100;
    var totalExp=mpi+inp.taxes/12+inp.ins/12+inp.maint/12+inp.hoa+mgmtFee;
    var mcf=effRent-totalExp,coc=inp.down>0?(mcf*12/inp.down)*100:0;
    var e3=eqAt(3,loan,mr,mpi,inp.price,inp.appr,io);
    var cagr3=inp.down>0&&e3.eq>0?(Math.pow(e3.eq/inp.down,1/3)-1)*100:0;
    var rec={id:Date.now(),label:label.trim(),savedAt:new Date().toLocaleDateString(),
             mcf:mcf,coc:coc,cagr3:cagr3,loantype:inp.loantype,inp:inp};
    var arr=loadSaves();
    arr.unshift(rec);
    writeSaves(arr);
    // open saves panel
    var body=gi('body-sv'),arr2=gi('arr-sv');
    if(body){body.style.display='block';}
    if(arr2){arr2.textContent='\u25BC';}
    renderSaves();
  }

  function printReport(ids){
    var all=loadSaves();
    var items=ids?all.filter(function(s){return ids.indexOf(s.id)>=0;}):all;
    if(!items.length)return;
    var rows='';
    for(var i=0;i<items.length;i++){
      var s=items[i];
      var mcfCol=s.mcf>=0?'#1a7a45':'#b91c1c';
      var ltLabel=s.loantype==='30io'?'Interest Only':'30yr Fixed';
      rows+='<div style="background:#fff;border:1px solid #ddd;border-radius:10px;padding:20px;margin-bottom:20px;page-break-inside:avoid">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c5a050;padding-bottom:10px;margin-bottom:14px">'
        +'<div><div style="font-size:16px;font-weight:700;color:#0d1b2e">'+escHtml(s.label)+'</div>'
        +'<div style="font-size:11px;color:#666;margin-top:2px">Saved '+s.savedAt+' &middot; '+ltLabel+'</div></div>'
        +'<div style="text-align:right"><div style="font-size:22px;font-weight:700;color:'+mcfCol+'">'+fms(s.mcf)+'/mo</div>'
        +'<div style="font-size:11px;color:#666">'+pc(s.coc)+' Cash-on-Cash</div></div></div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<tr><td style="padding:4px 8px;color:#555;width:33%">Price</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.price)+'</td>'
        +'<td style="padding:4px 8px;color:#555">Down</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.down)+'</td>'
        +'<td style="padding:4px 8px;color:#555">Rent/mo</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.rent)+'</td></tr>'
        +'<tr><td style="padding:4px 8px;color:#555">Interest</td><td style="padding:4px 8px;font-weight:600">'+s.inp.rate+'%</td>'
        +'<td style="padding:4px 8px;color:#555">Appr.</td><td style="padding:4px 8px;font-weight:600">'+s.inp.appr+'%</td>'
        +'<td style="padding:4px 8px;color:#555">Vacancy</td><td style="padding:4px 8px;font-weight:600">'+s.inp.vac+'%</td></tr>'
        +'<tr><td style="padding:4px 8px;color:#555">Taxes/yr</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.taxes)+'</td>'
        +'<td style="padding:4px 8px;color:#555">Insur./yr</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.ins)+'</td>'
        +'<td style="padding:4px 8px;color:#555">Maint./yr</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.maint)+'</td></tr>'
        +'<tr><td style="padding:4px 8px;color:#555">HOA/mo</td><td style="padding:4px 8px;font-weight:600">'+fm(s.inp.hoa)+'</td>'
        +'<td style="padding:4px 8px;color:#555">Mgmt</td><td style="padding:4px 8px;font-weight:600">'+s.inp.mgmt+'%</td>'
        +'<td></td><td></td></tr>'
        +'</table></div>';
    }
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>REI Calc — Saved Properties</title>'
      +'<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#0d1b2e}'
      +'.hdr{text-align:center;border-bottom:3px solid #c5a050;padding-bottom:14px;margin-bottom:24px}'
      +'.hdr h1{font-size:20px;color:#0d1b2e;margin:0}.hdr p{font-size:11px;color:#666;margin:4px 0 0}'
      +'@media print{body{padding:0}}</style></head><body>'
      +'<div class="hdr"><h1>REI Calculator — Property Comparison</h1><p>Realty 25 AZ &middot; '+new Date().toLocaleDateString()+'</p></div>'
      +rows
      +'<p style="font-size:9px;color:#999;text-align:center;margin-top:20px">For informational purposes only. Not financial advice. Realty 25 AZ · realty25az.com</p>'
      +'</body></html>';
    var blob=new Blob([html],{type:'text/html'});
    var url=URL.createObjectURL(blob);
    var w=window.open(url,'_blank');
    if(w){w.addEventListener('load',function(){w.print();});}
    else{var a=document.createElement('a');a.href=url;a.download='REI-Report.html';document.body.appendChild(a);a.click();document.body.removeChild(a);}
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  }

  function injectSavesUI(){
    var panelAnchor=gi('saved-panel-anchor');
    if(panelAnchor){
      panelAnchor.innerHTML='<div style="background:#162236;border-radius:10px;margin-bottom:12px;overflow:hidden">'
        +'<div id="hdr-sv" style="padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between">'
        +'<font color="#ffffff" style="font-size:11px;font-weight:700;letter-spacing:.08em">SAVED CALCULATIONS</font>'
        +'<span style="display:flex;align-items:center;gap:8px">'
        +'<span id="btn-save" style="font-size:14px;cursor:pointer;padding:3px 8px;background:#c5a050;color:#0d1b2e;border-radius:4px;line-height:1" title="Save calc">&#128190;</span>'
        +'<span id="print-all-btn" style="font-size:14px;cursor:pointer;padding:3px 8px;background:#1e3a5f;color:#c5a050;border-radius:4px;line-height:1" title="Print all">&#128424;</span>'
        +'<font id="arr-sv" color="#7a9bbf" style="font-size:13px">&#9658;</font>'
        +'</span></div>'
        +'<div id="body-sv" style="display:none;padding:0 16px 16px">'
        +'<div id="saves-list"><font color="#7a9bbf" style="font-size:11px">No saved calculations yet.</font></div>'
        +'</div></div>';
      initToggle('hdr-sv','body-sv','arr-sv');
      gi('btn-save').addEventListener('click',function(e){e.stopPropagation();doSave();});
      gi('print-all-btn').addEventListener('click',function(e){e.stopPropagation();printReport(null);});
      gi('saves-list').addEventListener('click',function(e){
        var el=e.target.closest('[data-act]');
        if(!el)return;
        var id=parseInt(el.getAttribute('data-id'));
        var act=el.getAttribute('data-act');
        if(act==='load'){
          var arr=loadSaves();
          var s=arr.filter(function(x){return x.id===id;})[0];
          if(s)applyInputs(s.inp);
        } else if(act==='print'){
          printReport([id]);
        } else if(act==='del'){
          var arr2=loadSaves().filter(function(x){return x.id!==id;});
          writeSaves(arr2);renderSaves();
        }
      });
      renderSaves();
    }
  }

  function init(){
    applyInputStyles();
    injectSavesUI();
    initToggle('hdr-eq','body-eq','arr-eq');
    initToggle('hdr-mo','body-mo','arr-mo');
    // Fix scroll trap in Carrd sandbox embed
    document.addEventListener('touchmove',function(e){e.stopPropagation();},{passive:true});
    run();
    var ids=['price','down','rent','rate','appr','vacancy','taxes','ins','maint','hoa','mgmt'];
    for(var i=0;i<ids.length;i++){
      var el=gi(ids[i]);if(el)el.addEventListener('input',run);
    }
    var lt=gi('loantype');if(lt)lt.addEventListener('change',run);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else {
    init();
  }
  setTimeout(run,300);
})();
