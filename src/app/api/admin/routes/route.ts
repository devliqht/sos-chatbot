import { NextRequest, NextResponse } from 'next/server';
import { createCustomRoute, listCustomRoutesByUser } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

/**
 * POST /api/admin/routes
 * Create a new custom chat route
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 *
 * Body:
 * {
 *   "routeName": "customer-support",     // Unique route name (URL-safe)
 *   "description": "Customer support AI", // Optional description
 *   "systemPrompt": "You are a..."        // Optional custom system prompt
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { routeName, description = '', systemPrompt = '' } = body;

    if (!routeName) {
      return NextResponse.json(
        { error: 'routeName is required' },
        { status: 400 }
      );
    }

    // Validate route name (alphanumeric, hyphens, underscores only)
    const routeNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!routeNameRegex.test(routeName)) {
      return NextResponse.json(
        {
          error:
            'Invalid route name. Use only letters, numbers, hyphens, and underscores.',
        },
        { status: 400 }
      );
    }

    // Create the custom route
    const route = await createCustomRoute(
      auth.userId,
      routeName,
      description,
      systemPrompt
    );

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        routeName: route.route_name,
        description: route.description,
        systemPrompt: route.system_prompt,
        endpoint: `/api/chats/${route.route_name}`,
        createdAt: route.created_at,
      },
      message: `Custom route created! Use POST /api/chats/${routeName} to chat.`,
    });
  } catch (error) {
    console.error('Error creating custom route:', error);

    // Handle unique constraint violation
    const errorMessage = error instanceof Error ? error.message : '';
    const errorCode = (error as { code?: string }).code;

    if (errorMessage.includes('unique') || errorCode === '23505') {
      return NextResponse.json(
        { error: 'Route name already exists. Choose a different name.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create custom route',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/routes
 * List all custom routes for the authenticated user
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
    const routes = await listCustomRoutesByUser(auth.userId);

    return NextResponse.json({
      success: true,
      routes: routes.map((route) => ({
        id: route.id,
        routeName: route.route_name,
        description: route.description,
        systemPrompt: route.system_prompt,
        endpoint: `/api/chats/${route.route_name}`,
        createdAt: route.created_at,
        updatedAt: route.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error listing custom routes:', error);
    return NextResponse.json(
      {
        error: 'Failed to list custom routes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
