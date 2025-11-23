import { NextRequest, NextResponse } from 'next/server';
import { createApiKey, listApiKeysByUser, getUserByEmail } from '@/lib/db';
import { generateApiKey, hashApiKey, authenticateRequest } from '@/lib/auth';

/**
 * POST /api/admin/keys
 * Generate a new API key
 *
 * Headers:
 * - Authorization: Bearer <existing-api-key>
 *   OR
 * - X-API-Key: <existing-api-key>
 *
 * Body:
 * {
 *   "name": "Key name"  // Optional
 * }
 *
 * OR for first-time setup without auth:
 * {
 *   "email": "user@example.com",  // Required if no auth
 *   "name": "Key name"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'API Key', email } = body;

    let userId: string;

    // Try to authenticate with existing API key
    const auth = await authenticateRequest(request);

    if (auth.authenticated) {
      userId = auth.userId;
    } else if (email) {
      // Allow creating key with email if no auth (for first-time setup)
      const user = await getUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Initialize database first at /api/admin/init' },
          { status: 404 }
        );
      }
      userId = user.id;
    } else {
      // No auth and no email provided
      return auth.response;
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    // Store hashed key
    const keyData = await createApiKey(userId, keyHash, name);

    return NextResponse.json({
      success: true,
      apiKey, // Return the actual key (only time it's shown)
      keyInfo: {
        id: keyData.id,
        name: keyData.name,
        created_at: keyData.created_at,
      },
      message: 'API key created successfully. Save it securely - it will not be shown again!',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      {
        error: 'Failed to create API key',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/keys
 * List all API keys for the authenticated user
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const keys = await listApiKeysByUser(auth.userId);

    return NextResponse.json({
      success: true,
      keys: keys.map((key) => ({
        id: key.id,
        name: key.name,
        created_at: key.created_at,
        last_used: key.last_used,
        // Never return the actual key or hash
      })),
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json(
      {
        error: 'Failed to list API keys',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
