import { NextRequest } from 'next/server';
import { genaiService } from '@/lib/genai';
import { ChatRequest } from '@/lib/types';
import { createStreamResponse } from '@/lib/streaming';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const prompt = context
      ? `Context: ${context}\n\nUser: ${message}`
      : message;

    const messages = [{ role: 'user' as const, content: prompt }];
    const stream = await genaiService.chatStream(messages);

    return createStreamResponse(stream);

  } catch (error) {
    console.error('Chat stream API error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
