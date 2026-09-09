import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import assert from 'node:assert/strict';

const result = await build({entryPoints:['components/manager-report.tsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic'});
const module = {exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);

const bookings = [{
  reference:'P1',
  guest:'Guest',
  arrival:'2026-09-09',
  departure:'2026-09-10',
  status:'Booked',
  rooms:[{code:'SPK',count:2,adults:2,children:1}],
  assignedRooms:2,
  checkedInGuests:0,
  guests:6,
  amount:500,
  segment:'Corporate',
}];
const hotelMasters = {
  profile:{hotelName:'Bird of Paradise Hotel & Resort'},
  roomTypes:[{code:'SPK',totalRoom:24,active:true}],
};
const html = renderToStaticMarkup(React.createElement(module.exports.ManagerReport,{bookings,hotelMasters,date:'2026-09-09',onDate:()=>{},onBack:()=>{}}));
for (const value of ['Manager Report','Room Statistic','NO OF GUEST','NO OF ADULT','NO OF CHILD','Corporate','Total Room Available']) assert.ok(html.toUpperCase().includes(value.toUpperCase()), value);
assert.ok(html.includes('6'), 'guest count');
assert.ok(html.includes('4'), 'adult count');
assert.ok(html.includes('2'), 'child count');
console.log('Manager report renders guest, adult and child counts from booking data.');
