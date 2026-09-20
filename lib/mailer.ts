import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCureEmail(email: string, url: string, edgeScriptLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>', // Or a verified domain, defaulting to resend's dev
      to: [email],
      subject: `Your CURE script for ${url}`,
      html: `
        <div>
          <h1>Thank you for your purchase!</h1>
          <p>Here is the script you need to include in your website (<strong>${url}</strong>):</p>
          <pre><code>&lt;script src="${edgeScriptLink}"&gt;&lt;/script&gt;</code></pre>
          <p>Add this just before the closing <code>&lt;/head&gt;</code> or <code>&lt;/body&gt;</code> tag of your HTML.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    return null;
  }
}
