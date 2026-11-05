import { NextResponse } from 'next/server';
import { generateSimulatedDebateResponse } from '@/lib/ai-models';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, userPosition, history, modelId, apiKey } = body;
    if (typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'A debate topic is required' }, { status: 400 });
    }
    if (userPosition !== 'Affirmative' && userPosition !== 'Negative') {
      return NextResponse.json({ error: 'A valid user position is required' }, { status: 400 });
    }
    if (!Array.isArray(history)) {
      return NextResponse.json({ error: 'Debate history must be an array' }, { status: 400 });
    }
    if (history.length > 100) {
      return NextResponse.json({ error: 'Debate history cannot exceed 100 turns' }, { status: 413 });
    }
    if (apiKey !== undefined && typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key must be a string when provided' }, { status: 400 });
    }

    const responseContent = await generateSimulatedDebateResponse(
      topic.trim(),
      userPosition,
      history,
      modelId || 'smart-simulator',
      apiKey?.trim() || undefined
    );

    return NextResponse.json({
      success: true,
      speaker: 'AI Opponent',
      role: userPosition === 'Affirmative' ? 'Negative' : 'Affirmative',
      content: responseContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process debate turn';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
