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

export const initialRateElements: RateElementItem[] = [
  ['Banquet Drink', 'Per Person', 1, 4, 2],
  ['Banquet Food', 'Per Person', 1, 2, 10],
  ['BBQ Dinner 2025', 'Per Person', 1, 3, 60],
  ['BBQ Dinner baru', 'Per Person', 1, 3, 60],
  ['Breakfast (Adult)', 'Per Person', 1, 2, 20],
  ['Breakfast Package', 'Per Person', 1, 4, 20],
  ['Breakfast Package Child', 'Per Person', 1, 4, 15],
  ['Breakfast Package Infant', 'Per Person', 0, 2, 0],
  ['Extra Bed', 'Per Room', 1, 1, 80],
  ['Extra Breakfast', 'Per Person', 1, 4, 25],
  ['Airport Transfer', 'Per Trip', 1, 6, 120],
  ['Welcome Drink', 'Per Person', 1, 4, 8],
  ['Late Checkout', 'Per Room', 1, 1, 100],
  ['Early Check-in', 'Per Room', 1, 1, 100],
  ['Dinner Adult', 'Per Person', 1, 4, 55],
  ['Dinner Child', 'Per Person', 1, 4, 30],
  ['Lunch Adult', 'Per Person', 1, 4, 45],
  ['Lunch Child', 'Per Person', 1, 4, 25],
  ['Spa Voucher', 'Per Person', 1, 2, 50],
  ['Laundry Credit', 'Per Room', 1, 1, 30],
  ['Minibar Credit', 'Per Room', 1, 1, 25],
  ['Parking', 'Per Vehicle', 1, 2, 10],
  ['Tourism Package', 'Per Person', 1, 4, 35],
  ['Romantic Setup', 'Per Room', 1, 1, 150],
  ['Anniversary Cake', 'Per Room', 1, 1, 80],
].map((item, index) => ({
  id: `element-${index + 1}`,
  name: String(item[0]),
  basis: String(item[1]),
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
  id: `type-${index + 1}`,
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
    updated: item[2],
    active: item[3] ?? true,
    web: item[4] ?? false,
  })),
  ...Array.from({ length: 35 }, (_, index) => ({
    id: `rate-${index + 11}`,
    code: `RATE${String(index + 11).padStart(2, '0')}`,
    description: `Hotel Rate Plan ${index + 11}`,
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
