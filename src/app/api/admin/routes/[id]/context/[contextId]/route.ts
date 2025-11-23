import { NextRequest, NextResponse } from 'next/server';
import { getCustomRouteById, deleteContext } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

/**
 * DELETE /api/admin/routes/:id/context/:contextId
 * Delete a specific context from a route
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contextId: string }> }
) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id: routeId, contextId } = await params;

    // Verify route exists and belongs to user
    const route = await getCustomRouteById(routeId);

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (route.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this route' },
        { status: 403 }
      );
    }

    // Delete the context
    await deleteContext(contextId, routeId);

    return NextResponse.json({
      success: true,
      message: 'Context deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting context:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
