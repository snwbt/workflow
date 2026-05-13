import { NextResponse } from 'next/server';
import { getDb, mergeConfig } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({ config: db.config || {} });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { config } = await request.json();
    if (!config) {
      return NextResponse.json({ error: 'Config is required' }, { status: 400 });
    }

    const savedConfig = await mergeConfig(config);

    return NextResponse.json({ success: true, config: savedConfig });
  } catch (error) {
    console.error('Error saving config:', error);
    const message = error instanceof Error ? error.message : 'Failed to save config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
