import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomRouteById,
  updateCustomRoute,
  deleteCustomRoute,
} from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

/**
 * PUT /api/admin/routes/:id
 * Update a custom route
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 *
 * Body:
 * {
 *   "routeName": "new-name",        // Optional
 *   "description": "New desc",       // Optional
 *   "systemPrompt": "New prompt"     // Optional
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify route exists and belongs to user
    const existingRoute = await getCustomRouteById(id);

    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (existingRoute.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this route' },
        { status: 403 }
      );
    }

    // Validate route name if provided
    if (body.routeName) {
      const routeNameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!routeNameRegex.test(body.routeName)) {
        return NextResponse.json(
          {
            error:
              'Invalid route name. Use only letters, numbers, hyphens, and underscores.',
          },
          { status: 400 }
        );
      }
    }

    // Update the route
    const updatedRoute = await updateCustomRoute(id, auth.userId, {
      route_name: body.routeName,
      description: body.description,
      system_prompt: body.systemPrompt,
    });

    if (!updatedRoute) {
      return NextResponse.json({ error: 'No changes made' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      route: {
        id: updatedRoute.id,
        routeName: updatedRoute.route_name,
        description: updatedRoute.description,
        systemPrompt: updatedRoute.system_prompt,
        endpoint: `/api/chats/${updatedRoute.route_name}`,
        updatedAt: updatedRoute.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating custom route:', error);

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
        error: 'Failed to update custom route',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/routes/:id
 * Delete a custom route (and all its contexts)
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;

    // Verify route exists and belongs to user
    const existingRoute = await getCustomRouteById(id);

    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (existingRoute.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this route' },
        { status: 403 }
      );
    }

    // Delete the route (cascades to contexts)
    await deleteCustomRoute(id, auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Custom route deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting custom route:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete custom route',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/routes/:id
 * Get a specific route by ID
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const route = await getCustomRouteById(id);

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (route.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this route' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        routeName: route.route_name,
        description: route.description,
        systemPrompt: route.system_prompt,
        endpoint: `/api/chats/${route.route_name}`,
        createdAt: route.created_at,
        updatedAt: route.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching custom route:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch custom route',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
