import {initial,ingredients} from './catalog.mjs';

const productId=/^(?:[rs][1-9]\d*|local-[a-f0-9-]{36})$/;
const samplePhotos=new Set(initial.map(p=>p.img));
const rasterData=/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const record=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const integer=(value,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>0&&value<=max;
const localized=value=>Array.isArray(value)&&value.length===2&&value.every(text=>typeof text==='string'&&text.trim());

function validProduct(p){
 if(!record(p)||typeof p.id!=='string'||!productId.test(p.id)||!integer(p.price,100000))return false;
 if(!['name','desc','alt'].every(key=>localized(p[key]))||typeof p.img!=='string'||!(samplePhotos.has(p.img)||rasterData.test(p.img)))return false;
 if(p.kind==='roll')return integer(p.grams,30000)&&integer(p.pieces,300)&&typeof p.baked==='boolean'&&
   Array.isArray(p.recipe)&&p.recipe.length>0&&p.recipe.every(r=>record(r)&&typeof r.key==='string'&&Object.hasOwn(ingredients,r.key)&&typeof r.raw==='boolean');
 if(p.kind!=='set'||!record(p.parts))return false;
 const parts=Object.entries(p.parts);
 return parts.length>0&&parts.every(([id,qty])=>productId.test(id)&&integer(qty,20));
}

export function readSavedState(data){
 if(!record(data)||!Array.isArray(data.menu)||!record(data.cart)||!['pickup','delivery'].includes(data.method))return null;
 const products=new Map();
 for(const product of data.menu){
   if(validProduct(product)&&!products.has(product.id))products.set(product.id,product);
 }
 const menu=[...products.values()].filter(p=>p.kind==='roll'||Object.keys(p.parts).every(id=>products.get(id)?.kind==='roll'));
 const ids=new Set(menu.map(p=>p.id));
 const cart=Object.fromEntries(Object.entries(data.cart).filter(([id,qty])=>ids.has(id)&&integer(qty)));
 return {menu,cart,method:data.method};
}
