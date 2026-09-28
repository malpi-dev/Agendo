import { z } from 'zod';

export const emailSchema = z.email();
export const otpSchema = z.string().regex(/^\d{6}$/);
export const fullNameSchema = z.string().trim().min(2).max(80);
