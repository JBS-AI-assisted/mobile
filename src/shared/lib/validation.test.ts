import { validateEmail, validateNewPassword, validateResetCode } from './validation';

describe('validation', () => {
  it('email', () => {
    expect(validateEmail('')).toBe('Enter your email.');
    expect(validateEmail('nope')).toBe("That doesn't look like an email address.");
    expect(validateEmail(' a@b.co ')).toBeUndefined();
  });

  it('new password and code', () => {
    expect(validateNewPassword('short')).toBe('Use at least 10 characters.');
    expect(validateNewPassword('x'.repeat(129))).toBe('Use 128 characters or fewer.');
    expect(validateNewPassword('x'.repeat(10))).toBeUndefined();
    expect(validateResetCode('12345')).toBeDefined();
    expect(validateResetCode('123456')).toBeUndefined();
  });
});
