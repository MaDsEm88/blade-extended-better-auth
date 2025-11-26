# 🔐 Blade Extended / Better-auth

## This package will be closed when the custom blade-extended package is being released for easy integration with better-auth.

A complete authentication system for [Blade](https://blade.im) featuring email/password, email OTP, and OAuth2 providers (Google, GitHub, Linear).

![Auth Flow](https://img.shields.io/badge/Email-Password%20%2B%20OTP-blue)
![OAuth](https://img.shields.io/badge/OAuth2-Google%20%7C%20GitHub%20%7C%20Linear-green)
![Framework](https://img.shields.io/badge/Framework-Blade-purple)

## ✨ Features

- **Email + Password** - Traditional signup/signin with secure password hashing
- **Email OTP** - Passwordless authentication with 6-digit codes
- **OAuth2 Providers** - Google, GitHub, and Linear with PKCE support
- **Account Linking** - Connect multiple OAuth providers to a single account (same email = same account)
- **Session Management** - Secure cookie-based sessions
- **Auto-generated Handles** - Unique `@handle` for each user profile
- **Protected Routes** - Auth guards for authenticated-only pages

---

## 📁 Project Structure

```
blade-extended/
├── components/
│   ├── auth-guard.client.tsx       # Prevents navigation to public pages when logged in
│   ├── callback-handler.client.tsx # Processes OAuth callbacks
│   ├── email-auth.client.tsx       # Email auth UI (password + OTP flows)
│   ├── login-button.client.tsx     # OAuth provider buttons
│   └── logout-button.client.tsx    # Sign out button
├── lib/
│   ├── oauth.ts                    # OAuth provider types
│   ├── oauth.server.ts             # OAuth server logic (token exchange, user info)
│   └── resend.ts                   # Email sending via Resend
├── pages/
│   ├── auth/
│   │   ├── callback.tsx            # OAuth callback handler
│   │   ├── create-session.tsx      # Sets session cookie after auth
│   │   └── verify-oauth.tsx        # Verifies OAuth and redirects
│   ├── [handle]/
│   │   └── index.tsx               # User profile page (protected)
│   ├── index.tsx                   # Landing page (redirects if logged in)
│   └── login.tsx                   # Login/signup page
├── schema/
│   └── index.ts                    # Database models
└── triggers/
    ├── account.ts                  # Creates profile on account creation
    ├── email-auth-request.ts       # Handles email auth actions
    ├── oauth-callback.ts           # Processes OAuth callbacks
    ├── oauth-state.ts              # Generates OAuth authorization URLs
    └── session.ts                  # Session creation logic
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#-environment-variables) below).

### 3. Apply Database Migrations

```bash
bunx blade diff    # Generate migration
bunx blade apply   # Apply to database
```

### 4. Run Development Server

```bash
bun run dev
```

Visit `http://localhost:3000` 🎉

---

## 🔧 Environment Variables

Create a `.env` file with the following:

```env
# Blade Core
BLADE_AUTH_SECRET=your_random_secret_here
BLADE_PUBLIC_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Linear OAuth (optional)
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_client_secret
```

> ⚠️ **Important:** Restart the dev server after changing `.env`

---

## 🔑 OAuth Provider Setup

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add to **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   ```
4. Add to **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   ```
5. Copy **Client ID** and **Client Secret** to `.env`

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Set **Homepage URL**:
   ```
   http://localhost:3000
   ```
3. Set **Authorization callback URL**:
   ```
   http://localhost:3000/auth/callback
   ```
4. Copy **Client ID** and **Client Secret** to `.env`

### Linear

1. In your Linear workspace, go to **Settings** → **API** → **OAuth Applications**
2. Create a new OAuth2 application
3. Set **Redirect callback URL**:
   ```
   http://localhost:3000/auth/callback
   ```
4. Copy **Client ID** and **Client Secret** to `.env`

---

## 📧 Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use test mode
3. Create an API key
4. Add to `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

> 💡 **Tip:** In test mode, Resend only delivers to verified emails. Check server logs for OTP codes during development.

---

## 🗄️ Database Schema

The auth system uses these models (defined in `schema/index.ts`):

| Model | Purpose |
|-------|---------|
| `Account` | User accounts with email, password, handle, OTP fields |
| `Session` | Active user sessions linked to accounts |
| `Profile` | Extended user profile data |
| `OAuthState` | Temporary OAuth flow state (PKCE) |
| `OAuthCallback` | OAuth callback processing |
| `SocialAccount` | Linked OAuth provider accounts |
| `EmailAuthRequest` | Email auth action handling |

---

## 🔄 Auth Flows

### Email + Password

```
1. User enters email → check-email action
2. If signup: enter password → signup action → send OTP
3. If signin: enter password → signin action → create session
4. Verify OTP → verify-otp action → redirect to profile
```

### Email OTP (Passwordless)

```
1. User enters email → check-email action
2. If signup: signup-otp action → send OTP
3. If signin: send-otp action → send OTP
4. Verify OTP → verify-otp action → redirect to profile
```

### OAuth

```
1. User clicks provider button → create OAuthState with PKCE
2. Redirect to provider → user authorizes
3. Provider redirects to /auth/callback with code + state
4. Exchange code for tokens → fetch user info
5. Create/link account → create session → redirect to profile
```

---

## � Account Linking

When a user signs in with an OAuth provider, the system automatically links accounts by email:

- **New email** → Creates a new account + links the OAuth provider
- **Existing email** → Links the OAuth provider to the existing account

This means:
- A user who signed up with email/password can later "Sign in with Google" (same email) and both methods will work
- A user can connect multiple OAuth providers (Google + GitHub) to the same account
- All linked providers are stored in the `SocialAccount` model

The linking logic is in `triggers/oauth-callback.ts`:

```ts
// Check if account with email exists
const existingAccount = await get.account.with.email(profile.email);

if (existingAccount) {
  // Link OAuth provider to existing account
  accountId = existingAccount.id;
} else {
  // Create new account
  const newAccount = await add.account.with({ ... });
  accountId = newAccount.id;
}

// Create social account link
await add.socialAccount.with({
  account: accountId,
  provider: provider,
  providerId: profile.id,
  // ... tokens
});
```

---

## �🛡️ Protected Routes

The `[handle]/index.tsx` page requires authentication:

```tsx
// Require authentication to view any profile
if (!currentSession || !currentAccount) {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/login" />
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/login');` }} />
    </>
  );
}
```

The `AuthGuard` component prevents authenticated users from navigating back to public pages:

```tsx
import AuthGuard from '../components/auth-guard.client';

<AuthGuard handle={currentAccount?.handle || null}>
  {/* Protected content */}
</AuthGuard>
```

---

## 📝 Adding to Your Project

### Required Files

Copy these directories to your Blade project:

```
components/     → Client components for auth UI
lib/            → OAuth and email utilities  
triggers/       → Server-side auth logic
schema/         → Database models (merge with existing)
pages/auth/     → Auth flow pages
pages/login.tsx → Login page
```

### Required Dependencies

```bash
bun add better-auth
bun add @better-auth/utils
bun add resend
```

### Required Environment Variables

See [Environment Variables](#-environment-variables) section.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `invalid_client` error | Check OAuth client ID matches provider console |
| `redirect_uri_mismatch` | Ensure redirect URI exactly matches (including `http` vs `https`) |
| OTP not received | Check server logs for OTP code; verify Resend domain |
| Session not persisting | Clear cookies and try again; check `session` cookie is set |
| Repeated redirect logs | Clear browser history for `/auth/create-session` |

---

## 📄 License

MIT

---
