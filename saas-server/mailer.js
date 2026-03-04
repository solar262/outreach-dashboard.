const nodemailer = require('nodemailer');

/**
 * Mailer — sends API keys to customers automatically after payment.
 * Uses Gmail SMTP by default (free).
 * Set env vars: EMAIL_USER and EMAIL_PASS (use a Gmail App Password).
 * 
 * To get a Gmail App Password:
 * Google Account → Security → 2FA enabled → App Passwords → Generate
 */

function createTransport() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, // App Password, not your real Gmail password
            },
        });
    }
    // Dev fallback: log to console only
    return null;
}

async function sendKeyEmail(record) {
    const { email, name, apiKey, plan } = record;
    const firstName = (name || email).split(' ')[0].split('@')[0];

    const planLimits = {
        free: '5 generations/day',
        pro: '500 generations/day',
        agency: 'Unlimited generations',
    };

    const subject = `🚀 Your AI Outreach Studio API Key — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#06070f;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);margin-right:8px"></div>
      <span style="color:#f0f0f8;font-size:18px;font-weight:800">AI Outreach Studio</span>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px">
      <h1 style="color:#f0f0f8;font-size:22px;font-weight:800;margin:0 0 8px">You're in, ${firstName}. 🎯</h1>
      <p style="color:#8888aa;font-size:15px;margin:0 0 28px">Your ${plan.toUpperCase()} plan is active. Here's everything you need.</p>

      <div style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:20px;margin-bottom:24px">
        <div style="color:#a855f7;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Your API Key</div>
        <div style="color:#f0f0f8;font-size:14px;font-family:'Courier New',monospace;font-weight:600;word-break:break-all">${apiKey}</div>
      </div>

      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:16px;margin-bottom:24px">
        <div style="color:#8888aa;font-size:13px;line-height:1.8">
          <strong style="color:#f0f0f8">Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}<br>
          <strong style="color:#f0f0f8">Daily Limit:</strong> ${planLimits[plan] || 'See dashboard'}<br>
          <strong style="color:#f0f0f8">App Dashboard:</strong> <a href="http://localhost:3500/app" style="color:#a855f7">Open Dashboard</a>
        </div>
      </div>

      <div style="margin-bottom:24px">
        <div style="color:#f0f0f8;font-size:14px;font-weight:600;margin-bottom:12px">Quick Start:</div>
        <div style="color:#8888aa;font-size:13px;line-height:2">
          1. Go to the dashboard<br>
          2. Paste your API key in the top bar<br>
          3. Pick a tool and start generating
        </div>
      </div>

      <a href="http://localhost:3500/app" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px">
        Open AI Outreach Studio →
      </a>
    </div>

    <p style="color:#555577;font-size:12px;text-align:center;margin-top:24px">
      Keep this key safe — it's tied to your account.<br>
      Reply to this email if you need any help.
    </p>
  </div>
</body>
</html>`;

    const transport = createTransport();

    if (!transport) {
        // Dev mode: just log it
        console.log(`\n📧 [EMAIL — DEV MODE] Would send to: ${email}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   API Key: ${apiKey}`);
        console.log(`   Plan: ${plan}\n`);
        return { success: true, mode: 'console' };
    }

    await transport.sendMail({
        from: `"AI Outreach Studio" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
    });

    console.log(`[Mailer] ✅ API key emailed to ${email}`);
    return { success: true, mode: 'email' };
}

module.exports = { sendKeyEmail };
