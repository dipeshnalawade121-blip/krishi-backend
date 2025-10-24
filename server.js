require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt'); // For secure password hashing
const { createClient } = require('@supabase/supabase-js'); // Supabase client

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;

// Supabase connection (using your provided details; RLS is OFF, so anon key works for inserts/updates)
const SUPABASE_URL = 'https://adfxhdbkqbezzliycckx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZnhoZGJrcWJlenpsaXljY2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTIxNjMsImV4cCI6MjA3Njg4ODE2M30.VHyryBwx19-KbBbEDaE-aySr0tn-pCERk9NZXQRzsYU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Register endpoint (new: creates user after OTP verification)
app.post('/register', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || mobile.length !== 10 || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid mobile or password (must be 6+ chars)' });
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('mobile')
      .eq('mobile', mobile)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      throw checkError;
    }
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this mobile number' });
    }

    // Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert([
        { mobile: mobile, password_hash: hashedPassword }
      ])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    return res.json({ success: true, message: 'Account created successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint (new: verifies mobile and password)
app.post('/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || mobile.length !== 10 || !password) {
    return res.status(400).json({ error: 'Invalid mobile or password' });
  }

  try {
    // Find user by mobile
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    // In a real app, generate a JWT token here for sessions
    return res.json({ success: true, message: 'Logged in successfully!', user: { mobile: user.mobile } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Reset Password endpoint (new: updates password after OTP verification)
app.post('/reset-password', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || mobile.length !== 10 || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid mobile or password (must be 6+ chars)' });
  }

  try {
    // Find user by mobile
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', mobile)
      .single();

    if (findError || !user) {
      return res.status(404).json({ error: 'User not found with this mobile number' });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    return res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on 0.0.0.0:${PORT}`));
