import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const APP_BASE_URL = 
  process.env.APP_URL || 
  process.env.AUTH_URL || 
  process.env.NEXTAUTH_URL || 
  'https://sourceapplication.onrender.com';

const DEFAULT_FROM = process.env.EMAIL_FROM || 'DXN Procurement <onboarding@resend.dev>';

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
    if (!resend) {
      console.warn('[Resend] RESEND_API_KEY is not set. Email notification skipped for:', to);
      return { success: false, reason: 'RESEND_API_KEY not configured' };
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

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: recipients,
      subject: `${title}${priorityBadge}`,
      html: htmlContent,
    });

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
