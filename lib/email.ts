import nodemailer from 'nodemailer';
import { Resend } from 'resend';

function getSmtpTransporter() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const APP_BASE_URL = 
  process.env.APP_URL || 
  process.env.AUTH_URL || 
  process.env.NEXTAUTH_URL || 
  'https://sourceapplication.onrender.com';

function getFromAddress(): string {
  const raw = (process.env.EMAIL_FROM || 'DXN Procurement <onboarding@resend.dev>').trim();
  if (raw.startsWith('<') && raw.endsWith('>')) {
    return `DXN Procurement ${raw}`;
  }
  return raw;
}

export interface EmailNotificationPayload {
  to: string | string[];
  title: string;
  message: string;
  requestId?: string;
  recipientName?: string | null;
  priority?: string | null;
}

/**
 * Sends a transactional email notification via Resend.
 * Silently logs errors to prevent blocking the main workflow if an email fails.
 */
export async function sendEmailNotification({
  to,
  title,
  message,
  requestId,
  recipientName,
  priority,
}: EmailNotificationPayload) {
  try {
    const smtp = getSmtpTransporter();
    const resend = !smtp ? getResendClient() : null;

    if (!smtp && !resend) {
      console.warn('[Email] Neither Gmail SMTP nor RESEND_API_KEY is configured. Email notification skipped for:', to);
      return { success: false, reason: 'Email service not configured' };
    }

    // Clean recipients
    const rawList = Array.isArray(to) ? to : [to];
    const recipients = Array.from(
      new Set(
        rawList
          .map(e => e?.trim().toLowerCase())
          .filter(e => e && e.includes('@') && !e.startsWith('archived_'))
      )
    );

    if (recipients.length === 0) {
      return { success: false, reason: 'No valid recipient email provided' };
    }

    const requestUrl = requestId ? `${APP_BASE_URL}/requests/${requestId}` : APP_BASE_URL;
    const priorityBadge = priority ? ` [${priority.toUpperCase()}]` : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px 30px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.01em;">
                      Source Request Portal
                    </h1>
                    <p style="color: rgba(255,255,255,0.75); font-size: 12px; margin: 4px 0 0; font-weight: 500;">
                      DXN Procurement Department
                    </p>
                  </td>
                  ${priority ? `
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 99px; background: rgba(255,255,255,0.2); color: #ffffff; text-transform: uppercase;">
                      ${priority}
                    </span>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">
              ${recipientName ? `
              <p style="font-size: 15px; color: #334155; margin: 0 0 16px; font-weight: 600;">
                Hello ${recipientName},
              </p>` : ''}
              
              <h2 style="font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 12px; line-height: 1.4;">
                ${title}
              </h2>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 16px; margin: 18px 0;">
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">
                  ${message}
                </p>
              </div>

              ${requestId ? `
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0 26px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8fafc; font-size: 12px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #e2e8f0;">
                    Request Number:
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                    ${requestId}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 10px;">
                <tr>
                  <td align="center">
                    <a href="${requestUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 6px rgba(79,70,229,0.35);">
                      View Request in Portal →
                    </a>
                  </td>
                </tr>
              </table>` : ''}

              <p style="font-size: 12px; color: #94a3b8; margin: 28px 0 0; line-height: 1.5; text-align: center;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${requestUrl}" style="color: #6366f1; word-break: break-all;">${requestUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; text-align: center;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                This is an automated notification from the DXN Procurement Department Portal.<br>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 1. Try Gmail SMTP (Sends to ANY recipient without domain verification restrictions)
    if (smtp) {
      const fromAddr = process.env.EMAIL_FROM || `DXN Procurement <${process.env.SMTP_USER || 'dxn15553@gmail.com'}>`;
      const info = await smtp.sendMail({
        from: fromAddr,
        to: recipients,
        subject: `${title}${priorityBadge}`,
        html: htmlContent,
      });
      console.log(`[Email SMTP] Notification delivered successfully to [${recipients.join(', ')}], MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    }

    // 2. Fallback to Resend
    if (!resend) {
      return { success: false, reason: 'No active email provider' };
    }

    let { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipients,
      subject: `${title}${priorityBadge}`,
      html: htmlContent,
    });

    // Automatic fallback for Resend testing sandbox (onboarding@resend.dev):
    // Resend free tier only permits sending to the account owner's email.
    // If blocked, automatically redirect to the registered account email with an informational banner.
    if (error && (error as any).message?.includes('You can only send testing emails to your own email address')) {
      const match = (error as any).message.match(/\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/);
      const fallbackEmail = match ? match[1] : null;

      if (fallbackEmail) {
        console.warn(`[Resend Sandbox] Redirecting email from [${recipients.join(', ')}] to verified testing address [${fallbackEmail}]`);
        const fallbackRes = await resend.emails.send({
          from: getFromAddress(),
          to: [fallbackEmail],
          subject: `[Dev / Test Mode: Originally to ${recipients.join(', ')}] ${title}${priorityBadge}`,
          html: `
            <div style="background-color: #fef3c7; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="margin: 0 0 6px 0; font-size: 13.5px; font-weight: 700; color: #92400e;">
                ⚠️ Resend Sandbox Testing Delivery
              </p>
              <p style="margin: 0; font-size: 12.5px; color: #78350f; line-height: 1.5;">
                This notification was originally addressed to: <strong>${recipients.join(', ')}</strong>.<br>
                Delivered to your registered testing email (<strong>${fallbackEmail}</strong>) because custom domain verification has not been completed yet on Resend.
                To send directly to all recipients without redirection, add and verify your custom domain at <a href="https://resend.com/domains" style="color: #4f46e5; font-weight: 600;">resend.com/domains</a>.
              </p>
            </div>
          ` + htmlContent,
        });

        if (!fallbackRes.error) {
          return { success: true, data: fallbackRes.data, redirectedTo: fallbackEmail };
        }
        error = fallbackRes.error;
      }
    }

    if (error) {
      console.error('[Resend] Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Resend] Unexpected error sending notification email:', err?.message || err);
    return { success: false, error: err };
  }
}
