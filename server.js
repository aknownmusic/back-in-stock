// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS configuration ---
const corsOptions = {
  origin: true, // Reflect request origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight

// --- Body parsing ---
app.use(bodyParser.json());

// Temporary in-memory store (replace with DB later)
let requests = [];

// --- Email transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // Gmail address
    pass: process.env.SMTP_PASS  // Gmail App Password
  }
});

// --- POST endpoint for form submissions ---
app.post('/back-in-stock', (req, res) => {
  const {
    email,
    message,
    product_id,
    product_title,
    product_handle,
    variant_id,
    store_domain,
    request_type
  } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Save request to memory
  const entry = {
    email,
    message: message || '',
    product_id,
    product_title,
    product_handle,
    variant_id,
    store_domain,
    request_type: request_type || 'back_in_stock',
    date: new Date()
  };
  requests.push(entry);

  console.log(`New ${entry.request_type} request:`, email, product_title);

  // Send response immediately so the form doesn't hang
  res.json({ success: true, queued: true });

  // Email subject depending on request type
  const subjectPrefix =
    entry.request_type === 'available_on_request'
      ? 'Available-on-request inquiry'
      : 'Back-in-stock request';

  // Send notification email in background
  transporter
    .sendMail({
      from: `"Shop Notification" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || 'privalsports@gmail.com',
      subject: `${subjectPrefix}: ${product_title}`,
      text: `
New request from: ${email}
${message ? `Message: ${message}\n` : ''}
Product: ${product_title}
Variant ID: ${variant_id || '-'}
Product ID: ${product_id}
Handle: ${product_handle || '-'}
Store: ${store_domain || '-'}
Time: ${new Date().toISOString()}
      `,
      html: `
        <h3>${subjectPrefix}</h3>
        <ul>
          <li><b>Email:</b> ${email}</li>
          ${message ? `<li><b>Message:</b> ${message}</li>` : ''}
          <li><b>Product:</b> ${product_title}</li>
          <li><b>Variant ID:</b> ${variant_id || '-'}</li>
          <li><b>Product ID:</b> ${product_id}</li>
          <li><b>Handle:</b> ${product_handle || '-'}</li>
          <li><b>Store:</b> ${store_domain || '-'}</li>
          <li><b>Time:</b> ${new Date().toLocaleString()}</li>
        </ul>
      `
    })
    .then(() => console.log('Notification email sent'))
    .catch(err => console.error('Failed to send email:', err.message));
});

// --- Debug endpoint ---
app.get('/back-in-stock', (_req, res) => {
  res.json(requests);
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
