export type RateSeason = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type RateElementItem = {
  id: string;
  name: string;
  basis: string;
  postingRhythm: 'Daily' | 'First Night' | 'Last Night';
  min: number;
  max: number;
  amount: number;
  active: boolean;
};

export type RateTypeItem = {
  id: string;
  name: string;
  active: boolean;
};

export type RatePlanItem = {
  id: string;
  code: string;
  description: string;
  rateTypeId: string;
  rateFrequency: 'Daily' | 'Monthly';
  updated: string;
  active: boolean;
  web?: boolean;
};

export type RateValidityItem = {
  id: string;
  rateSetupId: string;
  from: string;
  to: string;
  active: boolean;
  seasonalRates?: Record<string, Record<string, { amount: number; t1: number; t2: number; t3: number }>>;
};

export type RateSetupData = {
  seasons: RateSeason[];
  calendar: Record<string, string>;
  elements: RateElementItem[];
  rateTypes: RateTypeItem[];
  ratePlans: RatePlanItem[];
  validity: RateValidityItem[];
};

export const initialRateSeasons: RateSeason[] = [
  { id: 'non-peak', name: 'Non Peak', color: '#25ef1a', active: true },
  { id: 'peak', name: 'Peak', color: '#ed0000', active: true },
  { id: 'super-peak', name: 'Super Peak', color: '#2341dc', active: true },
  { id: 'public-holidays', name: 'Public Holidays', color: '#2bb3a6', active: true },
];

const initialRateElementIds = [
  'fab777fa-7181-4b7c-9829-ed115152a0e1', '8f9358c9-58dc-4fba-be17-81c8c960bec4', '2927a65d-9737-47d4-a2d4-8f39dd33a232', '0756f229-3f94-4f6e-bc98-d1615e10038a', 'c8eeabfd-de23-4dee-ba34-65f4a2238e28',
  'edb73a4c-cd96-4e7b-8f50-a375be52e806', '515a379b-24dc-4732-bb4a-4c5a677bbcf4', '52011b11-db65-4b78-a83b-8517a7397932', 'b14d8974-f269-40dd-8a20-274dc9652898', '032d4a59-84e7-4777-bbcb-d656dba7ebba',
  'd3c5e31d-8eab-44c2-a677-3c6e2ddb115e', 'a0fbfbb2-c66c-4bd9-88b1-23d569f32341', 'fd6fa3f5-9490-42a0-81fc-28884ccc182b', 'f03b8f65-219b-4983-95f3-6f9afdd375e1', '3be482fd-481d-48db-8f96-a41c90887cda',
  '906d01cc-04cd-47e2-b16c-be98fde9044d', '9db17fc3-d9c0-4625-b289-de9940ff57a1', 'd0fb958d-de84-42e4-9f38-0b7495471589', 'bf42a61e-6b69-4045-b6bb-30d093bd7f52', '1bdc30dc-c1fb-4733-bb11-92c58a5891ee',
  '3a54db56-ae07-462c-84b5-31137683681b', 'bd7d02d2-8c89-4523-a64f-beae3d0f4d6a', 'e35707c6-1666-4d8a-840e-a937561f7bc4', '3edbbadb-1251-4d84-bded-e16460abd4bc', 'e699c744-5c6c-4b4f-a761-364f0161bb36',
];

export const initialRateElements: RateElementItem[] = [
  ['Banquet Drink', 'Per Person', 1, 4, 2],
  ['Banquet Food', 'Per Person', 1, 2, 10],
  ['BBQ Dinner 2025', 'Per Person', 1, 3, 60],
  ['BBQ Dinner baru', 'Per Person', 1, 3, 60],
  ['Breakfast (Adult)', 'Per Person', 1, 2, 20],
  ['Breakfast Package', 'Per Person', 1, 4, 20],
  ['Breakfast Package Child', 'Per Person', 1, 4, 15],
  ['Breakfast Package Infant', 'Per Person', 0, 2, 0],
  ['Extra Bed', 'Flat Rate', 1, 1, 80],
  ['Extra Breakfast', 'Per Person', 1, 4, 25],
  ['Airport Transfer', 'Flat Rate', 1, 6, 120],
  ['Welcome Drink', 'Per Person', 1, 4, 8],
  ['Late Checkout', 'Flat Rate', 1, 1, 100],
  ['Early Check-in', 'Flat Rate', 1, 1, 100],
  ['Dinner Adult', 'Per Person', 1, 4, 55],
  ['Dinner Child', 'Per Person', 1, 4, 30],
  ['Lunch Adult', 'Per Person', 1, 4, 45],
  ['Lunch Child', 'Per Person', 1, 4, 25],
  ['Spa Voucher', 'Per Person', 1, 2, 50],
  ['Laundry Credit', 'Flat Rate', 1, 1, 30],
  ['Minibar Credit', 'Flat Rate', 1, 1, 25],
  ['Parking', 'Flat Rate', 1, 2, 10],
  ['Tourism Package', 'Per Person', 1, 4, 35],
  ['Romantic Setup', 'Flat Rate', 1, 1, 150],
  ['Anniversary Cake', 'Flat Rate', 1, 1, 80],
].map((item, index) => ({
  id: initialRateElementIds[index],
  name: String(item[0]),
  basis: String(item[1]),
  postingRhythm: 'Daily',
  min: Number(item[2]),
  max: Number(item[3]),
  amount: Number(item[4]),
  active: true,
}));

const rateTypeNames = [
  'BAR', 'COMP', 'Corp1', 'Monthly - Trillion', 'BEST AVAILABLE RATE',
  'Corporate', 'Government', 'Citto Inn', 'House Use', 'Long Stay',
  'Member Rate', 'Online Travel Agent', 'Package Rate', 'Promotion', 'Rack Rate',
  'Staff Rate', 'Travel Agent', 'Walk In', 'Weekend Rate', 'Wholesale',
];

export const initialRateTypes: RateTypeItem[] = rateTypeNames.map((name, index) => ({
  id: `a1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name,
  active: true,
}));

const firstRatePlans: Array<[string, string, string, boolean?, boolean?]> = [
  ['DU', 'DAYUSE', '10 Feb 2021'],
  ['BAR', 'BEST AVAILABLE RATE 2021', '25 Mar 2024'],
  ['Special Rate', 'Special Rate', '26 Jun 2025', false],
  ['COMP', 'COMPLIMENTARY', '27 Jan 2026'],
  ['HU', 'HOUSEUSE', '27 Sep 2022'],
  ['Promo With BF', 'Promotion Rate W Breakfast', '01 Feb 2023', true, true],
  ['Boss friends promo rate', 'Boss friends', '26 Jun 2025', false],
  ['CORP', 'Corporate Rate', '23 Jul 2026'],
  ['GOV', 'Government Rate', '23 Jul 2026'],
  ['OTA', 'Online Travel Agent Rate', '19 Aug 2026', true, true],
];

export const initialRatePlans: RatePlanItem[] = [
  ...firstRatePlans.map((item, index) => ({
    id: `rate-${index + 1}`,
    code: item[0],
    description: item[1],
    rateTypeId: initialRateTypes.find((type) => type.name === item[0])?.id ?? initialRateTypes[0].id,
    rateFrequency: 'Daily',
    updated: item[2],
    active: item[3] ?? true,
    web: item[4] ?? false,
  })),
  ...Array.from({ length: 35 }, (_, index) => ({
    id: `rate-${index + 11}`,
    code: `RATE${String(index + 11).padStart(2, '0')}`,
    description: `Hotel Rate Plan ${index + 11}`,
    rateTypeId: initialRateTypes[0].id,
    rateFrequency: 'Daily',
    updated: index % 3 === 0 ? '27 Aug 2026' : index % 3 === 1 ? '19 Aug 2026' : '23 Jul 2026',
    active: index % 9 !== 0,
    web: index % 7 === 0,
  })),
];

const initialCalendar: Record<string, string> = {};
for (let day = 1; day <= 30; day += 1) {
  initialCalendar[`2026-09-${String(day).padStart(2, '0')}`] = 'non-peak';
}

export const initialRateSetupData: RateSetupData = {
  seasons: initialRateSeasons,
  calendar: initialCalendar,
  elements: initialRateElements,
  rateTypes: initialRateTypes,
  ratePlans: initialRatePlans,
  validity: [],
};
