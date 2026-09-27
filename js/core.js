'use strict';
/* core.js: utilities, reference data (airports, airlines), flight generator, in-memory database, pricing, booking + payment rules, seed data */
/* ============ Utilities ============ */
const DAY=864e5,EP=20000,HOLD_MIN=15;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const inr=n=>'₹'+Math.round(n||0).toLocaleString('en-IN');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const wall=(ms,tz)=>new Date(ms+tz*6e4);
const tTime=(ms,tz)=>{const d=wall(ms,tz);return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())};
const tDate=(ms,tz)=>{const d=wall(ms,tz);return DOW[d.getUTCDay()]+', '+d.getUTCDate()+' '+MON[d.getUTCMonth()]};
const tDateY=(ms,tz)=>tDate(ms,tz)+' '+wall(ms,tz).getUTCFullYear();
const tKey=(ms,tz)=>{const d=wall(ms,tz);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())};
const hm=m=>Math.floor(m/60)+'h '+pad(m%60)+'m';
const localDay=(ms=Date.now())=>Math.floor((ms-new Date(ms).getTimezoneOffset()*6e4)/DAY);
const keyToDay=k=>{const [y,m,d]=k.split('-').map(Number);return Math.round(Date.UTC(y,m-1,d)/DAY)};
const dayToKey=d=>tKey(d*DAY,0);
const stamp=iso=>{const d=new Date(iso);return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+', '+pad(d.getHours())+':'+pad(d.getMinutes())};
const stampS=iso=>{const d=new Date(iso);return d.getDate()+' '+MON[d.getMonth()]+', '+pad(d.getHours())+':'+pad(d.getMinutes())};
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function hash(...a){let h=2166136261;for(const x of a){h^=(x|0);h=Math.imul(h,16777619)}return h>>>0}
function fnv(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
async function sha256(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return'sha256$'+Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return'fnv$'+fnv(s)+fnv(s+'~')}}
const luhn=n=>{let s=0,alt=false;for(let i=n.length-1;i>=0;i--){let d=+n[i];if(alt){d*=2;if(d>9)d-=9}s+=d;alt=!alt}return s%10===0};
const brandOf=n=>/^4/.test(n)?'Visa':/^(5[1-5]|2[2-7])/.test(n)?'Mastercard':/^3[47]/.test(n)?'Amex':/^(6|8)/.test(n)?'RuPay':'Card';
function HttpErr(status,code,message,extra){const e=new Error(message);e.status=status;e.code=code;e.extra=extra;return e}

/* ============ Reference data ============ */
const AIRPORTS=[
{airport_code:'AMD',airport_name:'Sardar Vallabhbhai Patel International',city:'Ahmedabad',country:'India'},
{airport_code:'BKK',airport_name:'Suvarnabhumi Airport',city:'Bangkok',country:'Thailand'},
{airport_code:'BLR',airport_name:'Kempegowda International',city:'Bengaluru',country:'India'},
{airport_code:'MAA',airport_name:'Chennai International',city:'Chennai',country:'India'},
{airport_code:'CMB',airport_name:'Bandaranaike International',city:'Colombo',country:'Sri Lanka'},
{airport_code:'DEL',airport_name:'Indira Gandhi International',city:'Delhi',country:'India'},
{airport_code:'DXB',airport_name:'Dubai International',city:'Dubai',country:'United Arab Emirates'},
{airport_code:'GOI',airport_name:'Dabolim Airport',city:'Goa',country:'India'},
{airport_code:'HYD',airport_name:'Rajiv Gandhi International',city:'Hyderabad',country:'India'},
{airport_code:'JAI',airport_name:'Jaipur International',city:'Jaipur',country:'India'},
{airport_code:'COK',airport_name:'Cochin International',city:'Kochi',country:'India'},
{airport_code:'CCU',airport_name:'Netaji Subhas Chandra Bose International',city:'Kolkata',country:'India'},
{airport_code:'BOM',airport_name:'Chhatrapati Shivaji Maharaj International',city:'Mumbai',country:'India'},
{airport_code:'SIN',airport_name:'Changi Airport',city:'Singapore',country:'Singapore'}];
const AP=Object.fromEntries(AIRPORTS.map(a=>[a.airport_code,a]));
// lon, lat, utc offset (min), city colour
const GEO={BOM:[72.87,19.09,330,'#FF5A5F'],DEL:[77.10,28.56,330,'#7C5CFF'],BLR:[77.71,13.20,330,'#0FB37F'],HYD:[78.43,17.24,330,'#FF8A3D'],MAA:[80.17,12.99,330,'#1FA2FF'],CCU:[88.45,22.65,330,'#EE4C93'],GOI:[73.83,15.38,330,'#E0A100'],COK:[76.40,10.15,330,'#12B5B0'],AMD:[72.63,23.07,330,'#B44BFF'],JAI:[75.81,26.82,330,'#F0568F'],DXB:[55.36,25.25,240,'#D9A400'],SIN:[103.99,1.36,480,'#0FB37F'],BKK:[100.75,13.69,420,'#FF6B3D'],CMB:[79.88,7.18,330,'#1FA2FF']};
const AIRLINES={AR:{name:'Aurora Air',color:'#7C5CFF',f:1.06},KT:{name:'Kite Airways',color:'#1FA2FF',f:.96},MJ:{name:'Monsoon Jet',color:'#0FB37F',f:.92},SW:{name:'Saffron Wings',color:'#FF8A3D',f:1.0},LT:{name:'Lotus Air',color:'#EE4C93',f:1.12},ZP:{name:'Zephyr',color:'#D9A400',f:.9}};
const AIRLINE_CODES=Object.keys(AIRLINES);
const CLS={Economy:{mult:1,color:'#1FA2FF'},Business:{mult:2.7,color:'#B44BFF'},First:{mult:4.6,color:'#E0A100'}};
const SLOTS=[330,405,480,565,650,735,820,915,1010,1105,1200,1290,1380];
const PAIRS=[['BOM','DEL',3],['BOM','BLR',3],['DEL','BLR',3],['BOM','HYD',2],['BOM','MAA',2],['BOM','CCU',2],['BOM','GOI',2],['BOM','COK',2],['BOM','AMD',2],['BOM','JAI',2],['DEL','HYD',2],['DEL','MAA',2],['DEL','CCU',2],['DEL','GOI',2],['DEL','AMD',2],['BLR','HYD',2],['BLR','MAA',2],['BLR','CCU',2],['BLR','GOI',2],['BLR','COK',2],['BLR','AMD',1],['HYD','MAA',2],['HYD','CCU',2],['HYD','GOI',2],['MAA','COK',2],['JAI','BLR',1],['CCU','DEL',1],
['BOM','DXB',2],['DEL','DXB',2],['COK','DXB',2],['BLR','DXB',2],['HYD','DXB',1],['BOM','SIN',2],['DEL','SIN',2],['MAA','SIN',2],['BLR','SIN',1],['BOM','BKK',2],['DEL','BKK',2],['CCU','BKK',1],['MAA','CMB',1],['BOM','CMB',1],['DXB','SIN',1]];
const SEAT_LAYOUT=(()=>{const a=[];const add=(cls,rows,letters)=>rows.forEach(row=>[...letters].forEach(l=>{let mod=0,tag=[];if(cls==='Economy'){if(row===11||row===12){mod+=450;tag.push('Extra legroom')}else if(row<=9){mod+=300;tag.push('Front section')}if(l==='A'||l==='F'){mod+=150;tag.push('Window')}else if(l==='C'||l==='D'){mod+=80;tag.push('Aisle')}else tag.push('Middle')}else tag.push(l==='A'||l==='F'?'Window':'Aisle');a.push({idx:a.length,seat_number:row+l,row,letter:l,class:cls,mod,tag:tag.join(', ')})}));add('First',[1,2],'ACDF');add('Business',[3,4,5],'ACDF');add('Economy',[7,8,9,10,11,12,13,14,15,16],'ABCDEF');return a})();
/* Payment options offered at checkout. Provider names are plain text labels only (no logos, no real integration). */
const PAY={
  methods:[['UPI','UPI apps'],['Card','Cards'],['NetBanking','Net banking'],['Wallet','Wallets'],['EMI','EMI'],['PayLater','Pay later']],
  upiApps:{'Google Pay':{b:'G',c:'#4285F4',handles:['@oksbi','@okaxis','@okicici','@okhdfcbank']},'PhonePe':{b:'Pe',c:'#5F259F',handles:['@ybl','@ibl','@axl']},'Paytm':{b:'P',c:'#00A9E0',handles:['@paytm']},'BHIM':{b:'B',c:'#0F8F4E',handles:['@upi']},'Amazon Pay':{b:'a',c:'#F08A00',handles:['@apl','@yapl']},'Other UPI app':{b:'@',c:'#7C5CFF',handles:['@okhdfcbank','@ybl','@paytm']}},
  banks:['Harbor Bank','Northwind Bank','Civic Bank','Metro Trust','Coastal Union','Sunrise Bank'],
  wallets:{'Paytm Wallet':'#00A9E0','Amazon Pay balance':'#F08A00','Mobikwik':'#2F6FED','Freecharge':'#E8541E'},
  emiBanks:['Harbor Bank','Northwind Bank','Civic Bank','Coastal Union'],tenures:[3,6,9,12],emiMin:5000,
  later:{'Simpl':'#12B886','LazyPay':'#7C5CFF','ZestMoney':'#FF6B3D'},laterLimit:25000,upiExpirySeconds:180};
function emiCalc(total,n){if(n<=6)return{monthly:Math.ceil(total/n),interest:0,rate:0};const r=.13/12,m=total*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);return{monthly:Math.ceil(m),interest:Math.ceil(m*n-total),rate:13}}
const seatNo=id=>id?SEAT_LAYOUT[id%100].seat_number:null,seatCls=id=>id?SEAT_LAYOUT[id%100].class:null;

/* ============ Database (in memory + localStorage) ============ */
const DB={users:[],airports:AIRPORTS,flights:[],flightsById:new Map(),route:new Map(),seatMap:new Map(),bookings:[],passengers:[],payments:[],audit:[],seq:{user:0,booking:0,passenger:0,payment:0}};
const flightById=id=>DB.flightsById.get(+id);
const isIntl=f=>AP[f.departure_airport_code].country!==AP[f.arrival_airport_code].country;
const distKm=(a,b)=>{const A=GEO[a],B=GEO[b],r=Math.PI/180,dl=(B[1]-A[1])*r,dn=(B[0]-A[0])*r,x=Math.sin(dl/2)**2+Math.cos(A[1]*r)*Math.cos(B[1]*r)*Math.sin(dn/2)**2;return 2*6371*Math.asin(Math.sqrt(x))};
const pub=f=>({flight_id:f.flight_id,flight_number:f.flight_number,departure_airport_code:f.departure_airport_code,arrival_airport_code:f.arrival_airport_code,departure_date_time:f.departure_date_time,arrival_date_time:f.arrival_date_time,aircraft_model:f.aircraft_model,duration_minutes:f.duration_minutes});

function genFlights(base){
  const out=[];
  for(let d=base-40;d<=base+30;d++){
    let n=0;
    PAIRS.forEach(([a,b],pi)=>{const cnt=PAIRS[pi][2];
      [[a,b],[b,a]].forEach(([from,to],dir)=>{
        const km=distKm(from,to),intl=AP[from].country!==AP[to].country;
        for(let k=0;k<cnt;k++){
          const r=rng(hash(d,pi,dir,k,7));
          const slot=SLOTS[Math.min(SLOTS.length-1,Math.floor((k+r())/cnt*SLOTS.length))]+Math.floor(r()*6)*5;
          const air=AIRLINE_CODES[Math.floor(r()*AIRLINE_CODES.length)];
          const dur=Math.round((km/(intl?790:730)*60+32)/5)*5;
          const dep=d*DAY-GEO[from][2]*6e4+slot*6e4;
          const load=(slot<420||slot>1260)?.9:((slot>=1000&&slot<=1200)||(slot>=480&&slot<=600))?1.12:1;
          const fare0=(intl?4200+km*4.6:1450+km*3.5)*AIRLINES[air].f*load*(.94+r()*.14);
          const ac=intl?['B787-9','A330-300','A350-900','B777-300ER']:(km<800?['A320neo','ATR 72-600','B737-800']:['A320neo','B737-800','A321neo']);
          out.push({flight_id:(d-EP)*1000+(++n),flight_number:air+' '+(100+Math.floor(r()*880)),departure_airport_code:from,arrival_airport_code:to,departure_date_time:new Date(dep).toISOString(),arrival_date_time:new Date(dep+dur*6e4).toISOString(),aircraft_model:ac[Math.floor(r()*ac.length)],duration_minutes:dur,_dep:dep,_arr:dep+dur*6e4,_fare0:fare0,_air:air,_km:Math.round(km)});
        }
      });
    });
  }
  return out;
}
function indexFlight(f){DB.flightsById.set(f.flight_id,f);const k=f.departure_airport_code+'-'+f.arrival_airport_code;if(!DB.route.has(k))DB.route.set(k,[]);DB.route.get(k).push(f)}
function fareOf(f){const days=(f._dep-Date.now())/DAY;const m=days<=0?1.05:days>30?.88:days>14?1:days>7?1.12:days>3?1.28:1.5;return Math.round(f._fare0*m/10)*10}
const bookingActive=id=>{const b=DB.bookings.find(x=>x.booking_id===id);return !!b&&b.status!=='Cancelled'};
function seatsFor(f){
  if(DB.seatMap.has(f.flight_id))return DB.seatMap.get(f.flight_id);
  const r=rng(f.flight_id*97+5),occ=.28+r()*.45,fare=fareOf(f);
  const held=new Set(DB.passengers.filter(p=>p.seat_id&&Math.floor(p.seat_id/100)===f.flight_id&&bookingActive(p.booking_id)).map(p=>p.seat_id));
  const list=SEAT_LAYOUT.map(s=>{const id=f.flight_id*100+s.idx,k={First:.45,Business:.65,Economy:1}[s.class],taken=r()<occ*k;return{seat_id:id,flight_id:f.flight_id,seat_number:s.seat_number,class:s.class,is_available:!taken&&!held.has(id),price:Math.round((fare*CLS[s.class].mult+s.mod)/10)*10}});
  DB.seatMap.set(f.flight_id,list);return list;
}
function summarize(f){
  const seats=seatsFor(f),fares={};
  Object.keys(CLS).forEach(c=>{const av=seats.filter(s=>s.class===c&&s.is_available);fares[c]=av.length?{from:Math.min(...av.map(s=>s.price)),left:av.length}:null});
  return{...pub(f),airline:AIRLINES[f._air].name,distance_km:f._km,fares};
}

/* ============ Pricing, bookings, payments ============ */
function quote(f,seatObjs,promo){
  const intl=isIntl(f),fare=seatObjs.reduce((s,x)=>s+x.price,0),taxes=Math.round(fare*(intl?.12:.05)),fee=seatObjs.length*(intl?450:180);
  let discount=0,applied=null,promo_error=null;
  if(promo&&String(promo).trim()){
    const c=String(promo).trim().toUpperCase();
    if(c==='SKY10'){discount=Math.min(1500,Math.round(fare*.10));applied={code:c,label:'10% off the fare, up to ₹1,500'}}
    else if(c==='FIRSTFLY'){if(fare>=3000){discount=500;applied={code:c,label:'₹500 off fares above ₹3,000'}}else promo_error='FIRSTFLY needs a fare of ₹3,000 or more.'}
    else if(c==='MONSOON'){if(!intl){discount=Math.min(1000,Math.round(fare*.07));applied={code:c,label:'7% off domestic fares, up to ₹1,000'}}else promo_error='MONSOON works on domestic flights only.'}
    else promo_error='That promo code is not valid.';
  }
  return{fare,taxes,airport_fee:fee,discount,promo:applied,promo_error,total:fare+taxes+fee-discount,currency:'INR'};
}
function audit(user_id,booking_id,kind,text,ts=Date.now()){DB.audit.push({ts,user_id,booking_id,kind,text})}
function createBooking({user_id,flight,pax,promo,when=Date.now(),status='Pending'}){
  const seats=seatsFor(flight),chosen=pax.map(p=>seats.find(s=>s.seat_id===p.seat_id));
  const q=quote(flight,chosen,promo);
  const b={booking_id:++DB.seq.booking,user_id,flight_id:flight.flight_id,booking_date:new Date(when).toISOString(),total_amount:q.total,status};
  DB.bookings.push(b);
  pax.forEach((p,i)=>{DB.passengers.push({passenger_id:++DB.seq.passenger,booking_id:b.booking_id,seat_id:p.seat_id,first_name:p.first_name,last_name:p.last_name,date_of_birth:p.date_of_birth,passport_number:String(p.passport_number).toUpperCase(),nationality:p.nationality});chosen[i].is_available=false});
  audit(user_id,b.booking_id,'booked',`Booked ${flight.departure_airport_code} to ${flight.arrival_airport_code} for ${pax.length} traveller${pax.length>1?'s':''}`,when);
  return{b,q};
}
/* The payer is the lead passenger on the booking: whoever's details were entered first at checkout (shown as "Traveller 1, you" in the UI). */
function leadPassenger(booking_id){return DB.passengers.filter(p=>p.booking_id===booking_id).reduce((m,p)=>!m||p.passenger_id<m.passenger_id?p:m,null)}
function addPayment(b,{method,detail,provider,status,amount,when=Date.now(),reason=null}){
  const lead=leadPassenger(b.booking_id);if(!lead)throw HttpErr(500,'NO_PASSENGER','This booking has no passengers to bill the payment to.');
  const p={payment_id:++DB.seq.payment,booking_id:b.booking_id,passenger_id:lead.passenger_id,amount:amount==null?b.total_amount:amount,currency:'INR',method,provider:provider||null,method_detail:detail,status,transaction_ref:'TXN'+Math.floor(when/1000).toString(36).toUpperCase()+Math.floor(Math.random()*46656).toString(36).toUpperCase().padStart(3,'0'),failure_reason:reason,paid_at:new Date(when).toISOString(),refunded_amount:0,refunded_at:null};
  DB.payments.push(p);
  const who=provider||method;
  if(status==='Success')audit(b.user_id,b.booking_id,'paid',`Paid ${inr(p.amount)} with ${who}`,when);
  else if(status==='Pending')audit(b.user_id,b.booking_id,'requested',`Payment request sent to ${who}`,when);
  else audit(b.user_id,b.booking_id,'failed',`Payment failed: ${reason}`,when);
  return p;
}
function failPending(b,reason){DB.payments.filter(p=>p.booking_id===b.booking_id&&p.status==='Pending').forEach(p=>{p.status='Failed';p.failure_reason=reason})}
function freeSeats(b){const m=DB.seatMap.get(b.flight_id);if(!m)return;DB.passengers.filter(p=>p.booking_id===b.booking_id&&p.seat_id).forEach(p=>{const s=m.find(x=>x.seat_id===p.seat_id);if(s)s.is_available=true})}
function expirePending(){const now=Date.now();DB.bookings.forEach(b=>{if(b.status==='Pending'&&now-Date.parse(b.booking_date)>HOLD_MIN*6e4){b.status='Cancelled';failPending(b,'The seat hold expired before approval');freeSeats(b);audit(b.user_id,b.booking_id,'expired','Seat hold expired after 15 minutes without payment',Date.parse(b.booking_date)+HOLD_MIN*6e4)}})}
function cancelInfo(b,now=Date.now()){
  if(b.status==='Cancelled')return{allowed:false,reason:'This booking is already cancelled.'};
  const f=flightById(b.flight_id),hrs=(f._dep-now)/36e5;
  if(hrs<0)return{allowed:false,reason:'This flight has already departed.'};
  if(hrs<2)return{allowed:false,reason:'Check-in is closed. Cancellation is not possible within 2 hours of departure.'};
  const paid=DB.payments.filter(p=>p.booking_id===b.booking_id&&p.status==='Success').reduce((s,p)=>s+p.amount,0);
  const pct=b.status==='Pending'||!paid?0:hrs>=72?90:hrs>=24?70:25;
  const refund=Math.round(paid*pct/100);
  return{allowed:true,hours_left:Math.round(hrs),paid,refund_percent:pct,refund_amount:refund,cancellation_fee:paid-refund};
}
function cancelBooking(b,now=Date.now()){
  const info=cancelInfo(b,now);if(!info.allowed)throw HttpErr(409,'NOT_CANCELLABLE',info.reason);
  let left=info.refund_amount,refunded=0;
  DB.payments.filter(p=>p.booking_id===b.booking_id&&p.status==='Success').forEach(p=>{const r=Math.min(left,p.amount);if(r>0){p.status='Refunded';p.refunded_amount=r;p.refunded_at=new Date(now).toISOString();left-=r;refunded+=r}});
  failPending(b,'Booking cancelled before approval');b.status='Cancelled';freeSeats(b);
  audit(b.user_id,b.booking_id,'cancelled','Booking cancelled',now);
  if(refunded)audit(b.user_id,b.booking_id,'refunded',`Refunded ${inr(refunded)} to the original payment method`,now+6e4);
  return{info,refunded};
}
function pnr(id){const r=rng((id*2654435761)>>>0),A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(r()*A.length)];return s}
const payerName=id=>{const p=DB.passengers.find(x=>x.passenger_id===id);return p?p.first_name+' '+p.last_name:null};
function hydrate(b){
  const f=flightById(b.flight_id);
  return{...b,pnr:pnr(b.booking_id),expires_at:b.status==='Pending'?new Date(Date.parse(b.booking_date)+HOLD_MIN*6e4).toISOString():null,
    flight:{...pub(f),airline:AIRLINES[f._air].name},
    passengers:DB.passengers.filter(p=>p.booking_id===b.booking_id).map(p=>({...p,seat_number:seatNo(p.seat_id),class:seatCls(p.seat_id)})),
    payments:DB.payments.filter(p=>p.booking_id===b.booking_id).map(p=>({...p,payer_name:payerName(p.passenger_id)})),cancellation:cancelInfo(b)};
}
function userSummary(uid){
  const now=Date.now(),bs=DB.bookings.filter(b=>b.user_id===uid),conf=bs.filter(b=>b.status==='Confirmed');
  const done=conf.filter(b=>flightById(b.flight_id)._dep<now),up=conf.filter(b=>flightById(b.flight_id)._dep>=now);
  const pays=DB.payments.filter(p=>bs.some(b=>b.booking_id===p.booking_id));
  return{trips_completed:done.length,upcoming:up.length,cancelled:bs.filter(b=>b.status==='Cancelled').length,distance_km:done.reduce((s,b)=>s+flightById(b.flight_id)._km,0),cities_visited:[...new Set(done.map(b=>AP[flightById(b.flight_id).arrival_airport_code].city))],
    total_spent:pays.reduce((s,p)=>s+(p.status==='Success'?p.amount:p.status==='Refunded'?p.amount-p.refunded_amount:0),0),total_refunded:pays.reduce((s,p)=>s+p.refunded_amount,0)};
}
const pubUser=u=>({user_id:u.user_id,email:u.email,first_name:u.first_name,last_name:u.last_name,phone_number:u.phone_number,registration_date:u.registration_date});

/* ============ Persistence ============ */
const KEY='skyline.flight-desk.v3';
function save(){try{const ids=new Set(DB.bookings.map(b=>b.flight_id));localStorage.setItem(KEY,JSON.stringify({users:DB.users,bookings:DB.bookings,passengers:DB.passengers,payments:DB.payments,audit:DB.audit,seq:DB.seq,flights:DB.flights.filter(f=>ids.has(f.flight_id)),session:S.token}))}catch(e){}}
function loadSaved(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null}catch(e){return null}}
function wipe(){try{localStorage.removeItem(KEY)}catch(e){}}

/* ============ Seed data ============ */
function findFlight(from,to,dayOff,nth=0){const d=localDay()+dayOff,list=(DB.route.get(from+'-'+to)||[]).filter(f=>Math.floor((f._dep+GEO[from][2]*6e4)/DAY)===d);return list[nth%list.length]}
function seedBooking(uid,f,names,o){
  const avail=seatsFor(f).filter(s=>s.is_available&&s.class===(o.cls||'Economy'));
  const pax=names.map((n,i)=>({...n,seat_id:avail[i*3+2].seat_id}));
  const when=f._dep-o.daysBefore*DAY;
  const {b}=createBooking({user_id:uid,flight:f,pax,promo:o.promo,when,status:'Confirmed'});
  addPayment(b,{method:o.method,provider:o.provider,detail:o.detail,status:'Success',when:when+9e4});
  if(o.cancelAt!=null)cancelBooking(b,f._dep-o.cancelAt*DAY);
  return b;
}
async function seedAll(){
  const h=await sha256('demo1234'),now=Date.now();
  DB.users.push({user_id:++DB.seq.user,email:'demo@skyline.app',password_hash:h,first_name:'Aarav',last_name:'Mehta',phone_number:'+91 98200 12345',registration_date:new Date(now-190*DAY).toISOString()},
    {user_id:++DB.seq.user,email:'isha@example.com',password_hash:await sha256('isha-pass-1'),first_name:'Isha',last_name:'Kapoor',phone_number:'+91 99000 45678',registration_date:new Date(now-120*DAY).toISOString()},
    {user_id:++DB.seq.user,email:'rohan@example.com',password_hash:await sha256('rohan-pass-1'),first_name:'Rohan',last_name:'Nair',phone_number:'+91 98450 77881',registration_date:new Date(now-64*DAY).toISOString()});
  const A={first_name:'Aarav',last_name:'Mehta',date_of_birth:'1994-03-14',passport_number:'K1234567',nationality:'India'};
  const M={first_name:'Meera',last_name:'Mehta',date_of_birth:'1996-08-02',passport_number:'K7654321',nationality:'India'};
  const V={first_name:'Aarav',last_name:'Mehta',date_of_birth:'1994-03-14',passport_number:'K1234567',nationality:'India'};
  const tries=[
    [1,findFlight('BOM','GOI',-34,0),[A,M],{daysBefore:22,method:'UPI',provider:'PhonePe',detail:'aarav@ybl'}],
    [1,findFlight('BOM','DEL',-21,1),[V],{daysBefore:26,method:'Card',provider:'Visa',detail:'•••• 4242',promo:'SKY10'}],
    [1,findFlight('DEL','BOM',-18,1),[V],{daysBefore:24,method:'Card',provider:'Visa',detail:'•••• 4242'}],
    [1,findFlight('BLR','BOM',-9,0),[V],{daysBefore:15,cls:'Business',method:'UPI',provider:'Google Pay',detail:'aarav@okaxis'}],
    [1,findFlight('BOM','BLR',6,1),[V],{daysBefore:20,method:'NetBanking',provider:'Harbor Bank',detail:'Harbor Bank',cancelAt:6}],
    [1,findFlight('BOM','DXB',11,0),[A,M],{daysBefore:19,method:'EMI',provider:'Northwind Bank',detail:'Mastercard •••• 4444, 6 months',promo:'FIRSTFLY'}],
    [2,findFlight('DEL','BLR',3,1),[{first_name:'Isha',last_name:'Kapoor',date_of_birth:'1992-11-21',passport_number:'P4455667',nationality:'India'}],{daysBefore:12,method:'UPI',provider:'Google Pay',detail:'isha@okicici'}],
    [3,findFlight('MAA','SIN',9,0),[{first_name:'Rohan',last_name:'Nair',date_of_birth:'1990-05-09',passport_number:'M9988776',nationality:'India'},{first_name:'Sneha',last_name:'Nair',date_of_birth:'1991-01-30',passport_number:'M9988123',nationality:'India'}],{daysBefore:16,method:'Wallet',provider:'Paytm Wallet',detail:'Paytm Wallet'}]];
  tries.forEach(([u,f,n,o])=>{if(f)try{seedBooking(u,f,n,o)}catch(e){console.warn('seed skipped',e)}});
  DB.audit.sort((a,b)=>a.ts-b.ts);
}
