import { NextResponse } from 'next/server';
import { generateCoachingPlan } from '@/lib/coaching-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = generateCoachingPlan(body.debateScore, body.presentation, body.argument);
    return NextResponse.json({ success: true, plan });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate coaching plan' }, { status: 500 });
  }
}
