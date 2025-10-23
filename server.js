require('dotenv').config();
const express = require('express');
const cors = require('cors');
app.use(cors());
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;

// In-memory store for OTP (for simplicity)
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const otp = generateOTP();
  otpStore[phone] = otp; // store OTP in memory for verification

  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: "v3",
      sender_id: "FSTSMS",
      message: `Your Krishi OTP is ${otp}. Do not share.`,
      numbers: phone
    }, {
      headers: {
        authorization: FAST2SMS_KEY,
        'Content-Type': 'application/json'
      }
    });

    if(response.data.return){
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Fast2SMS failed', details: response.data });
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] && parseInt(otp) === otpStore[phone]) {
    delete otpStore[phone]; // remove OTP after verification
    return res.json({ success: true });
  } else {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

