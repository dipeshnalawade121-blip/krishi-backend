require('dotenv').config(); //hi dipu
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// Timezone fix
process.env.TZ = 'Asia/Kolkata';

// ======================
// Basic Config
// ======================
const PORT = process.env.PORT || 3000;
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;

// Supabase connection
const SUPABASE_URL = 'https://adfxhdbkqbezzliycckx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZnhoZGJrcWJlenpsaXljY2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTIxNjMsImV4cCI6MjA3Njg4ODE2M30.VHyryBwx19-KbBbEDaE-aySr0tn-pCERk9NZXQRzsYU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// ======================
// AUTH + ACCOUNT ROUTES
// ======================

// Send OTP
app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const TEST_PHONE = '9999999999';
  const FAKE_OTP = 123456;
  if (phone === TEST_PHONE) {
    otpStore[phone] = FAKE_OTP;
    console.log(`[TEST MODE] Fake OTP for ${phone}: ${FAKE_OTP}`);
    return res.json({ success: true });
  }

  const otp = generateOTP();
  otpStore[phone] = otp;

  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        numbers: phone,
        message: `Your Krishi OTP is ${otp}. Do not share.`,
        flash: 0,
      },
      {
        headers: {
          authorization: FAST2SMS_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.return) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Fast2SMS failed', details: response.data });
    }
  } catch (err) {
    console.error('fast2sms error ->', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] && parseInt(otp) === otpStore[phone]) {
    delete otpStore[phone];
    return res.json({ success: true });
  } else {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
});

// Register
app.post('/register', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || mobile.length !== 10 || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid mobile or password' });
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('mobile')
      .eq('mobile', mobile)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([{ mobile, password_hash: hashedPassword }])
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, message: 'Account created!', user: { id: data.id, mobile: data.mobile } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) return res.status(400).json({ error: 'Invalid credentials' });

  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('mobile', mobile).single();
    if (error || !user) return res.status(401).json({ error: 'Invalid mobile or password' });

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid mobile or password' });

    return res.json({ success: true, message: 'Login success', user: { id: user.id, mobile: user.mobile } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const { data: user, error: findError } = await supabase.from('users').select('id').eq('mobile', mobile).single();
    if (findError || !user) return res.status(404).json({ error: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('users').update({ password_hash: hashedPassword }).eq('id', user.id);
    if (error) throw error;

    return res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Reset failed' });
  }
});

// ======================
// PROFILE ROUTES
// ======================

// Get user profile (now includes products + banners)
app.post('/get-user-profile', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID required' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_name, email, mobile, shop_name, shop_number, shop_address, products, banners')
      .eq('id', id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'Profile not found' });
    return res.json({ success: true, user });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Save profile
app.post('/save-profile', async (req, res) => {
  const { id, mobile, user_name, email, password } = req.body;
  if (!id || !user_name) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const updatePayload = {
      user_name: user_name.trim(),
      email: email ? email.trim() : null,
    };
    if (mobile) updatePayload.mobile = mobile.trim();
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
      updatePayload.password_hash = await bcrypt.hash(password, 10);
    }

    const { error } = await supabase.from('users').update(updatePayload).eq('id', id);
    if (error) throw error;

    return res.json({ success: true, message: 'Profile saved!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Profile save failed' });
  }
});

// Save shop profile
app.post('/save-shop-profile', async (req, res) => {
  const { id, mobile, shop_name, shop_number, shop_address } = req.body;
  if ((!id && !mobile) || !shop_name || !shop_number || !shop_address)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    let findKey = id ? 'id' : 'mobile';
    let findValue = id ? id : mobile;
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq(findKey, findValue)
      .single();

    if (findError || !user) return res.status(404).json({ error: 'User not found' });

    const { error } = await supabase
      .from('users')
      .update({
        shop_name: shop_name.trim(),
        shop_number: shop_number.trim(),
        shop_address: shop_address.trim(),
      })
      .eq('id', user.id);
    if (error) throw error;

    return res.json({ success: true, message: 'Shop profile saved!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Shop profile save failed' });
  }
});

// ======================
// DASHBOARD ROUTES (NEW)
// ======================

// Save products
app.post('/save-products', async (req, res) => {
  const { id, products } = req.body;
  if (!id || !Array.isArray(products))
    return res.status(400).json({ error: 'Missing user ID or invalid products' });

  try {
    if (products.length > 50)
      return res.status(400).json({ error: 'Maximum 50 products allowed' });

    const { error } = await supabase.from('users').update({ products }).eq('id', id);
    if (error) throw error;

    return res.json({ success: true, message: 'Products saved successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Products save failed' });
  }
});

// Save banners
app.post('/save-banners', async (req, res) => {
  const { id, banners } = req.body;
  if (!id || !Array.isArray(banners))
    return res.status(400).json({ error: 'Missing user ID or invalid banners' });

  try {
    if (banners.length > 3)
      return res.status(400).json({ error: 'Maximum 3 banners allowed' });

    const { error } = await supabase.from('users').update({ banners }).eq('id', id);
    if (error) throw error;

    return res.json({ success: true, message: 'Banners saved successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Banners save failed' });
  }
});

// ======================
// GOOGLE AUTH + FORGOT OTP
// ======================
app.post('/auth/google', async (req, res) => {
  const { id_token, existing_user_id } = req.body;
  if (!id_token) return res.status(400).json({ error: 'Missing Google token' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    let user;

    const { data: existingGoogleUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', sub)
      .single();

    if (existingGoogleUser) {
      user = existingGoogleUser;
    } else if (existing_user_id) {
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          google_id: sub,
          email: email || null,
          user_name: name || null,
          profile_pic: picture || null,
        })
        .eq('id', existing_user_id)
        .select()
        .single();
      user = updatedUser;
    } else {
      const { data: newUser } = await supabase
        .from('users')
        .insert([{ google_id: sub, email, user_name: name, profile_pic: picture, mobile: null }])
        .select()
        .single();
      user = newUser;
    }

    return res.json({ success: true, message: 'Google link/login successful!', user });
  } catch (err) {
    console.error('Google link error:', err);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Forgot OTP (reuses send-otp)
app.post('/forgot-otp', async (req, res) => app.post('/send-otp')(req, res));

// ======================
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
);
