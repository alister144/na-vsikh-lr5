import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initial} from '../assets/catalog.mjs';
import {readSavedState} from '../assets/storage.mjs';

test('keeps existing catalogue edits, order, and valid cart quantities',()=>{
 const menu=structuredClone(initial);
 menu[0].name[0]='<img src=x onerror=alert(1)>';
 menu[0].img='data:image/webp;base64,AAAA';
 const custom={...menu[0],id:'local-01234567-89ab-4def-8123-456789abcdef'};
 menu.push(custom);
 const saved={menu,cart:{r1:2,[custom.id]:1},method:'pickup'};
 assert.deepEqual(readSavedState(saved),saved);
});

test('quarantines forged fields, unsafe identifiers, and sets with invalid contents',()=>{
 const menu=structuredClone(initial);
 menu.find(p=>p.id==='r7').price='123"><img src=x onerror=alert(1)>';
 menu.find(p=>p.id==='r8').recipe=[{key:'constructor',raw:false}];
 menu.push({...menu[0],id:'r9" onclick="alert(1)'}, {...menu[0],id:'r10',img:'data:image/svg+xml;base64,AAAA'});
 const saved={menu,cart:{r4:3,r7:1,s4:2,r1:'1'},method:'delivery'};
 const clean=readSavedState(saved);
 assert.deepEqual(clean.menu.map(p=>p.id),['r1','r2','r3','r4','r5','r6','s1','s2','s3','s5']);
 assert.deepEqual(clean.cart,{r4:3});
 assert.equal(readSavedState({...saved,cart:[]}),null);
});
