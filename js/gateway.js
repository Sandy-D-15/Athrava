'use strict';
/* gateway.js: simulated API gateway (rate limit, router, auth) and every service route */
/* ============ API gateway (simulated, runs in the browser) ============ */
const SECRET='skyline-demo-secret',BASE='https://api.skyline.dev';
const b64u=s=>btoa(s).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const signToken=p=>{const b=b64u(JSON.stringify(p));return'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'+b+'.'+fnv(b+SECRET)};
function verifyToken(t){try{const [h,b,s]=String(t||'').split('.');if(!b||fnv(b+SECRET)!==s)return null;const p=JSON.parse(atob(b.replace(/-/g,'+').replace(/_/g,'/')));if(p.exp<Date.now())return null;return DB.users.find(u=>u.user_id===p.sub)||null}catch(e){return null}}
const issue=u=>signToken({sub:u.user_id,email:u.email,exp:Date.now()+7*DAY});

const G={routes:[],log:[],seq:0,subs:[],stats:{total:0,errors:0,ms:0,svc:{}},bucket:{n:60,t:Date.now()},last:null};
G.on=fn=>G.subs.push(fn);
function defRoute(method,path,service,summary,o,fn){
  G.routes.push({method,path,service,summary,auth:!!o.auth,latency:o.latency,sample:o.sample||(()=>({})),fn,re:new RegExp('^'+path.replace(/:[a-z_]+/g,'([^/]+)')+'$'),keys:(path.match(/:[a-z_]+/g)||[]).map(k=>k.slice(1))});
}
const MASK=['password','cvv','number'];
function maskBody(o){if(Array.isArray(o))return o.map(maskBody);if(o&&typeof o==='object'){const r={};for(const k in o){r[k]=MASK.includes(k)&&typeof o[k]==='string'?(k==='number'?o[k].replace(/\d(?=\d{4})/g,'•'):'••••'):maskBody(o[k])}return r}return o}

G.call=async function(method,url,opt={}){
  const t0=performance.now(),id='req_'+Math.random().toString(36).slice(2,10);
  const u=new URL(url,BASE),path=u.pathname,query=Object.fromEntries(u.searchParams);
  const body=opt.body===undefined?undefined:JSON.parse(JSON.stringify(opt.body));
  const stages=[];let route=null,svc='gateway',res,params={},phase=0;
  try{
    const now=Date.now();G.bucket.n=Math.min(60,G.bucket.n+(now-G.bucket.t)/1000);G.bucket.t=now;
    if(G.bucket.n<1){stages.push({s:'Rate limit',ok:false});throw HttpErr(429,'RATE_LIMITED','Too many requests. The limit is 60 per minute.')}
    G.bucket.n-=1;stages.push({s:'Rate limit',ok:true});
    const cands=G.routes.filter(r=>r.re.test(path));route=cands.find(r=>r.method===method);
    if(!route){stages.push({s:'Router',ok:false});if(cands.length)throw HttpErr(405,'METHOD_NOT_ALLOWED',`${method} is not allowed here. Try ${cands.map(c=>c.method).join(', ')}.`);throw HttpErr(404,'NOT_FOUND',`No route matches ${method} ${path}`)}
    stages.push({s:'Router',ok:true});svc=route.service;
    const m=path.match(route.re);route.keys.forEach((k,i)=>params[k]=decodeURIComponent(m[i+1]));
    let user=null;
    if(route.auth){const tok=String(opt.token||'').replace(/^Bearer\s+/i,'');user=verifyToken(tok);if(!user){stages.push({s:'Auth',ok:false});throw HttpErr(401,'UNAUTHORIZED',tok?'The token is invalid or has expired.':'Missing Authorization: Bearer token.')}}
    stages.push({s:'Auth',ok:true,skipped:!route.auth});phase=1;
    await sleep(opt.latency!=null?opt.latency:(route.latency!=null?route.latency:35+Math.random()*80));
    expirePending();
    const out=await route.fn({params,query,body,user});
    stages.push({s:'Service',ok:true},{s:'Database',ok:true});
    res={status:out.status||200,body:out.data};
  }catch(e){
    if(!e.status){console.error(e);e=HttpErr(500,'INTERNAL_ERROR','Something went wrong inside the service.')}
    if(phase===1)stages.push({s:'Service',ok:false});
    res={status:e.status,body:{error:{code:e.code,message:e.message,...(e.extra||{})}}};
  }
  const ms=Math.round(performance.now()-t0);
  const headers={'x-request-id':id,'x-service':svc,'x-ratelimit-limit':60,'x-ratelimit-remaining':Math.floor(G.bucket.n),'content-type':'application/json'};
  if(res.status===429)headers['retry-after']=1;
  if(res.status<400&&method!=='GET')save();
  const entry={id,ts:Date.now(),method,path:path+(u.search||''),route:route?route.path:null,service:svc,status:res.status,ms,stages,req:body===undefined?null:maskBody(body),res:res.body,headers,noAuth:!opt.token};
  G.log.unshift(entry);if(G.log.length>150)G.log.pop();
  G.stats.total++;G.stats.ms+=ms;if(res.status>=400)G.stats.errors++;G.stats.svc[svc]=(G.stats.svc[svc]||0)+1;G.last=entry;
  G.subs.forEach(fn=>{try{fn(entry)}catch(e){}});
  return{status:res.status,ok:res.status<400,body:res.body,headers,ms,id,stages};
};

/* --- sample helpers for the API explorer --- */
const soon=(from='BOM',to='DEL',d=5)=>(DB.route.get(from+'-'+to)||[]).find(f=>f._dep>Date.now()+d*DAY);
function sampleBooking(){const f=soon('BOM','DEL',6),s=seatsFor(f).filter(x=>x.class==='Economy'&&x.is_available)[3];return{flight_id:f.flight_id,passengers:[{first_name:'Aarav',last_name:'Mehta',date_of_birth:'1994-03-14',passport_number:'K1234567',nationality:'India',seat_id:s.seat_id}],promo_code:'SKY10'}}
const dateIn=n=>dayToKey(localDay()+n);
const requireFields=(o,keys)=>keys.forEach(k=>{if(o==null||o[k]==null||o[k]==='')throw HttpErr(422,'VALIDATION_ERROR',`${k} is required`,{field:k})});
const myBooking=(id,user)=>{const b=DB.bookings.find(x=>x.booking_id===+id);if(!b)throw HttpErr(404,'BOOKING_NOT_FOUND','Booking not found');if(b.user_id!==user.user_id)throw HttpErr(403,'FORBIDDEN','This booking belongs to another account');return b};

/* ---------- Auth service ---------- */
defRoute('POST','/api/v1/auth/register','auth','Create an account',{sample:()=>({body:{email:'you'+Math.floor(Math.random()*900+100)+'@example.com',password:'Passw0rd!',first_name:'Ada',last_name:'Lovelace',phone_number:'+91 90000 00000'}})},async({body})=>{
  requireFields(body,['email','password','first_name','last_name']);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email))throw HttpErr(422,'VALIDATION_ERROR','Enter a valid email address',{field:'email'});
  if(String(body.password).length<8)throw HttpErr(422,'VALIDATION_ERROR','Password needs at least 8 characters',{field:'password'});
  if(DB.users.some(u=>u.email.toLowerCase()===body.email.toLowerCase()))throw HttpErr(409,'EMAIL_TAKEN','An account with this email already exists');
  const u={user_id:++DB.seq.user,email:body.email.trim(),password_hash:await sha256(body.password),first_name:body.first_name.trim(),last_name:body.last_name.trim(),phone_number:body.phone_number||'',registration_date:new Date().toISOString()};
  DB.users.push(u);return{status:201,data:{user:pubUser(u),token:issue(u)}};
});
defRoute('POST','/api/v1/auth/login','auth','Sign in and receive a bearer token',{sample:()=>({body:{email:'demo@skyline.app',password:'demo1234'}})},async({body})=>{
  requireFields(body,['email','password']);
  const u=DB.users.find(x=>x.email.toLowerCase()===String(body.email).toLowerCase());
  if(!u||u.password_hash!==await sha256(body.password))throw HttpErr(401,'INVALID_CREDENTIALS','Email or password is incorrect');
  return{data:{user:pubUser(u),token:issue(u)}};
});
defRoute('GET','/api/v1/users/me','auth','Current profile',{auth:true},({user})=>({data:{user:pubUser(user)}}));
defRoute('PATCH','/api/v1/users/me','auth','Update name or phone number',{auth:true,sample:()=>({body:{phone_number:'+91 98200 12345'}})},({body,user})=>{
  ['first_name','last_name','phone_number'].forEach(k=>{if(body&&body[k]!=null)user[k]=String(body[k]).trim()});return{data:{user:pubUser(user)}};
});
defRoute('GET','/api/v1/users/me/summary','auth','Travel and spend summary',{auth:true},({user})=>({data:userSummary(user.user_id)}));

/* ---------- Flights service ---------- */
defRoute('GET','/api/v1/airports','flights','List airports',{sample:()=>({query:'q=mum'})},({query})=>{
  const q=(query.q||'').toLowerCase(),list=AIRPORTS.filter(a=>!q||[a.airport_code,a.city,a.airport_name,a.country].some(x=>x.toLowerCase().includes(q)));
  return{data:{count:list.length,airports:list}};
});
defRoute('GET','/api/v1/flights','flights','Search flights by route and date',{sample:()=>({query:`from=BOM&to=DEL&date=${dateIn(5)}&class=Economy&pax=1&sort=price`})},({query})=>{
  const{from,to,date}=query;requireFields(query,['from','to','date']);
  if(!AP[from]||!AP[to])throw HttpErr(422,'UNKNOWN_AIRPORT','Use IATA codes such as BOM or DEL');
  if(from===to)throw HttpErr(422,'SAME_AIRPORT','Departure and arrival must differ');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw HttpErr(422,'VALIDATION_ERROR','date must look like 2026-10-05',{field:'date'});
  const cls=CLS[query.class]?query.class:'Economy',pax=Math.max(1,Math.min(6,+query.pax||1)),d=keyToDay(date),tz=GEO[from][2];
  let list=(DB.route.get(from+'-'+to)||[]).filter(f=>Math.floor((f._dep+tz*6e4)/DAY)===d&&f._dep>Date.now()+2*36e5);
  const win={morning:[300,720],afternoon:[720,1020],evening:[1020,1260],night:[1260,1740]};
  if(win[query.time]){const[a,b]=win[query.time];list=list.filter(f=>{let m=Math.floor(((f._dep+tz*6e4)%DAY)/6e4);if(m<300)m+=1440;return m>=a&&m<b})}
  let out=list.map(summarize).filter(f=>f.fares[cls]&&f.fares[cls].left>=pax);
  const sorts={price:(a,b)=>a.fares[cls].from-b.fares[cls].from,duration:(a,b)=>a.duration_minutes-b.duration_minutes,departure:(a,b)=>Date.parse(a.departure_date_time)-Date.parse(b.departure_date_time)};
  out.sort(sorts[query.sort]||sorts.departure);
  return{data:{count:out.length,query:{from,to,date,class:cls,pax},flights:out}};
});
defRoute('GET','/api/v1/flights/:id','flights','Flight details',{sample:()=>({params:{id:String(soon().flight_id)}})},({params})=>{
  const f=flightById(params.id);if(!f)throw HttpErr(404,'FLIGHT_NOT_FOUND','Flight not found');
  return{data:{flight:summarize(f),departure_airport:AP[f.departure_airport_code],arrival_airport:AP[f.arrival_airport_code]}};
});
defRoute('GET','/api/v1/flights/:id/seats','flights','Seat map with live availability',{sample:()=>({params:{id:String(soon().flight_id)},query:'class=Business'})},({params,query})=>{
  const f=flightById(params.id);if(!f)throw HttpErr(404,'FLIGHT_NOT_FOUND','Flight not found');
  let s=seatsFor(f);if(CLS[query.class])s=s.filter(x=>x.class===query.class);
  return{data:{flight_id:f.flight_id,count:s.length,available:s.filter(x=>x.is_available).length,seats:s}};
});
defRoute('GET','/api/v1/fares/calendar','flights','Cheapest fare for each day around a date',{sample:()=>({query:`from=BOM&to=DEL&date=${dateIn(5)}&class=Economy`})},({query})=>{
  requireFields(query,['from','to','date']);const c=keyToDay(query.date),tz=GEO[query.from]?GEO[query.from][2]:330,days=[];
  for(let o=-3;o<=3;o++){const d=c+o,fl=(DB.route.get(query.from+'-'+query.to)||[]).filter(f=>Math.floor((f._dep+tz*6e4)/DAY)===d&&f._dep>Date.now()+2*36e5);
    days.push({date:dayToKey(d),flights:fl.length,cheapest:fl.length?Math.min(...fl.map(fareOf))*(CLS[query.class]?CLS[query.class].mult:1):null})}
  return{data:{from:query.from,to:query.to,days}};
});
defRoute('GET','/api/v1/fares/explore','flights','Cheapest destinations from an airport',{sample:()=>({query:'from=BOM'})},({query})=>{
  const from=query.from||'BOM';if(!AP[from])throw HttpErr(422,'UNKNOWN_AIRPORT','Use an IATA code such as BOM');
  const out=[];AIRPORTS.forEach(a=>{const list=(DB.route.get(from+'-'+a.airport_code)||[]).filter(f=>f._dep>Date.now()+2*36e5&&f._dep<Date.now()+30*DAY);
    if(!list.length)return;const best=list.reduce((m,f)=>fareOf(f)<fareOf(m)?f:m);
    out.push({to:a.airport_code,city:a.city,country:a.country,from_price:fareOf(best),date:tKey(best._dep,GEO[from][2]),flight_id:best.flight_id,duration_minutes:best.duration_minutes})});
  out.sort((a,b)=>a.from_price-b.from_price);return{data:{from,destinations:out}};
});

/* ---------- Bookings service ---------- */
function checkSeats(f,pax){
  const seats=seatsFor(f),chosen=[];
  pax.forEach((p,i)=>{const s=seats.find(x=>x.seat_id===+p.seat_id);if(!s)throw HttpErr(422,'INVALID_SEAT',`Passenger ${i+1}: seat ${p.seat_id} does not exist on this flight`);
    if(!s.is_available||chosen.includes(s))throw HttpErr(409,'SEAT_UNAVAILABLE',`Seat ${s.seat_number} is no longer available`);chosen.push(s)});
  return chosen;
}
defRoute('POST','/api/v1/bookings/quote','bookings','Price a seat selection, with optional promo code',{auth:true,sample:()=>{const b=sampleBooking();return{body:{flight_id:b.flight_id,seat_ids:[b.passengers[0].seat_id],promo_code:'SKY10'}}}},({body})=>{
  const f=flightById(body&&body.flight_id);if(!f)throw HttpErr(404,'FLIGHT_NOT_FOUND','Flight not found');
  const ids=(body.seat_ids||[]).map(Number),seats=seatsFor(f),chosen=ids.map(id=>seats.find(s=>s.seat_id===id)).filter(Boolean);
  return{data:{price:quote(f,chosen,body.promo_code)}};
});
defRoute('POST','/api/v1/bookings','bookings','Create a booking and hold the seats for 15 minutes',{auth:true,sample:()=>({body:sampleBooking()})},({body,user})=>{
  requireFields(body,['flight_id']);
  const f=flightById(body.flight_id);if(!f)throw HttpErr(404,'FLIGHT_NOT_FOUND','Flight not found');
  if(f._dep<Date.now()+2*36e5)throw HttpErr(409,'BOOKING_CLOSED','Booking closes 2 hours before departure');
  const pax=body.passengers;if(!Array.isArray(pax)||pax.length<1||pax.length>6)throw HttpErr(422,'INVALID_PASSENGERS','Provide between 1 and 6 passengers');
  pax.forEach((p,i)=>{['first_name','last_name','date_of_birth','passport_number','nationality','seat_id'].forEach(k=>{if(!p[k])throw HttpErr(422,'INVALID_PASSENGER',`Passenger ${i+1}: ${k} is required`,{field:k})});
    if(isNaN(Date.parse(p.date_of_birth))||Date.parse(p.date_of_birth)>Date.now())throw HttpErr(422,'INVALID_PASSENGER',`Passenger ${i+1}: date of birth is not valid`);
    if(!/^[A-Z0-9]{6,9}$/i.test(p.passport_number))throw HttpErr(422,'INVALID_PASSENGER',`Passenger ${i+1}: passport number should be 6 to 9 letters or digits`)});
  checkSeats(f,pax);
  const q0=quote(f,pax.map(p=>seatsFor(f).find(s=>s.seat_id===+p.seat_id)),body.promo_code);
  if(q0.promo_error)throw HttpErr(422,'INVALID_PROMO',q0.promo_error);
  const{b,q}=createBooking({user_id:user.user_id,flight:f,pax:pax.map(p=>({...p,seat_id:+p.seat_id})),promo:body.promo_code});
  return{status:201,data:{booking:hydrate(b),price:q}};
});
defRoute('GET','/api/v1/bookings','bookings','Your bookings, newest first',{auth:true,sample:()=>({query:''})},({query,user})=>{
  let l=DB.bookings.filter(b=>b.user_id===user.user_id);if(query.status)l=l.filter(b=>b.status.toLowerCase()===query.status.toLowerCase());
  l.sort((a,b)=>Date.parse(b.booking_date)-Date.parse(a.booking_date));return{data:{count:l.length,bookings:l.map(hydrate)}};
});
defRoute('GET','/api/v1/bookings/:id','bookings','One booking with passengers and payments',{auth:true,sample:()=>{const m=DB.bookings.find(b=>b.user_id===1);return{params:{id:String(m?m.booking_id:1)}}}},({params,user})=>({data:{booking:hydrate(myBooking(params.id,user))}}));
defRoute('POST','/api/v1/bookings/:id/cancel','bookings','Cancel a booking and refund what the policy allows',{auth:true,sample:()=>{const m=DB.bookings.filter(b=>b.user_id===1&&b.status==='Pending').pop();return{params:{id:String(m?m.booking_id:'0')}}}},({params,user})=>{
  const b=myBooking(params.id,user),r=cancelBooking(b);return{data:{booking:hydrate(b),refunded:r.refunded,policy:r.info}};
});

/* ---------- Payments service ---------- */
/* --- payment validation: returns {ok, pending?, provider, detail} or a failure {ok:false, code, msg, provider, detail} --- */
function checkCard(d){
  const n=String(d.number||'').replace(/\s/g,'');
  if(!/^\d{13,19}$/.test(n)||!luhn(n))throw HttpErr(422,'INVALID_CARD','That card number is not valid.',{field:'number'});
  const m=String(d.expiry||'').match(/^(\d{2})\s*\/\s*(\d{2})$/);if(!m||+m[1]<1||+m[1]>12)throw HttpErr(422,'INVALID_CARD','Enter the expiry as MM/YY.',{field:'expiry'});
  if(new Date(2000+ +m[2],+m[1],1).getTime()<Date.now())throw HttpErr(422,'INVALID_CARD','This card has expired.',{field:'expiry'});
  if(!/^\d{3,4}$/.test(String(d.cvv||'')))throw HttpErr(422,'INVALID_CARD','Enter the 3 or 4 digit security code.',{field:'cvv'});
  if(!String(d.name||'').trim())throw HttpErr(422,'INVALID_CARD','Enter the name on the card.',{field:'name'});
  return{n,brand:brandOf(n),last4:n.slice(-4)};
}
function judge(method,d,total){
  d=d||{};
  if(method==='Card'){
    const c=checkCard(d),base={provider:c.brand,detail:'•••• '+c.last4};
    if(c.n==='4000000000000002')return{ok:false,code:'CARD_DECLINED',msg:'Your bank declined this card. Try another card or a different method.',...base};
    if(c.n==='4000000000009995')return{ok:false,code:'INSUFFICIENT_FUNDS',msg:'The card has insufficient funds for this amount.',...base};
    return{ok:true,...base};
  }
  if(method==='UPI'){
    const app=PAY.upiApps[d.app]?d.app:'Other UPI app',raw=String(d.upi_id||'').trim(),digits=raw.replace(/[\s+\-]/g,'').replace(/^91(?=\d{10}$)/,'');
    let detail;
    if(/^\d{10}$/.test(digits))detail='••••••'+digits.slice(-4);
    else if(/^[\w.\-]{2,}@[a-z]{2,}$/i.test(raw))detail=raw;
    else throw HttpErr(422,'INVALID_UPI','Enter a UPI ID like name@okbank, or the 10 digit mobile number linked to UPI.',{field:'upi_id'});
    if(/^fail@/i.test(raw))return{ok:false,code:'UPI_TIMEOUT',msg:`${app} did not respond. Check the app and try again.`,provider:app,detail};
    return{ok:true,pending:true,provider:app,detail};
  }
  if(method==='NetBanking'){
    if(!PAY.banks.includes(d.bank))throw HttpErr(422,'INVALID_BANK','Choose a bank from the list.',{field:'bank'});
    if(d.bank==='Metro Trust')return{ok:false,code:'BANK_UNAVAILABLE',msg:'Metro Trust is offline right now. Choose another bank.',provider:d.bank,detail:d.bank};
    return{ok:true,provider:d.bank,detail:d.bank};
  }
  if(method==='Wallet'){
    if(!PAY.wallets[d.wallet])throw HttpErr(422,'INVALID_WALLET','Choose a wallet.',{field:'wallet'});
    if(d.wallet==='Mobikwik')return{ok:false,code:'WALLET_BALANCE_LOW',msg:'Your Mobikwik balance is too low for this amount. Add money or pick another method.',provider:d.wallet,detail:d.wallet};
    return{ok:true,provider:d.wallet,detail:d.wallet};
  }
  if(method==='EMI'){
    const c=checkCard(d),n=+d.tenure;
    if(!PAY.emiBanks.includes(d.bank))throw HttpErr(422,'INVALID_BANK','Choose the bank that issued your card.',{field:'bank'});
    if(!PAY.tenures.includes(n))throw HttpErr(422,'INVALID_TENURE','Choose 3, 6, 9 or 12 months.',{field:'tenure'});
    if(total<PAY.emiMin)throw HttpErr(422,'EMI_MINIMUM',`EMI is available for bookings of ${inr(PAY.emiMin)} or more.`);
    const e=emiCalc(total,n),base={provider:d.bank,detail:`${c.brand} •••• ${c.last4}, ${n} months`};
    if(c.n==='4000000000000002')return{ok:false,code:'CARD_DECLINED',msg:'Your bank declined this card. Try another card or a different method.',...base};
    return{ok:true,emi:{months:n,monthly:e.monthly,interest:e.interest,rate_pa:e.rate},...base};
  }
  if(method==='PayLater'){
    if(!PAY.later[d.provider])throw HttpErr(422,'INVALID_PROVIDER','Choose a pay later provider.',{field:'provider'});
    const mob=String(d.mobile||'').replace(/[\s+\-]/g,'').replace(/^91(?=\d{10}$)/,'');
    if(!/^\d{10}$/.test(mob))throw HttpErr(422,'INVALID_MOBILE','Enter the 10 digit mobile number registered with '+d.provider+'.',{field:'mobile'});
    const base={provider:d.provider,detail:'••••••'+mob.slice(-4)};
    if(total>PAY.laterLimit)return{ok:false,code:'CREDIT_LIMIT',msg:`This is above your ${d.provider} limit of ${inr(PAY.laterLimit)}. Pay part now with another method, or pick another option.`,...base};
    return{ok:true,...base};
  }
  throw HttpErr(422,'INVALID_METHOD','method must be UPI, Card, NetBanking, Wallet, EMI or PayLater',{field:'method'});
}
const pendingSample=()=>DB.payments.filter(p=>p.status==='Pending').pop();
defRoute('GET','/api/v1/payments/methods','payments','Checkout options: UPI apps, banks, wallets, EMI and pay later',{},()=>({data:{methods:PAY.methods.map(([id,label])=>({id,label})),upi_apps:Object.keys(PAY.upiApps),net_banking:PAY.banks,wallets:Object.keys(PAY.wallets),emi:{banks:PAY.emiBanks,tenures_months:PAY.tenures,minimum_amount:PAY.emiMin,no_cost_up_to_months:6,interest_rate_pa_after:13},pay_later:{providers:Object.keys(PAY.later),limit:PAY.laterLimit},upi_request_expiry_seconds:PAY.upiExpirySeconds}}));
defRoute('POST','/api/v1/payments','payments','Pay for a pending booking. UPI returns 202 and waits for approval in the app',{auth:true,latency:1200,sample:()=>{const m=DB.bookings.filter(b=>b.user_id===1&&b.status==='Pending').pop();return{body:{booking_id:m?m.booking_id:0,method:'UPI',details:{app:'PhonePe',upi_id:'aarav@ybl'}}}}},({body,user})=>{
  requireFields(body,['booking_id','method']);const b=myBooking(body.booking_id,user);
  if(b.status!=='Pending')throw HttpErr(409,'NOT_PAYABLE',b.status==='Confirmed'?'This booking is already paid.':'This booking was cancelled or its 15 minute hold expired.');
  const j=judge(body.method,body.details,b.total_amount);
  failPending(b,'Replaced by a new payment attempt');
  if(!j.ok){const p=addPayment(b,{method:body.method,provider:j.provider,detail:j.detail,status:'Failed',reason:j.msg});throw HttpErr(402,j.code,j.msg,{payment:{...p,payer_name:payerName(p.passenger_id)},booking_status:b.status})}
  if(j.pending){const p=addPayment(b,{method:body.method,provider:j.provider,detail:j.detail,status:'Pending'});
    return{status:202,data:{payment:{...p,payer_name:payerName(p.passenger_id)},booking:hydrate(b),next:{action:'approve_in_app',provider:j.provider,expires_in_seconds:PAY.upiExpirySeconds,confirm:`POST /api/v1/payments/${p.payment_id}/confirm`}}}}
  const p=addPayment(b,{method:body.method,provider:j.provider,detail:j.detail,status:'Success'});b.status='Confirmed';
  return{status:201,data:{payment:{...p,payer_name:payerName(p.passenger_id)},booking:hydrate(b),...(j.emi?{emi:j.emi}:{})}};
});
defRoute('POST','/api/v1/payments/:id/confirm','payments','Approve or decline a pending UPI request (stands in for the app callback)',{auth:true,latency:600,sample:()=>{const p=pendingSample();return{params:{id:String(p?p.payment_id:0)},body:{action:'approve'}}}},({params,body,user})=>{
  const p=DB.payments.find(x=>x.payment_id===+params.id);if(!p)throw HttpErr(404,'PAYMENT_NOT_FOUND','Payment not found');
  const b=myBooking(p.booking_id,user),action=body&&body.action;
  if(!['approve','decline','timeout','cancel'].includes(action))throw HttpErr(422,'VALIDATION_ERROR','action must be approve, decline, timeout or cancel',{field:'action'});
  if(p.status!=='Pending')throw HttpErr(409,'NOT_PENDING','This payment is not waiting for approval.');
  if(b.status!=='Pending'){p.status='Failed';p.failure_reason='The booking is no longer open';throw HttpErr(409,'NOT_PAYABLE','This booking was cancelled or its hold expired.')}
  if(action==='approve'){p.status='Success';p.paid_at=new Date().toISOString();b.status='Confirmed';audit(b.user_id,b.booking_id,'paid',`Paid ${inr(p.amount)} with ${p.provider}`);return{data:{payment:{...p,payer_name:payerName(p.passenger_id)},booking:hydrate(b)}}}
  const why={decline:`You declined the request in ${p.provider}.`,timeout:`The ${p.provider} request expired before it was approved.`,cancel:'You cancelled the payment.'}[action];
  p.status='Failed';p.failure_reason=why;audit(b.user_id,b.booking_id,'failed',`Payment failed: ${why}`);
  throw HttpErr(402,{decline:'UPI_DECLINED',timeout:'UPI_TIMEOUT',cancel:'CANCELLED'}[action],why,{payment:{...p,payer_name:payerName(p.passenger_id)},booking_status:b.status});
});
defRoute('GET','/api/v1/payments','payments','Your payment history',{auth:true,sample:()=>({query:''})},({query,user})=>{
  const mine=new Set(DB.bookings.filter(b=>b.user_id===user.user_id).map(b=>b.booking_id));
  let l=DB.payments.filter(p=>mine.has(p.booking_id));if(query.status)l=l.filter(p=>p.status.toLowerCase()===query.status.toLowerCase());
  l=l.map(p=>{const b=DB.bookings.find(x=>x.booking_id===p.booking_id),f=flightById(b.flight_id);return{...p,pnr:pnr(b.booking_id),route:f.departure_airport_code+'-'+f.arrival_airport_code,payer_name:payerName(p.passenger_id)}}).sort((a,b)=>Date.parse(b.paid_at)-Date.parse(a.paid_at));
  return{data:{count:l.length,payments:l}};
});
defRoute('GET','/api/v1/payments/:id','payments','One payment receipt',{auth:true,sample:()=>{const p=DB.payments.find(x=>DB.bookings.find(b=>b.booking_id===x.booking_id&&b.user_id===1));return{params:{id:String(p?p.payment_id:1)}}}},({params,user})=>{
  const p=DB.payments.find(x=>x.payment_id===+params.id);if(!p)throw HttpErr(404,'PAYMENT_NOT_FOUND','Payment not found');
  const b=myBooking(p.booking_id,user);return{data:{payment:p,booking:hydrate(b)}};
});

/* ---------- System ---------- */
defRoute('GET','/api/v1/health','gateway','Gateway and service health',{},()=>({data:{status:'ok',uptime_s:Math.round(performance.now()/1000),services:{auth:'up',flights:'up',bookings:'up',payments:'up'},rate_limit:{limit_per_min:60,remaining:Math.floor(G.bucket.n)}}}));
