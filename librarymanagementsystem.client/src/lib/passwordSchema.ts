import { z } from 'zod';

// Mirrors the server rules for a new password (the validators + the Identity password options) for instant feedback.
export const newPasswordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[a-z]/, 'Password needs a lowercase letter')
    .regex(/[A-Z]/, 'Password needs an uppercase letter')
    .regex(/[0-9]/, 'Password needs a digit')
    .regex(/[^A-Za-z0-9]/, 'Password needs a symbol');

export const newPasswordHint = 'At least 8 characters with upper and lower case, a digit and a symbol.';
