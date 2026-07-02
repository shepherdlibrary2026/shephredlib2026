// ============================================================
//  THE SHEPHERD'S LIBRARY — Route Protection
//  js/protect.js
//  Add to dashboard.html, account.html and any private page.
//  Must load AFTER config.js
// ============================================================

const Protect = {

  // ── Require user to be logged in ─────────────────────────
  // Redirects to login.html if no session found
  async requireAuth() {
    const { session, error } = await Auth.getSession();

    if (error || !session) {
      // Save intended destination so we can redirect back after login
      const returnTo = window.location.pathname + window.location.search;
      sessionStorage.setItem('returnTo', returnTo);
      goTo(APP.routes.login + '?reason=auth');
      return null;
    }

    return session;
  },

  // ── Require user to NOT be logged in ─────────────────────
  // Redirects to dashboard if already authenticated
  // Use on login.html and signup.html
  async requireGuest() {
    const { session } = await Auth.getSession();

    if (session) {
      // Already logged in — check if there's a saved destination
      const returnTo = sessionStorage.getItem('returnTo');
      sessionStorage.removeItem('returnTo');
      goTo(returnTo || APP.routes.dashboard);
      return null;
    }

    return true;
  },

  // ── Load user and populate page UI ───────────────────────
  async loadUser() {
    const session = await this.requireAuth();
    if (!session) return null;

    const { profile, error } = await Auth.getProfile(session.user.id);

    if (error || !profile) {
      // Profile missing — sign out and restart
      await Auth.signOut();
      return null;
    }

    // Store profile in memory for this page session
    window.currentUser    = session.user;
    window.currentProfile = profile;

    return profile;
  },

  // ── Populate sidebar user info ────────────────────────────
  populateSidebarUser(profile) {
    const nameEl     = document.getElementById('sidebar-user-name');
    const planEl     = document.getElementById('sidebar-user-plan');
    const avatarEl   = document.getElementById('sidebar-avatar');
    const topAvatarEl = document.getElementById('topbar-avatar');

    const name      = profile.full_name || profile.display_name || profile.email;
    const plan      = profile.subscription_tier || 'free';
    const initials  = getInitials(name);
    const planLabel = { free: 'Free Plan', disciple: 'Disciple', pastor: 'Pastor Plan', church: 'Church Plan' }[plan] || plan;

    if (nameEl)      nameEl.textContent     = name;
    if (planEl)      planEl.textContent     = planLabel;
    if (avatarEl)    avatarEl.textContent   = initials;
    if (topAvatarEl) topAvatarEl.textContent = initials;
  },

  // ── Require specific subscription tier ───────────────────
  requirePlan(profile, minTier = 'disciple') {
    const tierOrder = { free: 0, disciple: 1, pastor: 2, church: 3, institution: 4, lifetime: 5 };
    const userTier  = tierOrder[profile.subscription_tier] ?? 0;
    const needTier  = tierOrder[minTier] ?? 1;

    if (userTier < needTier) {
      showToast(`This feature requires the ${minTier} plan or higher. Upgrade to unlock.`, 'info');
      return false;
    }
    return true;
  },
};

// ── Auto-run on pages that call protect.js ───────────────
// Pages should call: Protect.loadUser().then(profile => { ... })
