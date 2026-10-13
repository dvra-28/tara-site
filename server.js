// Tara Interior and Outfit Ltd - zero-dependency Node backend (Node 18+). Data is saved in data/db.json
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,PSK=process.env.PAYSTACK_SECRET_KEY||'',PPK=process.env.PAYSTACK_PUBLIC_KEY||'';
const DIR=path.join(__dirname,'data'),FILE=path.join(DIR,'db.json');
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,64).toString('hex');
const check=(p,h)=>{const a=Buffer.from(hash(p,h.split(':')[0])),b=Buffer.from(h);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
let db={users:[],sessions:{},products:[],orders:[],bookings:[],trainings:[],messages:[],subscribers:[]};
fs.mkdirSync(DIR,{recursive:true});
if(fs.existsSync(FILE))db=Object.assign(db,JSON.parse(fs.readFileSync(FILE)));
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,1));
const id=()=>crypto.randomBytes(6).toString('hex');
if(!db.products.length){[['Sculpted Velvet Armchair','Furniture',185000],['Solid Oak Coffee Table','Furniture',120000],['Brass Floor Lamp','Decor',65000],['Linen Curtain Set','Fabrics',48000],['Handwoven Area Rug','Decor',95000],['Ankara Tailored Two-Piece','Outfits',55000],['Custom Agbada Set','Outfits',130000],['Silk Evening Gown','Outfits',90000]].forEach(([name,category,price])=>db.products.push({id:id(),name,category,price,desc:'Made and finished to order by the Tara team.'}));}
if(!db.users.length){const e=process.env.ADMIN_EMAIL||'admin@tara.com',p=process.env.ADMIN_PASSWORD||'ChangeMe123!';db.users.push({id:id(),name:'Admin',email:e,pass:hash(p),role:'admin'});console.log('Admin login:',e,'/',p,'(change via ADMIN_EMAIL / ADMIN_PASSWORD before first run)');}
save();
const send=(r,c,d)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(d))};
const readBody=q=>new Promise(r=>{let b='';q.on('data',c=>{b+=c;if(b.length>1e6)q.destroy()});q.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch{r({})}})});
const S=(v,n=300)=>String(v==null?'':v).trim().slice(0,n),mail=e=>/^\S+@\S+\.\S+$/.test(e);
const forms={'/api/bookings':['bookings',['name','email','phone','type','date','notes']],'/api/training':['trainings',['name','email','phone','course','message']],'/api/contact':['messages',['name','email','message']]};
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://x'),p=url.pathname;
 if(!p.startsWith('/api/')){const f=path.join(__dirname,'public',p==='/'?'index.html':p);
  if(!f.startsWith(path.join(__dirname,'public'))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});return fs.createReadStream(f).pipe(res)}
 try{
  const b=req.method==='GET'?{}:await readBody(req),tok=(req.headers.authorization||'').slice(7),user=db.users.find(u=>u.id===db.sessions[tok]);
  const pub=u=>({name:u.name,email:u.email,role:u.role});
  if(p==='/api/config')return send(res,200,{paystackKey:PPK});
  if(p==='/api/products')return send(res,200,db.products);
  if(p==='/api/register'){const email=S(b.email).toLowerCase(),name=S(b.name,80);
   if(!name||!mail(email)||S(b.password).length<8)return send(res,400,{error:'Enter a name, valid email and a password of 8+ characters'});
   if(db.users.some(u=>u.email===email))return send(res,400,{error:'Email already registered'});
   const u={id:id(),name,email,pass:hash(b.password),role:'customer'};db.users.push(u);const t=crypto.randomBytes(24).toString('hex');db.sessions[t]=u.id;save();return send(res,200,{token:t,user:pub(u)})}
  if(p==='/api/login'){const u=db.users.find(u=>u.email===S(b.email).toLowerCase());
   if(!u||!check(S(b.password,200),u.pass))return send(res,401,{error:'Wrong email or password'});
   const t=crypto.randomBytes(24).toString('hex');db.sessions[t]=u.id;save();return send(res,200,{token:t,user:pub(u)})}
  if(p==='/api/me')return user?send(res,200,pub(user)):send(res,401,{error:'Not logged in'});
  if(p==='/api/newsletter'){const e=S(b.email).toLowerCase();if(!mail(e))return send(res,400,{error:'Enter a valid email'});
   if(!db.subscribers.some(s=>s.email===e)){db.subscribers.push({id:id(),email:e,created:new Date().toISOString()});save()}return send(res,200,{ok:true})}
  if(forms[p]){const[col,keys]=forms[p],r={id:id(),status:'new',created:new Date().toISOString(),userId:user&&user.id};
   keys.forEach(k=>r[k]=S(b[k],k==='notes'||k==='message'?1000:120));
   if(!r.name||!mail(r.email))return send(res,400,{error:'Please enter your name and a valid email'});
   if(col==='bookings'&&!['consultation','appointment'].includes(r.type))return send(res,400,{error:'Invalid booking type'});
   db[col].push(r);save();return send(res,200,{ok:true})}
  if(p==='/api/orders'){let total=0;const items=[];
   for(const i of b.items||[]){const pr=db.products.find(x=>x.id===i.id),q=Math.min(Math.max(parseInt(i.qty)||0,1),50);if(pr){items.push({id:pr.id,name:pr.name,price:pr.price,qty:q});total+=pr.price*q}}
   if(!items.length||!S(b.name)||!mail(S(b.email)))return send(res,400,{error:'Add items and enter your name and a valid email'});
   const o={id:id(),reference:'TARA-'+Date.now()+id().slice(0,4),items,total,name:S(b.name,100),email:S(b.email),phone:S(b.phone,30),address:S(b.address,300),status:'awaiting payment',created:new Date().toISOString(),userId:user&&user.id};
   db.orders.push(o);save();return send(res,200,{reference:o.reference,total,online:!!PPK&&!!PSK})}
  if(p==='/api/orders/verify'){const o=db.orders.find(x=>x.reference===S(b.reference));if(!o||!PSK)return send(res,400,{error:'Cannot verify'});
   const r=await(await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(o.reference),{headers:{Authorization:'Bearer '+PSK}})).json();
   if(r.data&&r.data.status==='success'&&r.data.amount>=o.total*100){o.status='paid';save();return send(res,200,{ok:true})}
   return send(res,400,{error:'Payment not confirmed'})}
  if(p.startsWith('/api/admin/')){
   if(!user||user.role!=='admin')return send(res,403,{error:'Admins only'});
   if(p==='/api/admin/all')return send(res,200,{...db,sessions:undefined,users:db.users.map(pub)});
   let m;
   if(req.method==='PATCH'&&(m=p.match(/^\/api\/admin\/(orders|bookings|trainings)\/(\w+)$/))){const r=db[m[1]].find(x=>x.id===m[2]);if(r){r.status=S(b.status,30);save()}return send(res,200,{ok:true})}
   if(p==='/api/admin/products'&&req.method==='POST'){const pr={id:id(),name:S(b.name,100),category:S(b.category,40),price:Math.max(0,Number(b.price)||0),desc:S(b.desc,300)};
    if(!pr.name||!pr.price)return send(res,400,{error:'Name and price required'});db.products.push(pr);save();return send(res,200,pr)}
   if(req.method==='DELETE'&&(m=p.match(/^\/api\/admin\/products\/(\w+)$/))){db.products=db.products.filter(x=>x.id!==m[1]);save();return send(res,200,{ok:true})}
  }
  send(res,404,{error:'Not found'});
 }catch(e){console.error(e);send(res,500,{error:'Server error'})}
}).listen(PORT,()=>console.log('Tara site running at http://localhost:'+PORT));
