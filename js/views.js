'use strict';
/* views.js: header, sign-in, My trips, Payments, API console, Database view, event wiring and boot */
/* ============ Extra route: activity timeline ============ */
defRoute('GET','/api/v1/users/me/activity','auth','Booking and payment activity',{auth:true},({user})=>({data:{events:DB.audit.filter(e=>e.user_id===user.user_id).sort((a,b)=>b.ts-a.ts).slice(0,60).map(e=>({...e,pnr:pnr(e.booking_id),at:new Date(e.ts).toISOString()}))}}));

/* ============ Header, navigation, auth ============ */
let DEV=false;
const NAV=[['book','plane','Book flights'],['trips','ticket','My trips'],['payments','wallet','Payments'],['api','code','API gateway'],['db','db','Database']];
function renderHeader(){
  const u=S.user;
  $('#top').innerHTML=`<div class="top-in"><a class="logo" href="#" data-act="go" data-tab="book"><span class="logo-mark">${ic('plane',18)}</span>Skyline</a>
  <nav class="nav" aria-label="Main">${NAV.filter(n=>DEV||!['api','db'].includes(n[0])).map(([k,i,l])=>`<button data-act="go" data-tab="${k}" ${S.tab===k?'aria-current="page"':''}>${ic(i,17)}<span>${l}</span></button>`).join('')}</nav>
  <div class="who"><button class="icon-btn" data-act="theme" aria-label="Switch colour theme">${ic(document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches)?'sun':'moon',18)}</button>
  ${u?`<span class="avatar" title="${esc(u.email)}">${esc(u.first_name[0]+u.last_name[0])}</span><span class="uname">${esc(u.first_name)}</span><button class="icon-btn" data-act="signout" aria-label="Sign out">${ic('logout',18)}</button>`:`<button class="btn primary sm" data-act="openAuth">Sign in</button>`}</div></div>`;
}
function go(tab){if(!DEV&&(tab==='api'||tab==='db'))tab='book';S.tab=tab;renderHeader();window.scrollTo(0,0);({book:viewBook,trips:viewTrips,payments:viewPayments,api:viewApi,db:viewDb})[tab]()}
function gate(title,text){
  if(S.user)return true;
  $('#view').innerHTML=`<div class="wrap"><div class="empty gate"><div class="gate-ic">${ic('user',28)}</div><h2>${title}</h2><p>${text}</p><div class="row"><button class="btn primary" data-act="openAuth">Sign in</button><button class="btn ghost" data-act="demo">Use the demo traveller</button></div></div></div>`;
  return false;
}
let afterAuth=null;
function authHTML(mode){
  const inn=mode==='in';
  return`<h2>${inn?'Welcome back':'Create your account'}</h2><div class="seg"><button class="${inn?'on':''}" data-act="authMode" data-m="in">Sign in</button><button class="${inn?'':'on'}" data-act="authMode" data-m="up">Create account</button></div>
  <form id="af" data-mode="${mode}" class="formgrid one" autocomplete="on">
  ${inn?'':`<div class="two"><label class="fld"><span>First name</span><input name="first_name" required></label><label class="fld"><span>Last name</span><input name="last_name" required></label></div><label class="fld"><span>Phone number</span><input name="phone_number" type="tel" placeholder="+91 90000 00000"></label>`}
  <label class="fld"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
  <label class="fld"><span>Password</span><input name="password" type="password" required minlength="8" autocomplete="${inn?'current-password':'new-password'}"></label>
  <p class="err" id="autherr" role="alert" hidden></p>
  <button class="btn primary block" type="submit">${inn?'Sign in':'Create account'}</button></form>
  <div class="demo-box"><b>Just exploring?</b><p>The demo traveller comes with past trips, an upcoming Dubai flight and a cancelled booking with a refund.</p><button class="btn ghost block" data-act="demo">Continue as Aarav (demo@skyline.app)</button></div>`;
}
function openAuth(cb,mode='in'){afterAuth=typeof cb==='function'?cb:null;modal(authHTML(mode))}
async function authWith(mode,data){
  const r=mode==='in'?await api('POST','/api/v1/auth/login',{email:data.email,password:data.password},{quiet:true}):await api('POST','/api/v1/auth/register',data,{quiet:true});
  if(!r.ok){const e=$('#autherr');if(e){e.textContent=r.body.error.message;e.hidden=false}return}
  S.token=r.body.token;S.user=r.body.user;save();closeModal();toast('Welcome, '+S.user.first_name);
  const cb=afterAuth;afterAuth=null;renderHeader();if(cb)cb();else go(S.tab);
}
Object.assign(ACT,{
  go(t){go(t.dataset.tab)},openAuth(){openAuth()},authMode(t){modal(authHTML(t.dataset.m))},
  demo(){authWith('in',{email:'demo@skyline.app',password:'demo1234'})},
  signout(){S.token=null;S.user=null;S.flow=null;S.trips.data=null;save();toast('Signed out');go('book')},
  theme(){const r=document.documentElement,dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('skyline.theme',r.dataset.theme)}catch(e){}renderHeader()},
  copy(t){copyText(t.dataset.t)}
});

/* ============ My trips ============ */
async function viewTrips(){
  if(!gate('Sign in to see your trips','Your bookings, boarding passes and refunds live here.'))return;
  $('#view').innerHTML='<div class="wrap"><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:320px;margin-top:16px"></div></div>';
  const[b,s,a]=await Promise.all([api('GET','/api/v1/bookings'),api('GET','/api/v1/users/me/summary'),api('GET','/api/v1/users/me/activity')]);
  if(S.tab!=='trips')return;if(!b.ok){return}
  S.trips.data=b.body.bookings;S.trips.sum=s.body;S.trips.act=a.body.events;renderTrips();
}
const depOf=b=>Date.parse(b.flight.departure_date_time);
function tripGroups(){const bs=S.trips.data,now=Date.now();return{
  upcoming:bs.filter(b=>b.status==='Confirmed'&&depOf(b)>=now).sort((x,y)=>depOf(x)-depOf(y)),
  pending:bs.filter(b=>b.status==='Pending'),
  past:bs.filter(b=>b.status==='Confirmed'&&depOf(b)<now).sort((x,y)=>depOf(y)-depOf(x)),
  cancelled:bs.filter(b=>b.status==='Cancelled').sort((x,y)=>depOf(y)-depOf(x))}}
function payRow(p){return`<div class="prow"><span class="pill ${stCls(p.status)}">${p.status}</span><span>${esc(payLabel(p))}</span><span class="muted">by ${esc(p.payer_name||'')}</span><span class="mono muted">${p.transaction_ref}</span><span class="muted">${stampS(p.paid_at)}</span><b>${inr(p.amount)}</b>${p.refunded_amount?`<span class="refd">Refunded ${inr(p.refunded_amount)}</span>`:''}${p.failure_reason?`<span class="refd bad">${esc(p.failure_reason)}</span>`:''}</div>`}
function tripCard(b){
  const f=b.flight,a=air(f.flight_number),D=f.departure_airport_code,A=f.arrival_airport_code,dep=depOf(b),future=dep>Date.now();
  let acts='';
  if(b.status==='Pending')acts=`<button class="btn primary sm" data-act="payResume" data-id="${b.booking_id}">Pay now</button><button class="btn ghost sm" data-act="cancelAsk" data-id="${b.booking_id}">Release seats</button>`;
  else if(b.status==='Confirmed'&&future&&b.cancellation.allowed)acts=`<button class="btn ghost sm danger" data-act="cancelAsk" data-id="${b.booking_id}">Cancel booking</button>`;
  else if(b.status==='Confirmed'&&future)acts=`<span class="muted">${esc(b.cancellation.reason)}</span>`;
  if(!future||b.status==='Cancelled')acts+=`<button class="btn ghost sm" data-act="bookAgain" data-a="${D}" data-b="${A}">Book this route again</button>`;
  const body=b.status==='Confirmed'?`<div class="passes">${b.passengers.map(p=>bpHTML(b,p)).join('')}</div>`:`<ul class="paxl">${b.passengers.map(p=>`<li>${esc(p.first_name)} ${esc(p.last_name)}, seat ${p.seat_number}, ${p.class}</li>`).join('')}</ul>`;
  return`<article class="trip" style="--ac:${a.color}"><div class="trip-h"><div class="trip-route"><b>${D}</b>${ic('plane',16)}<b>${A}</b></div>
    <div class="trip-t"><b>${AP[D].city} to ${AP[A].city}</b><span class="muted">${tDate(dep,tz(D))}, ${tTime(dep,tz(D))} on ${a.name} ${esc(f.flight_number)}</span></div><span class="pill ${stCls(b.status)}">${b.status}</span></div>
    <div class="trip-m"><span>${b.passengers.map(p=>esc(p.first_name)).join(', ')}</span><span>${b.passengers[0].class} cabin</span><span>Reference <b class="mono">${b.pnr}</b> <button class="lnk" data-act="copy" data-t="${b.pnr}" aria-label="Copy reference">${ic('copy',13)}</button></span><b class="amt">${inr(b.total_amount)}</b></div>
    ${b.status==='Pending'?`<div class="hold">${ic('clock',16)}<span>Seats held for <b data-countdown="${b.expires_at}">15:00</b>. Pay before the timer ends or the seats are released.</span></div>`:''}
    <details><summary>${b.status==='Confirmed'?'Boarding passes and payments':'Travellers and payments'}</summary>${body}<div class="pays">${b.payments.length?b.payments.map(payRow).join(''):'<p class="muted">No payment attempts yet.</p>'}</div></details>
    ${acts?`<div class="trip-a">${acts}</div>`:''}</article>`;
}
const KIND={booked:['#7C5CFF','ticket'],paid:['#0FB37F','check'],failed:['#E11D48','x'],cancelled:['#8A87B0','x'],refunded:['#1FA2FF','refresh'],requested:['#D9A400','zap'],expired:['#D9A400','clock']};
function renderTrips(){
  const T=S.trips,G0=tripGroups(),s=T.sum,tabs=[['upcoming','Upcoming'],['pending','Awaiting payment'],['past','Past'],['cancelled','Cancelled']];
  if(!G0[T.tab].length&&T.tab==='upcoming'&&G0.pending.length)T.tab='pending';
  const list=G0[T.tab];
  const routes=T.data.filter(b=>b.status==='Confirmed').map(b=>[b.flight.departure_airport_code,b.flight.arrival_airport_code]);
  const empty={upcoming:['No upcoming trips','Find a flight and it will show up here with its boarding pass.'],pending:['Nothing waiting for payment','Bookings you have not paid for yet are listed here for 15 minutes.'],past:['No past trips yet','Completed flights appear here.'],cancelled:['No cancelled bookings','Cancelled bookings and their refunds appear here.']}[T.tab];
  $('#view').innerHTML=`<div class="wrap"><div class="h2row"><div><h1 class="h1">Hello, ${esc(S.user.first_name)}</h1><p class="muted">Every booking, boarding pass and refund in one place.</p></div><button class="btn primary" data-act="go" data-tab="book">Book a flight</button></div>
  <div class="tripsgrid"><section><div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${T.tab===k}" class="${T.tab===k?'on':''}" data-act="tripTab" data-k="${k}">${l}<span class="cnt">${G0[k].length}</span></button>`).join('')}</div>
    <div class="trips">${list.length?list.map(tripCard).join(''):`<div class="empty"><h3>${empty[0]}</h3><p>${empty[1]}</p><button class="btn primary" data-act="go" data-tab="book">Search flights</button></div>`}</div></section>
  <aside class="side"><div class="card mapcard">${routeMap({routes,label:'Your flown and booked routes'})}<div class="mapfoot"><b>${routes.length}</b> route${routes.length===1?'':'s'} on your map</div></div>
    <div class="card"><h3>Your travel so far</h3><dl class="kv"><div><dt>Trips completed</dt><dd>${s.trips_completed}</dd></div><div><dt>Upcoming trips</dt><dd>${s.upcoming}</dd></div><div><dt>Distance flown</dt><dd>${s.distance_km.toLocaleString('en-IN')} km</dd></div><div><dt>Cities visited</dt><dd>${s.cities_visited.length?s.cities_visited.join(', '):'None yet'}</dd></div><div><dt>Spent, after refunds</dt><dd>${inr(s.total_spent)}</dd></div></dl></div>
    <div class="card"><h3>Activity</h3><ol class="tl">${T.act.length?T.act.slice(0,12).map(e=>{const k=KIND[e.kind]||KIND.booked;return`<li><span class="tl-dot" style="--k:${k[0]}">${ic(k[1],12)}</span><div><b>${esc(e.text)}</b><small>${stampS(e.at)}, ref ${e.pnr}</small></div></li>`}).join(''):'<li class="muted">No activity yet.</li>'}</ol></div></aside></div></div>`;
  tick();
}
Object.assign(ACT,{
  tripTab(t){S.trips.tab=t.dataset.k;renderTrips()},
  bookAgain(t){S.q.from=t.dataset.a;S.q.to=t.dataset.b;S.q.date=dayToKey(localDay()+7);S.res=null;S.flow=null;go('book');doSearch()},
  cancelAsk(t){
    const b=S.trips.data.find(x=>x.booking_id==t.dataset.id),c=b.cancellation;if(!c.allowed){toast(c.reason,'err');return}
    const tiers=[['More than 72 hours before departure',90],['24 to 72 hours before',70],['2 to 24 hours before',25]],cur=c.hours_left>=72?0:c.hours_left>=24?1:2;
    modal(b.status==='Pending'?`<h2>Release these seats?</h2><p class="muted">You have not paid yet, so nothing is charged. The seats go back on sale.</p><div class="row end"><button class="btn ghost" data-act="closeModal">Keep the hold</button><button class="btn primary" data-act="cancelDo" data-id="${b.booking_id}">Release seats</button></div>`:
    `<h2>Cancel booking ${b.pnr}?</h2><p class="muted">${b.flight.departure_airport_code} to ${b.flight.arrival_airport_code}, leaves in about ${c.hours_left} hours.</p>
    <div class="tiers">${tiers.map((x,i)=>`<div class="${i===cur?'on':''}"><span>${x[0]}</span><b>${x[1]}% refund</b></div>`).join('')}</div>
    <div class="lr"><span>You paid</span><b>${inr(c.paid)}</b></div><div class="lr"><span>Cancellation fee</span><b>-${inr(c.cancellation_fee)}</b></div><div class="lr tot"><span>You get back</span><b>${inr(c.refund_amount)}</b></div>
    <div class="row end"><button class="btn ghost" data-act="closeModal">Keep my booking</button><button class="btn danger-solid" data-act="cancelDo" data-id="${b.booking_id}">Cancel booking</button></div>`)
  },
  async cancelDo(t){const r=await api('POST','/api/v1/bookings/'+t.dataset.id+'/cancel');closeModal();if(!r.ok){toast(r.body.error.message,'err');return}
    toast(r.body.refunded?`Cancelled. ${inr(r.body.refunded)} is on its way back.`:'Booking cancelled.');S.trips.tab='cancelled';viewTrips()},
  async payResume(t){
    const r=await api('GET','/api/v1/bookings/'+t.dataset.id);if(!r.ok){toast(r.body.error.message,'err');return}
    const bk=r.body.booking;if(bk.status!=='Pending'){toast('This hold has expired.','err');viewTrips();return}
    const seats={};bk.passengers.forEach((p,i)=>seats[i]=p.seat_id);
    S.flow={f:bk.flight,cls:bk.passengers[0].class,n:bk.passengers.length,step:3,active:0,seats,pax:bk.passengers,errors:{},quote:null,_qt:0,promo:'',promoMsg:null,method:'UPI',pay:newPay(S.user.first_name+' '+S.user.last_name),booking:bk,payError:null,seatData:null,busy:false};
    S.tab='book';go('book');
  }
});

/* ============ Payments ============ */
async function viewPayments(){
  if(!gate('Sign in to see your payments','Receipts, failed attempts and refunds for every booking.'))return;
  $('#view').innerHTML='<div class="wrap"><div class="skeleton" style="height:360px"></div></div>';
  const r=await api('GET','/api/v1/payments');if(S.tab!=='payments'||!r.ok)return;S.pay.data=r.body.payments;renderPayments();
}
const MCOL={UPI:'#5F259F',Card:'#7C5CFF',NetBanking:'#1FA2FF',Wallet:'#FF8A3D',EMI:'#EE4C93',PayLater:'#0FB37F'},MLAB=Object.fromEntries(PAY.methods);
function renderPayments(){
  const P=S.pay,all=P.data,f=P.filter,rows=f==='all'?all:all.filter(p=>p.status===f);
  const paid=all.reduce((s,p)=>s+(p.status==='Success'||p.status==='Refunded'?p.amount:0),0),ref=all.reduce((s,p)=>s+p.refunded_amount,0),net=paid-ref;
  const byM={};all.forEach(p=>{if(p.status==='Success'||p.status==='Refunded')byM[p.method]=(byM[p.method]||0)+p.amount-p.refunded_amount});
  const tot=Object.values(byM).reduce((a,b)=>a+b,0)||1;
  $('#view').innerHTML=`<div class="wrap"><div class="h2row"><div><h1 class="h1">Payments</h1><p class="muted">Every attempt is recorded, including the ones that failed.</p></div></div>
  <div class="paysum"><div class="card"><small>Paid</small><b>${inr(paid)}</b></div><div class="card"><small>Refunded</small><b class="info">${inr(ref)}</b></div><div class="card hl"><small>Net spend</small><b>${inr(net)}</b></div></div>
  <div class="card"><h3>Where your money went</h3><div class="split" role="img" aria-label="Spend by payment method">${Object.entries(byM).map(([m,v])=>`<span style="flex:${v};background:${MCOL[m]||'#999'}" title="${MLAB[m]||m} ${inr(v)}"></span>`).join('')||'<span style="flex:1;background:var(--line)"></span>'}</div>
  <div class="legend2">${Object.entries(byM).map(([m,v])=>`<span><i style="background:${MCOL[m]||'#999'}"></i>${MLAB[m]||m} ${Math.round(v/tot*100)}%</span>`).join('')}</div></div>
  <div class="tabs" style="margin-top:22px">${[['all','All'],['Success','Successful'],['Failed','Failed'],['Refunded','Refunded']].map(([k,l])=>`<button class="${f===k?'on':''}" data-act="payFilter" data-k="${k}">${l}<span class="cnt">${k==='all'?all.length:all.filter(p=>p.status===k).length}</span></button>`).join('')}</div>
  <div class="card tscroll">${rows.length?`<table class="ledger"><thead><tr><th>Date</th><th>Transaction</th><th>Trip</th><th>Billed to</th><th>Method</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td>${stampS(p.paid_at)}</td><td class="mono">${p.transaction_ref}</td><td><b class="mono">${p.pnr}</b> ${p.route.replace('-',' to ')}</td><td>${esc(p.payer_name||'')}</td><td>${esc(payLabel(p))}</td><td class="r">${inr(p.amount)}${p.refunded_amount?`<small class="refd">-${inr(p.refunded_amount)}</small>`:''}</td><td><span class="pill ${stCls(p.status)}">${p.status}</span></td><td><button class="btn ghost sm" data-act="receipt" data-id="${p.payment_id}">Receipt</button></td></tr>`).join('')}</tbody></table>`:`<div class="empty"><h3>Nothing here</h3><p>No payments match this filter.</p></div>`}</div></div>`;
}
Object.assign(ACT,{payFilter(t){S.pay.filter=t.dataset.k;renderPayments()},
  async receipt(t){const r=await api('GET','/api/v1/payments/'+t.dataset.id);if(!r.ok){toast(r.body.error.message,'err');return}
    const p=r.body.payment,b=r.body.booking,f=b.flight;
    modal(`<h2>Receipt</h2><p class="muted mono">${p.transaction_ref}</p><div class="lr"><span>Status</span><span class="pill ${stCls(p.status)}">${p.status}</span></div><div class="lr"><span>Trip</span><b>${AP[f.departure_airport_code].city} to ${AP[f.arrival_airport_code].city}</b></div><div class="lr"><span>Booking reference</span><b class="mono">${b.pnr}</b></div><div class="lr"><span>Travellers</span><b>${b.passengers.map(x=>esc(x.first_name)).join(', ')}</b></div><div class="lr"><span>Method</span><b>${esc(payLabel(p))}</b></div><div class="lr"><span>Date</span><b>${stamp(p.paid_at)}</b></div>${p.failure_reason?`<div class="lr"><span>Reason</span><b>${esc(p.failure_reason)}</b></div>`:''}${p.refunded_amount?`<div class="lr"><span>Refunded</span><b>${inr(p.refunded_amount)}</b></div>`:''}<div class="lr tot"><span>Amount</span><b>${inr(p.amount)}</b></div><div class="row end"><button class="btn primary" data-act="closeModal">Done</button></div>`)}});

/* ============ API gateway console ============ */
const SVC={auth:['Accounts','#7C5CFF'],flights:['Flights','#1FA2FF'],bookings:['Bookings','#EE4C93'],payments:['Payments','#0FB37F'],gateway:['Gateway','#D9A400']};
const PIPE=['Client','Rate limit','Router','Auth','Service','Database'];
const bucketNow=()=>Math.min(60,G.bucket.n+(Date.now()-G.bucket.t)/1000);
function viewApi(){
  $('#view').innerHTML=`<div class="wrap"><div class="h2row"><div><h1 class="h1">API gateway</h1><p class="muted">Every screen in this app calls these endpoints. Watch them here, or send your own requests.</p></div><div class="row"><button class="btn ghost" data-act="burst">${ic('zap',16)} Send 70 requests at once</button></div></div>
  <div id="gstats" class="gstats"></div><div class="card" id="pipe"></div>
  <div class="apigrid"><aside class="card eplist" id="eplist"></aside><section id="reqpanel"></section></div><div class="card" id="logpanel"></div></div>`;
  selectEp(S.api.sel,true);paintEps();paintStats();paintPipe();paintLog();
}
function paintStats(){const el=$('#gstats');if(!el)return;const s=G.stats,b=Math.floor(bucketNow());
  el.innerHTML=`<div class="card"><small>Requests handled</small><b>${s.total}</b></div><div class="card"><small>Average response</small><b>${s.total?Math.round(s.ms/s.total):0} ms</b></div><div class="card"><small>Error rate</small><b>${s.total?Math.round(s.errors/s.total*100):0}%</b></div><div class="card"><small>Rate limit, 60 per minute</small><b>${b} left</b><div class="meter"><i style="width:${b/60*100}%;background:${b<12?'var(--bad)':'var(--mint)'}"></i></div></div>`}
function paintPipe(){const el=$('#pipe');if(!el)return;const L=G.last;
  const st=n=>{if(n==='Client')return L?'ok':'idle';const x=L&&L.stages.find(s=>s.s===n);return!x?'idle':x.skipped?'skip':x.ok?'ok':'bad'};
  el.innerHTML=`<div class="pipe">${PIPE.map((n,i)=>`<div class="node ${st(n)}"><span class="nd">${st(n)==='ok'?ic('check',14):st(n)==='bad'?ic('x',14):''}</span><b>${n}</b></div>${i<PIPE.length-1?'<i class="wire"></i>':''}`).join('')}</div>
  <p class="pipe-cap mono">${L?`<span class="m ${L.method}">${L.method}</span> ${esc(L.path)} <b class="st s${String(L.status)[0]}">${L.status}</b> in ${L.ms} ms via ${L.service}`:'Send a request to watch it travel through the gateway.'}</p>`}
function paintLog(){const el=$('#logpanel');if(!el)return;
  el.innerHTML=`<div class="h2row tight"><h3>Live traffic</h3><span class="muted">Newest first. Select a row for the full request and response.</span></div><div class="tscroll"><table class="log"><tbody>${G.log.slice(0,14).map((e,i)=>`<tr data-act="logView" data-i="${i}" tabindex="0"><td class="mono muted">${new Date(e.ts).toTimeString().slice(0,8)}</td><td><span class="m ${e.method}">${e.method}</span></td><td class="mono">${esc(e.path)}</td><td><b class="st s${String(e.status)[0]}">${e.status}</b></td><td class="mono muted r">${e.ms} ms</td><td class="muted">${e.service}</td></tr>`).join('')||'<tr><td class="muted">No traffic yet.</td></tr>'}</tbody></table></div>`}
function paintEps(){const el=$('#eplist');if(!el)return;
  el.innerHTML=Object.keys(SVC).map(k=>`<div class="epg"><h4 style="--c:${SVC[k][1]}"><i></i>${SVC[k][0]}</h4>${G.routes.map((r,i)=>[r,i]).filter(([r])=>r.service===k).map(([r,i])=>`<button class="ep ${S.api.sel===i?'on':''}" data-act="epSel" data-i="${i}"><span class="m ${r.method}">${r.method}</span><span class="mono">${esc(r.path.replace('/api/v1',''))}</span>${r.auth?`<span class="lock" title="Needs a bearer token">${ic('shield',13)}</span>`:''}</button>`).join('')}</div>`).join('')}
function selectEp(i,quiet){
  const r=G.routes[i];S.api.sel=i;let s={};try{s=r.sample()}catch(e){}
  S.api.params=s.params||{};S.api.query=s.query||'';S.api.body=s.body?JSON.stringify(s.body,null,2):'';S.api.out=quiet&&S.api.out?S.api.out:null;paintReq();
}
function paintReq(){
  const el=$('#reqpanel');if(!el)return;const r=G.routes[S.api.sel],A=S.api,hasBody=['POST','PATCH','PUT'].includes(r.method);
  el.innerHTML=`<div class="card reqcard"><div class="req-h"><span class="m ${r.method}">${r.method}</span><code class="mono">${esc(r.path)}</code></div><p class="muted">${esc(r.summary)}${r.auth?' Needs a bearer token.':' Public endpoint.'}</p>
  ${r.keys.map(k=>`<label class="fld"><span>Path parameter: ${k}</span><input class="mono" data-p="${k}" value="${esc(A.params[k]||'')}"></label>`).join('')}
  <label class="fld"><span>Query string</span><input class="mono" id="ep-q" value="${esc(A.query)}" placeholder="from=BOM&to=DEL"></label>
  ${hasBody?`<label class="fld"><span>JSON body</span><textarea class="mono" id="ep-b" rows="${Math.min(12,(A.body.match(/\n/g)||[]).length+2)}" spellcheck="false">${esc(A.body)}</textarea></label>`:''}
  <label class="chk"><input type="checkbox" id="ep-auth" ${A.noAuth?'':'checked'} ${S.token?'':'disabled'}> Send my bearer token ${S.token?'':'(sign in first)'}</label>
  <div class="row"><button class="btn primary" data-act="send" ${A.pending?'disabled':''}>${A.pending?'Sending…':'Send request'}</button><button class="btn ghost" data-act="curl">Copy as cURL</button></div></div><div id="resp">${respHTML()}</div>`;
}
function respHTML(){
  const o=S.api.out;if(!o)return`<div class="card resp empty-r"><p class="muted">The response will appear here.</p></div>`;
  return`<div class="card resp"><div class="resp-h"><b class="st s${String(o.status)[0]} big">${o.status}</b><span class="mono muted">${o.ms} ms</span><span class="mono muted">${o.id}</span></div>
  <div class="hdrs mono">${Object.entries(o.headers).map(([k,v])=>`<span>${k}: ${esc(v)}</span>`).join('')}</div><pre class="json">${jhl(o.body)}</pre></div>`}
function jhl(o,max=7000){let s=JSON.stringify(o,null,2);if(s===undefined)s='';let cut=false;if(s.length>max){s=s.slice(0,max);cut=true}
  const re=/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;let out='',last=0,m;
  while((m=re.exec(s))){out+=esc(s.slice(last,m.index));out+=m[1]?(m[2]?`<i class="jk">${esc(m[1])}</i>${esc(m[2])}`:`<i class="js">${esc(m[1])}</i>`):m[3]?`<i class="jb">${m[0]}</i>`:`<i class="jn">${m[0]}</i>`;last=re.lastIndex}
  return out+esc(s.slice(last))+(cut?'\n… response truncated':'')}
function buildReq(){
  const r=G.routes[S.api.sel];let path=r.path;$$('[data-p]').forEach(i=>{S.api.params[i.dataset.p]=i.value;path=path.replace(':'+i.dataset.p,encodeURIComponent(i.value))});
  const q=($('#ep-q')||{}).value||'';S.api.query=q;const bEl=$('#ep-b');let body;
  if(bEl){S.api.body=bEl.value;if(bEl.value.trim()){try{body=JSON.parse(bEl.value)}catch(e){return{error:'The JSON body is not valid: '+e.message}}}}
  const ea=$('#ep-auth');S.api.noAuth=ea?!ea.checked:false;
  return{method:r.method,url:path+(q?'?'+q.replace(/^\?/,''):''),body,token:S.api.noAuth?null:S.token};
}
Object.assign(ACT,{
  epSel(t){selectEp(+t.dataset.i);paintEps()},
  async send(){const q=buildReq();if(q.error){toast(q.error,'err');return}S.api.pending=true;paintReq();
    const r=await G.call(q.method,q.url,{body:q.body,token:q.token});S.api.pending=false;S.api.out=r;paintReq()},
  curl(){const q=buildReq();if(q.error){toast(q.error,'err');return}
    copyText(`curl -X ${q.method} '${BASE}${q.url}'${q.token?` \\\n  -H 'Authorization: Bearer ${q.token}'`:''}${q.body?` \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(q.body)}'`:''}`)},
  async burst(){const rs=await Promise.all(Array.from({length:70},()=>G.call('GET','/api/v1/airports',{latency:0})));const ok=rs.filter(r=>r.ok).length;toast(`${ok} succeeded, ${70-ok} were stopped by the rate limiter (429).`,ok===70?'ok':'info')},
  logView(t){const e=G.log[+t.dataset.i];if(!e)return;
    modal(`<h2><span class="m ${e.method}">${e.method}</span> <span class="mono">${esc(e.path)}</span></h2><p class="muted"><b class="st s${String(e.status)[0]}">${e.status}</b> in ${e.ms} ms via ${e.service}${e.noAuth?', no bearer token':''}</p><div class="pipe small">${e.stages.map(s=>`<div class="node ${s.skipped?'skip':s.ok?'ok':'bad'}"><b>${s.s}</b></div>`).join('<i class="wire"></i>')}</div>${e.req?`<h4>Request body</h4><pre class="json">${jhl(e.req,3000)}</pre>`:''}<h4>Response</h4><pre class="json">${jhl(e.res,4000)}</pre><div class="row end"><button class="btn primary" data-act="closeModal">Close</button></div>`,'wide')}
});
G.on(()=>{if(S.tab==='api'){paintStats();paintPipe();paintLog()}});
setInterval(()=>{if(S.tab==='api')paintStats()},1000);

/* ============ Database view ============ */
const SCHEMA=[
{k:'users',n:'Users',c:'#7C5CFF',cols:[['user_id','integer','PK'],['email','string, Unique'],['password_hash','string'],['first_name','string'],['last_name','string'],['phone_number','string'],['registration_date','datetime']]},
{k:'airports',n:'Airports',c:'#1FA2FF',cols:[['airport_code','string, IATA','PK'],['airport_name','string'],['city','string'],['country','string']]},
{k:'flights',n:'Flights',c:'#B44BFF',cols:[['flight_id','integer','PK'],['flight_number','string'],['departure_airport_code','string','FK','airports'],['arrival_airport_code','string','FK','airports'],['departure_date_time','datetime'],['arrival_date_time','datetime'],['aircraft_model','string'],['duration_minutes','integer']]},
{k:'seats',n:'Seats',c:'#D9A400',cols:[['seat_id','integer','PK'],['flight_id','integer','FK','flights'],['seat_number',"string, '14A'"],['class','ENUM: Economy, Business, First'],['is_available','boolean'],['price','decimal']]},
{k:'bookings',n:'Bookings',c:'#EE4C93',cols:[['booking_id','integer','PK'],['user_id','integer','FK','users'],['flight_id','integer','FK','flights'],['booking_date','datetime'],['total_amount','decimal'],['status','ENUM: Confirmed, Cancelled, Pending']]},
{k:'passengers',n:'Passengers',c:'#FF6B3D',cols:[['passenger_id','integer','PK'],['booking_id','integer','FK','bookings'],['seat_id','integer','FK','seats','ADDED'],['first_name','string'],['last_name','string'],['date_of_birth','date'],['passport_number','string'],['nationality','string']]},
{k:'payments',n:'Payments',c:'#0FB37F',isNew:true,cols:[['payment_id','integer','PK'],['booking_id','integer','FK','bookings'],['passenger_id','integer','FK','passengers','ADDED'],['amount','decimal'],['currency','string, ISO 4217'],['method','ENUM: UPI, Card, NetBanking, Wallet, EMI, PayLater'],['provider','string, e.g. PhonePe, Google Pay, Visa'],['method_detail','string, masked'],['status','ENUM: Success, Failed, Pending, Refunded'],['transaction_ref','string, Unique'],['failure_reason','string, nullable'],['paid_at','datetime'],['refunded_amount','decimal'],['refunded_at','datetime, nullable']]}];
const DDL=`CREATE TYPE seat_class     AS ENUM ('Economy', 'Business', 'First');
CREATE TYPE booking_status AS ENUM ('Confirmed', 'Cancelled', 'Pending');
CREATE TYPE pay_method     AS ENUM ('UPI', 'Card', 'NetBanking', 'Wallet', 'EMI', 'PayLater');
CREATE TYPE pay_status     AS ENUM ('Success', 'Failed', 'Pending', 'Refunded');

CREATE TABLE users (
  user_id           SERIAL PRIMARY KEY,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  first_name        VARCHAR(80)  NOT NULL,
  last_name         VARCHAR(80)  NOT NULL,
  phone_number      VARCHAR(30),
  registration_date TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE airports (
  airport_code CHAR(3) PRIMARY KEY,           -- IATA
  airport_name VARCHAR(120) NOT NULL,
  city         VARCHAR(80)  NOT NULL,
  country      VARCHAR(80)  NOT NULL
);

CREATE TABLE flights (
  flight_id              SERIAL PRIMARY KEY,
  flight_number          VARCHAR(10) NOT NULL,
  departure_airport_code CHAR(3) NOT NULL REFERENCES airports(airport_code),
  arrival_airport_code   CHAR(3) NOT NULL REFERENCES airports(airport_code),
  departure_date_time    TIMESTAMPTZ NOT NULL,
  arrival_date_time      TIMESTAMPTZ NOT NULL,
  aircraft_model         VARCHAR(40),
  duration_minutes       INT NOT NULL,
  CHECK (departure_airport_code <> arrival_airport_code),
  CHECK (arrival_date_time > departure_date_time)
);

CREATE TABLE seats (
  seat_id      SERIAL PRIMARY KEY,
  flight_id    INT NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
  seat_number  VARCHAR(4) NOT NULL,           -- e.g. '14A'
  class        seat_class NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  price        NUMERIC(10,2) NOT NULL,
  UNIQUE (flight_id, seat_number)
);

CREATE TABLE bookings (
  booking_id   SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(user_id),
  flight_id    INT NOT NULL REFERENCES flights(flight_id),
  booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(10,2) NOT NULL,
  status       booking_status NOT NULL DEFAULT 'Pending'
);

CREATE TABLE passengers (
  passenger_id    SERIAL PRIMARY KEY,
  booking_id      INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  seat_id         INT UNIQUE REFERENCES seats(seat_id),   -- ADDED: links a traveller to a seat
  first_name      VARCHAR(80) NOT NULL,
  last_name       VARCHAR(80) NOT NULL,
  date_of_birth   DATE NOT NULL,
  passport_number VARCHAR(20) NOT NULL,
  nationality     VARCHAR(60) NOT NULL
);

CREATE TABLE payments (                        -- NEW
  payment_id      SERIAL PRIMARY KEY,
  booking_id      INT NOT NULL REFERENCES bookings(booking_id),
  passenger_id    INT NOT NULL REFERENCES passengers(passenger_id),  -- ADDED: who the payment is billed to (the lead traveller)
  amount          NUMERIC(10,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  method          pay_method NOT NULL,
  provider        VARCHAR(60),                -- 'PhonePe', 'Google Pay', 'Visa', a bank or wallet name
  method_detail   VARCHAR(80),                -- masked: '•••• 4242', a UPI ID, or the last digits of a mobile number
  status          pay_status NOT NULL,
  transaction_ref VARCHAR(40) NOT NULL UNIQUE,
  failure_reason  VARCHAR(200),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refunded_at     TIMESTAMPTZ
);

CREATE INDEX idx_flights_route ON flights (departure_airport_code, arrival_airport_code, departure_date_time);
CREATE INDEX idx_seats_flight  ON seats (flight_id) WHERE is_available;
CREATE INDEX idx_bookings_user ON bookings (user_id, booking_date DESC);
CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_passenger ON payments (passenger_id);`;
const dbRows=k=>k==='seats'?[...DB.seatMap.values()].flat():k==='flights'?DB.flights.filter(f=>f._dep>Date.now()).slice(0,4000):DB[k];
const dbCount=k=>k==='seats'?[...DB.seatMap.values()].reduce((s,a)=>s+a.length,0):DB[k].length;
function cell(v,c){if(v==null)return'<i class="nul">null</i>';if(typeof v==='boolean')return`<span class="bl ${v?'t':'f'}">${v}</span>`;if(c==='password_hash')return esc(String(v).slice(0,20))+'…';
  if(typeof v==='string'&&/(_date_time|_at|_date)$/.test(c)&&v.length>10)return esc(stampS(v));if(['total_amount','price','amount','refunded_amount'].includes(c))return inr(v);
  if(c==='status')return`<span class="pill ${stCls(v)}">${v}</span>`;return esc(v)}
function dataTable(){
  const sc=SCHEMA.find(s=>s.k===S.db.table),names=sc.cols.map(c=>c[0]),f=S.db.filter.toLowerCase();
  let rows=dbRows(sc.k);if(f)rows=rows.filter(r=>names.some(n=>String(r[n]).toLowerCase().includes(f)));
  const shown=rows.slice(0,60);
  return`<div class="tscroll"><table class="dt"><thead><tr>${names.map(n=>`<th>${n}</th>`).join('')}</tr></thead><tbody>${shown.map(r=>`<tr>${names.map(n=>`<td>${cell(r[n],n)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${names.length}" class="muted">${sc.k==='seats'?'Seats are created when a flight is first opened. Search and open a seat map to fill this table.':'No rows match.'}</td></tr>`}</tbody></table></div><p class="muted foot">Showing ${shown.length} of ${rows.length.toLocaleString('en-IN')} rows${sc.k==='flights'?' (upcoming flights only)':''}.</p>`;
}
function viewDb(){
  const rels=[];SCHEMA.forEach(s=>s.cols.forEach(c=>{if(c[2]==='FK')rels.push({from:s.n,to:SCHEMA.find(x=>x.k===c[3]).n,col:s.k+'.'+c[0],one:s.k==='passengers'&&c[0]==='seat_id',isNew:s.isNew||c[3]==='payments'||c[4]==='ADDED'})}));
  $('#view').innerHTML=`<div class="wrap"><div class="h2row"><div><h1 class="h1">Database</h1><p class="muted">Your ER diagram, running live. Select a table to see what it connects to.</p></div><button class="btn ghost" data-act="resetData">${ic('refresh',16)} Reset demo data</button></div>
  <div class="tables">${SCHEMA.map(s=>`<article class="tbl ${s.isNew?'isnew':''}" data-act="dbFocus" data-k="${s.k}" tabindex="0" style="--tc:${s.c}"><header><b>${s.n}</b>${s.isNew?'<span class="badge new">New table</span>':''}<span class="cnt">${dbCount(s.k).toLocaleString('en-IN')} rows</span></header><ul>${s.cols.map(c=>`<li><span class="k">${c[2]?`<span class="badge ${c[2].toLowerCase()}">${c[2]}</span>`:''}</span><span class="n">${c[0]}</span><span class="t">${c[1]}</span>${c[4]?`<span class="badge new">Added</span>`:''}</li>`).join('')}</ul></article>`).join('')}</div>
  <div class="card"><h3>Relationships</h3><ul class="rels">${rels.map(r=>`<li class="${r.isNew?'isnew':''}"><b>${r.to}</b><span class="card-n">1</span><i></i><span class="card-n">${r.one?'0..1':'many'}</span><b>${r.from}</b><code class="mono">${r.col}</code></li>`).join('')}</ul>
  <p class="note">${ic('zap',14)} Three changes to your original diagram: the <b>Payments</b> table, <b>passengers.seat_id</b> so a booking can say which traveller sits where, and <b>payments.passenger_id</b> so a payment is billed to a specific traveller, not just the booking as a whole.</p></div>
  <div class="card"><div class="h2row tight"><h3>Browse the data</h3><input class="search" id="dbf" placeholder="Filter rows" value="${esc(S.db.filter)}" aria-label="Filter rows"></div>
  <div class="chips" id="dbchips">${SCHEMA.map(s=>`<button class="chip ${S.db.table===s.k?'on':''}" data-act="dbTable" data-k="${s.k}">${s.n}</button>`).join('')}</div><div id="dtbl">${dataTable()}</div></div>
  <div class="card"><div class="h2row tight"><h3>SQL schema (PostgreSQL)</h3><button class="btn ghost sm" data-act="copySql">${ic('copy',14)} Copy SQL</button></div><pre class="json sql">${esc(DDL)}</pre></div></div>`;
}
Object.assign(ACT,{
  dbFocus(t){const k=t.dataset.k;$$('.tbl').forEach(x=>x.classList.remove('sel','rel'));t.classList.add('sel');const sc=SCHEMA.find(s=>s.k===k);
    const rel=new Set();sc.cols.forEach(c=>{if(c[2]==='FK')rel.add(c[3])});SCHEMA.forEach(s=>s.cols.forEach(c=>{if(c[2]==='FK'&&c[3]===k)rel.add(s.k)}));
    rel.forEach(r=>$(`.tbl[data-k=${r}]`).classList.add('rel'));S.db.table=k;$('#dtbl').innerHTML=dataTable();$$('#dbchips .chip').forEach(c=>c.classList.toggle('on',c.dataset.k===k))},
  dbTable(t){S.db.table=t.dataset.k;$$('#dbchips .chip').forEach(c=>c.classList.toggle('on',c===t));$('#dtbl').innerHTML=dataTable()},
  copySql(){copyText(DDL)},resetData(){wipe();location.reload()}
});

/* ============ Wiring and boot ============ */
function setDev(on){DEV=!!on;if(!DEV&&(S.tab==='api'||S.tab==='db'))go('book');else renderHeader()}
window.addEventListener('hashchange',()=>setDev(location.hash==='#dev'));
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&String(e.key).toLowerCase()==='d'){e.preventDefault();setDev(!DEV)}});
function setPath(o,p,v){const k=p.split('.');let c=o;for(let i=0;i<k.length-1;i++)c=c[k[i]];c[k[k.length-1]]=v}
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t||!t.dataset.act)return;const f=ACT[t.dataset.act];if(f){if(t.tagName==='A')e.preventDefault();f(t,e)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden&&!$('.sheet.proc'))closeModal();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-act],article[data-act]')){e.preventDefault();ACT[e.target.dataset.act](e.target)}});
document.addEventListener('input',e=>{const t=e.target;
  if(t.dataset.b&&S.flow){setPath(S.flow,t.dataset.b,t.value)}
  if(t.dataset.cc&&S.flow){const F=S.flow,k=t.dataset.cc;let v=t.value;
    if(k==='number'){v=fmtCard(v);t.value=v}else if(k==='exp'){const d=v.replace(/\D/g,'').slice(0,4);v=d.length>2?d.slice(0,2)+'/'+d.slice(2):d;t.value=v}else if(k==='cvv'){v=v.replace(/\D/g,'').slice(0,4);t.value=v}
    F.pay.card[k]=v;const c=$('#ccard');if(c){const b=brandOf(F.pay.card.number.replace(/\s/g,''));c.className='ccard n-'+b.toLowerCase();$('#cc-net').textContent=b==='Card'?'':b;$('#cc-num').textContent=F.pay.card.number||'•••• •••• •••• ••••';$('#cc-name').textContent=F.pay.card.name||'Your name';$('#cc-exp').textContent=F.pay.card.exp||'MM/YY'}}
  if(t.id==='dbf'){S.db.filter=t.value;$('#dtbl').innerHTML=dataTable()}});
document.addEventListener('change',e=>{const k=e.target.dataset.q;if(!k)return;S.q[k]=e.target.value;if(k==='from'||k==='to'){updateHeroMap();if(k==='from')loadExplore()}});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;if(f.id==='sf')doSearch();else if(f.id==='af')authWith(f.dataset.mode,Object.fromEntries(new FormData(f)))});

async function boot(){
  try{const th=localStorage.getItem('skyline.theme');if(th)document.documentElement.dataset.theme=th}catch(e){}
  DB.flights=genFlights(localDay());
  const saved=loadSaved();
  if(saved&&saved.users&&saved.bookings){
    DB.users=saved.users;DB.bookings=saved.bookings;DB.passengers=saved.passengers||[];DB.payments=saved.payments||[];DB.audit=saved.audit||[];DB.seq=saved.seq||DB.seq;S.token=saved.session||null;
    const have=new Set(DB.flights.map(f=>f.flight_id));(saved.flights||[]).forEach(f=>{if(!have.has(f.flight_id))DB.flights.push(f)});
  }
  DB.flights.sort((a,b)=>a._dep-b._dep);DB.flights.forEach(indexFlight);
  if(!(saved&&saved.users&&saved.bookings))await seedAll();
  S.user=verifyToken(S.token);if(!S.user)S.token=null;
  DEV=location.hash==='#dev';save();renderHeader();go('book');
}
boot().catch(e=>{console.error(e);const v=$('#view');if(v)v.innerHTML='<div class="wrap"><div class="empty"><h3>Something went wrong while starting</h3><p>Try Reset in the database tab, or reload the page.</p></div></div>'});
