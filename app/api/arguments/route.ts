import { NextResponse } from 'next/server';
import { analyzeArgument } from '@/lib/argument-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, topic } = body;

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Argument text is required' }, { status: 400 });
    }

    if (text.length > 20000) {
      return NextResponse.json({ error: 'Argument text must be 20,000 characters or fewer' }, { status: 413 });
    }

    if (topic !== undefined && typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic must be a string when provided' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      analysis: analyzeArgument(text, topic?.trim() || undefined)
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze argument' },
      { status: 500 }
    );
  }
}
