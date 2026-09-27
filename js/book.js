'use strict';
/* book.js: UI foundation (state, icons, route map, boarding pass) and the Book flights tab: search, results, seats, payment */
/* ============ UI foundation ============ */
const S={tab:'book',user:null,token:null,
  q:{from:'BOM',to:'DEL',date:'',pax:1,cls:'Economy',sort:'price',time:'any'},
  res:null,cal:null,loading:false,explore:null,flow:null,
  trips:{tab:'upcoming',view:'trips',data:null,sum:null},pay:{data:null,filter:'all'},
  api:{sel:0,query:'',body:'',params:{},out:null,noAuth:false,pending:false},db:{table:'users',filter:''}};
S.q.date=dayToKey(localDay()+5);
const ACT={};
const IC={
plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
swap:'<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
check:'<path d="M20 6 9 17l-5-5"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
card:'<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
ticket:'<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
db:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
code:'<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
cal:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
zap:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',minus:'<path d="M5 12h14"/>',
tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'};
const ic=(n,s=18)=>`<svg class="ic ic-${n}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const stCls=s=>({Confirmed:'ok',Success:'ok',Pending:'warn',Cancelled:'mute',Failed:'bad',Refunded:'info'}[s]||'mute');
const air=fn=>AIRLINES[String(fn).split(' ')[0]];
const tz=c=>GEO[c][2];

function toast(msg,kind='ok'){const el=document.createElement('div');el.className='toast '+kind;el.setAttribute('role','status');el.innerHTML=(kind==='ok'?ic('check',16):kind==='err'?ic('x',16):ic('zap',16))+'<span>'+esc(msg)+'</span>';$('#toasts').appendChild(el);setTimeout(()=>el.classList.add('out'),3400);setTimeout(()=>el.remove(),3800)}
function modal(html,cls=''){const m=$('#modal');m.innerHTML=`<div class="scrim" data-act="${cls==='proc'?'':'closeModal'}"></div><div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;document.body.style.overflow='hidden'}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';document.body.style.overflow=''}
ACT.closeModal=closeModal;
async function api(m,u,b,o={}){const r=await G.call(m,u,{body:b,token:S.token,...o});if(r.status===401&&S.token&&!o.quiet){S.token=null;S.user=null;save();renderHeader();toast('Your session expired. Sign in again.','err')}return r}
function copyText(t){try{navigator.clipboard.writeText(t).then(()=>toast('Copied to clipboard'),()=>toast('Copy is blocked here. Select the text and copy it manually.','err'))}catch(e){toast('Copy is blocked here. Select the text and copy it manually.','err')}}

/* ============ Route map ============ */
const MAP={W:760,H:470,P:34,lon0:50,lon1:108,lat0:-3,lat1:34};
const mx=lon=>MAP.P+(lon-MAP.lon0)/(MAP.lon1-MAP.lon0)*(MAP.W-2*MAP.P),my=lat=>MAP.P+(MAP.lat1-lat)/(MAP.lat1-MAP.lat0)*(MAP.H-2*MAP.P);
const gp=c=>[mx(GEO[c][0]),my(GEO[c][1])];
const INDIA=[[68.2,23.7],[69.3,22.6],[70.4,20.9],[72.0,20.6],[72.8,19.0],[73.4,16.8],[74.2,14.6],[75.0,12.5],[76.2,9.9],[77.4,8.1],[78.2,8.9],[79.3,10.3],[80.2,12.6],[80.2,15.2],[82.0,16.6],[83.5,18.2],[85.5,19.7],[87.0,21.4],[88.3,21.7],[88.9,22.4],[89.0,25.2],[90.5,25.4],[92.2,25.0],[92.6,27.0],[95.0,26.9],[97.2,28.2],[95.5,29.3],[92.0,28.0],[89.0,27.3],[88.0,27.9],[84.5,27.5],[80.6,29.6],[79.0,31.2],[78.7,32.6],[77.8,35.4],[75.5,35.5],[74.2,34.6],[74.5,32.8],[75.2,31.6],[74.0,30.6],[72.6,28.6],[71.0,27.6],[70.3,25.6],[69.5,24.4]];
const LANKA=[[79.8,9.6],[80.5,9.7],[81.6,7.5],[81.2,6.2],[80.0,6.0],[79.7,7.5]];
const poly=pts=>pts.map(([lo,la],i)=>(i?'L':'M')+mx(lo).toFixed(1)+' '+my(la).toFixed(1)).join('')+'Z';
function arc(a,b,lift=.2){const[x1,y1]=gp(a),[x2,y2]=gp(b),dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;if(ny>0){nx=-nx;ny=-ny}const cx=(x1+x2)/2+nx*len*lift,cy=(y1+y2)/2+ny*len*lift;return`M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`}
function routeMap({routes=[],hi=null,animate=false,label='Route map'}={}){
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let g='';for(let lo=50;lo<=108;lo+=10)g+=`<line class="gl" x1="${mx(lo)}" y1="${MAP.P-14}" x2="${mx(lo)}" y2="${MAP.H-MAP.P+14}"/>`;
  for(let la=0;la<=34;la+=10)g+=`<line class="gl" x1="${MAP.P-14}" y1="${my(la)}" x2="${MAP.W-MAP.P+14}" y2="${my(la)}"/>`;
  const used=new Set(routes.flat());if(hi)hi.forEach(c=>used.add(c));
  const arcs=routes.map(([a,b])=>`<path class="arc" d="${arc(a,b)}"/>`).join('');
  let hiSvg='';
  if(hi&&hi[0]!==hi[1]){const d=arc(hi[0],hi[1],.22);hiSvg=`<path class="arc hi ${animate&&!reduce?'flow':''}" d="${d}"/>`+(animate&&!reduce?`<g class="jet"><path d="M11 0L-8 -7L-4 0L-8 7Z"/><animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path="${d}"/></g>`:'')}
  const dots=AIRPORTS.map(a=>{const c=a.airport_code,[x,y]=gp(c),isHi=hi&&hi.includes(c),on=used.has(c),col=GEO[c][3],right=x>MAP.W-150;
    const t=isHi?`<text class="lbl big" x="${(x+(right?-12:12)).toFixed(1)}" y="${(y-8).toFixed(1)}" text-anchor="${right?'end':'start'}">${a.city}</text>`:`<text class="lbl ${on?'on':''}" x="${(x+7).toFixed(1)}" y="${(y+3).toFixed(1)}">${c}</text>`;
    return`<g>${isHi?`<circle class="pulse" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" style="fill:${col}"/>`:''}<circle class="dot ${on?'on':''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isHi?6.5:on?4.5:3}" style="${on?'fill:'+col:''}"/>${t}</g>`}).join('');
  return`<svg class="map" viewBox="0 0 ${MAP.W} ${MAP.H}" role="img" aria-label="${esc(label)}">${g}<path class="land" d="${poly(INDIA)}"/><path class="land" d="${poly(LANKA)}"/>${arcs}${hiSvg}${dots}</svg>`;
}

/* ============ Boarding pass ============ */
function barcode(seed){const r=rng(hash(...[...String(seed)].map(c=>c.charCodeAt(0))));let x=0,s='';while(x<150){const w=1+Math.floor(r()*3);if(r()>.32)s+=`<rect x="${x}" y="0" width="${w}" height="46"/>`;x+=w+1+Math.floor(r()*2)}return`<svg class="barcode" viewBox="0 0 150 46" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`}
function bpHTML(bk,p){
  const f=bk.flight,a=air(f.flight_number),D=f.departure_airport_code,A=f.arrival_airport_code,dep=Date.parse(f.departure_date_time),id=f.flight_id;
  const gate='ABCD'[id%4]+(1+id%28);
  return`<div class="bp" style="--ac:${a.color}"><div class="bp-main">
    <div class="bp-head"><b>${a.name}</b><span class="pill ${stCls(bk.status)}">${bk.status}</span></div>
    <div class="bp-route"><div><strong>${D}</strong><small>${AP[D].city}</small></div><div class="bp-mid">${ic('plane',22)}<i></i></div><div><strong>${A}</strong><small>${AP[A].city}</small></div></div>
    <dl class="bp-grid"><div><dt>Passenger</dt><dd>${esc(p.first_name)} ${esc(p.last_name)}</dd></div><div><dt>Flight</dt><dd>${esc(f.flight_number)}</dd></div><div><dt>Date</dt><dd>${tDate(dep,tz(D))}</dd></div><div><dt>Departs</dt><dd>${tTime(dep,tz(D))}</dd></div><div><dt>Boards</dt><dd>${tTime(dep-40*6e4,tz(D))}</dd></div><div><dt>Gate</dt><dd>${gate}</dd></div><div><dt>Seat</dt><dd>${p.seat_number||'-'}</dd></div><div><dt>Cabin</dt><dd>${p.class||'-'}</dd></div></dl>
  </div><div class="bp-stub">${barcode(bk.pnr+p.passenger_id)}<div class="bp-pnr"><small>Booking reference</small><b>${bk.pnr}</b></div></div></div>`;
}

/* ============ Book tab ============ */
const airOpts=sel=>AIRPORTS.map(a=>`<option value="${a.airport_code}" ${a.airport_code===sel?'selected':''}>${a.city} (${a.airport_code})</option>`).join('');
const POPULAR=[['BOM','GOI'],['DEL','BLR'],['BOM','DXB'],['BLR','SIN'],['DEL','BKK'],['CCU','DEL']];
function viewBook(){
  const q=S.q,min=dayToKey(localDay()),max=dayToKey(localDay()+30);
  $('#view').innerHTML=`<section id="hero" class="hero" ${S.flow?'hidden':''}><div class="hero-in">
    <div class="hero-copy"><h1>Where to next?</h1><p>Live fares across ${AIRPORTS.length} airports. Pick your exact seat, pay once, and carry your boarding pass in your pocket.</p></div>
    <div class="hero-grid">
      <form id="sf" class="sform" autocomplete="off">
        <div class="ft"><label class="fld"><span>From</span><select data-q="from">${airOpts(q.from)}</select></label>
        <button type="button" class="swap" data-act="swap" aria-label="Swap airports">${ic('swap',18)}</button>
        <label class="fld"><span>To</span><select data-q="to">${airOpts(q.to)}</select></label></div>
        <div class="fr"><label class="fld"><span>Departure</span><input type="date" data-q="date" min="${min}" max="${max}" value="${q.date}"></label>
        <div class="fld"><span>Travellers</span><div class="stepper"><button type="button" data-act="paxDec" aria-label="Fewer travellers">${ic('minus',16)}</button><b id="paxn">${q.pax}</b><button type="button" data-act="paxInc" aria-label="More travellers">${ic('plus',16)}</button></div></div>
        <label class="fld"><span>Cabin</span><select data-q="cls">${Object.keys(CLS).map(c=>`<option ${c===q.cls?'selected':''}>${c}</option>`).join('')}</select></label></div>
        <button class="btn cta" type="submit">${ic('search',18)} Search flights</button>
        <div class="quick"><span>Popular</span>${POPULAR.map(([a,b])=>`<button type="button" class="chip glass" data-act="quick" data-a="${a}" data-b="${b}">${AP[a].city} to ${AP[b].city}</button>`).join('')}</div>
      </form>
      <div class="hero-map"><div id="hero-map"></div><p id="hero-cap" class="map-cap"></p></div>
    </div></div></section><div id="bookBody" class="wrap"></div>`;
  updateHeroMap();renderBookBody();if(!S.explore||S.explore.from!==S.q.from)loadExplore();
}
function updateHeroMap(){const el=$('#hero-map');if(!el)return;const{from,to}=S.q;el.innerHTML=routeMap({hi:[from,to],animate:true,label:`Route from ${AP[from].city} to ${AP[to].city}`});
  const cap=$('#hero-cap');if(cap)cap.textContent=from===to?'Choose two different airports.':`${AP[from].city} to ${AP[to].city}, ${Math.round(distKm(from,to)).toLocaleString('en-IN')} km, about ${hm(Math.round(distKm(from,to)/(AP[from].country!==AP[to].country?790:730)*60+32))} in the air.`}
async function loadExplore(){const from=S.q.from,r=await api('GET','/api/v1/fares/explore?from='+from,undefined,{quiet:true,latency:20});if(r.ok){S.explore=r.body;if(S.tab==='book'&&!S.res&&!S.flow)renderBookBody()}}

function exploreHTML(){
  const e=S.explore;
  const promo=`<div class="promo"><div>${ic('tag',22)}</div><div><h3>Three promo codes are live</h3><p>Apply at checkout: <b>SKY10</b> takes 10% off the fare, <b>FIRSTFLY</b> takes ₹500 off, <b>MONSOON</b> takes 7% off domestic flights.</p></div></div>`;
  if(!e)return promo+'<div class="skeleton" style="height:180px;margin-top:20px"></div>';
  return`${promo}<div class="h2row"><h2>Cheapest trips from ${AP[e.from].city}</h2><span class="muted">Lowest fares in the next 30 days</span></div>
  <div class="dests">${e.destinations.slice(0,8).map(d=>{const c=GEO[d.to][3];return`<button class="dest" data-act="dest" data-to="${d.to}" style="--c:${c}"><span class="dest-code">${d.to}</span><span class="dest-city">${d.city}</span><span class="dest-meta">${hm(d.duration_minutes)} flight, ${d.country===AP[e.from].country?'domestic':'international'}</span><span class="dest-price"><small>from</small> ${inr(d.from_price)}</span></button>`}).join('')}</div>`;
}
Object.assign(ACT,{
  swap(){const q=S.q;[q.from,q.to]=[q.to,q.from];$$('[data-q=from]')[0].innerHTML=airOpts(q.from);$$('[data-q=to]')[0].innerHTML=airOpts(q.to);updateHeroMap();S.explore=null;loadExplore()},
  paxInc(){if(S.q.pax<6)S.q.pax++;$('#paxn').textContent=S.q.pax},paxDec(){if(S.q.pax>1)S.q.pax--;$('#paxn').textContent=S.q.pax},
  quick(t){S.q.from=t.dataset.a;S.q.to=t.dataset.b;$('[data-q=from]').value=S.q.from;$('[data-q=to]').value=S.q.to;updateHeroMap();doSearch();loadExplore()},
  dest(t){S.q.to=t.dataset.to;$('[data-q=to]').value=S.q.to;updateHeroMap();doSearch();window.scrollTo({top:0,behavior:'smooth'})}
});
async function doSearch(){
  const q=S.q;if(q.from===q.to){toast('Pick two different airports.','err');return}
  if(!q.date){toast('Choose a departure date.','err');return}
  S.flow=null;S.loading=true;S.res=null;renderBookBody();
  const qs=new URLSearchParams({from:q.from,to:q.to,date:q.date,class:q.cls,pax:q.pax}).toString();
  const[r,c]=await Promise.all([api('GET','/api/v1/flights?'+qs),api('GET','/api/v1/fares/calendar?'+qs)]);
  S.loading=false;S.res=r.ok?r.body:{error:r.body.error,flights:[]};S.cal=c.ok?c.body:null;renderBookBody();
  const b=$('#bookBody');if(b)window.scrollTo({top:b.offsetTop-80,behavior:'smooth'});
}
function timeBucket(f){const t=tz(f.departure_airport_code),d=wall(Date.parse(f.departure_date_time),t),m=d.getUTCHours()*60+d.getUTCMinutes();return m<720&&m>=300?'morning':m>=720&&m<1020?'afternoon':m>=1020&&m<1260?'evening':'night'}
function sortedFlights(){
  const cls=S.q.cls;let l=(S.res.flights||[]).slice();
  if(S.q.time!=='any')l=l.filter(f=>timeBucket(f)===S.q.time);
  const s={price:(a,b)=>a.fares[cls].from-b.fares[cls].from,duration:(a,b)=>a.duration_minutes-b.duration_minutes,departure:(a,b)=>Date.parse(a.departure_date_time)-Date.parse(b.departure_date_time)};
  return l.sort(s[S.q.sort]);
}
function ticketHTML(f,tags){
  const a=air(f.flight_number),D=f.departure_airport_code,A=f.arrival_airport_code,dep=Date.parse(f.departure_date_time),arr=Date.parse(f.arrival_date_time),cls=S.q.cls,fare=f.fares[cls];
  const next=tKey(dep,tz(D))!==tKey(arr,tz(A));
  const alts=Object.keys(CLS).filter(c=>c!==cls&&f.fares[c]).map(c=>`<button class="alt" data-act="select" data-id="${f.flight_id}" data-cls="${c}" style="--cc:${CLS[c].color}"><i></i>${c} ${inr(f.fares[c].from)}</button>`).join('');
  return`<article class="ticket" style="--ac:${a.color}"><div class="tmain">
    <div class="tair"><span class="tdot"></span><b>${a.name}</b><span class="muted">${esc(f.flight_number)}</span><span class="muted">${esc(f.aircraft_model)}</span></div>
    <div class="troute"><div class="tend"><b class="tt">${tTime(dep,tz(D))}</b><span class="tc">${D}</span><span class="tcity">${AP[D].city}</span></div>
      <div class="tmid"><span>${hm(f.duration_minutes)}</span><div class="tline">${ic('plane',18)}</div><span>Non-stop</span></div>
      <div class="tend r"><b class="tt">${tTime(arr,tz(A))}${next?'<sup>+1</sup>':''}</b><span class="tc">${A}</span><span class="tcity">${AP[A].city}</span></div></div>
    <div class="ttags">${tags.map(t=>`<span class="tag ${t[1]}">${t[0]}</span>`).join('')}</div>
  </div><div class="tstub"><div class="tprice"><small>${cls} from</small><b>${inr(fare.from)}</b><small>per traveller</small></div>
    <button class="btn primary" data-act="select" data-id="${f.flight_id}" data-cls="${cls}">Select flight</button><div class="alts">${alts}</div></div></article>`;
}
function resultsHTML(){
  const q=S.q;
  if(S.loading)return`<div class="skeleton" style="height:64px;margin:20px 0"></div>${'<div class="skeleton" style="height:150px;margin-bottom:16px"></div>'.repeat(3)}`;
  const r=S.res;
  const head=`<div class="rhead"><div><h2>${AP[q.from].city} to ${AP[q.to].city}</h2><p class="muted">${tDateY(keyToDay(q.date)*DAY,0)}, ${q.pax} traveller${q.pax>1?'s':''}, ${q.cls}</p></div><button class="btn ghost sm" data-act="clearSearch">Back to ideas</button></div>`;
  if(r.error)return head+`<div class="empty"><h3>We could not run that search</h3><p>${esc(r.error.message)}</p></div>`;
  const all=r.flights,fl=sortedFlights(),cls=q.cls;
  const cheap=all.length?Math.min(...all.map(f=>f.fares[cls].from)):0,fast=all.length?Math.min(...all.map(f=>f.duration_minutes)):0;
  const cal=S.cal?`<div class="cal" role="group" aria-label="Fares by day">${S.cal.days.map(d=>{const dd=keyToDay(d.date),dw=DOW[new Date(dd*DAY).getUTCDay()],on=d.date===q.date;return`<button class="cal-d ${on?'on':''}" data-act="calDay" data-date="${d.date}" ${d.flights?'':'disabled'}><span>${dw} ${new Date(dd*DAY).getUTCDate()}</span><b>${d.flights?inr(d.cheapest):'No flights'}</b></button>`}).join('')}</div>`:'';
  const chips=(k,opts)=>opts.map(([v,l])=>`<button class="chip ${q[k]===v?'on':''}" data-act="filter" data-k="${k}" data-v="${v}">${l}</button>`).join('');
  const bar=`<div class="fbar"><div class="chips"><span class="muted">Sort</span>${chips('sort',[['price','Cheapest'],['duration','Fastest'],['departure','Earliest']])}</div><div class="chips"><span class="muted">Departs</span>${chips('time',[['any','Any time'],['morning','Morning'],['afternoon','Afternoon'],['evening','Evening'],['night','Night']])}</div></div>`;
  const list=fl.length?fl.map(f=>{const tags=[];if(f.fares[cls].from===cheap)tags.push(['Cheapest','ok']);if(f.duration_minutes===fast)tags.push(['Fastest','info']);if(f.fares[cls].left<=6)tags.push([f.fares[cls].left+' seats left at this price','warn']);return ticketHTML(f,tags)}).join(''):`<div class="empty"><h3>${all.length?'No flights at that time of day':'No flights for these dates'}</h3><p>${all.length?'Try a different time of day.':'Try another date from the fare strip above, or a nearby airport.'}</p></div>`;
  return head+cal+bar+`<div class="tickets">${list}</div>`;
}
function renderBookBody(){
  const el=$('#bookBody');if(!el)return;
  if(S.flow){$('#hero').hidden=true;el.innerHTML=flowHTML();afterFlow();return}
  $('#hero').hidden=false;el.innerHTML=(S.loading||S.res)?resultsHTML():exploreHTML();
}
Object.assign(ACT,{
  clearSearch(){S.res=null;S.cal=null;renderBookBody()},
  filter(t){S.q[t.dataset.k]=t.dataset.v;renderBookBody()},
  calDay(t){S.q.date=t.dataset.date;$('[data-q=date]').value=S.q.date;doSearch()}
});

/* ============ Booking flow ============ */
const NATS=['India','United Arab Emirates','Singapore','Thailand','Sri Lanka','United Kingdom','United States','Other'];
const blankPax=()=>({first_name:'',last_name:'',date_of_birth:'',passport_number:'',nationality:'India'});
function startFlow(id,cls){
  const f=S.res.flights.find(x=>x.flight_id==id);if(!f)return;
  if(!S.user){openAuth(()=>startFlow(id,cls));return}
  const n=S.q.pax,pax=Array.from({length:n},blankPax);
  pax[0].first_name=S.user.first_name;pax[0].last_name=S.user.last_name;
  if(S.user.email==='demo@skyline.app'){pax[0].date_of_birth='1994-03-14';pax[0].passport_number='K1234567'}
  S.flow={f,cls,n,step:1,active:0,seats:{},pax,errors:{},quote:null,_qt:0,promo:'',promoMsg:null,method:'UPI',pay:newPay(S.user.first_name+' '+S.user.last_name),booking:null,payError:null,seatData:null,busy:false};
  renderBookBody();window.scrollTo({top:0,behavior:'smooth'});
}
Object.assign(ACT,{select(t){startFlow(t.dataset.id,t.dataset.cls)}});
const STEPS=['Travellers','Seats','Payment','Boarding pass'];
function flowHead(F){
  const f=F.f,a=air(f.flight_number),D=f.departure_airport_code,A=f.arrival_airport_code,dep=Date.parse(f.departure_date_time),arr=Date.parse(f.arrival_date_time);
  return`<div class="fh" style="--ac:${a.color}"><div class="fh-route"><b>${D}</b>${ic('plane',18)}<b>${A}</b></div><div class="fh-info"><b>${AP[D].city} to ${AP[A].city}</b><span>${tDate(dep,tz(D))}, ${tTime(dep,tz(D))} to ${tTime(arr,tz(A))}, ${hm(f.duration_minutes)}</span><span>${a.name} ${esc(f.flight_number)}, ${F.n} traveller${F.n>1?'s':''}</span></div>${F.step<4?`<button class="btn ghost sm" data-act="exitFlow">${F.booking&&F.booking.status==='Pending'?'Release seats and exit':'Back to results'}</button>`:''}</div>
  <ol class="steps">${STEPS.map((s,i)=>`<li class="${F.step===i+1?'on':F.step>i+1?'done':''}"><span>${F.step>i+1?ic('check',14):i+1}</span>${s}</li>`).join('')}</ol>`;
}
function flowHTML(){const F=S.flow;return`<div class="flow">${flowHead(F)}${[null,stepPax,stepSeats,stepPay,stepDone][F.step](F)}</div>`}
function afterFlow(){const F=S.flow;if(F.step===2&&!F.seatData)loadSeats();if(F.step===3)refreshQuote();tick()}
const fld=(path,label,val,o={})=>`<label class="fld ${o.cls||''}"><span>${label}</span><input ${o.type?`type="${o.type}"`:''} data-b="${path}" value="${esc(val)}" ${o.ph?`placeholder="${o.ph}"`:''} ${o.max?`max="${o.max}"`:''} ${o.style||''}>${o.err?`<em class="err">${esc(o.err)}</em>`:''}</label>`;
function stepPax(F){
  return`<div class="paxlist">${F.pax.map((p,i)=>{const e=k=>F.errors[`pax.${i}.${k}`];return`<fieldset class="card paxcard"><legend>Traveller ${i+1}${i===0?' (you)':''}</legend><div class="formgrid">
    ${fld(`pax.${i}.first_name`,'First name',p.first_name,{err:e('first_name')})}${fld(`pax.${i}.last_name`,'Last name',p.last_name,{err:e('last_name')})}
    ${fld(`pax.${i}.date_of_birth`,'Date of birth',p.date_of_birth,{type:'date',max:dayToKey(localDay()),err:e('date_of_birth')})}
    ${fld(`pax.${i}.passport_number`,'Passport number',p.passport_number,{ph:'K1234567',err:e('passport_number')})}
    <label class="fld"><span>Nationality</span><select data-b="pax.${i}.nationality">${NATS.map(n=>`<option ${n===p.nationality?'selected':''}>${n}</option>`).join('')}</select></label></div></fieldset>`}).join('')}</div>
  <div class="flow-actions"><span class="muted">Names must match the passport exactly.</span><button class="btn primary" data-act="toSeats">Continue to seats</button></div>`;
}
function validatePax(F){
  const err={};F.pax.forEach((p,i)=>{['first_name','last_name'].forEach(k=>{if(!p[k].trim())err[`pax.${i}.${k}`]='Required'});
    if(!p.date_of_birth||isNaN(Date.parse(p.date_of_birth))||Date.parse(p.date_of_birth)>Date.now())err[`pax.${i}.date_of_birth`]='Enter a valid date';
    if(!/^[A-Z0-9]{6,9}$/i.test(p.passport_number.trim()))err[`pax.${i}.passport_number`]='6 to 9 letters or digits'});
  F.errors=err;return!Object.keys(err).length;
}
async function loadSeats(){
  const F=S.flow,r=await api('GET','/api/v1/flights/'+F.f.flight_id+'/seats',undefined,{quiet:true,latency:40});
  if(S.flow!==F)return;if(r.ok)F.seatData=r.body.seats;else{toast(r.body.error.message,'err');return}
  renderBookBody();
}
const initial=(F,i)=>((F.pax[i].first_name||'?')[0]||'?').toUpperCase();
function seatArea(F){
  const by=Object.fromEntries(F.seatData.map(s=>[s.seat_number,s])),mine={};Object.entries(F.seats).forEach(([i,id])=>mine[id]=+i);
  const rows=[...new Set(SEAT_LAYOUT.map(s=>s.row))];let html='',last='';
  rows.forEach(row=>{const cls=SEAT_LAYOUT.find(s=>s.row===row).class;
    if(cls!==last){const av=F.seatData.filter(s=>s.class===cls&&s.is_available).length;html+=`<div class="cabin-h" style="--cc:${CLS[cls].color}"><b>${cls}</b><span>${av} free, from ${inr(Math.min(...F.seatData.filter(s=>s.class===cls).map(s=>s.price)))}</span></div>`;last=cls}
    const cols=cls==='Economy'?['A','B','C','|','D','E','F']:['A','-','C','|','D','-','F'];
    html+=`<div class="srow"><span class="rn">${row}</span>${cols.map(c=>{if(c==='|')return'<span class="aisle"></span>';if(c==='-')return'<span></span>';const s=by[row+c],mi=mine[s.seat_id],st=mi!=null?'mine':s.is_available?'free':'taken',tag=SEAT_LAYOUT[s.seat_id%100].tag;
      return`<button class="seat ${st} c-${cls}" style="--cc:${CLS[cls].color}" data-act="pickSeat" data-id="${s.seat_id}" ${st==='taken'?'disabled':''} title="${s.seat_number}, ${tag}, ${inr(s.price)}" aria-label="Seat ${s.seat_number}, ${cls}, ${tag}, ${inr(s.price)}, ${st==='mine'?'selected':st==='free'?'available':'taken'}">${mi!=null?initial(F,mi):(st==='taken'?'':c)}</button>`}).join('')}</div>`});
  return html;
}
const paxTabs=F=>F.pax.map((p,i)=>{const id=F.seats[i],s=id?SEAT_LAYOUT[id%100].seat_number:null;return`<button class="ptab ${F.active===i?'on':''}" data-act="activePax" data-i="${i}"><span class="pav">${initial(F,i)}</span><span><b>${esc(p.first_name||'Traveller '+(i+1))}</b><small>${s?'Seat '+s:'Choose a seat'}</small></span></button>`}).join('');
function sumHTML(F){
  const q=F.quote,b=F.booking;
  if(F.step===2){
    const rows=F.pax.map((p,i)=>{const id=F.seats[i],s=id&&F.seatData.find(x=>x.seat_id===id);return`<div class="lr"><span>${esc(p.first_name||'Traveller '+(i+1))}${s?', seat '+s.seat_number:''}</span><b>${s?inr(s.price):'-'}</b></div>`}).join('');
    const done=Object.keys(F.seats).length===F.n;
    return`<h3>Your seats</h3>${rows}${q?`<div class="lr sub"><span>Taxes and airport fees</span><b>${inr(q.taxes+q.airport_fee)}</b></div><div class="lr tot"><span>Total</span><b>${inr(q.total)}</b></div>`:'<p class="muted">Pick a seat for each traveller to see your total.</p>'}
    <button class="btn ghost block" data-act="autoSeats">${ic('zap',16)} Pick the cheapest seats for me</button>
    <button class="btn primary block" data-act="toPay" ${done?'':'disabled'}>${done?'Continue to payment':`Choose ${F.n-Object.keys(F.seats).length} more seat${F.n-Object.keys(F.seats).length>1?'s':''}`}</button>`;
  }
  const total=b?b.total_amount:(q?q.total:0);
  const payer=F.pax[0]&&F.pax[0].first_name?`${F.pax[0].first_name} ${F.pax[0].last_name}`.trim():S.user.first_name+' '+S.user.last_name;
  const payerLine=F.step===3&&!b?`<p class="payer">${ic('user',13)} Billed to <b>${esc(payer)}</b>, traveller 1</p>`:'';
  const lines=q&&!b?`<div class="lr"><span>Fare, ${F.n} seat${F.n>1?'s':''}</span><b>${inr(q.fare)}</b></div><div class="lr"><span>Taxes (GST)</span><b>${inr(q.taxes)}</b></div><div class="lr"><span>Airport fees</span><b>${inr(q.airport_fee)}</b></div>${q.discount?`<div class="lr disc"><span>Promo ${esc(q.promo.code)}</span><b>-${inr(q.discount)}</b></div>`:''}`:'';
  const promo=b?'':`<div class="promo-in"><input data-b="promo" value="${esc(F.promo)}" placeholder="Promo code" aria-label="Promo code" style="text-transform:uppercase"><button class="btn ghost sm" data-act="applyPromo">Apply</button></div>${F.promoMsg?`<p class="pm ${F.promoMsg[1]}">${esc(F.promoMsg[0])}</p>`:''}`;
  const hold=b&&b.status==='Pending'?`<div class="hold">${ic('clock',16)}<span>Your seats are held for <b data-countdown="${b.expires_at}">15:00</b></span></div>`:'';
  return`<h3>Price summary</h3>${payerLine}${lines}${b?'<div class="lr"><span>Booking reference</span><b>'+pnr(b.booking_id)+'</b></div>':''}<div class="lr tot"><span>Total</span><b>${inr(total)}</b></div>${promo}${hold}
  <button id="paybtn" class="btn cta block" data-act="pay" ${total?'':'disabled'}>${payBtn(F,total)}</button><p class="secure">${ic('shield',14)} Payments are simulated. No real money moves.</p>`;
}
function stepSeats(F){
  if(!F.seatData)return'<div class="skeleton" style="height:420px"></div>';
  return`<div class="seatwrap"><div class="card"><div class="paxtabs" id="ptabs">${paxTabs(F)}</div>
    <div class="legend"><span><i class="lg free"></i>Available</span><span><i class="lg mine"></i>Yours</span><span><i class="lg taken"></i>Taken</span><span class="muted">Front rows and rows 11 and 12 (extra legroom) cost more</span></div>
    <div class="fuselage" id="seatarea">${seatArea(F)}</div></div><aside class="card sumcard" id="sum">${sumHTML(F)}</aside></div>`;
}
Object.assign(ACT,{
  toSeats(){const F=S.flow;if(!validatePax(F)){renderBookBody();toast('Fix the highlighted fields.','err');return}F.step=2;F.seatData=null;F.seats={};F.quote=null;F.active=0;renderBookBody();window.scrollTo({top:0,behavior:'smooth'})},
  activePax(t){S.flow.active=+t.dataset.i;$('#ptabs').innerHTML=paxTabs(S.flow)},
  pickSeat(t){const F=S.flow,id=+t.dataset.id,owner=Object.entries(F.seats).find(([,s])=>s===id);
    if(owner){delete F.seats[owner[0]];F.active=+owner[0]}else{F.seats[F.active]=id;const nx=[...Array(F.n).keys()].find(i=>F.seats[i]==null);if(nx!=null)F.active=nx}
    $('#seatarea').innerHTML=seatArea(F);$('#ptabs').innerHTML=paxTabs(F);$('#sum').innerHTML=sumHTML(F);refreshQuote()},
  autoSeats(){const F=S.flow,taken=new Set(Object.values(F.seats));const pool=F.seatData.filter(s=>s.is_available&&s.class===F.cls&&!taken.has(s.seat_id)).sort((a,b)=>a.price-b.price);
    for(let i=0;i<F.n;i++)if(F.seats[i]==null){const s=pool.shift();if(s)F.seats[i]=s.seat_id}
    $('#seatarea').innerHTML=seatArea(F);$('#ptabs').innerHTML=paxTabs(F);$('#sum').innerHTML=sumHTML(F);refreshQuote()},
  toPay(){const F=S.flow;if(Object.keys(F.seats).length<F.n)return;F.step=3;F.payError=null;renderBookBody();window.scrollTo({top:0,behavior:'smooth'})},
  applyPromo(){const F=S.flow;F.promo=($('[data-b=promo]').value||'').trim();F.promoMsg=null;refreshQuote(true)},
  async exitFlow(){const F=S.flow;if(F&&F.booking&&F.booking.status==='Pending')await api('POST','/api/v1/bookings/'+F.booking.booking_id+'/cancel',undefined,{quiet:true,latency:20});S.flow=null;renderBookBody();window.scrollTo({top:0,behavior:'smooth'})},
  method(t){const F=S.flow;F.method=t.dataset.m;F.payError=null;$('#paypanel').innerHTML=payPanel(F);refreshPayBtn()},
  pick(t){const F=S.flow,k=t.dataset.k;F.pay[k]=k==='tenure'?+t.dataset.v:t.dataset.v;F.payError=null;$('#paypanel').innerHTML=payPanel(F);refreshPayBtn()},
  upiHandle(t){const F=S.flow,cur=F.pay.upi.split('@')[0]||'yourname';F.pay.upi=cur+t.dataset.v;const i=$('[data-b="pay.upi"]');if(i)i.value=F.pay.upi},
  upiApprove(){const F=S.flow;if(F&&F._upi)F._upi.fin('approve')},upiDecline(){const F=S.flow;if(F&&F._upi)F._upi.fin('decline')},upiCancel(){const F=S.flow;if(F&&F._upi)F._upi.fin('cancel')},
  pay(){payNow()},
  finishTrips(){S.flow=null;S.res=null;go('trips')},newSearch(){S.flow=null;S.res=null;renderBookBody();window.scrollTo({top:0,behavior:'smooth'})},
});
async function refreshQuote(showPromo){
  const F=S.flow;if(!F)return;const ids=Object.values(F.seats);
  if(F.booking||!ids.length){F.quote=F.booking?F.quote:null;const s=$('#sum');if(s)s.innerHTML=sumHTML(F);return}
  const tk=++F._qt,r=await api('POST','/api/v1/bookings/quote',{flight_id:F.f.flight_id,seat_ids:ids,promo_code:F.promo},{quiet:true,latency:25});
  if(tk!==F._qt||S.flow!==F)return;F.quote=r.ok?r.body.price:null;
  if(showPromo&&F.quote){F.promoMsg=F.quote.promo_error?[F.quote.promo_error,'bad']:F.quote.promo?['Applied: '+F.quote.promo.label,'ok']:F.promo?null:['Enter a code to apply it.','bad']}
  const s=$('#sum');if(s)s.innerHTML=sumHTML(F);
}

/* --- payment step --- */
const newPay=name=>({card:{number:'',name,exp:'',cvv:''},app:'Google Pay',upi:'',bank:'Harbor Bank',wallet:'Paytm Wallet',emiBank:'Harbor Bank',tenure:6,later:'Simpl',mobile:''});
const payLabel=p=>p.provider&&p.provider!==p.method_detail?(p.method_detail?`${p.provider} (${p.method_detail})`:p.provider):(p.method_detail||p.method);
const payTotal=F=>F.booking?F.booking.total_amount:(F.quote?F.quote.total:0);
function payBtn(F,t){const m=F.method;return m==='UPI'?`Pay ${inr(t)} with ${F.pay.app==='Other UPI app'?'UPI':F.pay.app}`:m==='EMI'?`Pay ${inr(t)} on EMI`:m==='PayLater'?`Pay ${inr(t)} later with ${F.pay.later}`:`Pay ${inr(t)}`}
function refreshPayBtn(){const b=$('#paybtn'),F=S.flow;if(b&&F)b.textContent=payBtn(F,payTotal(F))}
function fmtCard(v){const d=v.replace(/\D/g,'').slice(0,19);return/^3[47]/.test(d)?[d.slice(0,4),d.slice(4,10),d.slice(10,15)].filter(Boolean).join(' '):d.replace(/(.{4})/g,'$1 ').trim()}
function ccHTML(c){const d=c.number.replace(/\s/g,''),b=brandOf(d);return`<div class="ccard n-${b.toLowerCase()}" id="ccard"><div class="cc-top"><span class="cc-chip"></span><b id="cc-net">${b==='Card'?'':b}</b></div><div class="cc-num" id="cc-num">${esc(c.number||'•••• •••• •••• ••••')}</div><div class="cc-bot"><div><small>Card holder</small><span id="cc-name">${esc(c.name||'Your name')}</span></div><div><small>Expires</small><span id="cc-exp">${esc(c.exp||'MM/YY')}</span></div></div></div>`}
const tile=(k,v,color,badge,on,label)=>`<button type="button" class="bank ${on?'on':''}" data-act="pick" data-k="${k}" data-v="${esc(v)}" aria-pressed="${!!on}"><span class="bk" style="background:${color}">${esc(badge)}</span>${esc(label||v)}</button>`;
const BANKBG='linear-gradient(135deg,#1FA2FF,#5B3DF5)';
const MIC={UPI:'zap',Card:'card',NetBanking:'db',Wallet:'wallet',EMI:'cal',PayLater:'clock'};
function cardForm(F){const c=F.pay.card;return`<div class="cardpay">${ccHTML(c)}<div class="formgrid tight">
    <label class="fld wide"><span>Card number</span><input data-cc="number" inputmode="numeric" value="${esc(c.number)}" placeholder="4242 4242 4242 4242" autocomplete="off"></label>
    <label class="fld wide"><span>Name on card</span><input data-cc="name" value="${esc(c.name)}" autocomplete="off"></label>
    <label class="fld"><span>Expiry</span><input data-cc="exp" inputmode="numeric" value="${esc(c.exp)}" placeholder="MM/YY" maxlength="5" autocomplete="off"></label>
    <label class="fld"><span>Security code</span><input data-cc="cvv" inputmode="numeric" value="${esc(c.cvv)}" placeholder="123" maxlength="4" type="password" autocomplete="off"></label></div></div>
    <p class="hint">Test cards: <button class="lnk" data-act="fillCard" data-n="4242 4242 4242 4242">4242 4242 4242 4242</button> succeeds, <button class="lnk" data-act="fillCard" data-n="4000 0000 0000 0002">4000 0000 0000 0002</button> is declined. Use any future expiry.</p>`}
function payPanel(F){
  const p=F.pay,total=payTotal(F);let body='';
  if(F.method==='UPI'){const a=PAY.upiApps[p.app];
    body=`<p class="sub">Choose your UPI app</p><div class="banks">${Object.entries(PAY.upiApps).map(([n,x])=>tile('app',n,x.c,x.b,p.app===n)).join('')}</div>
    <label class="fld" style="margin-top:16px"><span>UPI ID or mobile number</span><input data-b="pay.upi" value="${esc(p.upi)}" placeholder="name${a.handles[0]} or 98200 12345" autocomplete="off"></label>
    <div class="chips" style="margin-top:10px">${a.handles.map(h=>`<button type="button" class="chip" data-act="upiHandle" data-v="${h}">${h}</button>`).join('')}</div>
    <p class="hint">We send a payment request to ${esc(p.app==='Other UPI app'?'your UPI app':p.app)}. Approve it there within 3 minutes. Any ID works in this demo. An ID that starts with <b>fail@</b> shows a failed request.</p>`}
  else if(F.method==='Card')body=cardForm(F);
  else if(F.method==='NetBanking')body=`<p class="sub">Choose your bank</p><div class="banks">${PAY.banks.map(b=>tile('bank',b,BANKBG,b[0],p.bank===b)).join('')}</div><p class="hint">Metro Trust is offline in this demo, so it will fail.</p>`;
  else if(F.method==='Wallet')body=`<p class="sub">Choose a wallet</p><div class="banks">${Object.entries(PAY.wallets).map(([n,c])=>tile('wallet',n,c,n[0],p.wallet===n)).join('')}</div><p class="hint">Mobikwik has a low balance in this demo, so you can see that failure.</p>`;
  else if(F.method==='EMI'){
    body=total<PAY.emiMin?`<div class="banner info">${ic('zap',16)}<span>EMI is available for bookings of ${inr(PAY.emiMin)} or more. Your total is ${inr(total)}.</span></div>`:
    `<p class="sub">Choose the bank that issued your card</p><div class="banks">${PAY.emiBanks.map(b=>tile('emiBank',b,BANKBG,b[0],p.emiBank===b)).join('')}</div>
    <p class="sub" style="margin-top:18px">Choose a tenure</p><div class="tenures">${PAY.tenures.map(n=>{const e=emiCalc(total,n);return`<button type="button" class="ten ${p.tenure===n?'on':''}" data-act="pick" data-k="tenure" data-v="${n}" aria-pressed="${p.tenure===n}"><b>${n} months</b><span>${inr(e.monthly)} a month</span><small>${e.interest?`${e.rate}% a year, interest ${inr(e.interest)}`:'No-cost EMI'}</small></button>`}).join('')}</div>
    <div style="margin-top:18px">${cardForm(F)}</div><p class="hint" style="margin-top:6px">Any interest is billed by your bank, not added to this booking.</p>`}
  else body=`<p class="sub">Choose a provider</p><div class="banks">${Object.entries(PAY.later).map(([n,c])=>tile('later',n,c,n[0],p.later===n)).join('')}</div>
    <label class="fld" style="margin-top:16px"><span>Mobile number registered with ${esc(p.later)}</span><input data-b="pay.mobile" value="${esc(p.mobile)}" placeholder="98200 12345" inputmode="numeric" autocomplete="off"></label>
    <p class="hint">Book now and pay within 15 days, with no interest if you pay on time. The demo limit is ${inr(PAY.laterLimit)}${total>PAY.laterLimit?`, and this booking is above it, so it will be declined`:''}.</p>`;
  return`<div class="methods" role="tablist">${PAY.methods.map(([k,l])=>`<button role="tab" aria-selected="${F.method===k}" class="mth ${F.method===k?'on':''}" data-act="method" data-m="${k}">${ic(MIC[k],18)}${l}</button>`).join('')}</div>${F.payError?`<div class="banner bad" role="alert">${ic('x',16)}<span>${esc(F.payError)}</span></div>`:''}<div class="paybody">${body}</div>`;
}
function stepPay(F){return`<div class="paywrap"><div class="card"><h3>How would you like to pay?</h3><div id="paypanel">${payPanel(F)}</div></div><aside class="card sumcard" id="sum">${sumHTML(F)}</aside></div>`}
Object.assign(ACT,{fillCard(t){const F=S.flow;F.pay.card.number=t.dataset.n;if(!F.pay.card.exp)F.pay.card.exp='12/29';if(!F.pay.card.cvv)F.pay.card.cvv='123';$('#paypanel').innerHTML=payPanel(F)}});
function payBody(F){const m=F.method,p=F.pay,c=p.card,card={number:c.number,name:c.name,expiry:c.exp,cvv:c.cvv};
  if(m==='Card')return{method:m,details:card};if(m==='UPI')return{method:m,details:{app:p.app,upi_id:p.upi}};
  if(m==='NetBanking')return{method:m,details:{bank:p.bank}};if(m==='Wallet')return{method:m,details:{wallet:p.wallet}};
  if(m==='EMI')return{method:m,details:{...card,bank:p.emiBank,tenure:p.tenure}};return{method:'PayLater',details:{provider:p.later,mobile:p.mobile}}}
function procHTML(stage,state,msg){
  const L=['Reserving your seats','Contacting your bank','Confirming your booking'];
  if(state==='ok')return`<div class="pr-res ok"><div class="pr-ic">${ic('check',34)}</div><h3>Payment received</h3><p>Preparing your boarding pass.</p></div>`;
  if(state==='fail')return`<div class="pr-res bad"><div class="pr-ic">${ic('x',34)}</div><h3>Payment did not go through</h3><p>${esc(msg)}</p><button class="btn primary" data-act="closeModal">Back to payment</button></div>`;
  return`<h3>Processing your payment</h3><ul class="pr-steps">${L.map((l,i)=>`<li class="${i<stage?'done':i===stage?'act':''}"><span>${i<stage?ic('check',14):''}</span>${l}</li>`).join('')}</ul>`;
}
/* UPI: a request is sent to the app and the customer approves it there. The phone below stands in for that app. */
function upiHTML(p){const a=PAY.upiApps[p.provider]||PAY.upiApps['Other UPI app'],t=PAY.upiExpirySeconds;
  return`<div class="upi-wait"><h3>Approve the payment in ${esc(p.provider)}</h3><div class="phone"><div class="phone-h" style="background:${a.c}"><span class="phone-badge">${a.b}</span><b>${esc(p.provider)}</b></div><div class="phone-body"><small>Payment request from Skyline Air Desk</small><div class="phone-amt">${inr(p.amount)}</div><small>Paying from ${esc(p.method_detail)}</small><div class="phone-a"><button class="btn ghost" data-act="upiDecline">Decline</button><button class="btn primary" data-act="upiApprove">Approve</button></div></div></div>
  <p class="muted">On a real phone this arrives as a notification. Here, these buttons stand in for the app. The request expires in <b class="mono" id="upi-t">${pad(Math.floor(t/60))}:${pad(t%60)}</b>.</p><button class="lnk" data-act="upiCancel">Cancel this payment</button></div>`}
function waitUpi(F,p){
  return new Promise(res=>{
    const end=Date.now()+PAY.upiExpirySeconds*1000;modal(upiHTML(p),'proc');
    const iv=setInterval(()=>{const s=Math.max(0,Math.round((end-Date.now())/1000)),el=$('#upi-t');if(el)el.textContent=pad(Math.floor(s/60))+':'+pad(s%60);if(s<=0)fin('timeout')},500);
    function fin(a){clearInterval(iv);F._upi=null;res(a)}
    F._upi={fin};
  });
}
async function payNow(){
  const F=S.flow;if(!F||F.busy)return;F.busy=true;F.payError=null;F.emi=null;
  try{
    modal(procHTML(0),'proc');
    if(!F.booking){
      const r=await api('POST','/api/v1/bookings',{flight_id:F.f.flight_id,passengers:F.pax.map((p,i)=>({...p,seat_id:F.seats[i]})),promo_code:F.promo});
      if(!r.ok){closeModal();toast(r.body.error.message,'err');if(r.status===409){F.step=2;F.seatData=null;F.seats={};F.quote=null}else F.payError=r.body.error.message;renderBookBody();return}
      F.booking=r.body.booking;
    }
    modal(procHTML(1),'proc');
    let r=await api('POST','/api/v1/payments',{booking_id:F.booking.booking_id,...payBody(F)});
    if(r.status===202){const p=r.body.payment,action=await waitUpi(F,p);modal(procHTML(2),'proc');r=await api('POST','/api/v1/payments/'+p.payment_id+'/confirm',{action})}
    if(!r.ok){
      F.payError=r.body.error.message;
      if(r.status===402){modal(procHTML(1,'fail',r.body.error.message),'proc');const sc=$('.scrim');if(sc)sc.dataset.act='closeModal'}
      else closeModal();
      const bk=await api('GET','/api/v1/bookings/'+F.booking.booking_id,undefined,{quiet:true,latency:10});if(bk.ok)F.booking=bk.body.booking;
      const pp=$('#paypanel');if(pp)pp.innerHTML=payPanel(F);const sm=$('#sum');if(sm)sm.innerHTML=sumHTML(F);tick();
      return;
    }
    if(r.body.emi)F.emi=r.body.emi;
    modal(procHTML(2),'proc');await sleep(700);
    F.payment=r.body.payment;F.booking=r.body.booking;modal(procHTML(3,'ok'),'proc');await sleep(1000);closeModal();
    F.step=4;renderBookBody();window.scrollTo({top:0,behavior:'smooth'});
  }finally{F.busy=false}
}
function stepDone(F){
  const b=F.booking,p=F.payment;
  return`<div class="done"><div class="stamp">${ic('check',30)}</div><h2>You are booked</h2><p>Booking reference <b class="mono">${b.pnr}</b>. We sent the receipt to ${esc(S.user.email)}.</p></div>
  <div class="passes">${b.passengers.map(x=>bpHTML(b,x)).join('')}</div>
  <div class="card receipt"><div class="lr"><span>Billed to</span><b>${esc(p.payer_name||b.passengers[0].first_name+' '+b.passengers[0].last_name)}</b></div><div class="lr"><span>Paid with</span><b>${esc(payLabel(p))}</b></div>${F.emi?`<div class="lr"><span>EMI</span><b>${inr(F.emi.monthly)} a month for ${F.emi.months} months</b></div>`:''}<div class="lr"><span>Transaction</span><b class="mono">${p.transaction_ref}</b></div><div class="lr tot"><span>Total paid</span><b>${inr(p.amount)}</b></div></div>
  <div class="flow-actions"><button class="btn ghost" data-act="newSearch">Search another flight</button><button class="btn primary" data-act="finishTrips">View my trips</button></div>`;
}
/* live countdown for held seats */
function tick(){$$('[data-countdown]').forEach(el=>{const ms=Date.parse(el.dataset.countdown)-Date.now();if(ms<=0){el.textContent='expired';el.classList.add('bad');return}const s=Math.floor(ms/1000);el.textContent=pad(Math.floor(s/60))+':'+pad(s%60);el.classList.toggle('warn',ms<12e4)})}
setInterval(tick,1000);
