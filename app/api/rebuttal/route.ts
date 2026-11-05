import { NextResponse } from 'next/server';
import { generateCounterarguments } from '@/lib/rebuttal-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { argumentText, topic } = body;
    if (typeof argumentText !== 'string' || !argumentText.trim()) {
      return NextResponse.json({ error: 'An argument is required' }, { status: 400 });
    }

    const counterarguments = generateCounterarguments(argumentText, typeof topic === 'string' ? topic : undefined);

    return NextResponse.json({
      success: true,
      counterarguments
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate counterarguments';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
