// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ------ CORS (you can restrict to your domains later) ------
app.use(cors());
// Example to lock it down later:
// app.use(cors({ origin: ['https://YOUR-STORE.myshopify.com','https://YOUR-DOMAIN.com'] }));

app.use(bodyParser.json());

// In-memory store (replace with DB later)
let requests = [];

// ------ Email (configure via env vars; works with Gmail or any SMTP) ------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // e.g. privalsports@gmail.com
    pass: process.env.SMTP_PASS  // Gmail App Password (not your normal password)
  }
});

// Endpoint for Shopify form
app.post('/back-in-stock', async (req, res) => {
  const {
    email,
    product_id,
    product_title,
    product_handle,
    variant_id,
    store_domain
  } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Save request (temporary in-memory)
  const entry = {
    email,
    product_id,
    product_title,
    product_handle,
    variant_id,
    store_domain,
    date: new Date()
  };
  requests.push(entry);

  console.log('New back-in-stock request:', email, product_title);

  // Send notification email to you
  let emailed = false;
  try {
    await transporter.sendMail({
      from: `"Back in Stock" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || 'privalsports@gmail.com',
      subject: `Back-in-stock request: ${product_title}`,
      text:
`New request from: ${email}
Product: ${product_title}
Variant ID: ${variant_id || '-'}
Product ID: ${product_id}
Handle: ${product_handle || '-'}
Store: ${store_domain || '-'}
Time: ${new Date().toISOString()}`,
      html: `
        <h3>New Back-in-Stock Request</h3>
        <ul>
          <li><b>Email:</b> ${email}</li>
          <li><b>Product:</b> ${product_title}</li>
          <li><b>Variant ID:</b> ${variant_id || '-'}</li>
          <li><b>Product ID:</b> ${product_id}</li>
          <li><b>Handle:</b> ${product_handle || '-'}</li>
          <li><b>Store:</b> ${store_domain || '-'}</li>
          <li><b>Time:</b> ${new Date().toLocaleString()}</li>
        </ul>
      `
    });
    console.log('Notification email sent to you');
    emailed = true;
  } catch (err) {
    console.error('Failed to send email:', err.message);
  }

  res.json({ success: true, emailed });
});

// Check stored requests (for debugging)
app.get('/back-in-stock', (req, res) => {
  res.json(requests);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
