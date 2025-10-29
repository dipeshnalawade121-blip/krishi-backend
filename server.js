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

// Timezone fix (if logs show future dates)
process.env.TZ = 'Asia/Kolkata';

const PORT = process.env.PORT || 3000;
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;

// Supabase connection
const SUPABASE_URL = 'https://adfxhdbkqbezzliycckx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZnhoZGJrcWJlenpsaXljY2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTIxNjMsImV4cCI6MjA3Njg4ODE2M30.VHyryBwx19-KbBbEDaE-aySr0tn-pCERk9NZXQRzsYU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Send OTP
app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const otp = generateOTP();
  otpStore[phone] = otp;

  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      numbers: phone,
      message: `Your Krishi OTP is ${otp}. Do not share.`,
      flash: 0
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
    console.error('fast2sms request error ->', err.response?.data || err.message);
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
    return res.status(400).json({ error: 'Invalid mobile or password (must be 6+ chars)' });
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('mobile')
      .eq('mobile', mobile)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this mobile number' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from('users')
      .insert([{ mobile: mobile, password_hash: hashedPassword }])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    return res.json({ success: true, message: 'Account created successfully!', user: { id: data.id, mobile: data.mobile } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || mobile.length !== 10 || !password) {
    return res.status(400).json({ error: 'Invalid mobile or password' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    return res.json({ success: true, message: 'Logged in successfully!', user: { mobile: user.mobile, id: user.id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || mobile.length !== 10 || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid mobile or password (must be 6+ chars)' });
  }

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', mobile)
      .single();

    if (findError || !user) {
      return res.status(404).json({ error: 'User not found with this mobile number' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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

// Get User Profile
app.post('/get-user-profile', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || mobile.length !== 10) {
    return res.status(400).json({ error: 'Invalid mobile number' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_name, shop_name, email, shop_address')
      .eq('mobile', mobile)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.json({ success: true, user: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Save Profile
app.post('/save-profile', async (req, res) => {
  const { mobile, shop_name, user_name, email, shop_address } = req.body;
  if (!mobile || mobile.length !== 10 || !shop_name || !user_name || !shop_address) {
    return res.status(400).json({ error: 'Missing required profile fields' });
  }

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', mobile)
      .single();

    if (findError || !user) {
      return res.status(404).json({ error: 'User not found with this mobile' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        shop_name: shop_name.trim(),
        user_name: user_name.trim(),
        email: email ? email.trim() : null,
        shop_address: shop_address.trim()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    return res.json({ success: true, message: 'Profile saved successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Profile save failed' });
  }
});

// Google Auth (Fixed: Handle schema errors, explicit nulls)
app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ error: 'Missing Google ID token' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // Debug log (remove in prod)
    console.log('Token verification details:', {
      aud: payload.aud,
      iss: payload.iss,
      sub: payload.sub,
      exp: payload.exp,
      origin: req.headers.origin
    });

    // Check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', sub)
      .single();

    let user;

    if (!existingUser) {
      // Create new user (mobile null for Google users)
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            google_id: sub,
            email: email || null,
            user_name: name || null,
            profile_pic: picture || null,  // Now safe post-schema update
            mobile: null  // Explicit null; safe after ALTER
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Google login error:', insertError);
        return res.status(500).json({ error: 'Failed to create Google user account', details: insertError.message });
      }
      user = newUser;
    } else {
      user = existingUser;
    }

    return res.json({
      success: true,
      message: 'Google login successful!',
      user,
    });
  } catch (err) {
    console.error('Google login error:', err);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Forgot OTP (missing in your original? Add if needed)
app.post('/forgot-otp', async (req, res) => {
  // Reuse /send-otp logic, but call it /forgot-otp for separation
  return app.post('/send-otp')(req, res);  // Proxy to send-otp
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on 0.0.0.0:${PORT}`));
