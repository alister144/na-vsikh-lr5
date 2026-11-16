import {initial, ingredients, describe, matches, recommend, portions, cartTotals} from './catalog.mjs';
import {pair} from './words.mjs';
import {mountAdmin} from './admin.mjs';
const uk=document.documentElement.lang==='uk';
const lang=uk?'uk':'en';
const n=uk?0:1;
const t=key=>pair[key][n];
const tr=(a,b)=>uk?a:b;
const L=values=>values[n];
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const numeric=new Intl.NumberFormat(uk?'uk-UA':'en-GB',{maximumFractionDigits:0});
const num=x=>numeric.format(x);
const money=x=>uk?num(x)+' грн':'UAH '+num(x);
const average=(sum,count,fmt)=>((sum%count)?'≈ ':'')+fmt(sum/count);
const base=document.body.dataset.base;
const page=document.body.dataset.page;
const route=p=>base+lang+'/'+p;
const assets=base+'assets/';
const toast=document.getElementById('toast');
const view=document.getElementById('view');
const storageKey='na-vsikh-v1';
const previousMakiNames=['Огірок і кунжут','Cucumber & Sesame'];
const maki=initial.find(p=>p.id==='r7');
let savedNotice='';
function load(fallback){
 try{
   const raw=localStorage.getItem(storageKey);
   if(raw){
     const data=JSON.parse(raw);
     if(Array.isArray(data.menu)&&data.cart&&['pickup','delivery'].includes(data.method)){
       const savedMaki=data.menu.find(p=>p.id===maki.id);
       if(savedMaki){
         for(const field of ['name','alt']){
           savedMaki[field]=savedMaki[field].map((text,i)=>text===previousMakiNames[i]?maki[field][i]:text);
         }
       }
       return data;
     }
   }
 }catch {savedNotice=t('storage');if(fallback)return fallback;}
 return {menu:initial,cart:{},method:'delivery'};
}
let state=load();
let volatile=false;
let menu=new Map();
let toastTimer;
function say(message){
 clearTimeout(toastTimer);
 toast.textContent=message;
 toast.classList.toggle('show',Boolean(message));
 toastTimer=setTimeout(()=>toast.classList.remove('show'),4000);
}
function refresh(){
 menu=new Map(state.menu.map(p=>[p.id,describe(p,state.menu)]));
 const removed=Object.keys(state.cart).filter(id=>!menu.has(id));
 removed.forEach(id=>delete state.cart[id]);
 document.getElementById('basket-count').textContent=Object.values(state.cart).reduce((a,b)=>a+b,0);
 return removed.length;
}
async function commit(change){
 const perform=()=>{
   if(!volatile)state=load(state);
   const previous=state;
   const updated={...state,cart:{...state.cart}};
   const error=change(updated);
   if(error){refresh();return error;}
   state=updated;
   const removed=refresh();
   try{localStorage.setItem(storageKey,JSON.stringify(state));volatile=false;}
   catch{
     if(updated.menu!==previous.menu){state=previous;refresh();}
     else volatile=true;
     return t('storage');
   }
   if(removed)say(t('cartUpdate'));
   return '';
 };
 return navigator.locks? navigator.locks.request(storageKey,perform) : perform();
}
async function add(lines){
 const error=await commit(current=>{
   const available=new Set(current.menu.map(p=>p.id));
   if(lines.some(([id])=>!available.has(id)))return t('cartUpdate');
   for(const [id,qty] of lines)current.cart[id]=(current.cart[id]||0)+qty;
 });
 say(error||t('added'));
}
function href(p){
 return route('item/')+(initial.some(q=>q.id===p.id)?p.id+'/':'?id='+encodeURIComponent(p.id));
}
function img(p, eager=false){
 return '<img '+(eager?'fetchpriority="high"':'loading="lazy"')+' decoding="async" width="768" height="512" src="'+esc(p.img.startsWith('data:')?p.img:assets+p.img)+'" alt="'+esc(L(p.alt))+'">';
}
function measure(p){return num(p.pieces)+' '+t('pcs')+' · '+num(p.grams)+' '+t('g');}
function pills(p){return [p.baked&&'baked',p.hot&&'hot',p.raw&&'raw',p.plant&&'plant'].filter(Boolean).map(k=>'<span>'+t(k)+'</span>').join('');}
function card(p){
 return '<article class="product"><a class="product-image" href="'+href(p)+'" aria-label="'+esc(L(p.name))+'">'+img(p)+'</a><div class="product-copy"><div class="spec">'+measure(p)+'</div><h3><a href="'+href(p)+'">'+esc(L(p.name))+'</a></h3><p>'+esc(L(p.desc))+'</p><div class="traits">'+pills(p)+'</div><div class="buy"><strong>'+money(p.price)+'</strong><button type="button" class="small-button" data-add="'+esc(p.id)+'" aria-label="'+esc(t('add')+' — '+L(p.name))+'"><span aria-hidden="true">+</span> '+t('add')+'</button></div></div></article>';
}
function languageLink(){
 const link=document.getElementById('language');
 const target=new URL(link.href);
 target.search=location.search;
 target.hash=location.hash;
 link.href=target.href;
}
function heading(title,sub=''){return '<header class="page-head"><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</header>';}
function options(keys,selected,label=t){return keys.map(k=>'<option value="'+k+'"'+(k===selected?' selected':'')+'>'+esc(label(k))+'</option>').join('');}
function check(key,label,on){return '<label class="tick"><input type="checkbox" name="'+key+'"'+(on?' checked':'')+'> <span>'+label+'</span></label>';}
let bundles=[];
let filters;
function parseFilters(){
 const q=new URLSearchParams(location.search);
 const allowed=(key,values,fallback)=>values.includes(q.get(key))?q.get(key):fallback;
 const legacyBaked=q.get('category')==='baked';
 const category=legacyBaked?'rolls':allowed('category',['all','sets','rolls'],'all');
 return {category,rollType:category==='rolls'&&(legacyBaked||q.get('rollType')==='baked')?'baked':'allRolls',people:Number(allowed('people',['1','2','3','4','5'],'2')),active:q.has('people'),portion:allowed('portion',Object.keys(portions),'dinner'),plant:q.get('plant')==='1'||q.get('pref')==='plant',pref:allowed('pref',['salmon','shrimp'],''),baked:q.get('baked')==='1',mild:q.get('spicy')==='no',noRaw:q.get('rawfish')==='no',sort:allowed('sort',['usual','low','high'],'usual')};
}
function filterURL(){
 const f=filters;
 const url=new URL(location.href);
 for(const k of ['category','rollType','people','portion','baked','spicy','rawfish','plant','pref','sort'])url.searchParams.delete(k);
 if(f.category!=='all')url.searchParams.set('category',f.category);
 if(f.category==='rolls'&&f.rollType==='baked')url.searchParams.set('rollType','baked');
 if(f.active){url.searchParams.set('people',f.people);url.searchParams.set('portion',f.portion);}
 if(f.baked)url.searchParams.set('baked','1');
 if(f.mild)url.searchParams.set('spicy','no');
 if(f.noRaw)url.searchParams.set('rawfish','no');
 if(f.plant)url.searchParams.set('plant','1');
 if(f.pref&&!f.plant)url.searchParams.set('pref',f.pref);
 if(f.sort!=='usual')url.searchParams.set('sort',f.sort);
 history.replaceState(null,'',url);
 languageLink();
}
function renderMenu(){
 const f=filters=parseFilters();
 if(f.plant)f.pref='';
 const params=new URLSearchParams(location.search);
 if(params.get('pref')==='plant'||params.get('category')==='baked')filterURL();
 view.innerHTML=heading(t('menu'))+
 '<div class="menu-tabs" aria-label="'+t('menu')+'">'+['all','sets','rolls'].map(k=>'<button type="button" data-category="'+k+'" aria-pressed="'+(f.category===k)+'">'+t(k)+'</button>').join('')+
 '</div><form class="finder" id="filters"><div class="finder-head"><h2>'+t('finder')+'</h2></div><div class="finder-fields"><label>'+t('people')+'<select name="people">'+options(['1','2','3','4','5'],String(f.people),x=>x)+'</select></label><label>'+t('portion')+'<select name="portion">'+options(Object.keys(portions),f.portion,k=>t(k)+' · '+portions[k]+' '+t('g'))+'</select></label><label>'+t('pref')+'<select name="pref"'+(f.plant?' disabled':'')+'><option value="">'+t('any')+'</option>'+options(['salmon','shrimp'],f.pref,k=>L(ingredients[k]))+'</select></label></div><div class="finder-bottom"><fieldset class="checks" aria-label="'+t('requirements')+'">'+check('baked',t('onlyBaked'),f.baked)+check('mild',t('mild'),f.mild)+check('noRaw',t('noRaw'),f.noRaw)+check('plant',t('plantOnly'),f.plant)+'</fieldset><button class="primary">'+t('finder')+' <span aria-hidden="true">↗</span></button></div></form><section id="recommendations" class="recs" aria-live="polite"></section><section class="listing"><div class="section-head"><h2 id="category-title">'+t(f.category)+'</h2><label class="sort">'+t('sort')+' <select id="sort">'+options(['usual','low','high'],f.sort)+'</select></label></div><div class="roll-types" aria-label="'+t('rollTypes')+'" hidden>'+['allRolls','baked'].map(k=>'<button type="button" data-roll-type="'+k+'" aria-pressed="'+(f.rollType===k)+'">'+t(k)+'</button>').join('')+'</div><div id="products" class="grid"></div></section>';
 const form=document.getElementById('filters');
 function update(activate=false){
   const data=new FormData(form);
   for(const k of ['baked','mild','noRaw','plant']) f[k]=data.has(k);
   f.people=Number(data.get('people'));
   f.portion=data.get('portion');
   form.elements.pref.disabled=f.plant;
   if(f.plant)form.elements.pref.value='';
   f.pref=f.plant?'':(data.get('pref')||'');
   if(activate)f.active=true;
   filterURL();
   menuResults();
 }
 form.addEventListener('submit',e=>{e.preventDefault();update(true);});
 form.addEventListener('change',()=>update());
 document.getElementById('sort').addEventListener('change',e=>{f.sort=e.target.value;filterURL();menuResults();});
 view.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{
   f.category=b.dataset.category;
   if(f.category!=='rolls')f.rollType='allRolls';
   view.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',x===b));
   filterURL();menuResults();
 }));
 view.querySelectorAll('[data-roll-type]').forEach(b=>b.addEventListener('click',()=>{
   f.rollType=b.dataset.rollType;
   filterURL();menuResults();
 }));
 menuResults();
}
function menuResults(){
 const f=filters;
 const products=[...menu.values()];
 let listed=products.filter(p=>matches(p,f)&&(f.category==='all'||(f.category==='sets'&&p.kind==='set')||(f.category==='rolls'&&p.kind==='roll'&&(f.rollType!=='baked'||p.baked))));
 if(f.sort!=='usual')listed.sort((a,b)=>(a.price-b.price)*(f.sort==='low'?1:-1));
 document.getElementById('category-title').textContent=t(f.category);
 view.querySelector('.roll-types').hidden=f.category!=='rolls';
 view.querySelectorAll('[data-roll-type]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rollType===f.rollType));
 document.getElementById('products').innerHTML=listed.map(card).join('')||'<p class="empty">'+t('none')+'</p>';
 const recommendations=document.getElementById('recommendations');
 if(!f.active){recommendations.innerHTML='';return;}
 const rec=recommend(products,f);
 bundles=rec.items;
 const browse=rec.kind==='size'&&f.category!=='all'?'<button type="button" class="outline" id="browse-matching">'+t('all')+' →</button>':'';
 recommendations.innerHTML='<div class="section-head"><h2>'+t(rec.kind==='near'?'near':'recommend')+'</h2><span class="spec">'+t('target')+' · '+num(rec.target)+' '+t('g')+'</span></div>'+
 (bundles.length?'<div class="grid rec-grid">'+bundles.map((b,i)=>bundle(b,i,rec)).join('')+'</div><p class="dim">'+t('excl')+'</p>':'<p class="empty">'+t(rec.kind)+'</p>'+browse);
 document.getElementById('browse-matching')?.addEventListener('click',()=>{
   view.querySelector('[data-category="all"]').click();
   document.getElementById('category-title').scrollIntoView({block:'center'});
 });
}
function bundle(b,i,rec){
 const f=filters;
 const delta=b.grams-rec.target;
 const explains=rec.kind==='near'?'<p class="spec">'+num(Math.abs(delta)/f.people)+' '+t('g')+' '+t(delta<0?'less':'more')+'</p>':'';
 const count=average(b.pieces,f.people,x=>new Intl.NumberFormat(uk?'uk-UA':'en-GB',{maximumFractionDigits:1}).format(x)+' '+t('pcs'));
 return '<article class="recommendation"><div class="rec-top">'+b.lines.map(([p,q])=>'<a href="'+href(p)+'">'+esc(L(p.name))+(q>1?' × '+q:'')+'</a>').join('')+'</div>'+explains+(f.pref?'<p class="spec">'+t(b.preferred?'preferred':'missingPref')+'</p>':'')+'<dl><div><dt>'+t('total')+'</dt><dd><strong>'+money(b.price)+'</strong><span>'+measure(b)+'</span></dd></div><div><dt>'+t('per')+'</dt><dd><strong>'+average(b.price,f.people,money)+'</strong><span>'+average(b.grams,f.people,x=>num(x)+' '+t('g'))+' · '+count+'</span></dd></div></dl><button class="small-button" data-bundle="'+i+'">'+t('bundle')+'</button></article>';
}
function renderItem(){
 const id=document.body.dataset.product||new URLSearchParams(location.search).get('id');
 const p=menu.get(id);
 if(!p){view.innerHTML=heading(t('notFound'))+'<a class="text-link" href="'+route('menu/')+'">'+t('back')+' →</a>';return;}
 document.title=L(p.name)+' · '+t('brand');
 const list=p.kind==='set'?p.partsDetail.map(([r,q])=>'<li><a class="text-link" href="'+href(r)+'">'+esc(L(r.name))+'</a> × '+q+'</li>').join(''):p.recipe.map(r=>'<li>'+esc(L(ingredients[r.key]))+(r.raw?' <span class="dim">('+t('raw').toLowerCase()+')</span>':'')+'</li>').join('');
 const allergies=[...new Set(p.tags.flatMap(k=>(ingredients[k][2]||'').split(' ')).filter(Boolean))];
 view.innerHTML='<a class="text-link back" href="'+route('menu/')+'">← '+t('back')+'</a><article class="detail"><div class="detail-img">'+img(p,true)+'</div><div><div class="spec">'+measure(p)+'</div><h1>'+esc(L(p.name))+'</h1><p class="intro">'+esc(L(p.desc))+'</p><div class="traits">'+pills(p)+'</div><div class="buy"><strong>'+money(p.price)+'</strong><button class="primary" data-add="'+esc(p.id)+'">'+t('add')+'</button></div><h2>'+t('prep')+'</h2><ul>'+list+'</ul><p><strong>'+t('allergen')+'</strong><br>'+(allergies.map(t).join(', ')||'—')+'</p><p><strong>'+t('accompaniment')+'</strong><br>'+t('sides')+' '+tr('Соєвий соус містить сою та пшеницю.','Soy sauce contains soy and wheat.')+'</p></div></article>';
}
function renderCart(focus){
 const lines=Object.entries(state.cart).filter(([id])=>menu.has(id)).map(([id,q])=>[menu.get(id),q]);
 const totals=cartTotals(lines,state.method);
 if(!lines.length){
   view.innerHTML=heading(t('cart'))+'<p class="empty">'+t('basketEmpty')+'</p><a class="primary inline" id="empty-back" href="'+route('menu/')+'">'+t('back')+' →</a>';
   if(focus)document.getElementById('empty-back').focus();
   return;
 }
 const summary='<dl class="cart-summary"><div><dt>'+t('subtotal')+'</dt><dd>'+money(totals.subtotal)+'</dd></div><div><dt>'+t('courier')+'</dt><dd>'+(totals.shipping?money(totals.shipping):t('free'))+'</dd></div><div class="grand"><dt>'+t('total')+'</dt><dd>'+money(totals.total)+'</dd></div></dl>';
 view.innerHTML=heading(t('cart'))+'<div class="cart-layout"><ul class="cart-lines">'+lines.map(([p,q])=>'<li><a class="cart-image" href="'+href(p)+'" aria-label="'+esc(L(p.name))+'">'+img(p)+'</a><div><h2><a href="'+href(p)+'">'+esc(L(p.name))+'</a></h2><p class="spec">'+money(p.price)+'</p><button class="text-link delete-link" data-remove="'+p.id+'" aria-label="'+esc(t('remove')+' — '+L(p.name))+'">'+t('remove')+'</button></div><div class="line-qty"><label>'+t('qty')+'<input data-qty="'+p.id+'" type="number" min="1" step="1" value="'+q+'" aria-label="'+esc(t('qty')+' — '+L(p.name))+'"></label><div class="qty-buttons"><button type="button" data-step="'+p.id+'" data-delta="-1" aria-label="'+esc(tr('Зменшити кількість','Decrease quantity')+' — '+L(p.name))+'"'+(q===1?' disabled':'')+'>−</button><button type="button" data-step="'+p.id+'" data-delta="1" aria-label="'+esc(tr('Збільшити кількість','Increase quantity')+' — '+L(p.name))+'">+</button></div><strong>'+money(p.price*q)+'</strong></div></li>').join('')+'</ul><aside class="checkout"><label>'+t('method')+'<select id="method">'+options(['delivery','pickup'],state.method,k=>t(k==='delivery'?'courier':'pickup'))+'</select></label>'+summary+'<p class="notice">'+t('demo')+'</p><button class="primary" id="review">'+t('review')+'</button></aside></div><dialog id="review-dialog" aria-labelledby="order-title"><h2 id="order-title">'+t('order')+'</h2><p>'+t('orderPreview')+'</p>'+summary+'<form method="dialog"><button class="outline">'+t('close')+'</button></form></dialog>';
 document.getElementById('method').addEventListener('change',async e=>{const method=e.target.value;const error=await commit(current=>{current.method=method;});if(error)say(error);renderCart('#method');});
 document.getElementById('review').addEventListener('click',()=>document.getElementById('review-dialog').showModal());
 view.querySelectorAll('[data-qty]').forEach(input=>input.addEventListener('change',async ()=>{
   const id=input.dataset.qty;
   const quantity=input.valueAsNumber;
   const error=await commit(current=>{
     if(current.cart[id]&&Number.isSafeInteger(quantity)&&quantity>0&&quantity<=9999)current.cart[id]=quantity;
   });
   if(error)say(error);
   renderCart('[data-qty="'+input.dataset.qty+'"]');
 }));
 view.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',async ()=>{
   const id=button.dataset.step;
   const error=await commit(current=>{
     const qty=current.cart[id]+Number(button.dataset.delta);
     if(Number.isSafeInteger(qty)&&qty>=1&&qty<=9999)current.cart[id]=qty;
   });
   if(error)say(error);
   renderCart('[data-step="'+id+'"][data-delta="'+button.dataset.delta+'"]:not(:disabled), [data-qty="'+id+'"]');
 }));
 view.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',async ()=>{
   const error=await commit(current=>{delete current.cart[button.dataset.remove];});
   if(error)say(error);
   renderCart('[data-remove]');
 }));
 if(focus)view.querySelector(focus)?.focus();
}
function render(){
 if(page==='menu')renderMenu();
 if(page==='item')renderItem();
 if(page==='cart')renderCart();
 if(page==='home'){
   const featuredCards=(id,kind,ids)=>{
     const picks=ids.map(key=>menu.get(key)).filter(Boolean);
     const others=[...menu.values()].filter(p=>p.kind===kind&&!ids.includes(p.id));
     document.getElementById(id).innerHTML=[...picks,...others].slice(0,3).map(card).join('')||'<p class="dim">'+t('unavailable')+'</p>';
   };
   featuredCards('featured','set',['s2','s3','s6']);
   featuredCards('featured-rolls','roll',['r1','r5','r4']);
   const featured=menu.get('s6');
   const link=document.querySelector('.hero-fig a');
   link.href=featured?href(featured):route('menu/');
   link.setAttribute('aria-label',featured?tr('Переглянути сет «'+L(featured.name)+'»','View '+L(featured.name)):t('all'));
 }
}
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-add]');
 if(a)add([[a.dataset.add,1]]);
 const b=e.target.closest('[data-bundle]');
 if(b)add(bundles[Number(b.dataset.bundle)].lines.map(([p,q])=>[p.id,q]));
});
let admin;
window.addEventListener('storage',e=>{
 if(e.storageArea!==localStorage||(e.key!==storageKey&&e.key!==null))return;
 const previousMenu=JSON.stringify(state.menu);
 state=load(state);
 volatile=false;
 const removed=refresh();
 const catalogueChanged=JSON.stringify(state.menu)!==previousMenu;
 if(removed)say(t('cartUpdate'));
 if(page==='admin'){if(catalogueChanged)admin.sync();return;}
 if(page==='cart')renderCart();
 else if(catalogueChanged){
   if(page==='menu')menuResults();
   else render();
 }
});
window.addEventListener('popstate',()=>{if(page==='menu')renderMenu();languageLink();});
if(refresh())savedNotice=t('cartUpdate');
render();languageLink();
if(page==='admin')admin=mountAdmin({view,t,L,esc,heading,money,img,say,menu:()=>menu,products:()=>state.menu,update(change){return commit(current=>{const result=change(current.menu);if(typeof result==='string')return result;current.menu=result;});}});
if(savedNotice)say(savedNotice);
