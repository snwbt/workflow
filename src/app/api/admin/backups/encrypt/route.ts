import { NextResponse } from 'next/server';
import { rewriteSensitiveDataEncrypted } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await rewriteSensitiveDataEncrypted();
    return NextResponse.json({ success: true, result }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error encrypting stored data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to encrypt stored data.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}
