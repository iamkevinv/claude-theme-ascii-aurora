// season.js: whether it is the cold time of year where the person is, from
// their computer's time zone (no location, no permission asked) and the month.
//
// A time zone names a place, and the place says which hemisphere it is in.
// The Northern Hemisphere's cold months are November to March, the
// Southern's May to September.

// Time zones south of the equator: whole regions by prefix, and the rest by
// name. Anything not listed counts as northern, as most time zones are.
const SOUTHERN_PREFIXES = ['Australia/', 'Antarctica/', 'America/Argentina/']

const SOUTHERN_ZONES = new Set([
  // Oceania
  'Pacific/Auckland',
  'Pacific/Chatham',
  'Pacific/Norfolk',
  'Pacific/Fiji',
  'Pacific/Tongatapu',
  'Pacific/Noumea',
  'Pacific/Efate',
  'Pacific/Apia',
  'Pacific/Rarotonga',
  'Pacific/Tahiti',
  'Pacific/Easter',
  'Pacific/Port_Moresby',
  'NZ',
  // South America
  'America/Buenos_Aires',
  'America/Santiago',
  'America/Punta_Arenas',
  'America/Montevideo',
  'America/Asuncion',
  'America/Sao_Paulo',
  'America/La_Paz',
  'America/Lima',
  'Chile/Continental',
  'Brazil/East',
  'Atlantic/Stanley',
  'Atlantic/South_Georgia',
  // Africa
  'Africa/Johannesburg',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Windhoek',
  'Africa/Gaborone',
  'Africa/Harare',
  'Africa/Lusaka',
  'Africa/Maputo',
  'Africa/Blantyre',
  'Africa/Lubumbashi',
  'Africa/Luanda',
  'Africa/Dar_es_Salaam',
  // Indian Ocean
  'Indian/Mauritius',
  'Indian/Reunion',
  'Indian/Antananarivo',
  'Indian/Kerguelen',
  // Asia
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Dili',
])

const NORTHERN_COLD = [10, 11, 0, 1, 2] // November to March
const SOUTHERN_COLD = [4, 5, 6, 7, 8] // May to September

/** The chance, each session in the cold months, that it snows. */
export const SNOW_CHANCE = 0.3

/** The computer's own time zone, such as `Europe/London`, or undefined. */
export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

/** `south` for a time zone south of the equator, else `north`. */
export function hemisphere(timeZone) {
  if (SOUTHERN_PREFIXES.some(prefix => timeZone.startsWith(prefix))) {
    return 'south'
  }
  return SOUTHERN_ZONES.has(timeZone) ? 'south' : 'north'
}

/** Whether `month` (0 for January) is a cold month in `timeZone`'s hemisphere. */
export function isColdSeason(timeZone, month) {
  return (hemisphere(timeZone) === 'south' ? SOUTHERN_COLD : NORTHERN_COLD).includes(month)
}

/**
 * Whether this session gets snow: a cold month where the person is, and a
 * `roll` (0 to 1) under the chance of snow.
 */
export function shouldSnow(timeZone, month, roll) {
  return timeZone !== undefined && isColdSeason(timeZone, month) && roll < SNOW_CHANCE
}
