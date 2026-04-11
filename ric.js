// ric.js — REI Calc external script
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

  function eqAt(yr,loan,mr,mpi,price,appr){
    var pv=price*Math.pow(1+appr/100,yr),bal=loan;
    for(var m=0;m<yr*12;m++){var i=bal*mr;bal=Math.max(0,bal-(mpi-i));}
    return{pv:pv,eq:pv-bal};
  }

  function run(){
    var price=gv('price'),down=gv('down'),rent=gv('rent'),rate=gv('rate'),appr=gv('appr'),
        vac=gv('vacancy'),taxes=gv('taxes'),ins=gv('ins'),maint=gv('maint'),
        hoa=gv('hoa'),mgmt=gv('mgmt'),term=gv('term')||30;
    if(!price){price=500000;down=100000;rent=3000;rate=6.5;appr=5;vac=5;taxes=3000;ins=1200;maint=1200;hoa=150;mgmt=0;term=30;}

    set('dpct',price>0?(down/price*100).toFixed(1)+'% of purchase price':'');
    set('th','\u2248 '+fm(taxes/12)+'/mo');
    set('ih','\u2248 '+fm(ins/12)+'/mo');
    set('mh','\u2248 '+fm(maint/12)+'/mo');

    var loan=Math.max(price-down,0),mr=rate/100/12,np=term*12,mpi=0;
    if(mr>0&&loan>0)mpi=loan*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);

    var effRent=rent*(1-vac/100),mgmtFee=effRent*mgmt/100;
    var totalExp=mpi+taxes/12+ins/12+maint/12+hoa+mgmtFee;
    var mcf=effRent-totalExp,coc=down>0?(mcf*12/down)*100:0;

    var e3=eqAt(3,loan,mr,mpi,price,appr);
    var e5=eqAt(5,loan,mr,mpi,price,appr);
    var e7=eqAt(7,loan,mr,mpi,price,appr);
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

  function init(){
    applyInputStyles();
    initToggle('hdr-eq','body-eq','arr-eq');
    initToggle('hdr-mo','body-mo','arr-mo');
    run();
    var ids=['price','down','rent','rate','appr','vacancy','taxes','ins','maint','hoa','mgmt','term'];
    for(var i=0;i<ids.length;i++){
      var el=gi(ids[i]);if(el)el.addEventListener('input',run);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else {
    init();
  }
  setTimeout(run,300);
})();
