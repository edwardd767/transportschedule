export type CountryEntry = { code: string; name: string; nationality: string };
export type StateEntry = { countryCode: string; code: string; name: string };

export type Geography = {
  countries: string[];
  states: Record<string, string[]>;
  cities: Record<string, string[]>;
  nationalities: string[];
  loadCities: (country: string, state: string) => void;
};

export const fallbackGeography: Geography = {
  countries: ['Malaysia', 'Singapore', 'Thailand', 'Indonesia', 'Brunei', 'Australia', 'China', 'India', 'Japan', 'South Korea', 'United Kingdom', 'United States'],
  states: {
    Malaysia: ['Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'],
    Singapore: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
    Thailand: ['Bangkok', 'Chiang Mai', 'Phuket', 'Chon Buri'],
    Indonesia: ['Bali', 'Jakarta', 'West Java', 'East Java'],
  },
  cities: {
    'Malaysia|Johor': ['Johor Bahru', 'Mersing', 'Batu Pahat', 'Kluang'],
    'Malaysia|Kedah': ['Alor Setar', 'Sungai Petani'],
    'Malaysia|Kelantan': ['Kota Bharu'],
    'Malaysia|Kuala Lumpur': ['Kuala Lumpur'],
    'Malaysia|Melaka': ['Melaka'],
    'Malaysia|Negeri Sembilan': ['Seremban'],
    'Malaysia|Pahang': ['Kuantan', 'Cameron Highlands'],
    'Malaysia|Penang': ['George Town', 'Butterworth'],
    'Malaysia|Perak': ['Ipoh', 'Taiping'],
    'Malaysia|Perlis': ['Kangar'],
    'Malaysia|Putrajaya': ['Putrajaya'],
    'Malaysia|Sabah': ['Kota Kinabalu', 'Sandakan', 'Tawau'],
    'Malaysia|Sarawak': ['Kuching', 'Miri', 'Sibu'],
    'Malaysia|Selangor': ['Petaling Jaya', 'Shah Alam', 'Subang Jaya', 'Klang'],
    'Malaysia|Terengganu': ['Kuala Terengganu'],
    'Singapore|Central Region': ['Singapore'],
    'Singapore|East Region': ['Bedok'],
    'Singapore|North Region': ['Woodlands'],
    'Singapore|North-East Region': ['Hougang'],
    'Singapore|West Region': ['Jurong'],
    'Thailand|Bangkok': ['Bangkok'],
    'Thailand|Chiang Mai': ['Chiang Mai'],
    'Thailand|Phuket': ['Phuket'],
    'Thailand|Chon Buri': ['Pattaya'],
    'Indonesia|Bali': ['Denpasar'],
    'Indonesia|Jakarta': ['Jakarta'],
    'Indonesia|West Java': ['Bandung'],
    'Indonesia|East Java': ['Surabaya'],
  },
  nationalities: [
    'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentinian', 'Armenian', 'Australian', 'Austrian',
    'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese',
    'Bolivian', 'Bosnian', 'Botswanan', 'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe', 'Burmese', 'Burundian',
    'Cambodian', 'Cameroonian', 'Canadian', 'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese', 'Colombian', 'Comoran',
    'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djiboutian', 'Dominican', 'Dutch',
    'Ecuadorian', 'Egyptian', 'Emirati', 'Equatorial Guinean', 'Eritrean', 'Estonian', 'Ethiopian', 'Fijian', 'Filipino', 'Finnish',
    'French', 'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Grenadian', 'Guatemalan', 'Guinean',
    'Guyanese', 'Haitian', 'Honduran', 'Hong Konger', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi',
    'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakh', 'Kenyan', 'Kuwaiti',
    'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Liechtensteiner', 'Lithuanian', 'Luxembourger', 'Macanese',
    'Macedonian', 'Malagasy', 'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Mauritanian', 'Mauritian', 'Mexican',
    'Moldovan', 'Monacan', 'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican', 'Namibian', 'Nepalese', 'New Zealander', 'Nicaraguan',
    'Nigerian', 'Nigerien', 'North Korean', 'Norwegian', 'Omani', 'Pakistani', 'Palestinian', 'Panamanian', 'Papua New Guinean', 'Paraguayan',
    'Peruvian', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Samoan', 'Saudi', 'Senegalese',
    'Serbian', 'Seychellois', 'Sierra Leonean', 'Singaporean', 'Slovak', 'Slovenian', 'Somali', 'South African', 'South Korean', 'Spanish',
    'Sri Lankan', 'Sudanese', 'Surinamese', 'Swazi', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian',
    'Thai', 'Togolese', 'Tongan', 'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Ugandan', 'Ukrainian', 'Uruguayan',
    'Uzbek', 'Vanuatuan', 'Venezuelan', 'Vietnamese', 'Yemeni', 'Zambian', 'Zimbabwean',
  ],
  loadCities: () => {},
};
