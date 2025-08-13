const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store (replace with DB later)
let requests = [];

app.use(cors());
app.use(bodyParser.json());

// Endpoint for Shopify form
app.post('/back-in-stock', (req, res) => {
  const { email, product_id, product_title } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Save request
  requests.push({
    email,
    product_id,
    product_title,
    date: new Date()
  });

  console.log('New back-in-stock request:', email, product_title);

  // Respond
  res.json({ success: true });
});

// Check stored requests (for debugging)
app.get('/back-in-stock', (req, res) => {
  res.json(requests);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
