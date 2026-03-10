// ============================================================
//  app.js — Jasmine Nonprofit Website
//  Handles: posting stories, loading feed, replying
// ============================================================

// ─── CHARACTER COUNT ─────────────────────────────────────
const storyTextarea = document.getElementById('story');
const charCountEl   = document.getElementById('char-count');

storyTextarea.addEventListener('input', () => {
  charCountEl.textContent = storyTextarea.value.length;
});

// ─── SHOW MESSAGE HELPER ─────────────────────────────────
function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.className = `form-msg ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ─── FORMAT DATE ─────────────────────────────────────────
function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─── SUBMIT POST ─────────────────────────────────────────
async function submitPost() {
  const author = document.getElementById('author').value.trim() || 'Anonymous';
  const title  = document.getElementById('title').value.trim();
  const story  = document.getElementById('story').value.trim();
  const btn    = document.getElementById('submit-btn');

  if (!title) { showMsg('form-msg', 'Please give your story a title. 🌸', 'error'); return; }
  if (!story) { showMsg('form-msg', 'Please share your story. Your words matter. 💜', 'error'); return; }
  if (story.length < 20) { showMsg('form-msg', 'Please write a little more — at least 20 characters.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">✿</span> Sharing…';

  try {
    await db.collection('posts').add({
      author,
      title,
      story,
      replyCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showMsg('form-msg', '🌸 Your story has been shared. You are so brave. Thank you.', 'success');
    document.getElementById('author').value = '';
    document.getElementById('title').value  = '';
    document.getElementById('story').value  = '';
    charCountEl.textContent = '0';

  } catch (err) {
    console.error(err);
    showMsg('form-msg', 'Something went wrong. Please try again. 💜', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✿</span> Share My Story';
  }
}

// ─── LOAD POSTS ──────────────────────────────────────────
function loadPosts() {
  const container = document.getElementById('posts-container');

  db.collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(30)
    .onSnapshot(snapshot => {

      if (snapshot.empty) {
        container.innerHTML = `
          <div class="empty-state">
            <span class="flower">🌸</span>
            <p>No stories yet. Be the first to share yours.<br/>
            Every journey begins with a single step.</p>
          </div>`;
        return;
      }

      container.innerHTML = '';

      snapshot.forEach((doc, i) => {
        const post = doc.data();
        const card = buildPostCard(doc.id, post, i);
        container.appendChild(card);
        loadReplies(doc.id, card.querySelector('.replies-list'));
      });

    }, err => {
      console.error(err);
      container.innerHTML = `<div class="empty-state">
        <span class="flower">⚠️</span>
        <p>Could not load stories. Please refresh the page.</p>
      </div>`;
    });
}

// ─── BUILD POST CARD ─────────────────────────────────────
function buildPostCard(postId, post, index) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.style.animationDelay = `${index * 0.08}s`;

  const shortStory = post.story.length > 400
    ? post.story.slice(0, 400) + '…'
    : post.story;

  const isLong = post.story.length > 400;

  card.innerHTML = `
    <div class="post-card-top">
      <div class="post-title">${escapeHtml(post.title)}</div>
      <div class="post-meta">
        <span class="author">✿ ${escapeHtml(post.author || 'Anonymous')}</span>
        <span class="dot">·</span>
        <span class="date">${formatDate(post.createdAt)}</span>
      </div>
    </div>

    <div class="post-body" id="body-${postId}">${escapeHtml(shortStory)}</div>

    ${isLong ? `
    <div style="padding: 0 2rem 0.6rem; text-align: right;">
      <button class="btn-reply" onclick="toggleReadMore('${postId}', this, ${JSON.stringify(post.story).replace(/'/g,"\\'")})" style="font-size:0.82rem;">
        Read more ↓
      </button>
    </div>` : ''}

    <div class="post-footer">
      <div class="reply-count">
        <span id="rc-${postId}">${post.replyCount || 0}</span> supportive response${(post.replyCount || 0) === 1 ? '' : 's'}
      </div>
      <button class="btn-reply" onclick="openModal('${postId}')">
        💜 Send Support
      </button>
    </div>

    <div class="replies-section" id="replies-section-${postId}" style="display:none">
      <div class="replies-title">💜 Messages of Support</div>
      <div class="replies-list" id="replies-${postId}"></div>
    </div>
  `;

  // show replies section when there are replies
  card._postId = postId;
  return card;
}

// ─── TOGGLE READ MORE ────────────────────────────────────
function toggleReadMore(postId, btn, fullStory) {
  const bodyEl = document.getElementById(`body-${postId}`);
  if (btn.textContent.includes('Read more')) {
    bodyEl.textContent = fullStory;
    btn.textContent = 'Show less ↑';
  } else {
    bodyEl.textContent = fullStory.slice(0, 400) + '…';
    btn.textContent = 'Read more ↓';
  }
}

// ─── LOAD REPLIES ────────────────────────────────────────
function loadReplies(postId, listEl) {
  db.collection('posts').doc(postId)
    .collection('replies')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {

      const section = document.getElementById(`replies-section-${postId}`);
      const countEl = document.getElementById(`rc-${postId}`);

      if (!snapshot.empty) {
        section.style.display = 'block';
        if (countEl) countEl.textContent = snapshot.size;
      }

      listEl.innerHTML = '';
      snapshot.forEach(doc => {
        const r = doc.data();
        const div = document.createElement('div');
        div.className = 'reply-item';
        div.innerHTML = `
          <div class="reply-author">💜 ${escapeHtml(r.author || 'Anonymous')}</div>
          <div class="reply-text">${escapeHtml(r.text)}</div>
        `;
        listEl.appendChild(div);
      });
    });
}

// ─── MODAL ───────────────────────────────────────────────
function openModal(postId) {
  document.getElementById('reply-post-id').value = postId;
  document.getElementById('reply-author').value  = '';
  document.getElementById('reply-text').value    = '';
  document.getElementById('reply-msg').classList.add('hidden');
  document.getElementById('reply-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('reply-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('reply-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ─── SUBMIT REPLY ─────────────────────────────────────────
async function submitReply() {
  const postId = document.getElementById('reply-post-id').value;
  const author = document.getElementById('reply-author').value.trim() || 'Anonymous';
  const text   = document.getElementById('reply-text').value.trim();

  if (!text) { showMsg('reply-msg', 'Please write a message of support. 💜', 'error'); return; }
  if (text.length < 10) { showMsg('reply-msg', 'Please write a little more. Your words matter.', 'error'); return; }

  const btn = document.querySelector('#reply-modal .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">💜</span> Sending…';

  try {
    const postRef = db.collection('posts').doc(postId);

    await postRef.collection('replies').add({
      author,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await postRef.update({
      replyCount: firebase.firestore.FieldValue.increment(1)
    });

    showMsg('reply-msg', '💜 Your support has been sent. You made a difference today.', 'success');
    document.getElementById('reply-text').value = '';

    setTimeout(closeModal, 2500);

  } catch (err) {
    console.error(err);
    showMsg('reply-msg', 'Something went wrong. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">💜</span> Send Support';
  }
}

// ─── ESCAPE HTML (security) ───────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ─── INIT ─────────────────────────────────────────────────
loadPosts();
