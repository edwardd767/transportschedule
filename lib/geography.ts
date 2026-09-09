export type Geography = { countries: string[]; states: Record<string, string[]>; cities: Record<string, string[]> };

export const geography: Geography = {
  countries: ['Malaysia', 'Singapore', 'Thailand', 'Indonesia', 'Brunei', 'Australia', 'China', 'India', 'Japan', 'South Korea', 'United Kingdom', 'United States'],
  states: {
    Malaysia: ['Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'],
    Singapore: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'], Thailand: ['Bangkok', 'Chiang Mai', 'Phuket', 'Chon Buri'], Indonesia: ['Bali', 'Jakarta', 'West Java', 'East Java'],
  },
  cities: {
    'Malaysia|Johor': ['Johor Bahru', 'Mersing', 'Batu Pahat', 'Kluang'], 'Malaysia|Kedah': ['Alor Setar', 'Sungai Petani'], 'Malaysia|Kelantan': ['Kota Bharu'], 'Malaysia|Kuala Lumpur': ['Kuala Lumpur'], 'Malaysia|Melaka': ['Melaka'], 'Malaysia|Negeri Sembilan': ['Seremban'], 'Malaysia|Pahang': ['Kuantan', 'Cameron Highlands'], 'Malaysia|Penang': ['George Town', 'Butterworth'], 'Malaysia|Perak': ['Ipoh', 'Taiping'], 'Malaysia|Perlis': ['Kangar'], 'Malaysia|Putrajaya': ['Putrajaya'], 'Malaysia|Sabah': ['Kota Kinabalu', 'Sandakan', 'Tawau'], 'Malaysia|Sarawak': ['Kuching', 'Miri', 'Sibu'], 'Malaysia|Selangor': ['Petaling Jaya', 'Shah Alam', 'Subang Jaya', 'Klang'], 'Malaysia|Terengganu': ['Kuala Terengganu'],
    'Singapore|Central Region': ['Singapore'], 'Singapore|East Region': ['Bedok'], 'Singapore|North Region': ['Woodlands'], 'Singapore|North-East Region': ['Hougang'], 'Singapore|West Region': ['Jurong'],
    'Thailand|Bangkok': ['Bangkok'], 'Thailand|Chiang Mai': ['Chiang Mai'], 'Thailand|Phuket': ['Phuket'], 'Thailand|Chon Buri': ['Pattaya'], 'Indonesia|Bali': ['Denpasar'], 'Indonesia|Jakarta': ['Jakarta'], 'Indonesia|West Java': ['Bandung'], 'Indonesia|East Java': ['Surabaya'],
  },
};
