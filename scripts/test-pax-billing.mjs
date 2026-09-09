import { build } from 'esbuild';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const result = await build({entryPoints:['lib/pax-billing.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),m,m.exports);
const {paxNight,regeneratePaxBilling}=m.exports;
const data={ratePlans:[{id:'p',code:'BAR',active:true}],calendar:{'2026-09-09':'s'},validity:[{rateSetupId:'p',active:true,from:'2026-01-01',to:'2026-12-31',seasonalRates:{SPK:{s:{amount:210,basePax:2,extraAdult:20,extraChild:10}}},inclusiveElements:['a','c']}],elements:[{id:'a',name:'Breakfast Adult',basis:'Per Person',amount:10,active:true,postingRhythm:'Daily'},{id:'c',name:'Breakfast Child',basis:'Per Person',amount:5,active:true,postingRhythm:'Daily'}]};
for(const [adults,children,total,food] of [[1,1,210,15],[2,1,220,25],[0,2,210,10],[0,3,220,15],[1,0,210,10],[3,0,230,30]]){
 const r=paxNight({code:'SPK',count:1,adults,children},'2026-09-09',data);assert.equal(r.total,total);assert.equal(r.elements.reduce((s,e)=>s+e.amount,0),food);
}
data.elements[0].basis='Flat Rate';assert.equal(paxNight({code:'SPK',adults:5,children:0},'2026-09-09',data).elements[0].amount,10);
const b=regeneratePaxBilling({arrival:'2026-09-09',departure:'2026-09-10',rooms:[{code:'SPK',count:1,adults:2,children:1}]},data);assert.equal(b.amount,220);assert.equal(b.billingSchedule.length,1);
console.log('Six adult/child scenarios, flat elements, checkout exclusion and regeneration passed.');
