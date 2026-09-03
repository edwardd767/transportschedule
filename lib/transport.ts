export type Group = { id: string; reference: string; name: string; adults: number; children: number; boarded: boolean };
export type Trip = { id: string; date: string; time: string; direction: 'inbound' | 'outbound'; boat: string; capacity: number; status: 'Scheduled' | 'Boarding' | 'Delayed' | 'Cancelled' | 'Completed'; groups: Group[] };
// Customer's August 2026 schedule. Each opposite-direction departure is 45 minutes
// after its paired departure. These are separate trips, not arrival times.
const august: Record<number, string[]> = {
  1: ['08:30','09:15','10:45','12:15','13:45','16:00'], 2: ['09:30','11:00','12:30','14:00','16:00'], 3: ['09:30','11:00','12:30','14:00','16:00'], 4: ['10:00','11:30','13:00','14:30'], 5: ['10:30','12:00','13:30'], 6: ['11:30','13:00','14:30'], 7: ['07:15','12:00','13:30','15:00'], 8: ['08:30','09:15','10:45','12:15','13:45','15:15'], 9: ['08:30','09:15','10:45','12:15','13:45','15:15'], 10: ['08:45','10:15','11:45'], 11: ['08:30','09:15','10:45','12:15'], 12: ['08:15','09:45','11:15','12:45'], 13: ['08:45','10:15','11:45','13:15'], 14: ['08:45','10:15','11:45','13:15'], 15: ['08:30','09:15','10:45','12:15','13:45'], 16: ['09:00','10:30','12:00','13:30'], 17: ['10:45','12:15','13:45'], 18: ['10:45','12:15','13:45'], 19: ['10:00','11:30','13:00','14:30'], 20: ['08:15','09:45','11:15','12:45','14:15'], 21: ['08:15','09:45','11:15','12:45','14:15'], 22: ['08:15','09:45','11:15','12:45','14:15'], 23: ['08:30','09:15','10:45','12:15'], 24: ['08:15','09:45','11:15'], 25: ['08:45','10:15','11:45'], 26: ['08:45','10:15','11:45'], 27: ['08:30','09:15','10:45','12:15'], 28: ['08:30','09:15','10:45','12:15'], 29: ['08:30','09:15','10:45','12:15'], 30: ['08:15','09:45','11:15','12:45'], 31: ['08:15','09:45','11:15','12:45'],
};
export function addMinutes(time: string, minutes: number) { const [h,m]=time.split(':').map(Number); const total=h*60+m+minutes; return `${Math.floor(total/60).toString().padStart(2,'0')}:${(total%60).toString().padStart(2,'0')}`; }
export function countPassengers(trip: Trip) { return trip.groups.reduce((n,g)=>n+g.adults+g.children,0); }
export function addGroupToTrip(trip: Trip, group: Group): Trip {
  if (trip.status==='Cancelled'||trip.status==='Completed') throw new Error('This trip is closed to new passengers.');
  if (!group.name.trim() || !group.reference.trim()) throw new Error('Enter a lead guest and reservation reference.');
  if (!Number.isInteger(group.adults)||!Number.isInteger(group.children)||group.adults<1||group.children<0) throw new Error('Enter at least one adult and a valid whole number of children.');
  if (countPassengers(trip)+group.adults+group.children>trip.capacity) throw new Error(`Only ${trip.capacity-countPassengers(trip)} seats remain on this trip.`);
  if (trip.groups.some(g=>g.reference.trim().toLowerCase()===group.reference.trim().toLowerCase())) throw new Error('This reservation already has passengers on this trip.');
  return {...trip,groups:[...trip.groups,{...group,name:group.name.trim(),reference:group.reference.trim()}]};
}
export function addTrip(trips: Trip[], trip: Trip): Trip[] {
  const validDate=new Date(`${trip.date}T12:00:00`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(trip.date)||Number.isNaN(validDate.getTime())||moveDate(trip.date,0)!==trip.date) throw new Error('Choose a valid departure date.');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(trip.time)) throw new Error('Choose a valid departure time.');
  if(!Number.isInteger(trip.capacity)||trip.capacity<1) throw new Error('Enter a valid seat capacity.');
  const minute=(time:string)=>{const [h,m]=time.split(':').map(Number);return h*60+m;};
  if(minute(trip.time)<420||minute(trip.time)+45>1140) throw new Error('Choose a departure from 07:00 to 18:15 to allow up to 45 minutes before daytime service ends.');
  if(trips.some(t=>t.date===trip.date&&t.boat===trip.boat&&t.status!=='Cancelled'&&Math.abs(minute(t.time)-minute(trip.time))<45)) throw new Error('This boat is already assigned within 45 minutes of that departure. Choose another boat or time.');
  return [...trips,trip];
}
export function moveDate(date: string, days: number) { const d=new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function formatDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
const demoNames=['Daniel Tan','Aisha Rahman','James Wilson','Mei Lin','Sofia Ahmad','Oliver Lee','Priya Kumar','Amir Hassan'];
export const initialTrips: Trip[]=Object.entries(august).flatMap(([day,times])=>times.flatMap((time,index)=>[0,1].map(leg=>{
  const id=`TR${day.padStart(2,'0')}${String(index*2+leg+1).padStart(2,'0')}`;
  const demo=Number(day)===3; const count=demo?[12,8,16,6,10,14,9,4,7,5][index*2+leg]:0;
  const groups: Group[]=[]; let remaining=count; let g=0;
  while(remaining>0) { const n=Math.min(remaining,g===0?4:3); groups.push({id:`${id}-${g}`,reference:`DEMO-${100+index*10+leg*5+g}`,name:demoNames[(index*2+leg+g)%demoNames.length],adults:n>2?n-1:n,children:n>2?1:0,boarded:false}); remaining-=n; g++; }
  return {id,date:`2026-08-${day.padStart(2,'0')}`,time:leg?addMinutes(time,45):time,direction:leg?'outbound':'inbound',boat:`Rawa ${String(index%2+1).padStart(2,'0')}`,capacity:16,status:demo&&index===0&&leg===0?'Boarding':'Scheduled',groups} as Trip;
})));
