import { isOldEnough, isPlausibleBirthYear, MIN_AGE } from './auth-rules';

describe('age config', () => {
  it('is 16 per the CEO (2026-10-12)', () => {
    expect(MIN_AGE).toBe(16);
  });

  it('uses the permissive year-only rule', () => {
    const now = new Date('2026-10-12');
    expect(isOldEnough(2010, now)).toBe(true);
    expect(isOldEnough(2011, now)).toBe(false);
    expect(isOldEnough(2012, now, 14)).toBe(true);
    expect(isOldEnough(2013, now, 14)).toBe(false);
  });

  it('rejects implausible years and non-integers', () => {
    const now = new Date('2026-10-12');
    expect(isPlausibleBirthYear(1899, now)).toBe(false);
    expect(isPlausibleBirthYear(2027, now)).toBe(false);
    expect(isPlausibleBirthYear(1990.5, now)).toBe(false);
    expect(isPlausibleBirthYear(1990, now)).toBe(true);
  });
});
