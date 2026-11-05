import { NextResponse } from 'next/server';
import { analyzePresentationText } from '@/lib/presentation-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, durationSeconds } = body;

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const metrics = analyzePresentationText(text, typeof durationSeconds === 'number' ? durationSeconds : 60);

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to analyze presentation';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
