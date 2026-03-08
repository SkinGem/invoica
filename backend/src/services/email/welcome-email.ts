import nodemailer from 'nodemailer';

/**
 * Sends a welcome email to a new API key holder
 * @param to - Recipient email address
 * @param apiKeyPrefix - First 8 characters of the API key for display
 */
export async function sendWelcomeEmail(to: string, apiKeyPrefix: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  
  if (!smtpUser) {
    console.log('SMTP not configured — skipping welcome email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: smtpUser,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="font-family: sans-serif; color: #0A2540;">Welcome to Invoica</h2>
      
      <p>Your key starts with: <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px;">${apiKeyPrefix}...</code> Keep it secret.</p>
      
      <p>3 things to do next:</p>
      <ol>
        <li><a href="https://invoica.mintlify.app/quickstart">Read the 10-minute quickstart</a></li>
        <li><a href="https://invoica.mintlify.app/api-reference/invoices/create">Create your first invoice via API</a></li>
        <li><a href="https://twitter.com/NexusCollectv">Follow @invoica_ai for updates</a></li>
      </ol>
      
      <p style="color: #6B7280; font-size: 13px;">Questions? Reply here or email support@invoica.ai</p>
    </div>
  `;

  const textBody = `Welcome to Invoica

Your key starts with: ${apiKeyPrefix}... Keep it secret.

3 things to do next:
1. Read the 10-minute quickstart: https://invoica.mintlify.app/quickstart
2. Create your first invoice via API: https://invoica.mintlify.app/api-reference/invoices/create
3. Follow @invoica_ai for updates: https://twitter.com/NexusCollectv

Questions? Reply here or email support@invoica.ai`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'hello@invoica.ai',
    to,
    subject: 'Welcome to Invoica — your API key is ready',
    text: textBody,
    html: htmlBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - this is a non-critical operation
  }
}