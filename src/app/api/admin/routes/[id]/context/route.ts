import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomRouteById,
  createContext,
  listContextsByRoute,
  getNextContextOrder,
} from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { put } from '@vercel/blob';
import pdf from 'pdf-parse/lib/pdf-parse';

/**
 * POST /api/admin/routes/:id/context
 * Add context to a custom route (text or file)
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 * - Content-Type: multipart/form-data (for file uploads)
 *   OR application/json (for text context)
 *
 * Body (JSON for text):
 * {
 *   "type": "text",
 *   "content": "Your context text here..."
 * }
 *
 * Body (FormData for file):
 * - type: "file"
 * - file: <uploaded file>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id: routeId } = await params;

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

    const contentType = request.headers.get('content-type') || '';

    let type: 'text' | 'file';
    let content: string | null = null;
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const typeField = formData.get('type') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      type = typeField === 'file' ? 'file' : 'text';
      fileName = file.name;

      // Upload file to Vercel Blob
      const blob = await put(
        `contexts/${routeId}/${Date.now()}-${file.name}`,
        file,
        {
          access: 'public',
        }
      );

      fileUrl = blob.url;

      // Parse file content based on type
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        try {
          const pdfData = await pdf(fileBuffer);
          content = pdfData.text;
        } catch (err) {
          console.error('Error parsing PDF:', err);
          content = '[PDF content could not be parsed]';
        }
      } else if (
        file.type === 'text/plain' ||
        file.type === 'text/markdown' ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md')
      ) {
        content = fileBuffer.toString('utf-8');
      } else {
        return NextResponse.json(
          {
            error:
              'Unsupported file type. Only PDF, TXT, and MD files are supported.',
          },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON (text context)
      const body = await request.json();

      if (body.type !== 'text') {
        return NextResponse.json(
          { error: 'Invalid type. Use "text" or upload a file.' },
          { status: 400 }
        );
      }

      if (!body.content) {
        return NextResponse.json(
          { error: 'Content is required for text type' },
          { status: 400 }
        );
      }

      type = 'text';
      content = body.content;
    }

    // Get next order index
    const orderIndex = await getNextContextOrder(routeId);

    // Create context
    const contextData = await createContext(
      routeId,
      type,
      content,
      fileUrl,
      fileName,
      orderIndex
    );

    return NextResponse.json({
      success: true,
      context: {
        id: contextData.id,
        type: contextData.type,
        content: contextData.content?.substring(0, 200) + '...', // Preview
        fileUrl: contextData.file_url,
        fileName: contextData.file_name,
        order: contextData.order_index,
        createdAt: contextData.created_at,
      },
      message: 'Context added successfully',
    });
  } catch (error) {
    console.error('Error adding context:', error);
    return NextResponse.json(
      {
        error: 'Failed to add context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/routes/:id/context
 * List all contexts for a custom route
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
    const { id: routeId } = await params;

    // Verify route exists and belongs to user
    const route = await getCustomRouteById(routeId);

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (route.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this route' },
        { status: 403 }
      );
    }

    const contexts = await listContextsByRoute(routeId);

    return NextResponse.json({
      success: true,
      contexts: contexts.map((ctx) => ({
        id: ctx.id,
        type: ctx.type,
        content: ctx.content?.substring(0, 200) + '...', // Preview
        fullContent: ctx.content, // Include full content
        fileUrl: ctx.file_url,
        fileName: ctx.file_name,
        order: ctx.order_index,
        createdAt: ctx.created_at,
      })),
    });
  } catch (error) {
    console.error('Error listing contexts:', error);
    return NextResponse.json(
      {
        error: 'Failed to list contexts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
