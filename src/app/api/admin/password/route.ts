import { NextResponse } from 'next/server';
import { updateAdminPassword, validateNewPassword } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();
    const validationError = await validateNewPassword(
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await updateAdminPassword(newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password updated. Please sign in again with the new password.',
      reauthRequired: true,
    });
  } catch (error) {
    console.error('Error updating admin password:', error);
    return NextResponse.json(
      { error: 'Failed to update password.' },
      { status: 500 }
    );
  }
}
