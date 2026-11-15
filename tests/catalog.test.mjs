import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,describe,matches,recommend,cartTotals,portions} from '../assets/catalog.mjs';

const menu=initial.map(item=>describe(item,initial));
const options={people:2,portion:'dinner',pref:''};

test('240 portions and hard filter combinations preserve dietary requirements and accurate totals',()=>{
 const keys=['plant','noRaw','mild','baked'];
 let covered=0;
 for(let people=1;people<=5;people++)for(const portion of Object.keys(portions))for(let mask=0;mask<16;mask++){
   const filters={people,portion,pref:mask&1?'salmon':''};
   keys.forEach((key,i)=>filters[key]=Boolean(mask&(1<<i)));
   const {kind,items,target}=recommend(menu,filters);
   assert.equal(target,people*portions[portion]);
   assert.ok(items.length,JSON.stringify(filters));
   assert.equal(new Set(items.map(item=>item.composition)).size,items.length);
   for(const item of items){
     for(const k of ['grams','pieces','price'])
       assert.equal(item[k],item.lines.reduce((sum,[p,q])=>sum+p[k]*q,0));
     assert.ok(Math.abs(item.grams-target)*100<=target*(kind==='near'?30:15));
     for(const [p] of item.lines){
       const recipes=p.kind==='set'?p.partsDetail.map(([roll])=>roll.recipe):[p.recipe];
       if(filters.plant)for(const recipe of recipes)
         assert.ok(!recipe.some(row=>['salmon','tuna','cheese','shrimp','chicken'].includes(row.key)));
       if(filters.noRaw)assert.ok(recipes.every(recipe=>recipe.every(row=>!row.raw)));
       if(filters.mild)assert.ok(recipes.every(recipe=>recipe.every(row=>!['chili','wasabi'].includes(row.key))));
       if(filters.baked)assert.ok(p.kind==='set'?p.partsDetail.every(([roll])=>roll.baked):p.baked);
     }
   }
   covered++;
 }
 assert.equal(covered,240);
});

test('legacy plant preference and strict plant searches cannot return meat, seafood or dairy',()=>{
 for(const filters of [{...options,pref:'plant'},{...options,plant:true,pref:'shrimp'}])
   assert.ok(recommend(menu,filters).items.every(item=>item.lines.every(([p])=>p.plant)));
 assert.equal(recommend(menu.filter(p=>!p.plant),{...options,plant:true}).kind,'none');
 const edited=structuredClone(initial);
 edited.find(p=>p.id==='r4').recipe.push({key:'cheese',raw:false});
 assert.equal(describe(edited.find(p=>p.id==='s4'),edited).plant,false);
});

test('ready baked duo beats a costly exact repetition and combines with rolls for three',()=>{
 const params={...options,baked:true,mild:true,noRaw:true};
 let top=recommend(menu,params).items[0];
 assert.deepEqual([top.key,top.grams,top.pieces,top.price,top.varieties],['s3-1',560,16,519,2]);
 top=recommend(menu,{...params,people:3}).items[0];
 assert.deepEqual([top.key,top.grams,top.pieces,top.price,Math.round(top.price/3)],['s3-1.r5-1',860,24,848,283]);
 assert.equal(recommend(menu,{...params,plant:true,people:1,portion:'light'}).kind,'near');
 assert.equal(recommend([menu.find(p=>p.id==='r5')],{...params,people:1,portion:'light'}).kind,'size');
 assert.ok(!matches(menu.find(p=>p.id==='s2'),params));
});

test('cart boundary and pickup use exact amounts',()=>{
 const totals=(price,method='delivery')=>cartTotals([[{price},1]],method);
 assert.deepEqual(totals(999),{subtotal:999,shipping:89,total:1088});
 assert.deepEqual(totals(1000),{subtotal:1000,shipping:0,total:1000});
 assert.equal(totals(848,'pickup').total,848);
 assert.equal(cartTotals([],'delivery').total,0);
});
