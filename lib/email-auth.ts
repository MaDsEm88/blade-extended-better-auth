// lib/email-auth.ts
// Re-exports for email authentication utilities
// Password hashing is now handled by the email-auth trigger using better-auth/crypto

import { generateOTP, getOTPExpiryTime, isOTPExpired } from './oauth';

export interface EmailAuthOptions {
  email: string;
  password?: string;
  type: 'sign-in' | 'sign-up';
  otp?: string;
}

export function generateEmailOTP(): { otp: string; expiresAt: Date } {
  const otp = generateOTP(6);
  const expiresAt = getOTPExpiryTime(10); // 10 minutes
  return { otp, expiresAt };
}

export function verifyEmailOTP(storedOTP: string, providedOTP: string): boolean {
  return storedOTP === providedOTP;
}

export function isEmailOTPValid(expiresAt: Date | null, attempts: number): boolean {
  if (!expiresAt) return false;
  return !isOTPExpired(expiresAt) && attempts < 3;
}

// Note: Password hashing is now handled server-side in triggers/email-auth.ts
// using better-auth/crypto's hashPassword and verifyPassword functions