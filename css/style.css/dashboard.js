// ============================================================
//  THE SHEPHERD'S LIBRARY — Dashboard Logic
//  js/dashboard.js
// ============================================================

// ── Initialize Dashboard ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Require login — redirect if not authenticated
  const profile = await Protect.loadUser();
  if (!profile) return;

  // 2. Populate sidebar
  Protect.populateSidebarUser(profile);

  // 3. Load dashboard data
  await loadDashboardStats(profile);
  loadVerseOfDay();
  loadRecentActivity(profile.id);
  loadReadingStreak(profile.id);

  // 4. Mobile sidebar toggle
  setupSidebar();

  // 5. Sign-out button
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await Auth.signOut();
    });
  }

  // 6. Highlight active nav item
  setActiveNav('nav-dashboard');
});

// ── Load Stats Cards ─────────────────────────────────────
async function loadDashboardStats(profile) {
  // Reading streak
  const { data: streak } = await db
    .from('user_reading_streaks')
    .select('current_streak, longest_streak, total_read_days')
    .eq('user_id', profile.id)
    .single();

  if (streak) {
    setEl('stat-streak',      streak.current_streak || 0);
    setEl('stat-longest',     streak.longest_streak || 0);
    setEl('stat-read-days',   streak.total_read_days || 0);
  }

  // Counts from profile
  setEl('stat-chapters',   profile.total_chapters_read  || 0);
  setEl('stat-sermons',    profile.total_sermons_created || 0);
  setEl('stat-ai-queries', profile.total_ai_queries     || 0);

  // Notes count
  const { count: notesCount } = await db
    .from('user_verse_notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id);
  setEl('stat-notes', notesCount || 0);

  // Prayer count
  const { count: prayerCount } = await db
    .from('prayer_journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id);
  setEl('stat-prayers', prayerCount || 0);
}

// ── Load Verse of the Day ────────────────────────────────
async function loadVerseOfDay() {
  const today = new Date().toISOString().split('T')[0];

  const { data: devotional } = await db
    .from('devotionals')
    .select('key_scripture, scripture_text, translation')
    .eq('publish_date', today)
    .eq('status', 'published')
    .single();

  if (devotional) {
    setEl('votd-text',  devotional.scripture_text);
    setEl('votd-ref',   `${devotional.key_scripture} · ${devotional.translation}`);
  } else {
    // Fallback verse
    setEl('votd-text', '"I can do all things through Christ which strengtheneth me."');
    setEl('votd-ref',  'Philippians 4:13 · KJV');
  }
}

// ── Load Recent Activity ─────────────────────────────────
async function loadRecentActivity(userId) {
  const list = document.getElementById('activity-list');
  if (!list) return;

  // Recent reading history
  const { data: history } = await db
    .from('user_reading_history')
    .select('book_id, chapter_number, read_at, bible_books(name)')
    .eq('user_id', userId)
    .order('read_at', { ascending: false })
    .limit(5);

  if (!history || history.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📖</div>
        <p>No reading history yet.</p>
        <a href="bible.html" class="btn btn-primary btn-sm">Start Reading</a>
      </div>`;
    return;
  }

  list.innerHTML = history.map(h => `
    <div class="activity-item">
      <div class="activity-icon">📖</div>
      <div class="activity-text">
        <div class="activity-title">${h.bible_books?.name || 'Bible'} ${h.chapter_number}</div>
        <div class="activity-meta">${timeAgo(h.read_at)}</div>
      </div>
    </div>`).join('');
}

// ── Load Reading Streak Visual ───────────────────────────
async function loadReadingStreak(userId) {
  const { data: streak } = await db
    .from('user_reading_streaks')
    .select('current_streak, last_read_date')
    .eq('user_id', userId)
    .single();

  const days = ['S','M','T','W','T','F','S'];
  const container = document.getElementById('streak-days');
  if (!container) return;

  const today   = new Date();
  const current = streak?.current_streak || 0;

  container.innerHTML = days.map((day, i) => {
    const d    = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const done = i >= (7 - current);
    const isToday = i === 6;
    return `
      <div class="streak-day ${done ? 'done' : ''} ${isToday ? 'today' : ''}">
        ${day}
      </div>`;
  }).join('');
}

// ── Sidebar Mobile Setup ─────────────────────────────────
function setupSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

// ── Set Active Navigation ────────────────────────────────
function setActiveNav(activeId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.id === activeId);
  });
}

// ── Utility Helpers ──────────────────────────────────────
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}
