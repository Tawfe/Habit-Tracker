/**
 * @format
 */

import { localDay } from '../src/features/checkins/date';

test('localDay formats a date as YYYY-MM-DD in local time', () => {
  expect(localDay(new Date(2026, 5, 28, 9, 0, 0))).toBe('2026-06-28');
});
