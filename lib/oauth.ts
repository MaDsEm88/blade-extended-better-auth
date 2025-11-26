// lib/oauth.ts - Type definitions only (client-safe)

export type ProviderName = 'google' | 'github' | 'linear';

export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  scopes: string[];
}

// Email OTP utilities
export function generateOTP(length: number = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

export function getOTPExpiryTime(minutes: number = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}