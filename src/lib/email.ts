import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const fromEmail = process.env.FROM_EMAIL || 'rsvp@wedding.events';

export async function sendRsvpConfirmation(
  guestEmail: string,
  guestName: string,
  attendance: string,
  details: string,
  coupleNames = 'Russell & Siaw Min'
) {
  if (!resend) {
    console.log('Resend not configured, skipping confirmation email to:', guestEmail);
    return;
  }

  try {
    const subject = attendance === 'attending' 
      ? 'We are so excited to celebrate with you!' 
      : 'We will miss you!';
      
    const html = `
      <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; font-weight: normal;">Hello ${guestName},</h1>
        <p style="font-size: 16px; line-height: 1.5;">Thank you for your RSVP.</p>
        <p style="font-size: 16px; line-height: 1.5;">${
          attendance === 'attending' 
            ? 'We have recorded your RSVP and look forward to celebrating with you! Here is a summary of the details you provided:' 
            : 'We have recorded your RSVP and are so sorry you won\'t be able to join us.'
        }</p>
        ${attendance === 'attending' ? `<div style="background-color: #faf8f4; padding: 15px; margin-top: 20px; border-radius: 4px;">
          <p style="margin: 0; white-space: pre-wrap;">${details}</p>
        </div>` : ''}
        <p style="margin-top: 40px; font-size: 14px; color: #666;">${coupleNames}</p>
      </div>
    `;

    await resend.emails.send({
      from: `${coupleNames} <${fromEmail}>`,
      to: guestEmail,
      subject,
      html,
    });
    console.log('Confirmation email sent to:', guestEmail);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }
}

export async function sendAdminNotification(
  guestName: string,
  attendance: string,
  details: string
) {
  if (!resend) {
    console.log('Resend not configured, skipping admin notification for:', guestName);
    return;
  }

  try {
    await resend.emails.send({
      from: `RSVP System <${fromEmail}>`,
      to: adminEmail,
      subject: `New RSVP: ${guestName} - ${attendance.toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>New RSVP Submission</h2>
          <p><strong>Name:</strong> ${guestName}</p>
          <p><strong>Status:</strong> ${attendance}</p>
          <pre style="background: #f5f5f5; padding: 15px;">${details}</pre>
        </div>
      `,
    });
    console.log('Admin notification sent.');
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}
