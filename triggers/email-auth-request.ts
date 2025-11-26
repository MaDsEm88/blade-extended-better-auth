// triggers/email-auth-request.ts
// Custom email authentication trigger using Better Auth utilities
import { triggers } from 'blade/schema';
import type { EmailAuthRequest } from 'blade/types';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { resend, isResendConfigured } from '../lib/resend';

// Simple OTP generator (6 digits)
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default triggers<EmailAuthRequest>({
  // Handle email auth actions
  add: async ({ query, client }) => {
    const { get, add, set } = client;
    
    const withData = query.with as any;
    console.log('[EmailAuthRequest] Trigger called with:', { action: withData?.action, email: withData?.email });
    
    if (!withData?.action || !withData?.email) {
      console.log('[EmailAuthRequest] Missing action or email, passing through');
      return query;
    }

    const { action, email, password, otp } = withData;

    // Action: check-email - Check if account exists
    if (action === 'check-email') {
      try {
        const account = await (get as any).account.with.email(email);
        if (account) {
          return {
            ...query,
            with: {
              ...withData,
              success: true,
              exists: true,
              hasPassword: !!account.password,
              accountId: account.id,
            },
          };
        }
      } catch {
        // Account doesn't exist
      }
      return {
        ...query,
        with: {
          ...withData,
          success: true,
          exists: false,
        },
      };
    }

    // Action: signup-otp - Create account without password, send OTP
    if (action === 'signup-otp') {
      try {
        console.log('[EmailAuthRequest] signup-otp: creating account for', email);
        
        // Generate handle from email
        const emailPart = email.split('@')[0] || '';
        let baseHandle = emailPart.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (baseHandle.length < 3) {
          baseHandle = `user${baseHandle}${Math.random().toString(36).slice(2, 6)}`;
        }
        
        // Create account with handle
        let handle = baseHandle;
        let account: any = null;
        let attempt = 0;
        const maxAttempts = 10;
        
        while (attempt < maxAttempts && !account) {
          try {
            account = await (add as any).account.with({
              email,
              handle,
              emailVerified: false,
            });
          } catch (err: any) {
            if (err?.message && /duplicate|unique/i.test(err.message)) {
              attempt++;
              const suffix = Math.random().toString(36).slice(2, 2 + Math.min(attempt + 2, 6));
              handle = `${baseHandle}${suffix}`;
              console.log('[EmailAuthRequest] Handle collision, trying:', handle);
            } else {
              throw err;
            }
          }
        }
        
        if (!account) {
          throw new Error('Failed to create account after multiple attempts');
        }
        
        console.log('[EmailAuthRequest] signup-otp: account created', account.id, 'with handle:', handle);

        // Generate OTP
        const otpCode = generateOTP();
        console.log('[EmailAuthRequest] signup-otp: generated OTP', otpCode);
        
        // Store OTP on account
        await (set as any).account({
          with: { id: account.id },
          to: {
            emailOtp: otpCode,
            emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            emailOtpType: 'sign-up',
            emailOtpAttempts: 0,
          },
        });

        // Send OTP email
        if (isResendConfigured()) {
          console.log('[EmailAuthRequest] signup-otp: sending email via Resend');
          try {
            await resend.emails.send({
              from: process.env['RESEND_FROM_EMAIL'] || 'onboarding@resend.dev',
              to: [email],
              subject: 'Verify your email',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Verify your email</h2>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${otpCode}</span>
                  </div>
                  <p style="color: #666;">This code will expire in 10 minutes.</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error('[EmailAuthRequest] signup-otp: email send failed:', emailErr);
            // Continue anyway - OTP is stored, user can see it in logs for testing
          }
        } else {
          console.log('[EmailAuthRequest] OTP for', email, ':', otpCode);
        }

        return {
          ...query,
          with: {
            ...withData,
            success: true,
            accountId: account.id,
          },
        };
      } catch (err) {
        console.error('[EmailAuthRequest] signup-otp error:', err);
        return {
          ...query,
          with: {
            ...withData,
            success: false,
            error: err instanceof Error ? err.message : 'Failed to create account',
          },
        };
      }
    }

    // Action: signup - Create account with hashed password
    if (action === 'signup') {
      try {
        console.log('[EmailAuthRequest] signup: hashing password');
        const hashedPassword = await hashPassword(password);
        
        // Generate handle from email
        const emailPart = email.split('@')[0] || '';
        let baseHandle = emailPart.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (baseHandle.length < 3) {
          baseHandle = `user${baseHandle}${Math.random().toString(36).slice(2, 6)}`;
        }
        
        console.log('[EmailAuthRequest] signup: creating account for', email);
        
        // Create account with handle
        let handle = baseHandle;
        let account: any = null;
        let attempt = 0;
        const maxAttempts = 10;
        
        while (attempt < maxAttempts && !account) {
          try {
            account = await (add as any).account.with({
              email,
              handle,
              password: hashedPassword,
              emailVerified: false,
            });
          } catch (err: any) {
            if (err?.message && /duplicate|unique/i.test(err.message)) {
              attempt++;
              const suffix = Math.random().toString(36).slice(2, 2 + Math.min(attempt + 2, 6));
              handle = `${baseHandle}${suffix}`;
              console.log('[EmailAuthRequest] Handle collision, trying:', handle);
            } else {
              throw err;
            }
          }
        }
        
        if (!account) {
          throw new Error('Failed to create account after multiple attempts');
        }
        
        console.log('[EmailAuthRequest] signup: account created', account.id, 'with handle:', handle);

        // Generate OTP
        const otpCode = generateOTP();
        console.log('[EmailAuthRequest] signup: generated OTP', otpCode);
        
        // Store OTP on account
        await (set as any).account({
          with: { id: account.id },
          to: {
            emailOtp: otpCode,
            emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            emailOtpType: 'sign-up',
            emailOtpAttempts: 0,
          },
        });

        // Send OTP email
        if (isResendConfigured()) {
          console.log('[EmailAuthRequest] signup: sending email via Resend');
          await resend.emails.send({
            from: process.env['RESEND_FROM_EMAIL'] || 'onboarding@resend.dev',
            to: [email],
            subject: 'Verify your email',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Verify your email</h2>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${otpCode}</span>
                </div>
                <p style="color: #666;">This code will expire in 10 minutes.</p>
              </div>
            `,
          });
        } else {
          console.log('[EmailAuthRequest] OTP for', email, ':', otpCode);
        }

        return {
          ...query,
          with: {
            ...withData,
            success: true,
            accountId: account.id,
            requiresOTP: true,
          },
        };
      } catch (err) {
        console.error('[EmailAuthRequest] signup error:', err);
        return {
          ...query,
          with: {
            ...withData,
            success: false,
            error: err instanceof Error ? err.message : 'Failed to create account',
          },
        };
      }
    }

    // Action: verify-otp - Verify OTP code
    if (action === 'verify-otp') {
      try {
        const account = await (get as any).account.with.email(email);
        if (!account) {
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Account not found',
            },
          };
        }

        // Check attempts
        if (account.emailOtpAttempts >= 3) {
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Too many attempts',
            },
          };
        }

        // Check expiry
        if (account.emailOtpExpiresAt && new Date() > new Date(account.emailOtpExpiresAt)) {
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Code expired',
            },
          };
        }

        // Verify OTP
        if (account.emailOtp !== otp) {
          await (set as any).account({
            with: { id: account.id },
            to: { emailOtpAttempts: (account.emailOtpAttempts || 0) + 1 },
          });
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Invalid code',
            },
          };
        }

        // OTP is valid - clear it and mark email as verified
        await (set as any).account({
          with: { id: account.id },
          to: {
            emailVerified: true,
            emailOtp: null,
            emailOtpExpiresAt: null,
            emailOtpType: null,
            emailOtpAttempts: 0,
          },
        });

        // Create session for the user
        console.log('[EmailAuthRequest] verify-otp: creating session for account', account.id);
        const session = await (add as any).session.with({
          account: { id: account.id },
          browser: 'unknown',
          browserVersion: 'unknown',
          os: 'unknown',
          osVersion: 'unknown',
          deviceType: 'web',
          activeAt: new Date(),
        });
        console.log('[EmailAuthRequest] verify-otp: session created', session.id);

        return {
          ...query,
          with: {
            ...withData,
            success: true,
            accountId: account.id,
            sessionId: session.id,
            handle: account.handle,
            emailVerified: true,
          },
        };
      } catch (err) {
        console.error('[EmailAuthRequest] verify-otp error:', err);
        return {
          ...query,
          with: {
            ...withData,
            success: false,
            error: 'Verification failed',
          },
        };
      }
    }

    // Action: signin - Verify password and create session
    if (action === 'signin') {
      try {
        const account = await (get as any).account.with.email(email);
        if (!account) {
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Account not found',
            },
          };
        }

        // Verify password
        const isValid = await verifyPassword({ hash: account.password, password });
        if (!isValid) {
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Invalid password',
            },
          };
        }

        // Password is valid - return account info for session creation
        return {
          ...query,
          with: {
            ...withData,
            success: true,
            accountId: account.id,
            handle: account.handle,
          },
        };
      } catch (err) {
        console.error('[Email Auth] signin error:', err);
        return {
          ...query,
          with: {
            ...withData,
            success: false,
            error: 'Sign in failed',
          },
        };
      }
    }

    // Action: send-otp - Send OTP for existing account (signin via OTP)
    if (action === 'send-otp') {
      try {
        const account = await (get as any).account.with.email(email);
        if (!account) {
          return {
            ...query,
            with: {
              ...withData,
              success: false,
              error: 'Account not found',
            },
          };
        }

        // Generate OTP
        const otpCode = generateOTP();
        
        // Store OTP on account
        await (set as any).account({
          with: { id: account.id },
          to: {
            emailOtp: otpCode,
            emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            emailOtpType: 'sign-in',
            emailOtpAttempts: 0,
          },
        });

        // Send OTP email
        if (isResendConfigured()) {
          await resend.emails.send({
            from: process.env['RESEND_FROM_EMAIL'] || 'onboarding@resend.dev',
            to: [email],
            subject: 'Your sign in code',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Your sign in code</h2>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${otpCode}</span>
                </div>
                <p style="color: #666;">This code will expire in 10 minutes.</p>
              </div>
            `,
          });
        } else {
          console.log('[Email Auth] OTP for', email, ':', otpCode);
        }

        return {
          ...query,
          with: {
            ...withData,
            success: true,
            accountId: account.id,
            otpSent: true,
          },
        };
      } catch (err) {
        console.error('[Email Auth] send-otp error:', err);
        return {
          ...query,
          with: {
            ...withData,
            success: false,
            error: 'Failed to send OTP',
          },
        };
      }
    }

    return query;
  },
});
