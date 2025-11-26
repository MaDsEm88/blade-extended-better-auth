import { triggers } from 'blade/schema';
import type { OauthCallback } from 'blade/types';
import { InvalidFieldsError } from 'blade/errors';
import { exchangeCodeForToken, getUserInfo } from '../lib/oauth.server';
import type { ProviderName } from '../lib/oauth';

export default triggers<OauthCallback>({
  add: async ({ query, client }) => {
    if (!query.with || Array.isArray(query.with)) {
      throw new InvalidFieldsError({ 
        fields: ['code', 'state'],
        message: 'Invalid query structure'
      });
    }

    const { code, state } = query.with;
    
    if (!code || !state || typeof state !== 'string') {
      const missing: string[] = [];
      if (!code) missing.push('code');
      if (!state) missing.push('state');
      
      throw new InvalidFieldsError({ 
        fields: missing,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // FIXED: Look up provider from OAuth state instead of query parameter
    // Cast state to string to fix TypeScript error
    const oauthState = await client.get.oauthState.with.state(state as string);
    
    if (!oauthState) {
      throw new InvalidFieldsError({
        fields: ['state'],
        message: 'OAuth state not found or expired'
      });
    }

    // Set values including provider from oauthState
    query.with['provider'] = oauthState.provider;
    query.with['createdAt'] = new Date();
    query.with['processed'] = false;

    return query;
  },

  followingAdd: async ({ records, client }) => {
    const { get, add: addRecord, set } = client;

    for (const callback of records) {
      try {
        const { code, state, provider } = callback;
        
        if (!code || !state || !provider) {
          console.error('[OAuth Callback] Missing required fields');
          continue;
        }

        console.log('[OAuth Callback] Processing callback for provider:', provider);

        const oauthState = await get.oauthState.with.state(state);
        
        if (!oauthState) {
          console.error('[OAuth Callback] State not found:', state);
          await set.oauthCallback({
            with: { id: callback.id },
            to: { processed: true, error: 'OAuth state not found or expired' }
          });
          continue;
        }

        if (new Date() > new Date(oauthState.expiresAt)) {
          console.error('[OAuth Callback] State expired:', state);
          await set.oauthCallback({
            with: { id: callback.id },
            to: { processed: true, error: 'OAuth state expired' }
          });
          continue;
        }

        const providerName = provider as ProviderName;

        console.log('[OAuth Callback] Exchanging code for tokens...');
        const tokens = await exchangeCodeForToken(
          providerName,
          code as string,
          oauthState.redirectUri as string,
          oauthState.codeVerifier as string
        );

        console.log('[OAuth Callback] Fetching user profile...');
        const profile = await getUserInfo(providerName, tokens.accessToken);

        const existingSocial = await get.socialAccount.with({
          provider: provider,
          providerId: profile.id,
        }).catch(() => null);

        let accountId: string;

        if (existingSocial) {
          console.log('[OAuth Callback] Updating existing social account');
          await set.socialAccount({
            with: { id: existingSocial.id },
            to: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt,
              providerData: profile,
            },
          });

          accountId = existingSocial.account as string;
          
          const existingAccount = await get.account.with.id(accountId).catch(() => null);
          if (existingAccount && !existingAccount.handle) {
            const baseHandle = (profile.name || profile.email.split('@')[0])
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            
            let handle = baseHandle;
            let suffix = 1;
            while (true) {
              const existing = await get.account.with.handle(handle).catch(() => null);
              if (!existing || existing.id === accountId) break;
              handle = `${baseHandle}-${suffix}`;
              suffix++;
            }
            
            await set.account({
              with: { id: accountId },
              to: { handle }
            });
            console.log('[OAuth Callback] Generated handle for existing account:', handle);
          }
        } else {
          const existingAccount = await get.account
            .with.email(profile.email)
            .catch(() => null);

          if (existingAccount) {
            console.log('[OAuth Callback] Linking to existing account');
            accountId = existingAccount.id;
            
            let handle = existingAccount.handle;
            if (!handle) {
              const baseHandle = (profile.name || profile.email.split('@')[0])
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
              
              handle = baseHandle;
              let suffix = 1;
              while (true) {
                const existing = await get.account.with.handle(handle).catch(() => null);
                if (!existing || existing.id === accountId) break;
                handle = `${baseHandle}-${suffix}`;
                suffix++;
              }
            }
            
            await set.account({
              with: { id: accountId },
              to: {
                name: existingAccount.name || profile.name,
                image: existingAccount.image || profile.image,
                handle: handle,
                emailVerified: true,
              }
            });
          } else {
            console.log('[OAuth Callback] Creating new account');
            
            const baseHandle = (profile.name || profile.email.split('@')[0])
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            
            let handle = baseHandle;
            let suffix = 1;
            while (true) {
              const existing = await get.account.with.handle(handle).catch(() => null);
              if (!existing) break;
              handle = `${baseHandle}-${suffix}`;
              suffix++;
            }
            
            const newAccount = await addRecord.account.with({
              email: profile.email,
              emailVerified: true,
              name: profile.name,
              image: profile.image,
              handle: handle,
              password: '',
            });
            
            if (!newAccount) {
              throw new Error('Failed to create account');
            }
            
            accountId = newAccount.id;
          }

          console.log('[OAuth Callback] Creating social account');
          await addRecord.socialAccount.with({
            account: accountId,
            provider: provider,
            providerId: profile.id,
            providerAccountId: profile.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            tokenType: tokens.tokenType,
            scope: tokens.scope,
            providerData: profile,
          });
        }

        console.log('[OAuth Callback] Creating session for account:', accountId);
        const sessionId = `ses_${crypto.randomUUID()}`;
        
        await addRecord.session.with({
          id: sessionId,
          account: accountId,
          activeAt: new Date(),
        });

        console.log('[OAuth Callback] Session created:', sessionId);

        console.log('[OAuth Callback] Updating OAuth state with account and session');
        await set.oauthState({
          with: { state: state },
          to: { 
            account: accountId,
            sessionId: sessionId,
          },
        });

        await set.oauthCallback({
          with: { id: callback.id },
          to: { processed: true }
        });

        console.log('[OAuth Callback] ✓ Successfully processed for account:', accountId);
      } catch (error) {
        console.error('[OAuth Callback] Error processing:', error);
        
        await set.oauthCallback({
          with: { id: callback.id },
          to: { 
            processed: true, 
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  },
});