import { NextResponse } from 'next/server';
import { generateCounterarguments } from '@/lib/rebuttal-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { argumentText, topic } = body;

    const counterarguments = generateCounterarguments(argumentText || '', topic);

    return NextResponse.json({
      success: true,
      counterarguments
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate counterarguments' },
      { status: 500 }
    );
  }
}
