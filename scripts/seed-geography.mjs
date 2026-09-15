import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const connection = process.env.DATABASE_URL;
if (!connection) {
  console.error('Set DATABASE_URL (your Neon connection string) before seeding.');
  process.exit(1);
}

const file = process.argv[2] ?? 'scripts/geography.json';
const source = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json';

if (!existsSync(file)) {
  console.log(`Downloading ${source} ...`);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

const data = JSON.parse(readFileSync(file, 'utf8'));
const host = new URL(connection).hostname.replace(/-pooler$/, '');
const endpoint = `https://${host}/sql`;

async function run(query, params = []) {
  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': connection,
      'Neon-Array-Mode': 'true',
      'Neon-Raw-Text-Output': 'true',
    },
    body: JSON.stringify({ query, params }),
  });
  if (!response.ok) throw new Error(`Neon ${response.status}: ${await response.text()}`);
  return response.json();
}

async function insertRows(table, columns, rows, chunk = 500) {
  for (let start = 0; start < rows.length; start += chunk) {
    const slice = rows.slice(start, start + chunk);
    const values = slice
      .map((_, row) => `(${columns.map((__, col) => `$${row * columns.length + col + 1}`).join(', ')})`)
      .join(', ');
    await run(`INSERT INTO public.${table} (${columns.join(', ')}) VALUES ${values} ON CONFLICT DO NOTHING`, slice.flat());
    process.stdout.write(`\r${table}: ${Math.min(start + chunk, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

console.log('Clearing existing geography ...');
await run('DELETE FROM public.hotelx_city');
await run('DELETE FROM public.hotelx_state');
await run('DELETE FROM public.hotelx_country');

const states = [];
const cities = [];
for (const country of data) {
  for (const state of country.states ?? []) {
    const stateCode = String(state.iso3166_2 || state.iso2 || state.id);
    states.push([country.iso2, stateCode, state.name]);
    for (const city of state.cities ?? []) cities.push([country.iso2, stateCode, city.name]);
  }
}

await insertRows('hotelx_country', ['code', 'name', 'nationality', 'phonecode'], data.map((country) => [country.iso2, country.name, country.nationality ?? '', String(country.phonecode ?? '')]));
await insertRows('hotelx_state', ['country_code', 'code', 'name'], states);
await insertRows('hotelx_city', ['country_code', 'state_code', 'name'], cities);
console.log(`Done: ${data.length} countries, ${states.length} states, ${cities.length} cities.`);
