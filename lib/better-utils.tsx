// lib/better-utils.ts
import { createRandomStringGenerator } from "@better-auth/utils/random";
import { createOTP } from "@better-auth/utils/otp";
import { createHMAC } from "@better-auth/utils/hmac";
import { hashPassword, verifyPassword } from "better-auth/crypto";

// Random generators
const generateState = createRandomStringGenerator("A-Z", "a-z", "0-9", "-_");
const generateVerifier = createRandomStringGenerator("A-Z", "a-z", "0-9", "-_");

// OTP generator
const otpGenerator = createOTP(process.env["OTP_SECRET"] || "default", {
  digits: 6,
  period: 600, // 10 minutes
});

// HMAC signer
const hmac = createHMAC("SHA-256", "hex");

export const utils = {
  // OAuth
  generateOAuthState: () => generateState(32),
  generateOAuthVerifier: () => generateVerifier(43),
  
  // OTP
  generateOTP: async (counter: number) => {
    return await otpGenerator.hotp(counter);
  },
  verifyOTP: async (token: string, counter: number) => {
    const generated = await otpGenerator.hotp(counter);
    return generated === token;
  },
  
  // Passwords
  hashPassword,
  verifyPassword,
  
  // Token signing
  signToken: async (data: string) => {
    const signature = await hmac.sign(process.env["TOKEN_SECRET"] || "secret", data);
    return `${data}.${signature}`;
  },
  
  verifyToken: async (token: string) => {
    const [data, signature] = token.split('.');
    if (!data || !signature) return false;
    try {
      const isValid = await hmac.verify(process.env["TOKEN_SECRET"] || "secret", data, signature);
      return isValid === true;
    } catch {
      return false;
    }
  },
};