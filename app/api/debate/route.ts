import { NextResponse } from 'next/server';
import { generateSimulatedDebateResponse } from '@/lib/ai-models';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, userPosition, history, modelId } = body;

    const responseContent = await generateSimulatedDebateResponse(
      topic || 'AI Governance Frameworks',
      userPosition || 'Affirmative',
      history || [],
      modelId || 'smart-simulator'
    );

    return NextResponse.json({
      success: true,
      speaker: 'AI Opponent',
      role: userPosition === 'Affirmative' ? 'Negative' : 'Affirmative',
      content: responseContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process debate turn' },
      { status: 500 }
    );
  }
}
