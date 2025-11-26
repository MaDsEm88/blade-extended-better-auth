// schema/index.ts
import { model, string, date, link, json, boolean, number } from 'blade/schema';


export const Account = model({
  slug: "account",
  fields: {
    handle: string({ unique: true }),
    email: string({ unique: true }),
    emailVerified: boolean(),
    emailVerificationToken: string(),
    emailVerificationSentAt: date(),
    passwordResetToken: string(),
    passwordResetSentAt: date(),
    passwordResetOtp: string(),
    passwordResetOtpExpiresAt: date(),
    // TODO: prob remove it
    password: string(),

     // Email OTP
    emailOtp: string(),
    emailOtpExpiresAt: date(),
    emailOtpType: string(),
    emailOtpAttempts: number({ default: 0 }),
    
    // OAuth profile
    name: string({ required: false }),
    image: string({ required: false }),
  },
})

// OAuth State tracking
export const OAuthState = model({
  slug: "oauthState",
  pluralSlug: "oauthStates",
  fields: {
    state: string({ unique: true }),
    provider: string(),
    codeVerifier: string(),
    redirectUri: string(),
    authorizationUrl: string(),
    expiresAt: date(),
    account: link({ target: "account", required: false }),
    sessionId: string({ required: false }), // ✨ NEW: Store session ID
  },
});

// OAuth Callback handling
export const OAuthCallback = model({
  slug: "oauthCallback",
  pluralSlug: "oauthCallbacks",
  fields: {
    provider: string(),
    code: string(),
    state: string(),
    processed: boolean({ default: false }),
    error: string({ required: false }),
    createdAt: date(),
  },
});

// Social accounts
export const SocialAccount = model({
  slug: "socialAccount",
  pluralSlug: "socialAccounts",
  fields: {
    account: link({
      target: "account",
      actions: { onDelete: "CASCADE" },
    }),
    provider: string(),
    providerId: string(),
    providerAccountId: string(),
    accessToken: string(),
    refreshToken: string({ required: false }),
    expiresAt: date({ required: false }),
    tokenType: string({ required: false }),
    scope: string({ required: false }),
    idToken: string({ required: false }),
    providerData: json({ required: false }),
  },
})


export const Session = model({
  slug: "session",
  fields: {
    account: link({
      target: "account",
      actions: {
        onDelete: "CASCADE",
      },
    }),
    browser: string(),
    browserVersion: string(),
    os: string(),
    osVersion: string(),
    deviceType: string(),
    activeAt: date(),
    // Email auth trigger data (used for passing auth actions through session creation)
    emailAuth: json({ required: false }),
    emailAuthResult: json({ required: false }),
  },
})

export const Profile = model({
  slug: "profile",
  fields: {
    account: link({ target: "account" }),
    username: string({ unique: true }),
    onboardingCompleted: boolean({ default: false }),
  },
})

// Email Auth Request - for handling email authentication actions
export const EmailAuthRequest = model({
  slug: "emailAuthRequest",
  pluralSlug: "emailAuthRequests",
  fields: {
    action: string(), // check-email, signup, signin, send-otp, verify-otp
    email: string(),
    password: string({ required: false }),
    otp: string({ required: false }),
    // Result fields (populated by trigger)
    success: boolean({ required: false }),
    error: string({ required: false }),
    exists: boolean({ required: false }),
    hasPassword: boolean({ required: false }),
    accountId: string({ required: false }),
    sessionId: string({ required: false }),
    handle: string({ required: false }),
    requiresOTP: boolean({ required: false }),
    otpSent: boolean({ required: false }),
    emailVerified: boolean({ required: false }),
  },
})

