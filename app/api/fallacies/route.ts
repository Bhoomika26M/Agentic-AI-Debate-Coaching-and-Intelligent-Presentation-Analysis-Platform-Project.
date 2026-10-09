import { NextResponse } from 'next/server';
import { detectFallacies } from '@/lib/fallacy-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const fallacies = detectFallacies(text);

    return NextResponse.json({
      success: true,
      fallaciesCount: fallacies.length,
      fallacies
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to detect fallacies' },
      { status: 500 }
    );
  }
}
