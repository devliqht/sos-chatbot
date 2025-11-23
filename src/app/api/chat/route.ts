import { NextRequest, NextResponse } from 'next/server';
import { genaiService } from '@/lib/genai';
import { ChatRequest, GenAIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const prompt = context
      ? `Context: ${context}\n\nUser: ${message}`
      : message;

    const response = await genaiService.generateResponse(prompt);

    const result: GenAIResponse = {
      success: true,
      message: response
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Chat API error:', error);

    const errorResult: GenAIResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };

    return NextResponse.json(errorResult, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
