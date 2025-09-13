import crypto from 'crypto';

/**
 * Unified secret management for SlotSync application
 * This ensures all authentication mechanisms use the same secret key
 */

// Generate a secure default secret if none is provided
const generateSecureSecret = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Use environment variable or generate a secure default
// In production, SESSION_SECRET should always be set
export const SECRET = process.env.SESSION_SECRET || generateSecureSecret();

// Log warning if using generated secret in production
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: SESSION_SECRET not set in production. Using generated secret.');
  console.warn('This will cause authentication issues across server restarts.');
}

// Export for logging/debugging purposes (but not the actual secret)
export const isUsingEnvSecret = !!process.env.SESSION_SECRET;

console.log(`[Config] Using ${isUsingEnvSecret ? 'environment' : 'generated'} secret for authentication`);