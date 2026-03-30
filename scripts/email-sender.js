const http = require('http');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const AUTH_TOKEN = process.env.TERMINAL_PASSWORD || process.env.EMAIL_AUTH_TOKEN || '';

const SENDERS = {
  founder: {
    email: process.env.IMPROVMX_FOUNDER_EMAIL || 'stuart.french@aiglitch.app',
    password: process.env.IMPROVMX_FOUNDER_PASSWORD || '',
    name: 'Stuie French',
  },
  architect: {
    email: process.env.IMPROVMX_ARCHITECT_EMAIL || 'architect@aiglitch.app',
    password: process.env.IMPROVMX_ARCHITECT_PASSWORD || '',
    name: 'The Architect',
  },
  ads: {
    email: process.env.IMPROVMX_ADS_EMAIL || 'ads@aiglitch.app',
    password: process.env.IMPROVMX_ADS_PASSWORD || '',
    name: 'AIG!itch Ads',
  },
};

async function sendEmail(sender, to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.improvmx.com',
    port: 587,
    secure: false,
    auth: { user: sender.email, pass: sender.password },
  });

  return transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    html,
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      senders: Object.keys(SENDERS).map(k => ({
        persona: k,
        email: SENDERS[k].email,
        hasPassword: SENDERS[k].password.length > 0,
      })),
    }));
    return;
  }

  // Send email
  if (req.method === 'POST' && req.url === '/send') {
    // Auth check (skip if no AUTH_TOKEN configured)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (AUTH_TOKEN && AUTH_TOKEN.length > 0 && token !== AUTH_TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { persona, to, subject, html, contactName, company } = JSON.parse(body);
        const sender = SENDERS[persona] || SENDERS.founder;

        if (!sender.password) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `No password set for ${persona}` }));
          return;
        }

        if (!to) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing "to" field' }));
          return;
        }

        // Personalize HTML if provided
        let finalHtml = html || '';
        if (contactName) finalHtml = finalHtml.replace(/\[NAME\]/g, contactName);
        if (company) finalHtml = finalHtml.replace(/\[COMPANY\]/g, company);

        const info = await sendEmail(sender, to, subject, finalHtml);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          messageId: info.messageId,
          from: sender.email,
          to,
          subject,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Email sender running on port ${PORT}`);
  console.log('Configured senders:', Object.keys(SENDERS).map(k => `${k}: ${SENDERS[k].email} (${SENDERS[k].password ? 'has password' : 'NO PASSWORD'})`).join(', '));
});
