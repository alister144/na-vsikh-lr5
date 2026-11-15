import {initial,ingredients,describe} from './catalog.mjs';

export function mountAdmin({view,t,L,esc,heading,money,img,say,menu,products,update}){
 let editing=null;
 let refreshAfterDialog=false;
 const samplePhotos=initial.map(p=>p.img);
 const yn=(a,b)=>document.documentElement.lang==='uk'?a:b;
 function ask(message,onConfirm){
   const dialog=document.createElement('dialog');
   dialog.innerHTML='<h2>'+t('admin')+'</h2><p>'+esc(message)+'</p><form method="dialog" class="admin-actions"><button class="outline" value="cancel" autofocus>'+t('cancel')+'</button><button class="primary" value="confirm">'+yn('Підтвердити','Confirm')+'</button></form>';
   dialog.addEventListener('close',async ()=>{
     const confirmed=dialog.returnValue==='confirm';
     dialog.remove();
     if(confirmed)await onConfirm();
     if(refreshAfterDialog&&!editing)listing();
     refreshAfterDialog=false;
   },{once:true});
   view.append(dialog);
   dialog.showModal();
 }
 function listing(){
   editing=null;
   view.innerHTML=heading(t('admin'),t('local'))+'<div class="admin-toolbar"><button class="primary" id="new">'+t('newItem')+'</button><button class="outline" id="reset">'+t('reset')+'</button></div><ul class="admin-list">'+[...menu().values()].map(p=>'<li>'+img(p)+'<div><strong>'+esc(L(p.name))+'</strong><span>'+t(p.kind)+' · '+money(p.price)+'</span></div><div class="admin-actions"><button class="outline" data-edit="'+p.id+'">'+t('edit')+'</button><button class="outline" data-delete="'+p.id+'">'+t('remove')+'</button></div></li>').join('')+'</ul>';
   view.querySelector('#new').addEventListener('click',()=>openForm());
   view.querySelector('#reset').addEventListener('click',()=>{
     ask(t('resetAsk'),async ()=>{const error=await update(()=>structuredClone(initial));say(error||t('saved'));listing();});
   });
   view.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openForm(b.dataset.edit)));
   view.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{
     const id=b.dataset.delete;
     const original=JSON.stringify(products().find(p=>p.id===id));
     const dependencies=items=>items.filter(p=>p.kind==='set'&&p.parts[id]);
     const depsError=deps=>t('depends')+' — '+deps.map(p=>L(p.name)).join(', ');
     const deps=dependencies(products());
     if(deps.length){say(depsError(deps));return;}
     ask(t('confirmDelete'),async ()=>{
       const error=await update(items=>{
         if(JSON.stringify(items.find(p=>p.id===id))!==original)return t('editConflict');
         const latest=dependencies(items);
         if(latest.length)return depsError(latest);
         return items.filter(p=>p.id!==id);
       });
       if(error)say(error);
       listing();
     });
   }));
 }
 function openForm(id){
   const p=products().find(x=>x.id===id);
   const baseline=JSON.stringify(p);
   editing=p?structuredClone(p):{id:'local-'+crypto.randomUUID(),kind:'roll',price:'',grams:'',pieces:8,baked:false,img:'',recipe:[],parts:{},name:['',''],desc:['',''],alt:['','']};
   view.innerHTML=heading(id?t('edit'):t('newItem'),t('local'))+'<form id="editor" class="editor"><div class="admin-fields">'+field('productType','<select name="kind"'+(id?' disabled':'')+'><option value="roll">'+t('roll')+'</option><option value="set"'+(editing.kind==='set'?' selected':'')+'>'+t('set')+'</option></select>')+
   field('price','<input name="price" type="number" min="1" max="100000" step="1" required value="'+editing.price+'">')+
   ['name','description','alt'].map((label)=>['UA','EN'].map((code,i)=>{
     const key=label==='description'?'desc':label;
     return '<label>'+t(label)+' · '+code+(label==='description'?'<textarea name="'+key+i+'" required maxlength="500">'+esc(editing[key][i])+'</textarea>':'<input name="'+key+i+'" required maxlength="120" value="'+esc(editing[key][i])+'">')+'</label>';
   }).join('')).join('')+
   field('photo','<select name="photo"><option value="">'+t('selectPhoto')+'</option>'+samplePhotos.map((src,i)=>'<option value="'+src+'"'+(editing.img===src?' selected':'')+'>'+esc(L(initial[i].name))+'</option>').join('')+'</select>')+
   '<label>'+yn('Завантажити фото','Upload photo')+'<input name="upload" type="file" accept="image/jpeg,image/png,image/webp"></label></div><div id="photo-preview"></div><div id="recipe-area"></div><p class="form-status" role="status"></p><div class="admin-toolbar"><button class="primary">'+t('save')+'</button><button type="button" class="outline" id="cancel">'+t('cancel')+'</button></div></form>';
   const form=view.querySelector('#editor');
   const status=form.querySelector('.form-status');
   const preview=form.querySelector('#photo-preview');
   let pending=false;
   const submit=form.querySelector('button:not([type])');
   function renderPhoto(){
     preview.innerHTML=editing.img?img(editing):'';
   }
   form.elements.photo.addEventListener('change',()=>{editing.img=form.elements.photo.value;renderPhoto();});
   form.elements.upload.addEventListener('change',async()=>{
     const file=form.elements.upload.files[0];
     if(!file)return;
     if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024){status.textContent=t('pictureBad');return;}
     try{
       pending=true;
       const image=await createImageBitmap(file);
       const ratio=Math.min(1,750/Math.max(image.width,image.height));
       const c=document.createElement('canvas');
       c.width=Math.max(1,Math.round(image.width*ratio));c.height=Math.max(1,Math.round(image.height*ratio));
       c.getContext('2d').drawImage(image,0,0,c.width,c.height);
       image.close();
       if(!form.isConnected)return;
       editing.img=c.toDataURL('image/webp',.83);
       form.elements.photo.value='';
       status.textContent='';
       renderPhoto();
     }catch{if(form.isConnected)status.textContent=t('pictureBad');}
     finally{pending=false;}
   });
   form.elements.kind.addEventListener('change',()=>{editing.kind=form.elements.kind.value;renderRecipe();});
   form.querySelector('#cancel').addEventListener('click',listing);
   form.addEventListener('submit',async e=>{
     e.preventDefault();
     if(pending||submit.disabled)return;
     const data=new FormData(form);
     for(const key of ['name','desc','alt'])editing[key]=[0,1].map(i=>String(data.get(key+i)).trim());
     editing.price=Number(data.get('price'));
     if(editing.kind==='roll'){
       editing.grams=Number(data.get('grams'));editing.pieces=Number(data.get('pieces'));editing.baked=data.has('baked');
     }
     const validNumber=x=>Number.isSafeInteger(x)&&x>0;
     const validRecipe=editing.kind==='set'?Object.keys(editing.parts).length>0&&Object.entries(editing.parts).every(([p,q])=>validNumber(q)&&q<=20):
       validNumber(editing.grams)&&validNumber(editing.pieces)&&editing.grams<=30000&&editing.pieces<=300&&editing.recipe.length>0&&editing.recipe.every(r=>ingredients[r.key]);
     if(!editing.img||!validNumber(editing.price)||!validRecipe||!['name','desc','alt'].every(k=>editing[k].every(Boolean))){status.textContent=t('invalid');return;}
     const draft=structuredClone(editing);
     submit.disabled=true;
     const error=await update(items=>{
       if(p&&JSON.stringify(items.find(row=>row.id===id))!==baseline)return t('editConflict');
       if(draft.kind==='set'&&Object.keys(draft.parts).some(part=>!items.some(row=>row.id===part&&row.kind==='roll')))return t('missingRoll');
       return p?items.map(row=>row.id===id?draft:row):[...items,draft];
     });
     submit.disabled=false;
     if(!form.isConnected)return;
     if(error){status.textContent=error;if(draft.kind==='set'&&error===t('missingRoll'))renderRecipe();return;}
     say(t('saved'));
     listing();
   });
   renderPhoto();
   renderRecipe();
 }
 function field(title,control){return '<label>'+t(title)+control+'</label>';}
 function renderRecipe(){
   const zone=view.querySelector('#recipe-area');
   if(editing.kind==='roll'){
     zone.innerHTML='<div class="admin-fields metrics">'+field('weight','<input type="number" name="grams" value="'+editing.grams+'" min="1" max="30000" required>')+field('pieces','<input type="number" name="pieces" value="'+editing.pieces+'" min="1" max="300" required>')+'<label class="tick"><input type="checkbox" name="baked"'+(editing.baked?' checked':'')+'> '+t('baked')+'</label></div><h2>'+t('prep')+'</h2><div class="recipe-rows">'+editing.recipe.map((row,i)=>{
       const opts=Object.entries(ingredients).map(([key,val])=>'<option value="'+key+'"'+(key===row.key?' selected':'')+'>'+esc(L(val))+'</option>').join('');
       return '<div class="recipe-row"><select data-ing="'+i+'" aria-label="'+t('prep')+' '+(i+1)+'">'+opts+'</select>'+(ingredients[row.key][3]==='fish'?'<label class="tick"><input data-raw="'+i+'" type="checkbox"'+(row.raw?' checked':'')+'> '+t('rawFlag')+'</label>':'')+'<button type="button" class="outline" data-cut="'+i+'">'+t('remove')+'</button></div>';
     }).join('')+'</div><button type="button" class="outline" id="add-row">'+t('addIngredient')+'</button>';
     zone.querySelector('[name="grams"]').addEventListener('input',e=>editing.grams=e.target.value);
     zone.querySelector('[name="pieces"]').addEventListener('input',e=>editing.pieces=e.target.value);
     zone.querySelector('[name="baked"]').addEventListener('change',e=>editing.baked=e.target.checked);
     zone.querySelectorAll('[data-ing]').forEach(el=>el.addEventListener('change',()=>{editing.recipe[el.dataset.ing]={key:el.value,raw:false};renderRecipe();zone.querySelector('[data-ing="'+el.dataset.ing+'"]')?.focus();}));
     zone.querySelectorAll('[data-raw]').forEach(el=>el.addEventListener('change',()=>editing.recipe[el.dataset.raw].raw=el.checked));
     zone.querySelectorAll('[data-cut]').forEach(el=>el.addEventListener('click',()=>{editing.recipe.splice(Number(el.dataset.cut),1);renderRecipe();zone.querySelector('#add-row').focus();}));
     zone.querySelector('#add-row').addEventListener('click',()=>{editing.recipe.push({key:'rice',raw:false});renderRecipe();zone.querySelector('[data-ing="'+(editing.recipe.length-1)+'"]').focus();});
   }else{
     const rolls=products().filter(p=>p.kind==='roll');
     const available=rolls.filter(p=>!(p.id in editing.parts));
     zone.innerHTML='<h2>'+t('prep')+'</h2><div class="recipe-rows">'+Object.entries(editing.parts).map(([id,q])=>'<div class="recipe-row"><strong>'+esc(rolls.some(p=>p.id===id)?L(rolls.find(p=>p.id===id).name):t('notFound'))+'</strong><label>'+t('qty')+'<input data-part="'+id+'" type="number" value="'+q+'" min="1" max="20" required></label><button type="button" data-cut="'+id+'" class="outline">'+t('remove')+'</button></div>').join('')+'</div>'+(available.length?'<div class="recipe-row"><select id="part-choice" aria-label="'+t('addRoll')+'">'+available.map(p=>'<option value="'+p.id+'">'+esc(L(p.name))+'</option>').join('')+'</select><button id="part-add" type="button" class="outline">'+t('addRoll')+'</button></div>':'')+'<p id="calculated" class="spec"></p>';
     function calculate(){
       if(!Object.keys(editing.parts).length){zone.querySelector('#calculated').textContent='';return;}
       if(Object.keys(editing.parts).some(id=>!rolls.some(r=>r.id===id))){zone.querySelector('#calculated').textContent=t('missingRoll');return;}
       const p=describe(editing,rolls);
       zone.querySelector('#calculated').textContent=t('computed')+' · '+p.grams+' '+t('g')+' · '+p.pieces+' '+t('pcs')+' '+[p.baked&&t('baked'),p.hot&&t('hot'),p.raw&&t('raw'),p.plant&&t('plant')].filter(Boolean).join(' · ');
     }
     calculate();
     zone.querySelectorAll('[data-part]').forEach(el=>el.addEventListener('input',()=>{editing.parts[el.dataset.part]=Number(el.value);calculate();}));
     zone.querySelectorAll('[data-cut]').forEach(el=>el.addEventListener('click',()=>{delete editing.parts[el.dataset.cut];renderRecipe();zone.querySelector('#part-choice')?.focus();}));
     zone.querySelector('#part-add')?.addEventListener('click',()=>{const id=zone.querySelector('#part-choice').value;editing.parts[id]=1;renderRecipe();zone.querySelector('[data-part="'+id+'"]').focus();});
   }
 }
 listing();
 return {sync(){
   if(editing){say(t('draftKept'));return;}
   if(view.querySelector('dialog[open]')){refreshAfterDialog=true;return;}
   listing();
 }};
}
