import { NextRequest, NextResponse } from 'next/server';
import { genaiService } from '@/lib/genai';
import { GenerateRequest, GenAIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await genaiService.generateResponse(prompt);

    const result: GenAIResponse = {
      success: true,
      message: response
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Generate API error:', error);

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
