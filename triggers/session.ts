// triggers/session.ts
import { triggers } from "blade/schema"
import type { Session } from "blade/types"

export default triggers<Session>({
  // Allow unauthenticated session creation for OAuth flow
  add: async ({ query, headless }) => {
    // If this is coming from the server (not headless), allow it
    if (!headless) {
      return query;
    }
    
    // For client-side requests, you might want additional validation
    // For now, we'll allow it for OAuth
    return query;
  }
});