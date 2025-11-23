import { NextRequest, NextResponse } from 'next/server';
import { getCustomRouteByName, listContextsByRoute } from '@/lib/db';
import { genaiService } from '@/lib/genai';
import { createStreamResponse } from '@/lib/streaming';

/**
 * POST /api/chats/:routeName
 * Send a message to a custom AI route with its loaded context
 *
 * This is the main endpoint users will call to interact with their custom AI
 *
 * Body:
 * {
 *   "message": "User's message",
 *   "messages": [] // Optional: full conversation history
 * }
 *
 * Response: Server-Sent Events (SSE) stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ routeName: string }> }
) {
  try {
    const { routeName } = await params;
    const body = await request.json();
    const { message, messages = [] } = body;

    if (!message && messages.length === 0) {
      return NextResponse.json(
        { error: 'Message or messages array is required' },
        { status: 400 }
      );
    }

    // Load the custom route
    const route = await getCustomRouteByName(routeName);

    if (!route) {
      return NextResponse.json(
        {
          error: `Route '${routeName}' not found`,
          hint: 'Create this route first at POST /api/admin/routes',
        },
        { status: 404 }
      );
    }

    // Load all contexts for this route
    const contexts = await listContextsByRoute(route.id);

    // Build the system prompt by merging route's system prompt and all contexts
    let systemPrompt = route.system_prompt || 'You are a helpful AI assistant.';

    if (contexts.length > 0) {
      systemPrompt += '\n\n--- Context Information ---\n\n';

      for (const ctx of contexts) {
        if (ctx.type === 'text' && ctx.content) {
          systemPrompt += `${ctx.content}\n\n`;
        } else if (ctx.type === 'file' && ctx.content) {
          systemPrompt += `--- Content from ${ctx.file_name} ---\n${ctx.content}\n\n`;
        }
      }

      systemPrompt += '--- End of Context ---\n\n';
      systemPrompt +=
        'Use the context information above to provide accurate and helpful responses. If the user asks about topics covered in the context, reference the information provided.';
    }

    // Add system prompt as the first message context
    const promptWithContext = `${systemPrompt}\n\nUser: ${message}`;

    // Generate streaming response using existing infrastructure
    const streamGenerator = genaiService.generateStreamResponse(
      messages.length > 0 ? messages : promptWithContext
    );

    // Return streaming response
    return createStreamResponse(streamGenerator);
  } catch (error) {
    console.error('Error in custom chat route:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chats/:routeName
 * Get information about a custom route (for discovery/testing)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ routeName: string }> }
) {
  try {
    const { routeName } = await params;

    // Load the custom route
    const route = await getCustomRouteByName(routeName);

    if (!route) {
      return NextResponse.json(
        {
          error: `Route '${routeName}' not found`,
        },
        { status: 404 }
      );
    }

    // Load contexts count
    const contexts = await listContextsByRoute(route.id);

    return NextResponse.json({
      success: true,
      route: {
        name: route.route_name,
        description: route.description,
        hasSystemPrompt: !!route.system_prompt,
        contextCount: contexts.length,
        endpoint: `/api/chats/${route.route_name}`,
        usage: {
          method: 'POST',
          body: {
            message: 'Your message here',
          },
          example: `curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chats/${route.route_name} \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'`,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching custom route info:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch route information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
