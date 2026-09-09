import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import assert from 'node:assert/strict';

const result = await build({entryPoints:['components/historical-forecast-report.tsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic'});
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
const html = renderToStaticMarkup(React.createElement(module.exports.HistoricalForecastReport,{bookings,hotelMasters,from:'2026-09-09',to:'2026-09-09',onFrom:()=>{},onTo:()=>{},onBack:()=>{}}));
for (const value of ['Hotel Historical &amp; Forecast Report','Hotel Date','A/C','Forecast Total','Grand Total:','4/2']) assert.ok(html.includes(value), value);
assert.ok(!html.includes('No Of Adult'), 'old adult header should be replaced');
console.log('Historical forecast report renders A/C counts and totals.');
