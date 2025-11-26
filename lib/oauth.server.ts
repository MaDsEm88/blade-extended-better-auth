// lib/oauth.server.ts - Server-only OAuth implementation
import { generateCodeChallenge, getOAuth2Tokens } from "better-auth/oauth2";
import type { ProviderName } from './oauth';

export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  scopes: string[];
}

// OAuth provider configurations
export const providers = {
  google: {
    clientId: process.env["GOOGLE_CLIENT_ID"]!,
    clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userInfoEndpoint: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["openid", "email", "profile"],
  },
  github: {
    clientId: process.env["GITHUB_CLIENT_ID"]!,
    clientSecret: process.env["GITHUB_CLIENT_SECRET"]!,
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    userInfoEndpoint: "https://api.github.com/user",
    scopes: ["user:email"],
  },
  linear: {
    clientId: process.env["LINEAR_CLIENT_ID"]!,
    clientSecret: process.env["LINEAR_CLIENT_SECRET"]!,
    authorizationEndpoint: "https://linear.app/oauth/authorize",
    tokenEndpoint: "https://api.linear.app/oauth/token",
    userInfoEndpoint: "https://api.linear.app/graphql",
    scopes: ["read"],
  },
} as const;

function generateRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

export async function getAuthorizationUrl(provider: ProviderName, redirectUri: string) {
  const config = providers[provider];
  const state = generateRandomString();
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  const url = `${config.authorizationEndpoint}?${params.toString()}`;
  
  return { url, state, codeVerifier };
}

export async function exchangeCodeForToken(
  provider: ProviderName,
  code: string,
  redirectUri: string,
  codeVerifier?: string
) {
  const config = providers[provider];
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  // Add code_verifier for PKCE if provided
  if (codeVerifier) {
    params.set('code_verifier', codeVerifier);
  }
  
  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  const tokens = getOAuth2Tokens(data);
  
  // Return normalized token data
  return {
    accessToken: tokens.accessToken || '',
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType || 'Bearer',
    expiresAt: tokens.accessTokenExpiresAt, // Better Auth uses accessTokenExpiresAt (Date)
    scope: tokens.scopes?.join(' '), // Better Auth uses scopes (array)
  };
}

export async function getUserInfo(provider: ProviderName, accessToken: string) {
  const config = providers[provider];
  
  if (provider === "linear") {
    const response = await fetch(config.userInfoEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{ viewer { id email name } }`,
      }),
    });
    
    const data = await response.json();
    return {
      id: data.data.viewer.id,
      email: data.data.viewer.email,
      name: data.data.viewer.name,
    };
  }
  
  const response = await fetch(config.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  
  const data = await response.json();
  
  if (provider === "github") {
    let email = data.email;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      const emails = await emailsResponse.json();
      email = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
    }
    
    return {
      id: data.id.toString(),
      email,
      name: data.name,
      image: data.avatar_url,
    };
  }
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    image: data.picture,
  };
}