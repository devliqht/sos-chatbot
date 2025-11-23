import { createHash, randomBytes } from 'crypto';
import { getApiKeyByHash, updateApiKeyLastUsed } from './db';

/**
 * Generate a new API key
 * Format: sk_live_<32 random hex characters>
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(32).toString('hex');
  return `sk_live_${randomPart}`;
}

/**
 * Hash an API key for secure storage
 * Uses SHA-256 for one-way hashing
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate an API key from request headers
 * Returns the user info if valid, null if invalid
 */
export async function validateApiKey(
  apiKey: string | null | undefined
): Promise<{ userId: string; email: string; apiKeyId: string } | null> {
  if (!apiKey) {
    return null;
  }

  // Remove "Bearer " prefix if present
  const cleanKey = apiKey.replace(/^Bearer\s+/i, '');

  // Hash the key to compare with stored hash
  const keyHash = hashApiKey(cleanKey);

  try {
    const apiKeyData = await getApiKeyByHash(keyHash);

    if (!apiKeyData) {
      return null;
    }

    // Update last used timestamp (fire and forget)
    updateApiKeyLastUsed(keyHash).catch((err) =>
      console.error('Failed to update API key last used:', err)
    );

    return {
      userId: apiKeyData.user_id,
      email: apiKeyData.email,
      apiKeyId: apiKeyData.id,
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Middleware helper to extract API key from request headers
 */
export function extractApiKey(headers: Headers): string | null {
  // Check Authorization header first
  const authHeader = headers.get('authorization');
  if (authHeader) {
    return authHeader.replace(/^Bearer\s+/i, '');
  }

  // Check X-API-Key header as fallback
  const apiKeyHeader = headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Helper to validate request and return user info or error response
 */
export async function authenticateRequest(
  request: Request
): Promise<
  | { authenticated: true; userId: string; email: string; apiKeyId: string }
  | { authenticated: false; response: Response }
> {
  const apiKey = extractApiKey(request.headers);

  if (!apiKey) {
    return {
      authenticated: false,
      response: new Response(
        JSON.stringify({
          error: 'Missing API key. Provide in Authorization header or X-API-Key header.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  const user = await validateApiKey(apiKey);

  if (!user) {
    return {
      authenticated: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return {
    authenticated: true,
    userId: user.userId,
    email: user.email,
    apiKeyId: user.apiKeyId,
  };
}
