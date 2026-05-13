import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({ config: db.config || {} });
  } catch (error) {
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

    const db = await getDb();
    db.config = { ...db.config, ...config };
    await saveDb(db);

    return NextResponse.json({ success: true, config: db.config });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
