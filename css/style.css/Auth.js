// ============================================================
//  THE SHEPHERD'S LIBRARY — Authentication
//  js/auth.js
//  Handles: sign up, sign in, Google OAuth, sign out, session
// ============================================================

const Auth = {

  // ── Get current session ─────────────────────────────────
  async getSession() {
    const { data: { session }, error } = await db.auth.getSession();
    return { session, error };
  },

  // ── Get current user ────────────────────────────────────
  async getUser() {
    const { data: { user }, error } = await db.auth.getUser();
    return { user, error };
  },

  // ── Get user profile from profiles table ────────────────
  async getProfile(userId) {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { profile: data, error };
  },

  // ── Sign Up with email & password ───────────────────────
  async signUp({ email, password, fullName, userType = 'General Believer' }) {
    // 1. Create auth user
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:  fullName,
          user_type:  userType,
        }
      }
    });

    if (error) return { error };

    // 2. Profile is auto-created by database trigger
    // 3. Show confirmation message
    return { data, error: null };
  },

  // ── Sign In with email & password ───────────────────────
  async signIn({ email, password }) {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // ── Sign In with Google OAuth ────────────────────────────
  async signInWithGoogle() {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${APP.baseUrl}/dashboard.html`,
      }
    });
    return { data, error };
  },

  // ── Sign Out ─────────────────────────────────────────────
  async signOut() {
    const { error } = await db.auth.signOut();
    if (!error) {
      goTo(APP.routes.login);
    }
    return { error };
  },

  // ── Send password reset email ────────────────────────────
  async resetPassword(email) {
    const { data, error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP.baseUrl}/account.html?tab=password`,
    });
    return { data, error };
  },

  // ── Update password ──────────────────────────────────────
  async updatePassword(newPassword) {
    const { data, error } = await db.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // ── Update profile ───────────────────────────────────────
  async updateProfile(userId, updates) {
    const { data, error } = await db
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // ── Listen for auth state changes ────────────────────────
  onAuthStateChange(callback) {
    return db.auth.onAuthStateChange(callback);
  },

  // ── Format error messages ────────────────────────────────
  friendlyError(error) {
    if (!error) return '';
    const msg = error.message || '';
    const map = {
      'Invalid login credentials':          'Incorrect email or password. Please try again.',
      'Email not confirmed':                 'Please check your email and click the confirmation link.',
      'User already registered':             'An account with this email already exists. Try signing in.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters.',
      'Unable to validate email address':    'Please enter a valid email address.',
      'signup is disabled':                  'New sign ups are temporarily disabled.',
      'Email rate limit exceeded':           'Too many attempts. Please wait a moment and try again.',
    };
    for (const [key, val] of Object.entries(map)) {
      if (msg.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return msg || 'Something went wrong. Please try again.';
  },
};
