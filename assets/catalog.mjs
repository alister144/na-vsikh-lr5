export const ingredients={
 rice:['Рис','Rice'], nori:['Норі','Nori'], salmon:['Лосось','Salmon','fish','fish'], tuna:['Тунець','Tuna','fish','fish'], cheese:['Крем-сир','Cream cheese','milk','animal'], avocado:['Авокадо','Avocado'], cucumber:['Огірок','Cucumber'], chili:['Соус шрірача','Sriracha','','hot'], shrimp:['Креветка','Shrimp','crustaceans','animal'], sesame:['Кунжут','Sesame','sesame'], shiitake:['Шиїтаке','Shiitake'], soy:['Соєвий соус','Soy sauce','soy wheat'], tofu:['Тофу','Tofu','soy'], chicken:['Курка','Chicken','','animal'], panko:['Панко','Panko','wheat'], ginger:['Маринований імбир','Pickled ginger'], wasabi:['Васабі','Wasabi','','hot']
};
const roll=(id,name,desc,price,grams,baked,recipe)=>({id,name,desc,alt:name,img:id+'.webp', price,grams,pieces:8,baked,recipe:recipe.split(' ').map(k=>({key:k.replace('*',''),raw:k.endsWith('*')})),kind:'roll'});
const set=(id,name,desc,price,ids)=>({id,name,desc,alt:name,img:id+'.webp',price,kind:'set',parts:Object.fromEntries(ids.split(' ').map(id=>[id,1]))});
export const initial=[
 roll('r1',['Філадельфія з лососем','Salmon Philadelphia'],['Лосось зовні, крем-сир та авокадо всередині.','Salmon outside, cream cheese and avocado inside.'],349,280,false,'rice nori salmon* cheese avocado cucumber'),
 roll('r2',['Спайсі з тунцем','Spicy Tuna'],['Тунець, хрусткий огірок і шрірача.','Tuna, crisp cucumber and sriracha.'],319,250,false,'rice nori tuna* cucumber chili'),
 roll('r3',['Каліфорнія з креветкою','Shrimp California'],['Готова креветка з авокадо в обсмаженому кунжуті.','Cooked shrimp with avocado and toasted sesame.'],279,245,false,'rice nori shrimp avocado cucumber sesame'),
 roll('r4',['Макі з авокадо','Avocado Maki'],['Авокадо, рис і тонкий лист норі.','Avocado, rice and a thin sheet of nori.'],149,180,false,'rice nori avocado'),
 roll('r5',['Запечений лосось','Baked Salmon'],['Лосось і крем-сир під золотистою шапочкою.','Salmon and cream cheese with a golden baked top.'],329,300,true,'rice nori salmon cheese'),
 roll('r6',['Запечений шиїтаке','Baked Shiitake'],['Шиїтаке та тофу із запеченою верхівкою.','Shiitake and tofu with a baked topping.'],229,260,true,'rice nori shiitake tofu soy'),
 roll('r7',['Огірок і кунжут','Cucumber & Sesame'],['Хрусткий огірок і підсмажений кунжут.','Crisp cucumber with toasted sesame.'],119,195,false,'rice nori cucumber sesame'),
 roll('r8',['Хрусткий рол із куркою','Crispy Chicken Roll'],['Курка в панко з огірком і крем-сиром.','Panko chicken, cucumber and cream cheese.'],239,260,false,'rice nori chicken panko cucumber cheese'),
 set('s1',['Риба й авокадо','Salmon & Avocado'],['Філадельфія з лососем і легкі макі з авокадо.','Salmon Philadelphia and light avocado maki.'],459,'r1 r4'),
 set('s2',['До вечері','Dinner Set'],['Лосось, креветка й авокадо — три різні роли на одному столі.','Salmon, shrimp and avocado — three different rolls to share.'],719,'r1 r3 r4'),
 set('s3',['Запечений дует','Baked Duo'],['Два запечені роли: з лососем і з шиїтаке.','Two baked rolls: salmon and shiitake.'],519,'r5 r6'),
 set('s4',['Овочевий','Plant-Based Set'],['Авокадо, шиїтаке, огірок і кунжут.','Avocado, shiitake, cucumber and sesame.'],459,'r4 r6 r7'),
 set('s5',['Гострий мікс','Spicy Mix'],['Спайсі з тунцем, Філадельфія й Каліфорнія з креветкою.','Spicy tuna, salmon Philadelphia and shrimp California.'],879,'r2 r1 r3'),
 set('s6',['На всіх','The Sharing Set'],['Шість різних ролів: від Філадельфії до хрусткої курки.','Six different rolls, from Philadelphia to crispy chicken.'],1449,'r1 r3 r4 r5 r6 r8')
];
export function describe(product, menu) {
 if(product.kind==='roll') return {...product, baked:product.baked, hot:product.recipe.some(row=>ingredients[row.key][3]==='hot'),raw:product.recipe.some(row=>row.raw&&ingredients[row.key][3]==='fish'),plant:product.recipe.every(row=>!['fish','animal'].includes(ingredients[row.key][3])),tags:product.recipe.map(row=>row.key)};
 const parts=Object.entries(product.parts).map(([id,qty])=>[describe(menu.find(p=>p.id===id),menu),qty]);
 return {...product,partsDetail:parts,grams:parts.reduce((n,[p,q])=>n+p.grams*q,0),pieces:parts.reduce((n,[p,q])=>n+p.pieces*q,0),baked:parts.every(([p])=>p.baked),hot:parts.some(([p])=>p.hot),raw:parts.some(([p])=>p.raw),plant:parts.every(([p])=>p.plant),tags:[...new Set(parts.flatMap(([p])=>p.tags))]};
}
export const portions={light:200,dinner:300,hearty:400};
export function matches(p, f){return (!f.baked||p.baked)&&(!f.mild||!p.hot)&&(!f.noRaw||!p.raw)&&(!(f.plant||f.pref==='plant')||p.plant);}
export function recommend(menu, f){
 const eligible=menu.filter(p=>matches(p,f)).sort((a,b)=>a.id.localeCompare(b.id));
 const rolls=eligible.filter(p=>p.kind==='roll');
 const target=f.people*portions[f.portion];
 const results=[];
 const preference=f.pref==='plant'?null:f.pref;
 function collect(lines, grams, price, pieces) {
   const gap=Math.abs(grams-target);
   if(!lines.length||gap*100>target*30)return;
   const preferred=!preference||lines.some(([p])=>p.tags.includes(preference));
   const counts=new Map();
   for(const [p,q] of lines){
     const contents=p.kind==='set'?p.partsDetail:[[p,1]];
     for(const [roll,count] of contents)counts.set(roll.id,(counts.get(roll.id)||0)+count*q);
   }
   const varieties=counts.size;
   const composition=JSON.stringify([...counts].sort(([a],[b])=>a.localeCompare(b)));
   const ready=lines.length===1&&lines[0][0].kind==='set';
   results.push({lines,grams,price,pieces,gap,preferred,varieties,composition,ready,key:lines.map(([p,q])=>p.id+'-'+q).join('.')});
 }
 function combinations(start,left,lines,grams,price,pieces){
   collect(lines,grams,price,pieces);
   if(lines.length===3)return;
   for(let i=start;i<rolls.length;i++){
     const p=rolls[i];
     for(let q=1;q<=left&&((grams+p.grams*q-target)*100<=30*target);q++){
       combinations(i+1,left-q,[...lines,[p,q]],grams+p.grams*q,price+p.price*q,pieces+p.pieces*q);
     }
   }
 }
 combinations(0,7,[],0,0,0);
 eligible.filter(p=>p.kind==='set').forEach(p=>combinations(0,3,[[p,1]],p.grams,p.price,p.pieces));
 const unique=options=>{
   const seen=new Set();
   return options.filter(option=>{
     if(seen.has(option.composition))return false;
     seen.add(option.composition);
     return true;
   });
 };
 const tie=(a,b)=>a.lines.length-b.lines.length||a.price-b.price||a.key.localeCompare(b.key);
 const close=results.filter(x=>x.gap*100<=target*15);
 if(close.length){
   const cheapest=close.reduce((price,option)=>Math.min(price,option.price),Infinity);
   // The portion band keeps prices and variety from pushing out a suitable meal.
   // Party size is fixed, so the relative price premium is also the per-person premium.
   const score=option=>option.gap/target
     + .18*Math.min((option.price-cheapest)/cheapest,1.5)
     - .035*Math.min(option.varieties-1,3)
     - (option.ready ? .025 : 0)
     - (preference&&option.preferred ? .08 : 0);
   close.sort((a,b)=>score(a)-score(b)||tie(a,b));
   return {kind:'match',items:unique(close).slice(0,3),target};
 }
 const other=unique(results.sort((a,b)=>a.gap-b.gap||Number(b.preferred)-Number(a.preferred)||tie(a,b)));
 if(other.length){
   const above=other.find(x=>x.grams>target), below=other.find(x=>x.grams<target);
   return {kind:'near',items:above&&below?[above,below].sort((a,b)=>a.gap-b.gap):other.slice(0,2),target};
 }
 return {kind:eligible.length?'size':'none',items:[],target};
}
export function cartTotals(lines, method){
 const subtotal=lines.reduce((n,[p,q])=>n+p.price*q,0);
 const shipping=method==='pickup'||subtotal===0||subtotal>=1000?0:89;
 return {subtotal,shipping,total:subtotal+shipping};
}
