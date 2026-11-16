import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {initial,describe} from '../assets/catalog.mjs';
import {pair} from '../assets/words.mjs';
const root=resolve(import.meta.dirname,'..');
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pages={home:'',menu:'menu/',delivery:'delivery/',contact:'contact/',cart:'cart/',admin:'admin/',item:'item/'};
function siteRoot(value){
 if(!value)return null;
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.search||url.hash||url.username||url.password){
   throw new Error('SITE_URL must be an absolute HTTP(S) site address without credentials, query or fragment.');
 }
 url.pathname=url.pathname.replace(/\/+$/,'')+'/';
 return url;
}
const deployed=siteRoot(process.env.SITE_URL);
async function save(path,html){await mkdir(resolve(root,path,'..'),{recursive:true});await writeFile(resolve(root,path),html);}
for(const [n,lang] of ['uk','en'].entries()){
 const t=k=>pair[k][n];
 const langSwap=n?'uk':'en';
 const tx=(a,b)=>n?b:a;
 for(const [page,route,product] of [...Object.entries(pages).map(([k,p])=>[k,p,null]),...initial.map(p=>['item','item/'+p.id+'/',p])]){
 const base='../'.repeat(1+route.split('/').filter(Boolean).length);
 const a=(key)=>base+lang+'/'+pages[key];
 const assets=base+'assets/';
 const title=product?product.name[n]:page==='home'?t('tagline'):page==='item'?t('menu'):t(page);
 const summary=product?product.desc[n]:tx('Суші, роли й сети в Києві. Підберіть страви за розміром компанії.','Sushi rolls and sharing sets in Kyiv. Find a meal for your group.');
 const canonical=deployed?new URL(lang+'/'+route,deployed).href:null;
 const alternate=deployed?new URL(langSwap+'/'+route,deployed).href:base+langSwap+'/'+route;
 const imageFile=product?.img||'hero.webp';
 const social=deployed?'<link rel="canonical" href="'+esc(canonical)+'"><meta property="og:url" content="'+esc(canonical)+'"><meta property="og:image" content="'+esc(new URL('assets/'+imageFile,deployed).href)+'"><meta property="og:image:alt" content="'+esc(product?.alt[n]||title)+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+esc(new URL('assets/'+imageFile,deployed).href)+'">':'';
 const nav=(key)=>'<a href="'+a(key)+'"'+(page===key?' aria-current="page"':'')+'>'+t(key)+'</a>';
 const wordmark='<a class="wordmark" href="'+a('home')+'" aria-label="'+t('brand')+'">'+tx('НА<span>ВСІХ</span>','NA<span>VSIKH</span>')+'</a>';
 const heading=(title,desc='')=>'<header class="page-head"><h1>'+title+'</h1>'+(desc?'<p>'+desc+'</p>':'')+'</header>';
 const chooser='<form class="quick" action="'+a('menu')+'" method="get"><input type="hidden" name="category" value="sets"><fieldset><legend>'+t('people')+'</legend><div class="segments">'+[1,2,3,4,5].map(q=>'<label><input type="radio" name="people" value="'+q+'"'+(q===2?' checked':'')+'><span>'+q+'</span></label>').join('')+'</div></fieldset><button class="primary">'+t('finder')+' <span aria-hidden="true">↗</span></button></form>';
 let content='';
 if(page==='home'){
   content='<section class="hero frame"><div class="hero-copy"><p class="kicker"><i></i>'+t('tagline')+'</p><h1>'+tx('Суші до<br>спільного <em>столу.</em>','Sushi for<br>the <em>table.</em>')+'</h1><p class="intro">'+tx('На двох, на друзів чи на себе. Підберіть роли за кількістю людей і дістаньте точну суму та орієнтир на кожного.','For two, for friends, or just for you. Find the right amount of sushi and see the total and the share per person.')+'</p>'+chooser+'<a class="text-link hero-menu" href="'+a('menu')+'">'+t('all')+' <span aria-hidden="true">→</span></a></div><figure class="hero-fig"><img src="'+assets+'hero.webp" width="1200" height="800" alt="'+tx('Різні роли на спільному підносі','Assorted rolls on a sharing tray')+'" fetchpriority="high"><figcaption><a href="'+a('item')+'s6/">'+tx('Сет «На всіх»','The Sharing Set')+' <span aria-hidden="true">↗</span></a><span>'+tx('Фото для ілюстрації','Illustrative photo')+'</span></figcaption></figure></section><section class="frame section popular"><div class="section-head"><h2>'+tx('Сети до столу','Sets to share')+'</h2><a class="text-link" href="'+a('menu')+'?category=sets">'+t('sets')+' →</a></div><div id="featured" class="grid"></div></section>';
 } else if(page==='delivery'){
   content='<div class="frame narrow section">'+heading(t('delivery'),tx('Київ','Kyiv'))+'<div class="info-grid"><section><h2>'+t('courier')+'</h2><p>'+tx('89 грн, якщо сума страв менша за 1 000 грн. Від 1 000 грн доставка безкоштовна.','UAH 89 for food subtotals below UAH 1,000. Free from UAH 1,000.')+'</p></section><section><h2>'+t('pickup')+'</h2><p>'+tx('Самовивіз безкоштовний.','Pickup is free.')+'</p></section><section><h2>'+tx('Оплата','Payment')+'</h2><p>'+t('demo')+'</p></section></div><a class="text-link" href="'+a('menu')+'">'+t('back')+' →</a></div>';
 } else if(page==='contact'){
   content='<div class="frame narrow section">'+heading(t('contact'))+'<div class="info-grid"><section><h2>'+tx('Автор проєкту','Project author')+'</h2><p>'+tx('Кузьміч Олексій · 4-16 ФТБ','Oleksii Kuzmich · 4-16 ФТБ')+'</p></section></div><a class="text-link" href="'+a('menu')+'">'+t('back')+' →</a></div>';
 } else if(page==='item'&&product){
   const data=describe(product,initial);
   content='<div class="frame section" id="view"><h1>'+esc(product.name[n])+'</h1><p>'+esc(product.desc[n])+'</p><img class="static-detail" src="'+assets+product.img+'" alt="'+esc(product.alt[n])+'"><p>'+data.grams+' '+t('g')+' · '+data.pieces+' '+t('pcs')+'</p></div>';
 } else {
   content='<div class="frame section" id="view">'+(page==='item'?'':heading(t(page)))+'</div>';
 }
 const html='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+' · '+t('brand')+'</title><meta name="description" content="'+esc(summary)+'"><meta property="og:title" content="'+esc(title)+' · '+t('brand')+'"><meta property="og:description" content="'+esc(summary)+'">'+social+'<meta property="og:locale" content="'+tx('uk_UA','en_GB')+'"><link rel="alternate" hreflang="'+langSwap+'" href="'+esc(alternate)+'"><link rel="icon" href="'+assets+'mark.svg"><link rel="stylesheet" href="'+assets+'style.css"><script type="module" src="'+assets+'app.mjs"></script></head><body data-page="'+page+'" data-product="'+(product?.id||'')+'" data-base="'+base+'"><a class="skip" href="#main">'+t('skip')+'</a><header class="site-header"><div class="top frame">'+wordmark+'<nav class="main-nav" aria-label="'+tx('Основна навігація','Main navigation')+'">'+nav('menu')+nav('delivery')+nav('contact')+'</nav><div class="tools"><a class="language" id="language" href="'+base+langSwap+'/'+route+'" lang="'+langSwap+'" hreflang="'+langSwap+'">'+tx('EN','UA')+'</a><a class="basket" href="'+a('cart')+'"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 8h16l-2 13H6L4 8Zm4 0a4 4 0 0 1 8 0"/></svg><span>'+t('cart')+'</span><strong id="basket-count">0</strong></a></div></div></header><main id="main" tabindex="-1">'+content+'</main><div id="toast" role="status" aria-live="polite"></div><footer class="footer"><div class="frame footer-inner">'+wordmark+'<span>© 2026 Кузьміч Олексій</span><div>'+nav('delivery')+nav('contact')+nav('admin')+'</div></div></footer></body></html>';
 await save(lang+'/'+route+'index.html',html);
 }
}
await save('index.html','<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0; url=uk/"><title>НА ВСІХ</title><a href="uk/">НА ВСІХ</a> · <a href="en/" lang="en">English</a><footer>© 2026 Кузьміч Олексій</footer></html>');
await save('404.html','<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404 · НА ВСІХ</title><h1>Сторінку не знайдено</h1><p lang="en">Page not found</p><p><a href="'+(deployed?.href||'./')+'uk/">НА ВСІХ</a> · <a href="'+(deployed?.href||'./')+'en/" lang="en">English</a></p><footer>© 2026 Кузьміч Олексій</footer></html>');
