import { expect, test } from 'claude-code/testing'

import { hemisphere, isColdSeason, localTimeZone, shouldSnow } from './season.js'

const JAN = 0
const MAR = 2
const APR = 3
const MAY = 4
const JUL = 6
const SEP = 8
const OCT = 9
const NOV = 10

test('time zones south of the equator are southern, the rest northern', async () => {
  for (const zone of ['Australia/Brisbane', 'Australia/Hobart', 'Pacific/Auckland', 'America/Argentina/Ushuaia', 'America/Santiago', 'America/Sao_Paulo', 'Africa/Johannesburg', 'Antarctica/McMurdo']) {
    expect(`${zone} ${hemisphere(zone)}`).toBe(`${zone} south`)
  }
  for (const zone of ['Europe/London', 'America/New_York', 'Asia/Tokyo', 'Asia/Hong_Kong', 'Africa/Cairo', 'UTC']) {
    expect(`${zone} ${hemisphere(zone)}`).toBe(`${zone} north`)
  }
})

test('the cold months are November to March up north and May to September down south', async () => {
  expect([NOV, JAN, MAR].map(month => isColdSeason('Europe/London', month))).toEqual([true, true, true])
  expect([APR, JUL, OCT].map(month => isColdSeason('Europe/London', month))).toEqual([false, false, false])
  expect([MAY, JUL, SEP].map(month => isColdSeason('Australia/Sydney', month))).toEqual([true, true, true])
  expect([OCT, NOV, JAN, APR].map(month => isColdSeason('Australia/Sydney', month))).toEqual([false, false, false, false])
})

test('in a cold month it snows on 30% of rolls, and never in a warm one', async () => {
  expect(shouldSnow('Europe/Oslo', JAN, 0.29)).toBe(true)
  expect(shouldSnow('Europe/Oslo', JAN, 0.3)).toBe(false)
  expect(shouldSnow('Europe/Oslo', JUL, 0)).toBe(false)
  expect(shouldSnow('Australia/Melbourne', JUL, 0.1)).toBe(true)
  expect(shouldSnow(undefined, JAN, 0)).toBe(false)
})

test('a mod can read the computer’s time zone', async () => {
  expect(typeof localTimeZone()).toBe('string')
})
