import { NextResponse } from 'next/server';
import { updateAdminPassword, validateNewPassword } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();
    const validationError = validateNewPassword(
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    updateAdminPassword(newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password updated. Your browser may ask you to sign in again.',
    });
  } catch (error) {
    console.error('Error updating admin password:', error);
    return NextResponse.json(
      { error: 'Failed to update password.' },
      { status: 500 }
    );
  }
}
