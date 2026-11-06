import type { ZoneId } from '$lib/time/types';

export interface CityAlias {
  timeZone: ZoneId;
  aliases: string[];
}

// Search-only aliases; row labels derive from IANA ids.
export const CITY_ALIASES: CityAlias[] = [
  {
    timeZone: 'America/Los_Angeles',
    aliases: ['san francisco', 'sf', 'bay area', 'silicon valley', 'seattle', 'portland'],
  },
  {
    timeZone: 'America/New_York',
    aliases: [
      'nyc',
      'new york city',
      'boston',
      'washington dc',
      'washington',
      'miami',
      'atlanta',
      'philadelphia',
    ],
  },
  {
    timeZone: 'America/Chicago',
    aliases: ['chicago', 'dallas', 'houston', 'austin', 'minneapolis', 'new orleans'],
  },
  {
    timeZone: 'America/Denver',
    aliases: ['denver', 'salt lake city', 'albuquerque'],
  },
  { timeZone: 'America/Phoenix', aliases: ['phoenix', 'arizona'] },
  { timeZone: 'America/Anchorage', aliases: ['anchorage', 'alaska'] },
  { timeZone: 'Pacific/Honolulu', aliases: ['honolulu', 'hawaii'] },
  { timeZone: 'America/Toronto', aliases: ['toronto', 'montreal', 'ottawa', 'canada east'] },
  { timeZone: 'America/Vancouver', aliases: ['vancouver', 'british columbia'] },
  { timeZone: 'America/Mexico_City', aliases: ['mexico city', 'mexico'] },
  { timeZone: 'America/Bogota', aliases: ['bogota', 'colombia'] },
  { timeZone: 'America/Lima', aliases: ['lima', 'peru'] },
  { timeZone: 'America/Santiago', aliases: ['santiago', 'chile'] },
  {
    timeZone: 'America/Sao_Paulo',
    aliases: ['sao paulo', 'são paulo', 'rio de janeiro', 'brazil'],
  },
  {
    timeZone: 'America/Argentina/Buenos_Aires',
    aliases: ['buenos aires', 'argentina'],
  },
  {
    timeZone: 'Europe/London',
    aliases: ['london', 'uk', 'england', 'manchester', 'edinburgh'],
  },
  { timeZone: 'Europe/Paris', aliases: ['paris', 'france'] },
  {
    timeZone: 'Europe/Berlin',
    aliases: ['berlin', 'germany', 'frankfurt', 'munich', 'hamburg'],
  },
  {
    timeZone: 'Europe/Madrid',
    aliases: ['madrid', 'spain', 'barcelona', 'valencia', 'seville'],
  },
  { timeZone: 'Europe/Rome', aliases: ['rome', 'italy', 'milan'] },
  { timeZone: 'Europe/Amsterdam', aliases: ['amsterdam', 'netherlands'] },
  { timeZone: 'Europe/Zurich', aliases: ['zurich', 'switzerland'] },
  { timeZone: 'Europe/Stockholm', aliases: ['stockholm', 'sweden'] },
  { timeZone: 'Europe/Oslo', aliases: ['oslo', 'norway'] },
  { timeZone: 'Europe/Copenhagen', aliases: ['copenhagen', 'denmark'] },
  { timeZone: 'Europe/Helsinki', aliases: ['helsinki', 'finland'] },
  { timeZone: 'Europe/Warsaw', aliases: ['warsaw', 'poland'] },
  { timeZone: 'Europe/Kyiv', aliases: ['kyiv', 'kiev', 'ukraine'] },
  { timeZone: 'Europe/Istanbul', aliases: ['istanbul', 'turkey'] },
  { timeZone: 'Europe/Moscow', aliases: ['moscow', 'russia'] },
  { timeZone: 'Africa/Cairo', aliases: ['cairo', 'egypt'] },
  { timeZone: 'Africa/Lagos', aliases: ['lagos', 'nigeria'] },
  {
    timeZone: 'Africa/Johannesburg',
    aliases: ['johannesburg', 'cape town', 'south africa'],
  },
  { timeZone: 'Africa/Nairobi', aliases: ['nairobi', 'kenya'] },
  {
    timeZone: 'Asia/Kolkata',
    aliases: ['india', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'hyderabad'],
  },
  { timeZone: 'Asia/Karachi', aliases: ['karachi', 'pakistan'] },
  { timeZone: 'Asia/Dubai', aliases: ['dubai', 'uae', 'abu dhabi'] },
  { timeZone: 'Asia/Riyadh', aliases: ['riyadh', 'saudi arabia'] },
  { timeZone: 'Asia/Tehran', aliases: ['tehran', 'iran'] },
  { timeZone: 'Asia/Jerusalem', aliases: ['jerusalem', 'israel', 'tel aviv'] },
  { timeZone: 'Asia/Bangkok', aliases: ['bangkok', 'thailand'] },
  { timeZone: 'Asia/Jakarta', aliases: ['jakarta', 'indonesia'] },
  { timeZone: 'Asia/Manila', aliases: ['manila', 'philippines'] },
  { timeZone: 'Asia/Kathmandu', aliases: ['kathmandu', 'nepal'] },
  {
    timeZone: 'Asia/Tokyo',
    aliases: ['tokyo', 'japan', 'osaka', 'kyoto'],
  },
  {
    timeZone: 'Asia/Shanghai',
    aliases: ['shanghai', 'beijing', 'china', 'shenzhen'],
  },
  { timeZone: 'Asia/Hong_Kong', aliases: ['hong kong'] },
  { timeZone: 'Asia/Singapore', aliases: ['singapore'] },
  { timeZone: 'Asia/Seoul', aliases: ['seoul', 'korea'] },
  { timeZone: 'Australia/Sydney', aliases: ['sydney', 'canberra'] },
  { timeZone: 'Australia/Melbourne', aliases: ['melbourne'] },
  { timeZone: 'Australia/Brisbane', aliases: ['brisbane'] },
  { timeZone: 'Australia/Perth', aliases: ['perth'] },
  { timeZone: 'Australia/Adelaide', aliases: ['adelaide'] },
  { timeZone: 'Australia/Darwin', aliases: ['darwin'] },
  { timeZone: 'Australia/Hobart', aliases: ['hobart'] },
  {
    timeZone: 'Pacific/Auckland',
    aliases: ['auckland', 'wellington', 'new zealand'],
  },
  { timeZone: 'UTC', aliases: ['utc', 'gmt', 'universal'] },
];
