import { NextResponse } from 'next/server';
import { analyzePresentationText } from '@/lib/presentation-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, durationSeconds } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const metrics = analyzePresentationText(text, durationSeconds || 60);

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to analyze presentation' },
      { status: 500 }
    );
  }
}
