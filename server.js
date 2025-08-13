// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS config ---
const corsOptions = {
  origin: true, // Reflect request origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight quickly

app.use(bodyParser.json());

// In-memory store (replace with DB later)
let requests = [];

// --- Nodemailer transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER, // your Gmail
    pass: process.env.SMTP_PASS  // Gmail App Password
  }
});

// --- POST endpoint ---
app.post('/back-in-stock', (req, res) => {
  const { 
    email, 
    product_id, 
    product_title, 
    product_handle, 
    variant_id, 
    store_domain,
    request_type, // NEW
    message       // NEW (for available on request form)
  } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Save request
  const entry = {
    email,
    product_id,
    product_title,
    product_handle,
    variant_id,
    store_domain,
    request_type,
    message,
    date: new Date()
  };
  requests.push(entry);

  console.log(`New ${request_type || 'back_in_stock'} request:`, email, product_title);

  // Respond immediately to browser
  res.json({ success: true, queued: true });

  // Pick subject based on type
  const subjectPrefix = request_type === 'available_on_request' 
    ? 'Available on Request' 
    : 'Back-in-stock request';

  // Send email in background
  transporter.sendMail({
    from: `"Stock Requests" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: process.env.TO_EMAIL || 'privalsports@gmail.com',
    subject: `${subjectPrefix}: ${product_title}`,
    text:
`New ${subjectPrefix} from: ${email}
Product: ${product_title}
Variant ID: ${variant_id || '-'}
Product ID: ${product_id}
Handle: ${product_handle || '-'}
Store: ${store_domain || '-'}
Message: ${message || '-'}
Time: ${new Date().toISOString()}`,
    html: `
      <h3>New ${subjectPrefix}</h3>
      <ul>
        <li><b>Email:</b> ${email}</li>
        <li><b>Product:</b> ${product_title}</li>
        <li><b>Variant ID:</b> ${variant_id || '-'}</li>
        <li><b>Product ID:</b> ${product_id}</li>
        <li><b>Handle:</b> ${product_handle || '-'}</li>
        <li><b>Store:</b> ${store_domain || '-'}</li>
        <li><b>Message:</b> ${message || '-'}</li>
        <li><b>Time:</b> ${new Date().toLocaleString()}</li>
      </ul>
    `
  })
  .then(() => console.log(`${subjectPrefix} email sent`))
  .catch(err => console.error(`Failed to send ${subjectPrefix} email:`, err.message));
});

// --- Debug endpoint ---
app.get('/back-in-stock', (_req, res) => {
  res.json(requests);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
