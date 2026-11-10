'use client';

// Reads the operator's yearly speedboat schedule (.xlsx) in the browser:
// a stored/deflated ZIP (native DecompressionStream) holding zipped XML, where
// each monthly sheet lists date blocks with a direction label per column
// ("To Mersing" / "To Rawa") and departure times beneath each column.

export type ImportedDay = { date: string; routeId: string; times: string[] };

export type ImportedMonth = {
  sheet: string;
  days: { date: string; toMersing: string[]; toRawa: string[] }[];
};

export type ScheduleParseResult = {
  months: ImportedMonth[];
  dates: number;
  departures: number;
};

const MERSING = 'to mersing';
const RAWA = 'to rawa';

async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 66000; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This file is not a valid .xlsx workbook.');
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, { method: number; size: number; offset: number }>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, { method, size: compressed, offset: localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  const files = new Map<string, Uint8Array>();
  for (const [name, entry] of entries) {
    if (!/\.(xml|rels)$/.test(name)) continue;
    const local = entry.offset;
    const nameLength = view.getUint16(local + 26, true);
    const extraLength = view.getUint16(local + 28, true);
    const start = local + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + entry.size);
    if (entry.method === 0) {
      files.set(name, data);
      continue;
    }
    if (entry.method !== 8) continue;
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    files.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  return files;
}

export async function parseScheduleWorkbook(buffer: ArrayBuffer): Promise<ScheduleParseResult> {
  const files = await unzip(buffer);
  const decoder = new TextDecoder();
  const text = (name: string) => {
    const data = files.get(name);
    if (!data) throw new Error(`Workbook part missing: ${name}`);
    return decoder.decode(data);
  };
  const doc = (name: string) => new DOMParser().parseFromString(text(name), 'application/xml');

  const workbook = doc('xl/workbook.xml');
  const rels = doc('xl/_rels/workbook.xml.rels');
  const targets = new Map<string, string>();
  for (const rel of Array.from(rels.getElementsByTagName('Relationship'))) {
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (id && target) targets.set(id, target.replace(/^\//, '').replace(/^xl\//, ''));
  }
  const sharedDoc = doc('xl/sharedStrings.xml');
  const shared = Array.from(sharedDoc.getElementsByTagName('si')).map((si) =>
    Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''),
  );

  const serialToDate = (serial: number) => {
    const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
    return new Date(utc).toISOString().slice(0, 10);
  };
  const normalizeTime = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    return '';
  };
  const isTime = (raw: string) => {
    const value = normalizeTime(raw);
    if (!value) return false;
    const [h, m] = value.split(':').map(Number);
    return h < 24 && m < 60;
  };

  const months: ImportedMonth[] = [];
  let dateCount = 0;
  let departureCount = 0;

  for (const sheet of Array.from(workbook.getElementsByTagName('sheet'))) {
    const name = sheet.getAttribute('name') ?? '';
    const relId = sheet.getAttribute('r:id') ?? sheet.getAttribute('id') ?? '';
    const target = targets.get(relId);
    if (!target) continue;
    const sheetDoc = doc(`xl/${target}`);
    const cells = new Map<string, { col: string; row: number; value: string }>();
    for (const cell of Array.from(sheetDoc.getElementsByTagName('c'))) {
      const ref = cell.getAttribute('r') ?? '';
      const match = /^([A-Z]+)(\d+)$/.exec(ref);
      if (!match) continue;
      const type = cell.getAttribute('t');
      const v = cell.getElementsByTagName('v')[0]?.textContent ?? '';
      const value = type === 's' ? shared[Number(v)] ?? '' : v;
      if (!value.trim()) continue;
      cells.set(ref, { col: match[1], row: Number(match[2]), value: value.trim() });
    }

    const rows = new Map<number, Map<string, string>>();
    for (const cell of cells.values()) {
      if (!rows.has(cell.row)) rows.set(cell.row, new Map());
      rows.get(cell.row)!.set(cell.col, cell.value);
    }
    const isDateCell = (value: string) => {
      if (!/^\d{5}$/.test(value)) return false;
      const numeric = Number(value);
      return numeric > 45000 && numeric < 48000;
    };
    const dayMap = new Map<string, { date: string; toMersing: string[]; toRawa: string[] }>();
    const state = new Map<string, { date: string; direction: 'toMersing' | 'toRawa'; times: string[] }>();
    const flushAll = () => {
      for (const item of state.values()) {
        if (!item.times.length) continue;
        const day = dayMap.get(item.date) ?? { date: item.date, toMersing: [], toRawa: [] };
        if (item.direction === 'toMersing') day.toMersing.push(...item.times);
        else day.toRawa.push(...item.times);
        dayMap.set(item.date, day);
      }
      state.clear();
    };
    let dateColumns: { col: string; date: string }[] = [];
    const sortedRows = [...rows.keys()].sort((a, b) => a - b);
    for (const rowNumber of sortedRows) {
      const row = rows.get(rowNumber)!;
      const cols = [...row.keys()].sort((a, b) => a.localeCompare(b));
      const dateCols = cols.filter((col) => isDateCell(row.get(col)!));
      if (dateCols.length >= 2) {
        flushAll();
        dateColumns = dateCols.map((col) => ({ col, date: serialToDate(Number(row.get(col))) }));
      }
      for (const col of cols) {
        const lower = row.get(col)!.toLowerCase();
        if (lower !== MERSING && lower !== RAWA) continue;
        const match = dateColumns.filter((item) => item.col <= col).pop() ?? dateColumns[0];
        if (!match) continue;
        state.set(col, {
          date: match.date,
          direction: lower === MERSING ? 'toMersing' : 'toRawa',
          times: [],
        });
      }
      for (const col of cols) {
        const item = state.get(col);
        if (!item) continue;
        if (isTime(row.get(col)!)) item.times.push(normalizeTime(row.get(col)!));
      }
    }
    flushAll();
    const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (!days.length) continue;
    for (const day of days) {
      dateCount += 1;
      departureCount += day.toMersing.length + day.toRawa.length;
    }
    months.push({ sheet: name, days });
  }

  if (!months.length) throw new Error('No schedule dates were found in this workbook.');
  return { months, dates: dateCount, departures: departureCount };
}
