import { emailSchema, fullNameSchema, otpSchema } from '../validation';

describe('validation', () => {
  it.each(['a@b.co', 'jose.malpica@gmail.com'])('accepts email %s', (v) =>
    expect(emailSchema.safeParse(v).success).toBe(true),
  );
  it.each(['', 'nope', 'a@', '@b.com'])('rejects email "%s"', (v) =>
    expect(emailSchema.safeParse(v).success).toBe(false),
  );

  it('accepts a 6-digit OTP', () => expect(otpSchema.safeParse('123456').success).toBe(true));
  it.each(['12345', '1234567', '12345a', ''])('rejects OTP "%s"', (v) =>
    expect(otpSchema.safeParse(v).success).toBe(false),
  );

  it('trims the name', () => expect(fullNameSchema.parse('  Ana  ')).toBe('Ana'));
  it('enforces length limits 2/80', () => {
    expect(fullNameSchema.safeParse('A').success).toBe(false);
    expect(fullNameSchema.safeParse(' A ').success).toBe(false);
    expect(fullNameSchema.safeParse('Al').success).toBe(true);
    expect(fullNameSchema.safeParse('x'.repeat(80)).success).toBe(true);
    expect(fullNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
  });
});
