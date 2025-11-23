import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, createUser, createApiKey } from '@/lib/db';
import { generateApiKey, hashApiKey } from '@/lib/auth';

/**
 * POST /api/admin/init
 * Initialize database and create first user with API key
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "keyName": "My First Key"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "user": { id, email },
 *   "apiKey": "sk_live_...",  // Save this! Won't be shown again
 *   "message": "Database initialized"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, keyName = 'Default Key' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Initialize database tables
    await initializeDatabase();

    // Create user
    const user = await createUser(email);

    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    // Store hashed key
    await createApiKey(user.id, keyHash, keyName);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      apiKey, // Return the actual key (only time it's shown)
      message: 'Database initialized successfully. Save your API key - it will not be shown again!',
    });
  } catch (error) {
    console.error('Error initializing database:', error);

    // Check if tables already exist or user already exists
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        {
          error: 'Database already initialized or user already exists',
          hint: 'Use /api/admin/keys to generate a new API key for existing user'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initialize database', details: errorMessage },
      { status: 500 }
    );
  }
}
