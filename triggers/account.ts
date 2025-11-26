// triggers/account.ts
import { triggers } from "blade/schema"
import type { Account } from "blade/types"

export default triggers<Account>({
  followingAdd: async ({ records, client, parentTrigger }) => {
    // Don't run this logic if called from another trigger
    if (parentTrigger) {
      return
    }

    // Create profile and set handle for each new account
    for (const account of records) {
      if (!account?.id) {
        continue
      }

      // Generate a unique handle based on email or account ID
      let baseHandle = ''
      if (account.email) {
        // Use the part before @ as base
        const emailPart = account.email.split('@')[0]
        baseHandle = (emailPart || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      }
      if (!baseHandle || baseHandle.length < 3) {
        const cleanedId = account.id.replace(/^acc[_-]?/i, "")
        baseHandle = cleanedId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase()
      }
      
      // Ensure minimum length
      if (baseHandle.length < 3) {
        baseHandle = `user${baseHandle}`
      }

      let handle = baseHandle
      let username = handle
      let attempt = 0
      const maxAttempts = 10

      while (attempt < maxAttempts) {
        try {
          // Try to set the handle on the account
          await (client.set as any).account({
            with: { id: account.id },
            to: { handle },
          })
          console.log(`[Account] Set handle '${handle}' for account ${account.id}`)

          // Also create profile with matching username
          await (client.add as any).profile.with({
            account: { id: account.id },
            username,
            onboardingCompleted: false,
          })
          console.log(`[Account] Created profile for account ${account.id}`)
          break
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !/duplicate|unique/i.test(error.message)
          ) {
            console.error("[Account] failed to set handle/create profile", {
              accountId: account.id,
              error,
            })
            break
          }
          // Handle collision - add random suffix
          attempt += 1
          const suffix = Math.random().toString(36).slice(2, 2 + Math.min(attempt + 2, 6))
          handle = `${baseHandle}${suffix}`
          username = handle
          console.log(`[Account] Handle collision, trying '${handle}'`)
        }
      }
    }
  },
})