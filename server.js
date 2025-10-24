require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;

// In-memory store for OTP (for simplicity; use Redis/DB in production)
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Send OTP endpoint (updated for Quick SMS route without DLT)
app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const otp = generateOTP();
  otpStore[phone] = otp; // Store OTP in memory for verification

  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',  // Quick SMS route for non-DLT (international routing, random numeric Sender ID)
      numbers: phone,
      message: `Your Krishi OTP is ${otp}. Do not share.`,
      flash: 0  // Non-flash message (matches plan; set to 1 for flash if needed)
      // Note: No sender_id needed; auto-random numeric ID for Quick SMS
    }, {
      headers: {
        authorization: FAST2SMS_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.return) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Fast2SMS failed', details: response.data });
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint (unchanged; works with the updated send flow)
app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] && parseInt(otp) === otpStore[phone]) {
    delete otpStore[phone]; // Remove OTP after verification
    return res.json({ success: true });
  } else {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
});

// TODO: Add /register, /login, /reset-password endpoints (e.g., using a DB like MongoDB for user storage)
// For example:
// app.post('/register', (req, res) => { ... });
// app.post('/login', (req, res) => { ... });
// app.post('/reset-password', (req, res) => { ... });

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on 0.0.0.0:${PORT}`));
