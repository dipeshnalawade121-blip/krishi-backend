<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Profile</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Load Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- Google Identity Services -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    
    <style>
        /* Custom font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
        
        :root {
            --primary-green: #059669; /* emerald-600 */
            --dark-bg: #0f172a; /* slate-900 */
            --dark-card: #1e293b; /* slate-800 */
            --dark-input: #0f172a; /* slate-900 */
            --dark-border: #334155; /* slate-700 */
            --light-text: #e2e8f0; /* slate-200 */
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--dark-bg); /* Dark background */
            color: var(--light-text);
        }

        /* General dark input styles */
        .input-field-dark {
            background-color: var(--dark-input);
            border: 1px solid var(--dark-border);
            color: var(--light-text);
        }
        .input-field-dark:focus {
            border-color: var(--primary-green);
            box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.4);
            outline: none;
        }

        /* Locked input styles (read-only) */
        .locked-input {
            background-color: #0f172a; /* Slightly darker than card for contrast */
            color: #94a3b8; /* Slate 400 */
            cursor: not-allowed;
            border-color: #334155;
        }

        /* Modal backdrop for darkening background */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 50;
        }

        /* Styles for OTP Section (Hidden by default) */
        .otp-section {
            display: none;
            flex-direction: column;
            gap: 12px; 
        }
        .otp-section.active {
            display: flex;
        }
        
        /* Custom Google button container for centering */
        .google-btn-container {
            display: flex; 
            justify-content: center;
        }

        /* Hide number input arrows */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
    </style>
</head>
<body class="min-h-screen p-4 sm:p-8 flex justify-center items-start">

    <!-- Main Profile Container (Dark Card) -->
    <div id="app" class="w-full max-w-lg bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8">
        
        <!-- Header Section -->
        <div class="flex items-center space-x-2 mb-8">
            <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.001 12.001 0 0012 21a12.001 12.001 0 008.618-17.964z"></path>
            </svg>
            <h1 class="text-2xl font-bold text-slate-100">User Profile</h1>
        </div>

        <!-- Notification/Status Message Area -->
        <div id="status-message" class="hidden p-3 mb-6 rounded-lg text-sm" role="alert"></div>

        <!-- Profile Form -->
        <form id="profile-form">
            
            <!-- User Name -->
            <div class="mb-4">
                <label for="userName" class="block text-sm font-medium text-slate-400 mb-1">User Name</label>
                <input type="text" id="userName" required maxlength="50"
                       class="w-full p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-150 locked-input input-field-dark"
                       placeholder="Your Full Name" readonly>
            </div>

            <!-- User Email -->
            <div class="mb-4">
                <label for="email" class="block text-sm font-medium text-slate-400 mb-1">User Email</label>
                <input type="email" id="email" required
                       class="w-full p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-150 locked-input input-field-dark"
                       placeholder="your.email@gmail.com" readonly>
            </div>

            <!-- Link Google Button (using GSI) -->
            <div class="mb-4" id="google-link-container">
                <label class="block text-sm font-medium text-slate-400 mb-1">Link Google Account</label>
                <div class="google-btn-container">
                    <!-- The GSI button will be rendered here -->
                    <div id="google-link-btn"></div>
                </div>
            </div>

            <hr class="my-6 border-slate-700" />
            
            <!-- User Mobile Number & OTP Send (Adjusted Layout) -->
            <div class="mb-4">
                <label for="mobileNumber" class="block text-sm font-medium text-slate-400 mb-1">User Mobile Number <span id="mobile-status-text" class="text-xs font-normal text-red-500">(Unverified)</span></label>
                
                <!-- Mobile Input Box (Full Width) -->
                <div class="flex mb-3">
                    <span class="inline-flex items-center px-3 text-sm text-slate-200 bg-slate-700 border border-r-0 border-slate-600 rounded-l-lg">
                        +91
                    </span>
                    <input type="tel" id="mobileNumber" required minlength="10" maxlength="10"
                           class="flex-1 p-3 rounded-r-lg input-field-dark focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-150"
                           placeholder="10 digit number">
                </div>

                <!-- Send OTP Button (Now full width, underneath the input) -->
                <button type="button" id="send-otp-btn"
                        class="w-full px-4 py-2 font-semibold rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 transition duration-150 disabled:bg-gray-700">
                    Send OTP
                </button>
            </div>

            <!-- OTP Input & Verify (Adjusted Layout: Stacked Block underneath) -->
            <div id="otp-section" class="otp-section mb-4">
                <input type="text" id="otp-input" placeholder="Enter 6-digit OTP" maxlength="6"
                       class="p-3 w-full rounded-lg input-field-dark focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-150"
                       disabled>
                <button type="button" id="verify-otp-btn"
                        class="w-full px-4 py-2 font-semibold rounded-lg text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition duration-150 disabled:bg-gray-700"
                        disabled>
                    Verify
                </button>
            </div>

            <!-- User Password -->
            <div class="mb-4">
                <label for="password" class="block text-sm font-medium text-slate-400 mb-1">User Password</label>
                <input type="password" id="password" required minlength="8"
                       class="w-full p-3 rounded-lg input-field-dark focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-150"
                       placeholder="Enter a secure password">
            </div>

            <!-- Save Button (Text changed) -->
            <button type="submit" id="save-button"
                    class="w-full p-3 text-lg font-bold text-white bg-emerald-600 rounded-lg shadow-lg hover:bg-emerald-700 transition duration-150 focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50 disabled:bg-gray-700"
                    disabled>
                Save Profile
            </button>
        </form>

        <!-- Display User ID for debugging/reference -->
        <div class="mt-6 text-center text-xs text-slate-500">
            <p>Your User ID: <span id="user-id">Loading...</span></p>
        </div>
    </div>
    
    <!-- Custom Validation Error Modal Structure (Dark) -->
    <div id="error-modal" class="modal-backdrop hidden">
        <div class="bg-slate-800 p-6 rounded-xl shadow-2xl w-11/12 max-w-sm transform transition-all duration-300 scale-100 border border-slate-700">
            <div class="flex items-center space-x-3 mb-4">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h3 class="text-xl font-bold text-slate-100">Validation Error</h3>
            </div>
            <p class="text-slate-400 mb-4">Please fix the following issues before updating your profile:</p>
            <ul id="modal-error-list" class="list-disc list-inside text-sm text-red-400 space-y-1 pl-4 mb-6">
                <!-- Errors will be inserted here -->
            </ul>
            <button id="close-modal-button"
                    class="w-full p-3 text-md font-semibold text-white bg-red-600 rounded-lg hover:bg-red-500 transition duration-150">
                Got It
            </button>
        </div>
    </div>

    <!-- Supabase and Logic -->
    <script type="module">
        // Supabase client (only used for auth session)
        import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
        const SUPABASE_URL = 'https://adfxhdbkqbezzliycckx.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZnhoZGJrcWJlenpsaXljY2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTIxNjMsImV4cCI6MjA3Njg4ODE2M30.VHyryBwx19-KbBbEDaE-aySr0tn-pCERk9NZXQRzsYU';
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Backend URL for API calls
        const BACKEND_URL = 'https://api.krishi.site'; 
        const GOOGLE_CLIENT_ID = '660849662071-887qddbcaq013hc3o369oimmbbsf74ov.apps.googleusercontent.com';

        // Detect signup method from URL params or session
        const urlParams = new URLSearchParams(window.location.search);
        const mobile = urlParams.get('mobile');
        const userId = urlParams.get('id');
        const googleId = urlParams.get('google_id');
        const signupMethod = urlParams.get('method') || 'mobile';

        document.getElementById('user-id').textContent = userId || 'N/A';

        let dbReady = false;
        let currentUser = null;
        let mobileVerified = false;
        let otpInterval;
        let currentMobile = mobile;

        const form = document.getElementById('profile-form');
        const saveButton = document.getElementById('save-button');
        const statusMessage = document.getElementById('status-message');
        const errorModal = document.getElementById('error-modal');
        const modalErrorList = document.getElementById('modal-error-list');
        const closeModalButton = document.getElementById('close-modal-button');
        
        // Input fields
        const inputUserName = document.getElementById('userName');
        const inputEmail = document.getElementById('email');
        const inputMobileNumber = document.getElementById('mobileNumber');
        const inputPassword = document.getElementById('password');
        
        // OTP Elements
        const sendOtpBtn = document.getElementById('send-otp-btn');
        const otpSection = document.getElementById('otp-section');
        const otpInput = document.getElementById('otp-input');
        const verifyOtpBtn = document.getElementById('verify-otp-btn');
        const mobileStatusText = document.getElementById('mobile-status-text');
        const googleLinkContainer = document.getElementById('google-link-container');

        // --- Helper Functions ---
        function lockElement(element, shouldLock) {
            element.readOnly = shouldLock;
            if (shouldLock) {
                element.classList.add('locked-input');
            } else {
                element.classList.remove('locked-input');
            }
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        function startCountdown(btn, seconds, originalText) {
            if (otpInterval) {
                clearInterval(otpInterval);
            }
            btn.disabled = true;
            const timerSpan = document.createElement('span');
            timerSpan.id = 'timer-span';
            timerSpan.className = 'ml-1 font-medium';
            btn.innerHTML = 'OTP sent! ';
            btn.appendChild(timerSpan);
            timerSpan.innerHTML = formatTime(seconds);
            btn.className = 'w-full px-4 py-2 font-semibold rounded-lg text-sm text-white bg-blue-900 transition duration-150 disabled:bg-gray-700';
            let timeLeft = seconds;
            otpInterval = setInterval(() => {
                timeLeft--;
                timerSpan.innerHTML = formatTime(timeLeft);
                if (timeLeft <= 0) {
                    clearInterval(otpInterval);
                    btn.innerHTML = originalText;
                    btn.className = 'w-full px-4 py-2 font-semibold rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 transition duration-150 disabled:bg-gray-700';
                    btn.disabled = false;
                }
            }, 1000);
        }

        /**
         * Displays a status message to the user.
         * @param {string} message - The message content.
         * @param {string} type - 'success', 'error', or 'info'.
         */
        function displayStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = `p-3 mb-6 rounded-lg text-sm transition-all duration-300 ${type === 'success' ? 'bg-green-900 text-green-300' : type === 'error' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`;
            statusMessage.classList.remove('hidden');

            setTimeout(() => {
                statusMessage.classList.add('hidden');
            }, 5000);
        }

        function checkFormValidity() {
            const isBaseValid = inputUserName.value.trim() && inputEmail.value.trim() && inputPassword.value.length >= 8;
            const canSave = isBaseValid && (mobileVerified || inputUserName.readOnly);
            saveButton.disabled = !canSave;
        }

        // --- Modal Functions ---
        function showModal(messages) {
            modalErrorList.innerHTML = messages.map(msg => `<li>${msg}</li>`).join('');
            errorModal.classList.remove('hidden');
        }

        function closeModal() {
            errorModal.classList.add('hidden');
        }

        closeModalButton.addEventListener('click', closeModal);

        // --- Google Sign In Integration (for Linking) ---
        async function handleGoogleCredentialResponse(response) {
            const id_token = response.credential;
            if (!id_token) return displayStatus('Google link failed.', 'error');
            
            displayStatus('Linking Google account...', 'info');

            try {
                const res = await fetch(`${BACKEND_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_token }),
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    inputUserName.value = data.user.user_name || inputUserName.value;
                    inputEmail.value = data.user.email || inputEmail.value;
                    
                    lockElement(inputUserName, true);
                    lockElement(inputEmail, true);
                    googleLinkContainer.style.display = 'none';
                    
                    displayStatus('Google account linked and profile updated!', 'success');
                    checkFormValidity();
                } else {
                    throw new Error(data.error || 'Linking failed');
                }
            } catch (err) {
                console.error('Google link error:', err);
                displayStatus('Failed to link Google account: ' + err.message, 'error');
            }
        }

        // Initialize Google button
        function initGoogleButton() {
            if (!window.google || !google.accounts || !google.accounts.id) {
                return setTimeout(initGoogleButton, 500);
            }

            const referenceElement = document.getElementById('save-button');
            let desiredWidth = 400; 

            if (referenceElement) {
                desiredWidth = referenceElement.offsetWidth;
            }
            
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredentialResponse,
                ux_mode: 'popup'
            });

            const linkBtnContainer = document.getElementById('google-link-btn');
            if (linkBtnContainer) {
                google.accounts.id.renderButton(linkBtnContainer, {
                    theme: 'outline', 
                    text: 'continue_with', 
                    size: 'large',
                    type: 'standard',
                    width: desiredWidth, 
                });
            }
        }

        // --- Mobile OTP Logic ---
        inputMobileNumber.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Reset verification status if mobile changes
            if (e.target.value !== currentMobile) {
                mobileVerified = false;
                mobileStatusText.innerHTML = '(Unverified)';
                mobileStatusText.classList.remove('text-green-500');
                mobileStatusText.classList.add('text-red-500');
                otpSection.classList.remove('active');
                verifyOtpBtn.innerHTML = 'Verify';
                verifyOtpBtn.disabled = true;
                otpInput.value = '';
                checkFormValidity();
            }
        });

        sendOtpBtn.addEventListener('click', async () => {
            const phoneInput = inputMobileNumber.value.replace(/[^0-9]/g, '');
            if (phoneInput.length !== 10) {
                return displayStatus('Please enter a valid 10-digit mobile number.', 'error');
            }
            currentMobile = phoneInput;

            try {
                const response = await fetch(`${BACKEND_URL}/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentMobile })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    startCountdown(sendOtpBtn, 119, 'Send OTP');
                    otpSection.classList.add('active');
                    otpInput.disabled = false;
                    displayStatus('OTP sent to your mobile!', 'success');
                } else {
                    throw new Error(data.error || 'Failed to send OTP');
                }
            } catch (error) {
                console.error(error);
                displayStatus('Error sending OTP: ' + error.message, 'error');
            }
        });

        otpInput.addEventListener('input', (e) => {
            // Only allow numbers and limit to 6 digits
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            const value = e.target.value;
            verifyOtpBtn.disabled = !(value.length === 6);
        });

        verifyOtpBtn.addEventListener('click', async () => {
            const otp = otpInput.value;
            if (currentMobile.length !== 10 || otp.length !== 6) {
                return displayStatus('Please enter valid phone and OTP.', 'error');
            }

            try {
                const response = await fetch(`${BACKEND_URL}/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentMobile, otp: otp })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    verifyOtpBtn.innerHTML = 'Verified <i data-lucide="check" class="w-4 h-4 ml-1"></i>';
                    verifyOtpBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                    verifyOtpBtn.classList.add('bg-green-700');
                    verifyOtpBtn.disabled = true;
                    otpInput.disabled = true;
                    lucide.createIcons();
                    
                    mobileVerified = true;
                    mobileStatusText.innerHTML = '(Verified)';
                    mobileStatusText.classList.remove('text-red-500');
                    mobileStatusText.classList.add('text-green-500');
                    
                    lockElement(inputMobileNumber, true);
                    sendOtpBtn.disabled = true;

                    displayStatus('Phone number verified successfully!', 'success');
                    checkFormValidity();
                } else {
                    throw new Error(data.error || 'Invalid OTP');
                }
            } catch (error) {
                console.error(error);
                displayStatus('Error verifying OTP. Please try again.', 'error');
                otpInput.value = '';
                verifyOtpBtn.disabled = true;
            }
        });

        // --- Validation Functions ---
        function validateForm() {
            const errors = [];
            if (!inputUserName.readOnly && !inputUserName.value.trim()) errors.push("User Name is required.");
            if (!inputEmail.readOnly && !inputEmail.value.trim()) errors.push("User Email is required.");
            
            // Email format validation
            if (!inputEmail.readOnly && inputEmail.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(inputEmail.value.trim())) {
                    errors.push("Please enter a valid email address.");
                }
            }
            
            // Mobile validation
            if (!inputMobileNumber.readOnly) {
                if (!inputMobileNumber.value.trim() || inputMobileNumber.value.length !== 10) {
                    errors.push("Valid 10-digit mobile number is required.");
                }
                if (!mobileVerified) {
                    errors.push("Mobile number must be verified via OTP.");
                }
            }
            
            if (!inputPassword.readOnly && (!inputPassword.value || inputPassword.value.length < 8)) {
                errors.push("Password must be at least 8 characters.");
            }
            return errors;
        }

        // --- Save Function - FIXED: Removed google_id from payload ---
        async function saveProfile(event) {
            event.preventDefault();
            const errors = validateForm();
            if (errors.length > 0) {
                showModal(errors);
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = 'Updating...';

            // Construct the payload - ONLY include fields that backend expects
            const payload = {
                id: userId,
                user_name: inputUserName.value.trim(),
                email: inputEmail.value.trim(),
            };

            // Only include mobile if verified
            if (currentMobile && mobileVerified) {
                payload.mobile = currentMobile;
            }

            // Only include password if it's not locked and has a value
            if (!inputPassword.readOnly && inputPassword.value) {
                payload.password = inputPassword.value;
            }

            console.log('Saving profile with payload:', payload);

            try {
                const res = await fetch(`${BACKEND_URL}/save-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                
                const responseText = await res.text();
                console.log('Raw server response:', responseText);
                
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse response as JSON:', responseText);
                    throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
                }
                
                console.log('Save profile response:', data);
                
                if (!res.ok) {
                    throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
                }

                if (data.success) {
                    displayStatus('Profile saved successfully!', 'success');
                    await loadProfile();
                } else {
                    throw new Error(data.error || 'Profile save failed');
                }
            } catch (error) {
                console.error("Error updating profile:", error);
                displayStatus('Error updating profile: ' + error.message, 'error');
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Profile';
            }
        }

        // --- Load Profile - FIXED: Only sends id to backend ---
        async function loadProfile() {
            if (!userId) {
                displayStatus('No user ID found for profile lookup.', 'error');
                return;
            }

            // Backend only expects 'id' for get-user-profile
            const payload = {
                id: userId
            };

            try {
                const res = await fetch(`${BACKEND_URL}/get-user-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                
                const responseText = await res.text();
                let data;
                
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse profile response as JSON:', responseText);
                    throw new Error('Server returned invalid response');
                }
                
                if (!res.ok || !data.success || !data.user) {
                    throw new Error(data.error || 'User profile not found');
                }
                
                const user = data.user;
                
                inputUserName.value = user.user_name || '';
                inputEmail.value = user.email || '';
                inputMobileNumber.value = user.mobile || '';
                currentMobile = user.mobile;

                mobileVerified = !!user.mobile;
                
                if (mobileVerified) {
                    mobileStatusText.innerHTML = '(Verified)';
                    mobileStatusText.classList.remove('text-red-500');
                    mobileStatusText.classList.add('text-green-500');
                }
                
                const nameEmailExists = !!user.user_name && !!user.email;
                
                // For Google users, name and email should be locked by default
                if (googleId || nameEmailExists) {
                    lockElement(inputUserName, true);
                    lockElement(inputEmail, true);
                    googleLinkContainer.style.display = 'none';
                } else {
                    googleLinkContainer.style.display = 'block';
                    lockElement(inputUserName, false);
                    lockElement(inputEmail, false);
                }

                const profileIsFull = nameEmailExists && mobileVerified;
                
                if (profileIsFull) {
                    lockElement(inputMobileNumber, true);
                    sendOtpBtn.disabled = true;
                    lockElement(inputPassword, true);
                    googleLinkContainer.style.display = 'none';
                } else if (mobileVerified) {
                    lockElement(inputMobileNumber, true);
                    sendOtpBtn.disabled = true;
                    lockElement(inputPassword, false);
                } else {
                    lockElement(inputMobileNumber, false);
                    sendOtpBtn.disabled = false;
                    lockElement(inputPassword, false);
                }

                checkFormValidity();
                
            } catch (error) {
                console.error("Error loading profile:", error);
                displayStatus('Failed to load profile data: ' + error.message, 'error');
            }
        }
        
        // --- Event Listeners for Validation Check ---
        inputUserName.addEventListener('input', checkFormValidity);
        inputEmail.addEventListener('input', checkFormValidity);
        inputPassword.addEventListener('input', checkFormValidity);

        // --- Initialization ---
        async function initApp() {
            dbReady = true;

            const { data: { session } } = await supabase.auth.getSession();
            if (session) currentUser = session.user;
            
            initGoogleButton();

            await loadProfile();
            
            form.addEventListener('submit', saveProfile);
            displayStatus('Profile ready!', 'success');
        }

        window.addEventListener('load', initApp);

        // Listen for auth changes (for Google redirect)
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                location.reload();
            }
        });
        
        lucide.createIcons();
    </script>
</body>
</html>
