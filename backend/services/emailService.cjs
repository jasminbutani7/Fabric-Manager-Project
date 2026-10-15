const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Helper to read .env dynamically
function getEnvConfig() {
  const env = { ...process.env };
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const idx = trimmed.indexOf('=');
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        // Don't overwrite if already in process.env
        if (!env[k]) {
          env[k] = v.replace(/^["']|["']$/g, '');
        }
      }
    } catch (e) {
      console.warn('[emailService] Warning reading .env:', e.message);
    }
  }
  return env;
}

/**
 * Creates a nodemailer transporter supporting Custom Domain SMTP (Zoho, Google Workspace, SES, etc.) or Gmail SMTP
 */
function createTransporter() {
  const env = getEnvConfig();
  const user = env.SMTP_USER || env.GMAIL_USER || env.EMAIL_USER;
  const pass = (env.SMTP_PASS || env.GMAIL_APP_PASSWORD || env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }

  const host = env.SMTP_HOST || (user.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const port = parseInt(env.SMTP_PORT || '465', 10);
  const secure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE === 'true' : port === 465;

  const config = {
    auth: {
      user,
      pass,
    },
  };

  if (host) {
    config.host = host;
    config.port = port;
    config.secure = secure;
  } else {
    config.service = 'gmail';
    config.host = 'smtp.gmail.com';
    config.port = 465;
    config.secure = true;
  }

  return nodemailer.createTransport(config);
}

/**
 * Generate branded HTML email for OTP verification
 */
function generateOtpHtmlTemplate(otp, adminName) {
  const recipientName = adminName ? String(adminName).trim() : 'Fabric Manager Administrator';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP - Fabric Manager</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #E2E8F0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 36px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border-radius: 16px; padding: 12px 18px; margin-bottom: 12px;">
                      <span style="font-size: 26px; line-height: 1;">🧵</span>
                      <span style="color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-left: 8px; vertical-align: middle;">Fabric Manager</span>
                    </div>
                    <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 8px 0 0 0; letter-spacing: -0.3px;">Password Reset Request</h1>
                    <p style="color: rgba(255, 255, 255, 0.85); font-size: 13px; margin: 6px 0 0 0;">Factory ERP & Production Control</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 0 0 24px 0;">
                We received a request to reset your password for your <strong>Fabric Manager</strong> account. Please use the following 6-digit verification code:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #F8FAFC; border: 2px dashed #6366F1; border-radius: 14px; padding: 20px 24px; text-align: center; display: inline-block; min-width: 240px;">
                      <span style="font-size: 11px; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your Verification Code</span>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1E1B4B; display: block; padding-left: 10px;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Alert -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="font-size: 12px; color: #92400E; margin: 0; line-height: 1.5;">
                      ⏱️ <strong>Valid for 10 minutes:</strong> This OTP will expire in 10 minutes. For your security, never share this code or your password with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin: 0;">
                If you did not initiate this request, you can safely ignore this email. Your current password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 12px; color: #94A3B8; margin: 0 0 6px 0;">
                Automated notification from Fabric Manager Cloud Security.
              </p>
              <p style="font-size: 11px; color: #CBD5E1; margin: 0;">
                © ${new Date().getFullYear()} Fabric Manager System. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send Password Reset OTP Email
 * @param {string} toEmail 
 * @param {string} otp 
 * @param {string} [adminName] 
 * @returns {Promise<{success: boolean, simulated: boolean, message: string, messageId?: string}>}
 */
async function sendPasswordResetOtpEmail(toEmail, otp, adminName = 'Admin') {
  const env = getEnvConfig();
  const smtpUser = env.SMTP_USER || env.GMAIL_USER || env.EMAIL_USER;
  const smtpPass = (env.SMTP_PASS || env.GMAIL_APP_PASSWORD || env.EMAIL_PASS || '').replace(/\s+/g, '');
  const fromName = env.SMTP_FROM_NAME || 'Fabric Manager Security';

  // Always simulate in test environment to guarantee hermetic offline testing
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return {
      success: true,
      simulated: true,
      message: `Test mode: OTP simulated as ${otp}.`,
      otp,
    };
  }

  // Check if Gmail SMTP credentials are provided
  if (!smtpUser || !smtpPass) {
    console.log('\n======================================================');
    console.log('⚠️  [Fabric Manager Email Service] Gmail App Password not set in .env');
    console.log(`🔑 [OTP SIMULATION] Password Reset OTP for <${toEmail}>: 👉 [ ${otp} ] 👈`);
    console.log('📌 (To enable real delivery: add SMTP_USER & SMTP_PASS to .env)');
    console.log('======================================================\n');

    return {
      success: true,
      simulated: true,
      message: `A 6-digit verification code has been sent to ${toEmail}.`,
      otp, // included for server-side testing only
    };
  }

  // Attempt real delivery through Gmail SMTP
  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Could not initialize Gmail SMTP transporter');
    }

    const fromAddress = env.SMTP_FROM || env.FROM_EMAIL || `"${fromName}" <${smtpUser}>`;
    const htmlContent = generateOtpHtmlTemplate(otp, adminName);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `🔐 Fabric Manager - Your Password Reset OTP is ${otp}`,
      html: htmlContent,
      text: `Hello ${adminName},\n\nYour Fabric Manager password reset verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
    });

    console.log(`\n✅ [Fabric Manager Email Service] Real email delivered to <${toEmail}>. Message ID: ${info.messageId}\n`);

    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      message: `A 6-digit verification code has been sent to ${toEmail}.`,
    };
  } catch (err) {
    console.error(`❌ [Fabric Manager Email Service] Failed to send email to <${toEmail}>:`, err.message);
    
    // In case of invalid credentials or network issue, log simulation fallback so demo / testing doesn't halt
    console.log(`🔑 [FALLBACK OTP] Generated code for <${toEmail}>: [ ${otp} ]`);

    return {
      success: false,
      error: `Gmail delivery error: ${err.message}. Please verify your Gmail App Password and network.`,
      simulatedFallbackOtp: otp,
    };
  }
}

module.exports = {
  sendPasswordResetOtpEmail,
  createTransporter,
  getEnvConfig,
};
