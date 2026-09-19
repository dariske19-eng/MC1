// api/addon-page.js — Vercel Node.js Serverless Function
// Jana laman khas untuk satu addon (server-rendered) supaya Meta Tags/Open Graph
// betul-betul terpapar bila pautan dikongsi di WhatsApp/Facebook/Twitter/dll

import { head } from '@vercel/blob';

const DATA_PATH = 'data/addons.json';

async function readAddons() {
  try {
    const info = await head(DATA_PATH);
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

function esc(str){
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes){
  if(!bytes) return '0 KB';
  const units = ['B','KB','MB','GB'];
  let i = 0, n = bytes;
  while(n >= 1024 && i < units.length - 1){ n /= 1024; i++; }
  return n.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

// kesan platform video dari URL dan bina src embed yang sesuai
function getVideoEmbed(url){
  if(!url) return null;
  try{
    const u = new URL(url);
    // YouTube
    if(u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')){
      let videoId = '';
      if(u.hostname.includes('youtu.be')){
        videoId = u.pathname.slice(1);
      } else if(u.pathname.includes('/embed/')){
        videoId = u.pathname.split('/embed/')[1];
      } else {
        videoId = u.searchParams.get('v');
      }
      if(!videoId) return null;
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      };
    }
    // TikTok
    if(u.hostname.includes('tiktok.com')){
      const match = u.pathname.match(/\/video\/(\d+)/);
      if(match){
        return {
          platform: 'tiktok',
          embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`
        };
      }
    }
  }catch(e){}
  return null;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const addons = await readAddons();
  const addon = addons.find(a => a.id === id);

  const siteUrl = `https://${req.headers.host}`;
  const fallbackImage = 'https://i.ibb.co/PvtKBPC6/file-000000008afc81f5a4251cf2b3c49e32.png';

  if(!addon){
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!DOCTYPE html><html lang="ms"><head><meta charset="UTF-8"><title>Addon Tidak Dijumpai — Drizz</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:sans-serif;text-align:center;padding:80px 20px;background:#071B12;color:#EAFFC9;">
        <h1>404</h1><p>Addon ni tak wujud atau dah dipadam.</p>
        <a href="/" style="color:#9CFA4C;">← Balik ke senarai addon</a>
      </body></html>`);
  }

  const versions = addon.versions || [];
  const videoEmbed = getVideoEmbed(addon.videoUrl);
  const ogImage = addon.image || fallbackImage;
  const pageUrl = `${siteUrl}/addon/${addon.id}`;

  const html = `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(addon.title)} — Drizz Addon</title>
<meta name="description" content="${esc(addon.desc)}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(addon.title)} — Drizz Addon">
<meta property="og:description" content="${esc(addon.desc)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:site_name" content="Drizz">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(addon.title)} — Drizz Addon">
<meta name="twitter:description" content="${esc(addon.desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">

<link rel="icon" type="image/png" href="${esc(fallbackImage)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --lime:#EAFFC9; --dark:#0C3722; --darker:#071B12;
    --mid:#1C7A46; --white:#FFFFFF; --text-soft:#2F5240;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{ font-family:'Inter',sans-serif; background:var(--lime); color:var(--darker); line-height:1.6; }
  a{ color:inherit; text-decoration:none; }
  .wrap{ max-width:760px; margin:0 auto; padding:32px 20px 80px; }
  .back-link{
    display:inline-flex; align-items:center; gap:8px;
    font-weight:600; font-size:.9rem; color:var(--mid); margin-bottom:24px;
  }
  .header-card{
    background:var(--white); border-radius:28px; padding:28px;
    display:flex; gap:20px; align-items:flex-start; margin-bottom:24px;
    flex-wrap:wrap;
  }
  .icon-box{
    width:80px; height:80px; border-radius:26%; flex-shrink:0;
    background:var(--white); border:2.5px solid var(--dark);
    display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:2.2rem;
  }
  .icon-box img{ width:100%; height:100%; object-fit:cover; }
  .category{ font-size:.75rem; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.04em; }
  h1{ font-family:'Bricolage Grotesque',sans-serif; font-size:1.6rem; margin:4px 0 8px; }
  .desc{ color:var(--text-soft); font-size:.95rem; }
  .downloads-count{
    display:inline-flex; align-items:center; gap:6px; margin-top:10px;
    font-size:.8rem; font-weight:700; color:var(--mid);
    background:rgba(28,122,70,.1); padding:6px 14px; border-radius:999px;
  }
  .section{ margin-bottom:24px; }
  .section h2{ font-family:'Bricolage Grotesque',sans-serif; font-size:1.15rem; margin-bottom:12px; }
  .video-wrap{
    position:relative; width:100%; border-radius:20px; overflow:hidden;
    background:#000;
  }
  .video-wrap.youtube{ aspect-ratio:16/9; }
  .video-wrap.tiktok{ aspect-ratio:9/16; max-width:340px; margin:0 auto; }
  .video-wrap iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }
  .howto-box{
    background:var(--white); border-radius:20px; padding:20px;
    font-size:.92rem; color:var(--text-soft); white-space:pre-wrap;
  }
  .version-card{
    background:var(--white); border-radius:20px; padding:20px;
  }
  select{
    width:100%; font-family:inherit; font-size:.9rem; font-weight:600;
    color:var(--darker); background:#EFFFE2; border:1.5px solid rgba(12,55,34,.15);
    border-radius:999px; padding:12px 18px; margin-bottom:14px;
  }
  .dl-btn{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    background:var(--dark); color:var(--lime); border-radius:999px; padding:14px 22px;
    font-weight:600; font-size:.92rem;
  }
  .dl-btn.disabled{ background:rgba(12,55,34,.08); color:var(--text-soft); pointer-events:none; }
  .empty-note{ color:var(--text-soft); font-size:.9rem; text-align:center; padding:16px; }

  /* ---------- KOMEN ---------- */
  .comment-box{ background:var(--white); border-radius:20px; padding:20px; }
  .signin-area{ padding:10px 0; text-align:center; }
  .signin-area > p{ font-size:.88rem; color:var(--text-soft); margin-bottom:14px; }
  .signin-btn-single{
    display:inline-block; background:var(--dark); color:var(--lime);
    font-weight:700; font-size:.9rem; padding:12px 32px; border-radius:999px;
    text-decoration:none; transition: background .2s ease, transform .2s ease;
  }
  .signin-btn-single:hover{ background:var(--darker); transform:translateY(-2px); }
  .user-bar{
    display:none; align-items:center; gap:10px; margin-bottom:14px;
    padding-bottom:14px; border-bottom:1px solid rgba(12,55,34,.1);
  }
  .user-bar img{ width:36px; height:36px; border-radius:50%; }
  .user-bar .u-name{ font-size:.88rem; font-weight:700; flex:1; }
  .user-bar .signout-btn{ font-size:.78rem; font-weight:600; color:var(--mid); cursor:pointer; background:none; border:none; }
  .comment-form{ display:none; margin-bottom:18px; }
  .comment-form textarea{
    width:100%; font-family:inherit; font-size:.9rem; color:var(--darker);
    background:#EFFFE2; border:1.5px solid rgba(12,55,34,.15); border-radius:16px;
    padding:12px 16px; resize:vertical; min-height:70px; margin-bottom:8px;
  }
  .comment-form .hint{ font-size:.75rem; color:var(--text-soft); margin-bottom:10px; }
  .comment-form button{
    background:var(--dark); color:var(--lime); font-weight:600; font-size:.88rem;
    padding:11px 22px; border-radius:999px; border:none; cursor:pointer;
  }
  .comment-error{ display:none; color:#C0392B; font-size:.82rem; margin-bottom:10px; }
  .comment-error.show{ display:block; }
  .comment-success{ display:none; color:var(--mid); font-size:.82rem; margin-bottom:10px; font-weight:600; }
  .comment-success.show{ display:block; }
  .comment-list{ display:flex; flex-direction:column; gap:14px; }
  .comment-item{ display:flex; gap:10px; }
  .comment-item img{ width:34px; height:34px; border-radius:50%; flex-shrink:0; }
  .comment-item .c-body{ flex:1; min-width:0; }
  .comment-item .c-name{ font-size:.85rem; font-weight:700; }
  .comment-item .c-text{ font-size:.87rem; color:var(--text-soft); margin-top:2px; }
  .comment-item .c-time{ font-size:.72rem; color:var(--text-soft); opacity:.7; margin-top:4px; }
  .comment-empty{ font-size:.86rem; color:var(--text-soft); text-align:center; padding:10px; }

  /* ---------- TEMA GELAP ---------- */
  html[data-theme="dark"] body{ background:#0A2318; color:#EAFFC9; }
  html[data-theme="dark"] .back-link{ color:var(--lime); }
  html[data-theme="dark"] .header-card,
  html[data-theme="dark"] .howto-box,
  html[data-theme="dark"] .version-card,
  html[data-theme="dark"] .comment-box{ background:#123322; }
  html[data-theme="dark"] .category{ color:var(--lime); }
  html[data-theme="dark"] h1, html[data-theme="dark"] .section h2{ color:var(--lime); }
  html[data-theme="dark"] .desc, html[data-theme="dark"] .howto-box{ color:rgba(234,255,201,.75); }
  html[data-theme="dark"] select{ background:#0A2318; color:var(--lime); border-color:rgba(255,255,255,.15); }
  html[data-theme="dark"] .comment-item .c-name{ color:var(--lime); }
  html[data-theme="dark"] .comment-item .c-text{ color:rgba(234,255,201,.7); }
</style>
</head>
<body>
  <div class="wrap">
    <a href="/" class="back-link">← Balik ke Senarai Addon</a>

    <div class="header-card">
      <div class="icon-box">${addon.image ? `<img src="${esc(addon.image)}" alt="">` : '📦'}</div>
      <div style="flex:1; min-width:200px;">
        <span class="category">${esc(addon.group)}</span>
        <h1>${esc(addon.title)}</h1>
        <p class="desc">${esc(addon.desc)}</p>
        <span class="downloads-count">⬇ ${addon.downloads || 0} muat turun</span>
      </div>
    </div>

    ${videoEmbed ? `
    <div class="section">
      <h2>Video</h2>
      <div class="video-wrap ${videoEmbed.platform}">
        <iframe src="${esc(videoEmbed.embedUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    </div>` : ''}

    ${addon.howTo ? `
    <div class="section">
      <h2>Cara Guna</h2>
      <div class="howto-box">${esc(addon.howTo)}</div>
    </div>` : ''}

    <div class="section">
      <h2>Muat Turun</h2>
      <div class="version-card">
        ${versions.length > 0 ? `
          <select id="versionSelect">
            ${versions.map(v => `<option value="${esc(v.id)}" data-file="${esc(v.fileName)}">${esc(v.version)} (${formatBytes(v.fileSize)})</option>`).join('')}
          </select>
          <a class="dl-btn" id="downloadBtn" href="/api/download?addonId=${esc(addon.id)}&versionId=${esc(versions[0].id)}" download="${esc(versions[0].fileName)}">
            <span>${esc(versions[0].fileName)}</span><span>⬇</span>
          </a>
          <script>
            document.getElementById('versionSelect').addEventListener('change', function(e){
              var opt = e.target.selectedOptions[0];
              var btn = document.getElementById('downloadBtn');
              btn.href = '/api/download?addonId=${esc(addon.id)}&versionId=' + e.target.value;
              btn.download = opt.getAttribute('data-file');
              btn.querySelector('span').textContent = opt.getAttribute('data-file');
            });
          </script>
        ` : (addon.link ? `<a class="dl-btn" href="${esc(addon.link)}" target="_blank" rel="noopener"><span>Buka Pautan</span><span>↗</span></a>` : `<div class="empty-note">Belum ada fail tersedia buat masa ini.</div>`)}
      </div>
    </div>

    <div class="section">
      <h2>Komen</h2>
      <div class="comment-box">
        <div class="user-bar" id="userBar">
          <img id="userAvatar" src="" alt="">
          <span class="u-name" id="userName"></span>
          <button class="signout-btn" id="signOutBtn">Log Keluar</button>
        </div>

        <div class="signin-area" id="signinArea">
          <p>Log masuk untuk tinggalkan komen.</p>
          <a id="signInBtn" class="signin-btn-single">Sign In</a>
        </div>

        <div class="comment-form" id="commentForm">
          <p class="comment-error" id="commentError"></p>
          <p class="comment-success" id="commentSuccess"></p>
          <textarea id="commentText" placeholder="Tulis komen anda tentang addon ni..."></textarea>
          <p class="hint">Ada isu dengan addon ni? Taip <code>/report &lt;penerangan masalah&gt;</code> — laporan ni cuma admin boleh nampak.</p>
          <button id="submitCommentBtn">Hantar Komen</button>
        </div>

        <div class="comment-list" id="commentList">
          <div class="comment-empty">Memuatkan komen...</div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <script>
    var SUPABASE_URL = ${JSON.stringify(process.env.SUPABASE_URL || '')};
    var SUPABASE_ANON_KEY = ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')};
    var ADDON_ID = ${JSON.stringify(addon.id)};

    if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
      document.getElementById('signinArea').innerHTML = '<p>Sistem komen belum disediakan sepenuhnya.</p>';
    } else {
      var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      var currentSession = null;

      // ---- Sync tema & bahasa dari index.html (localStorage sama, domain sama) ----
      var LANG_LABELS = {
        ms: { comment: 'Komen', download: 'Muat Turun', howto: 'Cara Guna', video: 'Video', signin: 'Sign In', signout: 'Log Keluar', placeholder: 'Tulis komen anda tentang addon ni...', send: 'Hantar Komen', back: '← Balik ke Senarai Addon' },
        id: { comment: 'Komentar', download: 'Unduh', howto: 'Cara Pakai', video: 'Video', signin: 'Sign In', signout: 'Keluar', placeholder: 'Tulis komentar Anda tentang addon ini...', send: 'Kirim Komentar', back: '← Kembali ke Daftar Addon' },
        en: { comment: 'Comments', download: 'Download', howto: 'How To Use', video: 'Video', signin: 'Sign In', signout: 'Sign Out', placeholder: 'Write your comment about this addon...', send: 'Send Comment', back: '← Back to Addon List' }
      };
      var savedTheme = localStorage.getItem('drizz-theme');
      if(savedTheme === 'dark'){ document.documentElement.setAttribute('data-theme', 'dark'); }
      var savedLang = localStorage.getItem('drizz-lang') || 'ms';
      var L = LANG_LABELS[savedLang] || LANG_LABELS.ms;
      var signInLabel = L.signin;
      document.getElementById('commentText').setAttribute('placeholder', L.placeholder);
      document.getElementById('submitCommentBtn').textContent = L.send;
      document.getElementById('signOutBtn').textContent = L.signout;
      var backLinkEl = document.querySelector('.back-link');
      if(backLinkEl) backLinkEl.textContent = L.back;
      document.querySelectorAll('.section h2').forEach(function(h){
        var t = h.textContent.trim();
        if(t === 'Komen') h.textContent = L.comment;
        if(t === 'Muat Turun') h.textContent = L.download;
        if(t === 'Cara Guna') h.textContent = L.howto;
        if(t === 'Video') h.textContent = L.video;
      });

      function escapeHtml(str){
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
      }

      function timeAgo(iso){
        var diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if(diff < 60) return 'baru je';
        if(diff < 3600) return Math.floor(diff/60) + ' minit lalu';
        if(diff < 86400) return Math.floor(diff/3600) + ' jam lalu';
        return Math.floor(diff/86400) + ' hari lalu';
      }

      async function loadComments(){
        var list = document.getElementById('commentList');
        try{
          var res = await fetch('/api/comments?addonId=' + encodeURIComponent(ADDON_ID));
          var comments = await res.json();
          if(!Array.isArray(comments) || comments.length === 0){
            list.innerHTML = '<div class="comment-empty">Belum ada komen. Jadi yang pertama!</div>';
            return;
          }
          list.innerHTML = comments.map(function(c){
            var avatar = c.user_picture || 'https://i.ibb.co/PvtKBPC6/file-000000008afc81f5a4251cf2b3c49e32.png';
            var nameDisplay = c.is_admin
              ? '<span style="color:#2563EB;font-weight:800;">ADMIN</span>'
              : escapeHtml(c.user_name);
            return '<div class="comment-item">' +
              '<img src="' + escapeHtml(avatar) + '" alt="">' +
              '<div class="c-body">' +
                '<div class="c-name">' + nameDisplay + '</div>' +
                '<div class="c-text">' + escapeHtml(c.text) + '</div>' +
                '<div class="c-time">' + timeAgo(c.created_at) + '</div>' +
              '</div>' +
            '</div>';
          }).join('');
        }catch(e){
          list.innerHTML = '<div class="comment-empty">Gagal muatkan komen.</div>';
        }
      }

      function updateAuthUI(session){
        currentSession = session;
        var signinArea = document.getElementById('signinArea');
        var userBar = document.getElementById('userBar');
        var commentForm = document.getElementById('commentForm');
        if(session && session.user){
          signinArea.style.display = 'none';
          userBar.style.display = 'flex';
          commentForm.style.display = 'block';
          var meta = session.user.user_metadata || {};
          document.getElementById('userAvatar').src = meta.avatar_url || meta.picture || '';
          document.getElementById('userName').textContent = meta.username || meta.full_name || meta.name || session.user.email;
        } else {
          signinArea.style.display = 'block';
          userBar.style.display = 'none';
          commentForm.style.display = 'none';
        }
      }

      document.getElementById('signOutBtn').addEventListener('click', async function(){
        await sb.auth.signOut();
        updateAuthUI(null);
      });

      document.getElementById('submitCommentBtn').addEventListener('click', async function(){
        var errorEl = document.getElementById('commentError');
        var successEl = document.getElementById('commentSuccess');
        var textEl = document.getElementById('commentText');
        errorEl.classList.remove('show');
        successEl.classList.remove('show');

        if(!currentSession){
          errorEl.textContent = 'Sila log masuk semula.';
          errorEl.classList.add('show');
          return;
        }
        var text = textEl.value.trim();
        if(!text){ return; }

        var btn = document.getElementById('submitCommentBtn');
        btn.disabled = true;
        try{
          var res = await fetch('/api/comments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + currentSession.access_token
            },
            body: JSON.stringify({ addonId: ADDON_ID, text: text })
          });
          var data = await res.json();
          if(!res.ok){
            errorEl.textContent = data.error || 'Gagal hantar komen.';
            errorEl.classList.add('show');
          } else if(data.type === 'report'){
            successEl.textContent = 'Laporan anda telah dihantar kepada admin. Terima kasih!';
            successEl.classList.add('show');
            textEl.value = '';
          } else {
            successEl.textContent = 'Komen berjaya dihantar!';
            successEl.classList.add('show');
            textEl.value = '';
            loadComments();
          }
        }catch(e){
          errorEl.textContent = 'Ralat rangkaian. Sila cuba lagi.';
          errorEl.classList.add('show');
        }
        btn.disabled = false;
      });

      // ---- Butang Sign In (redirect ke laman /signin berasingan) ----
      document.getElementById('signInBtn').textContent = signInLabel;
      document.getElementById('signInBtn').href = '/signin?return=' + encodeURIComponent(window.location.href);

      (async function init(){
        var { data } = await sb.auth.getSession();
        updateAuthUI(data.session);
        loadComments();

        sb.auth.onAuthStateChange(function(event, session){
          updateAuthUI(session);
        });
      })();
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(html);
}
