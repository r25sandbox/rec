(function(){
  function gi(id){return document.getElementById(id);}
  function gv(id){var el=gi(id);return el?parseFloat(el.value)||0:0;}
  function fm(n){return '$'+Math.round(Math.abs(n)).toLocaleString();}
  function fms(n){return(n<0?'-':'')+fm(n);}
  function pc(n){return n.toFixed(2)+'%';}
  function set(id,txt,col){var el=gi(id);if(!el)return;el.textContent=txt;if(col)el.color=col;}

  function eqAt(yr,loan,mr,mpi,price,appr,io){
    var pv=price*Math.pow(1+appr/100,yr);
    var bal=io?loan:loan; // IO: balance stays flat
    if(!io){
      for(var m=0;m<yr*12;m++){var i=bal*mr;bal=Math.max(0,bal-(mpi-i));}
    }
    return{pv:pv,eq:pv-bal};
  }

  function run(){
    var price=gv('price'),down=gv('down'),rent=gv('rent'),rate=gv('rate'),appr=gv('appr'),
        vac=gv('vacancy'),taxes=gv('taxes'),ins=gv('ins'),maint=gv('maint'),
        hoa=gv('hoa'),mgmt=gv('mgmt');
    var ltEl=document.getElementById('loantype');
    var loantype=ltEl?ltEl.value:'30fixed';
    var term=30;

    
    set('th','≈ '+fm(taxes/12)+'/mo');
    set('ih','≈ '+fm(ins/12)+'/mo');
    set('mh','≈ '+fm(maint/12)+'/mo');

    var loan=Math.max(price-down,0),mr=rate/100/12,np=term*12,mpi=0;
    if(loantype==='30io'){
      // Interest only - payment is just monthly interest, no principal
      mpi=loan*mr;
    } else {
      // 30yr fixed amortizing
      if(mr>0&&loan>0)mpi=loan*(mr*Math.pow(1+mr,np))/(Math.pow(1+mr,np)-1);
    }

    var effRent=rent*(1-vac/100),mgmtFee=mgmt;
    var totalExp=mpi+taxes/12+ins/12+maint/12+hoa+mgmtFee;
    var mcf=effRent-totalExp,coc=down>0?(mcf*12/down)*100:0;

    var io=loantype==='30io';
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

    set('b1',fm(effRent));
    set('b2',fm(mpi));set('b3',fm(taxes/12+ins/12));
    set('b4',fm(maint/12));set('b5',fm(hoa+mgmtFee));set('b6',fm(totalExp));
  }

  run();
  var ids=['price','down','rent','rate','appr','vacancy','taxes','ins','maint','hoa','mgmt'];
  for(var i=0;i<ids.length;i++){
    var el=gi(ids[i]);
    if(el)el.addEventListener('input',run);
  }
})();
