// api/auth-page.js — Vercel Node.js Serverless Function
// Laman Sign In / Sign Up berasingan — Google Sign-In atau emel+password
// Selepas berjaya, redirect balik ke laman asal (?return=)

export default async function handler(req, res) {
  const returnTo = req.query.return || '/';
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

  const html = `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign In — Drizz</title>
<link rel="icon" type="image/png" href="https://i.ibb.co/PvtKBPC6/file-000000008afc81f5a4251cf2b3c49e32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --lime:#EAFFC9; --dark:#0C3722; --darker:#071B12;
    --mid:#1C7A46; --white:#FFFFFF; --text-soft:#2F5240;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:'Inter',sans-serif; background:var(--lime); color:var(--darker);
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    padding:24px;
  }
  .card{
    background:var(--white); border-radius:28px; padding:36px 30px;
    width:100%; max-width:400px;
  }
  .back-link{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; font-weight:600; color:var(--mid); margin-bottom:20px; text-decoration:none; }
  .logo-row{ display:flex; align-items:center; gap:10px; margin-bottom:24px; }
  .logo-row img{ width:36px; height:36px; border-radius:28%; }
  .logo-row span{ font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:1.15rem; }
  h1{ font-family:'Bricolage Grotesque',sans-serif; font-size:1.5rem; margin-bottom:6px; }
  .sub{ font-size:.88rem; color:var(--text-soft); margin-bottom:24px; }
  #googleSignInBtn{ display:flex; justify-content:center; margin-bottom:18px; }
  .auth-divider{ display:flex; align-items:center; gap:12px; margin-bottom:18px; color:var(--text-soft); font-size:.8rem; }
  .auth-divider::before, .auth-divider::after{ content:''; flex:1; height:1px; background:rgba(12,55,34,.15); }
  .auth-tabs{ display:flex; gap:8px; margin-bottom:16px; background:#EFFFE2; border-radius:999px; padding:4px; }
  .auth-tab{ flex:1; text-align:center; padding:9px; border-radius:999px; font-size:.85rem; font-weight:700; color:var(--text-soft); background:none; border:none; cursor:pointer; }
  .auth-tab.active{ background:var(--dark); color:var(--lime); }
  .auth-form{ display:flex; flex-direction:column; gap:10px; }
  .auth-form input{ font-family:inherit; font-size:.88rem; color:var(--darker); background:#EFFFE2; border:1.5px solid rgba(12,55,34,.15); border-radius:14px; padding:11px 16px; }
  .auth-form input:focus{ outline:none; border-color:var(--mid); }
  .auth-form button{ background:var(--dark); color:var(--lime); font-weight:700; font-size:.88rem; padding:12px; border-radius:999px; border:none; cursor:pointer; margin-top:4px; }
  .msg-error{ display:none; color:#C0392B; font-size:.82rem; }
  .msg-error.show{ display:block; }
  .msg-success{ display:none; color:var(--mid); font-size:.82rem; font-weight:600; }
  .msg-success.show{ display:block; }
  .loading-note{ text-align:center; font-size:.85rem; color:var(--text-soft); padding:20px; }
</style>
</head>
<body>
  <div class="card">
    <a href="${escAttr(returnTo)}" class="back-link">← Kembali</a>
    <div class="logo-row">
      <img src="https://i.ibb.co/PvtKBPC6/file-000000008afc81f5a4251cf2b3c49e32.png" alt="">
      <span>Drizz</span>
    </div>
    <h1 id="pageTitle">Sign In</h1>
    <p class="sub" id="pageSub">Log masuk untuk komen, ikuti addon dan banyak lagi.</p>

    <div id="authArea">
      <div id="googleSignInBtn"></div>
      <div class="auth-divider"><span>atau guna emel</span></div>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" data-tab="login">Log Masuk</button>
        <button type="button" class="auth-tab" data-tab="signup">Daftar Akaun</button>
      </div>
      <form id="loginForm" class="auth-form">
        <input type="email" id="loginEmail" placeholder="Emel (Gmail)" required>
        <input type="password" id="loginPassword" placeholder="Kata Laluan" required>
        <p class="msg-error" id="loginError"></p>
        <button type="submit">Log Masuk</button>
      </form>
      <form id="signupForm" class="auth-form" style="display:none;">
        <input type="text" id="signupUsername" placeholder="Nama Pengguna" required>
        <input type="email" id="signupEmail" placeholder="Emel (Gmail)" required>
        <input type="password" id="signupPassword" placeholder="Kata Laluan (min 6 aksara)" required minlength="6">
        <p class="msg-error" id="signupError"></p>
        <p class="msg-success" id="signupSuccess"></p>
        <button type="submit">Daftar</button>
      </form>
    </div>

    <div id="alreadyIn" style="display:none;">
      <p class="loading-note" id="alreadyInText">Anda sudah log masuk. Mengalihkan...</p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <script>
    var SUPABASE_URL = ${JSON.stringify(SUPABASE_URL)};
    var SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};
    var RETURN_TO = ${JSON.stringify(returnTo)};

    if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
      document.getElementById('authArea').innerHTML = '<p class="loading-note">Sistem sign-in belum disediakan sepenuhnya.</p>';
    } else {
      var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      function goBack(){
        window.location.href = RETURN_TO;
      }

      (async function checkExisting(){
        var { data } = await sb.auth.getSession();
        if(data.session){
          document.getElementById('authArea').style.display = 'none';
          document.getElementById('alreadyIn').style.display = 'block';
          setTimeout(goBack, 900);
        }
      })();

      document.getElementById('googleSignInBtn').innerHTML =
        '<button id="gBtn" type="button" style="display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid #dadce0;border-radius:999px;padding:11px 22px;font-family:inherit;font-size:.88rem;font-weight:600;color:#3c4043;cursor:pointer;width:100%;justify-content:center;">' +
        '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.4l-6.4-5.4C29.4 35 26.8 36 24 36c-5.4 0-9.9-3.3-11.4-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.4-4.4 5.9l6.4 5.4C40.5 36.6 44 30.8 44 24c0-1.4-.1-2.7-.4-3.5z"/></svg>' +
        'Log masuk dengan Google</button>';

      document.getElementById('gBtn').addEventListener('click', async function(){
        await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/signin?return=' + encodeURIComponent(RETURN_TO) }
        });
      });

      document.querySelectorAll('.auth-tab').forEach(function(tab){
        tab.addEventListener('click', function(){
          document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.remove('active'); });
          tab.classList.add('active');
          var isLogin = tab.getAttribute('data-tab') === 'login';
          document.getElementById('loginForm').style.display = isLogin ? 'flex' : 'none';
          document.getElementById('signupForm').style.display = isLogin ? 'none' : 'flex';
        });
      });

      document.getElementById('loginForm').addEventListener('submit', async function(e){
        e.preventDefault();
        var errorEl = document.getElementById('loginError');
        errorEl.classList.remove('show');
        var email = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value;
        var btn = e.target.querySelector('button');
        btn.disabled = true;
        var { error } = await sb.auth.signInWithPassword({ email: email, password: password });
        if(error){
          errorEl.textContent = 'Log masuk gagal: emel atau kata laluan salah.';
          errorEl.classList.add('show');
          btn.disabled = false;
        } else {
          goBack();
        }
      });

      document.getElementById('signupForm').addEventListener('submit', async function(e){
        e.preventDefault();
        var errorEl = document.getElementById('signupError');
        var successEl = document.getElementById('signupSuccess');
        errorEl.classList.remove('show');
        successEl.classList.remove('show');
        var username = document.getElementById('signupUsername').value.trim();
        var email = document.getElementById('signupEmail').value.trim();
        var password = document.getElementById('signupPassword').value;
        if(!username){
          errorEl.textContent = 'Sila isi nama pengguna.';
          errorEl.classList.add('show');
          return;
        }
        var btn = e.target.querySelector('button');
        btn.disabled = true;
        var { data, error } = await sb.auth.signUp({
          email: email, password: password,
          options: { data: { username: username } }
        });
        if(error){
          errorEl.textContent = 'Pendaftaran gagal: ' + error.message;
          errorEl.classList.add('show');
          btn.disabled = false;
        } else if(data.session){
          successEl.textContent = 'Berjaya! Mengalihkan...';
          successEl.classList.add('show');
          setTimeout(goBack, 800);
        } else {
          successEl.textContent = 'Pendaftaran berjaya! Sila semak emel untuk sahkan akaun, kemudian log masuk.';
          successEl.classList.add('show');
          btn.disabled = false;
        }
      });
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(html);
}

function escAttr(str){
  return String(str || '/').replace(/"/g, '&quot;');
}
