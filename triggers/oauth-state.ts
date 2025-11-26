// triggers/oauth-state.ts
import { triggers } from 'blade/schema';
import type { OauthState } from 'blade/types';
import { getAuthorizationUrl } from '../lib/oauth.server';
import type { ProviderName } from '../lib/oauth';
import { InvalidFieldsError } from 'blade/errors';

const VALID_PROVIDERS: readonly ProviderName[] = ['google', 'github', 'linear'];

function isValidProvider(value: unknown): value is ProviderName {
  return typeof value === 'string' && 
    (VALID_PROVIDERS as readonly string[]).includes(value);
}

export default triggers<OauthState>({
  add: async ({ query }) => {
    if (!query.with || Array.isArray(query.with)) {
      throw new InvalidFieldsError({ 
        fields: ['provider', 'redirectUri'],
        message: 'Invalid query structure: with instruction must be an object'
      });
    }

    const { provider, redirectUri } = query.with as {
      provider?: unknown;
      redirectUri?: unknown;
    };
    
    if (!provider || !redirectUri) {
      const missingFields: string[] = [];
      if (!provider) missingFields.push('provider');
      if (!redirectUri) missingFields.push('redirectUri');
      
      throw new InvalidFieldsError({ 
        fields: missingFields,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    if (!isValidProvider(provider)) {
      throw new InvalidFieldsError({ 
        fields: ['provider'],
        message: `Invalid provider "${provider}". Must be one of: ${VALID_PROVIDERS.join(', ')}`
      });
    }

    if (typeof redirectUri !== 'string') {
      throw new InvalidFieldsError({ 
        fields: ['redirectUri'],
        message: 'redirectUri must be a string'
      });
    }
    
    console.log('Generating OAuth authorization URL for provider:', provider);
    
    // Generate OAuth authorization URL and state
    const { url, state, codeVerifier } = await getAuthorizationUrl(
      provider,
      redirectUri
    );
    
    console.log('Generated authorization URL:', url);
    console.log('Generated state:', state);
    
    // Use bracket notation for index signatures
    query.with['state'] = state;
    query.with['codeVerifier'] = codeVerifier;
    query.with['authorizationUrl'] = url;
    query.with['expiresAt'] = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    return query;
  },
});