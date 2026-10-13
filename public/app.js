const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
let token=localStorage.getItem('tok'),user=null,products=[],cfg={},cart=JSON.parse(localStorage.getItem('cart')||'[]'),reg=false;
const api=async(u,m='GET',b)=>{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:b&&JSON.stringify(b)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Something went wrong');return d};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3400)};
const money=n=>'₦'+Number(n).toLocaleString(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// theme
const setTheme=t=>{document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)};
setTheme(localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
$('#burger').onclick=()=>$('#links').classList.toggle('open');$$('#links a').forEach(a=>a.onclick=()=>$('#links').classList.remove('open'));
$('#yr').textContent=new Date().getFullYear();
// scroll reveal
const io=new IntersectionObserver(e=>e.forEach(x=>x.isIntersecting&&(x.target.classList.add('in'),io.unobserve(x.target))),{threshold:.12});
const reveal=()=>$$('.rv,.card').forEach(e=>{e.classList.add('rv');io.observe(e)});
// shop
function drawProducts(){const q=$('#q').value.toLowerCase(),c=$('#cat').value,s=$('#sort').value;
 let l=products.filter(p=>(!c||p.category===c)&&(p.name+p.desc).toLowerCase().includes(q));
 if(s)l.sort((a,b)=>s==='a'?a.price-b.price:b.price-a.price);
 $('#prods').innerHTML=l.map(p=>`<div class="card"><small style="color:var(--mute)">${esc(p.category)}</small><h3>${esc(p.name)}</h3><p style="font-size:.85rem;color:var(--mute)">${esc(p.desc)}</p><div class="pr">${money(p.price)}</div><button class="btn s" data-add="${p.id}">Add to cart</button></div>`).join('')||'<p>No products found.</p>';reveal()}
['#q','#cat','#sort'].forEach(s=>$(s).oninput=drawProducts);
$('#prods').onclick=e=>{const id=e.target.dataset.add;if(!id)return;const i=cart.find(x=>x.id===id);i?i.qty++:cart.push({id,qty:1});drawCart();toast('Added to cart')};
function drawCart(){localStorage.setItem('cart',JSON.stringify(cart));let t=0;
 $('#items').innerHTML=cart.map(i=>{const p=products.find(x=>x.id===i.id);if(!p)return'';t+=p.price*i.qty;return`<div class="row"><span>${esc(p.name)}<br><small>${money(p.price)}</small></span><span><button class="ic" data-q="${i.id}:-1">−</button> ${i.qty} <button class="ic" data-q="${i.id}:1">+</button></span></div>`}).join('')||'<p style="color:var(--mute)">Your cart is empty.</p>';
 $('#tot').textContent=money(t);$('#cc').textContent=cart.reduce((a,i)=>a+i.qty,0)}
$('#items').onclick=e=>{const q=e.target.dataset.q;if(!q)return;const[id,d]=q.split(':'),i=cart.find(x=>x.id===id);i.qty+=+d;if(i.qty<1)cart=cart.filter(x=>x!==i);drawCart()};
$('#cartBtn').onclick=()=>$('#drawer').classList.add('open');$('#cx').onclick=()=>$('#drawer').classList.remove('open');
$('#co').onsubmit=async e=>{e.preventDefault();if(!cart.length)return toast('Cart is empty');const f=Object.fromEntries(new FormData(e.target));
 try{const o=await api('/api/orders','POST',{...f,items:cart});
  const done=()=>{cart=[];drawCart();$('#drawer').classList.remove('open');e.target.reset()};
  if(o.online&&cfg.paystackKey&&window.PaystackPop){new PaystackPop().newTransaction({key:cfg.paystackKey,email:f.email,amount:o.total*100,currency:'NGN',reference:o.reference,
   onSuccess:async()=>{try{await api('/api/orders/verify','POST',{reference:o.reference});toast('Payment confirmed. Thank you!');done()}catch(x){toast(x.message)}},onCancel:()=>toast('Payment cancelled')})}
  else{toast('Order '+o.reference+' placed. We will contact you to arrange payment.');done()}
 }catch(x){toast(x.message)}};
// gallery (add {img:'img/photo.jpg'} to use real photos)
const G=[{t:'Modern living room',c:'Interior'},{t:'Ankara two-piece',c:'Outfit'},{t:'Gold-accent bedroom',c:'Interior'},{t:'Agbada set',c:'Outfit'},{t:'Minimal kitchen',c:'Interior'},{t:'Evening gown',c:'Outfit'},{t:'Office space',c:'Interior'},{t:'Bridal collection',c:'Outfit'}];
const drawGal=()=>{const c=$('#gcat').value;$('#gal').innerHTML=G.filter(g=>!c||g.c===c).map(g=>`<div class="tile">${g.img?`<img src="${g.img}" alt="${esc(g.t)}" loading="lazy">`:''}<span>${esc(g.t)}</span></div>`).join('');reveal()};$('#gcat').oninput=drawGal;
// generic forms (booking, training, contact, newsletter)
$$('form[data-api]').forEach(f=>f.onsubmit=async e=>{e.preventDefault();try{await api(f.dataset.api,'POST',Object.fromEntries(new FormData(f)));f.reset();toast('Thank you! We have received your request.')}catch(x){toast(x.message)}});
// auth
const setUser=u=>{user=u;$('#authBtn').textContent=u?'Logout':'Login';$('#adminLink').hidden=$('#admin').hidden=!(u&&u.role==='admin');if(u&&u.role==='admin')loadAdmin()};
$('#authBtn').onclick=()=>{if(user){token=null;localStorage.removeItem('tok');setUser(null);toast('Logged out')}else $('#authD').showModal()};
$('#sw').onclick=e=>{e.preventDefault();reg=!reg;$('#nm').hidden=!reg;$('#nm').required=reg;$('#authT').textContent=reg?'Create account':'Login';e.target.textContent=reg?'Have an account? Login':'Need an account? Register'};
$('#authD').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
$('#authF').onsubmit=async e=>{e.preventDefault();try{const d=await api(reg?'/api/register':'/api/login','POST',Object.fromEntries(new FormData(e.target)));token=d.token;localStorage.setItem('tok',token);setUser(d.user);$('#authD').close();toast('Welcome, '+d.user.name)}catch(x){toast(x.message)}};
// admin
let A={},tab='orders';
async function loadAdmin(){try{A=await api('/api/admin/all');drawAdmin()}catch(x){toast(x.message)}}
function drawAdmin(){const T=['orders','bookings','trainings','messages','subscribers','users','products'];
 $('#tabs').innerHTML=T.map(t=>`<button class="btn s ${t===tab?'on':'o'}" data-t="${t}">${t} (${(A[t]||[]).length})</button>`).join('');
 const rows=A[tab]||[],st=['orders','bookings','trainings'].includes(tab),skip=['id','pass','userId','items','desc'];
 const cols=rows.length?Object.keys(rows[0]).filter(k=>!skip.includes(k)):[];
 $('#adm').innerHTML=(tab==='products'?`<form id="pf" class="two" style="margin-bottom:14px"><input name="name" placeholder="Name" required><input name="category" placeholder="Category" required><input name="price" type="number" placeholder="Price ₦" required><input name="desc" placeholder="Description"><button class="btn s">Add product</button></form>`:'')+
 `<table><tr>${cols.map(c=>`<th>${c}</th>`).join('')}${tab==='products'?'<th></th>':''}</tr>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c==='status'&&st?`<select data-s="${tab}:${r.id}">${['new','awaiting payment','paid','confirmed','completed','cancelled'].map(o=>`<option ${o===r.status?'selected':''}>${o}</option>`).join('')}</select>`:esc(c==='total'||c==='price'?money(r[c]):r[c])}</td>`).join('')}${tab==='products'?`<td><button class="btn s o" data-d="${r.id}">Delete</button></td>`:''}</tr>`).join('')}</table>`}
$('#tabs').onclick=e=>{if(e.target.dataset.t){tab=e.target.dataset.t;drawAdmin()}};
$('#adm').onchange=async e=>{const s=e.target.dataset.s;if(s){const[c,id]=s.split(':');await api(`/api/admin/${c}/${id}`,'PATCH',{status:e.target.value});toast('Status updated')}};
$('#adm').onclick=async e=>{if(e.target.dataset.d&&confirm('Delete product?')){await api('/api/admin/products/'+e.target.dataset.d,'DELETE');await loadAdmin();products=A.products;drawProducts()}};
$('#adm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/products','POST',Object.fromEntries(new FormData(e.target)));await loadAdmin();products=A.products;drawProducts();toast('Product added')}catch(x){toast(x.message)}};
// init
(async()=>{cfg=await api('/api/config');products=await api('/api/products');
 $('#cat').innerHTML+=[...new Set(products.map(p=>p.category))].map(c=>`<option>${esc(c)}</option>`).join('');drawProducts();drawCart();drawGal();reveal();
 if(token)try{setUser(await api('/api/me'))}catch{token=null;localStorage.removeItem('tok')}})();
