# Panduan Setup Addon di Vercel (Subdomain addon.drizzev.web.id)

Laman ni **berasingan** dari laman utama Drizz — laman utama (`drizzev.web.id`) kekal
di Cloudflare, cuma laman Addon (`addon.drizzev.web.id`) pindah ke Vercel.

## Struktur fail dalam folder ini
```
public/
  index.html            ← ini sebenarnya addon.html (dinamakan semula supaya
                            subdomain terus papar dia tanpa perlu /addon.html)
api/
  addons.js               ← urus data addon + kumpulan
  addon-versions.js         ← upload/padam fail versi addon
  login.js                   ← semak login admin
package.json
vercel.json
```

## Langkah 1 — Buat repo GitHub BERASINGAN untuk addon ni
Disyorkan buat repo **baharu** (contoh: `drizz-addon`) supaya tak bercampur dengan
repo laman utama (`drizz-pro`). Ini juga buat Vercel auto-deploy hanya bila fail
addon berubah, tak terjejas oleh perubahan laman utama.

1. Buat repo baharu di GitHub, nama contoh: `drizz-addon`
2. Upload semua fail dan folder dalam ZIP ni ke repo tersebut

## Langkah 2 — Buat projek Vercel
1. https://vercel.com/signup — daftar guna GitHub (percuma, tiada kad)
2. **Add New → Project** → import repo `drizz-addon`
3. Framework Preset: **Other**
4. **Deploy** (mungkin nampak ralat buat masa ni sebab storan belum disambung — normal, teruskan)

## Langkah 3 — Sambungkan Vercel Blob (tempat simpan fail addon DAN data)
1. Tab **Storage** → **Create Database** → **Blob**
2. Nama: `drizz-addon-files` → Create → **Connect** ke projek `drizz-addon`
3. Auto-tambah `BLOB_READ_WRITE_TOKEN`

> Tak perlu Upstash/Redis — data addon (kumpulan, tajuk, dll) kini disimpan
> sebagai fail JSON dalam Blob yang sama, sekali dengan fail addon sendiri.
> Kalau anda dah sambung Upstash sebelum ini, boleh je disconnect — tak
> digunakan lagi oleh kod.

## Langkah 4 — Tambah kata laluan admin
1. **Settings → Environment Variables**:
   - `ADMIN_EMAIL` = `dariskeas@gmail.com`
   - `ADMIN_PASSWORD` = `digicomprs`
2. Save

## Langkah 5 — Redeploy
Tab **Deployments** → **⋯** → **Redeploy** (supaya env vars baharu aktif)

## Langkah 6 — Sambung subdomain addon.drizzev.web.id
Ini bahagian yang sikit berbeza sebab domain utama masih di Cloudflare:

**Di Vercel:**
1. Projek → **Settings → Domains** → **Add**
2. Masukkan `addon.drizzev.web.id` → Add
3. Vercel akan tunjukkan rekod DNS yang perlu ditambah — biasanya:
   ```
   Jenis: CNAME
   Nama: addon
   Nilai: cname.vercel-dns.com
   ```
   (Salin nilai **sebenar** yang Vercel bagi — kadang berbeza sikit)

**Di Cloudflare (sebab domain drizzev.web.id di sana):**
1. Dashboard Cloudflare → pilih domain `drizzev.web.id` → **DNS** → **Records**
2. **Add record**:
   - Type: **CNAME**
   - Name: `addon`
   - Target: (paste nilai dari Vercel tadi, contoh `cname.vercel-dns.com`)
   - Proxy status: **DNS only** (klik ikon awan supaya jadi kelabu, **bukan** oren) — ini penting supaya Vercel boleh keluarkan SSL sendiri untuk subdomain ni
3. Save
4. Balik ke Vercel, tunggu beberapa minit — status domain patut tukar jadi "Valid"

## Selesai!
- `https://addon.drizzev.web.id` — laman addon, live
- Taip **"admin"** di laman tu, atau lawati `.../#admin-login`
- Login → urus kumpulan, addon, dan versi fail — semua fail dimuat naik terus ke Vercel Blob

## Nota
- Laman utama (`drizzev.web.id`) dan laman addon (`addon.drizzev.web.id`) kini **dua projek berasingan sepenuhnya** — ubah satu tak terjejas yang lain
- Had saiz upload fail: sekitar **4.5MB** setiap fail (had Vercel Edge Function). Kalau addon anda lebih besar, bagitahu saya — ada cara upload terus ke Blob tanpa had ni (guna client-side upload token), boleh saya sediakan.

---

# Panduan Tambahan: Sistem Komen (Supabase + Google Sign-In)

Ciri komen perlukan setup **Supabase** (percuma, tiada kad diperlukan) dan **Google Cloud OAuth** (percuma, tiada kad diperlukan, tapi kena buat "Consent Screen").

## Langkah 1 — Buat projek Supabase
1. Pergi https://supabase.com → **Start your project** → daftar guna GitHub
2. **New Project** → bagi nama (contoh `drizz-addon`) → pilih password database (simpan elok-elok) → pilih region terdekat (Singapore) → **Create new project**
3. Tunggu ~2 minit sampai projek siap

## Langkah 2 — Buat jadual `comments`
1. Dalam dashboard Supabase → sidebar → **SQL Editor** → **New query**
2. Paste dan **Run** SQL ni:
```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  addon_id text not null,
  user_email text not null,
  user_name text,
  user_picture text,
  text text not null,
  type text not null default 'comment',
  created_at timestamptz not null default now()
);

alter table comments enable row level security;

create policy "public read comments"
on comments for select
using (type = 'comment');
```

## Langkah 3 — Dapatkan API Keys Supabase
1. Sidebar → **Project Settings** → **API**
2. Salin & simpan 3 nilai ni:
   - **Project URL** (contoh `https://xxxxx.supabase.co`)
   - **anon public** key (panjang, mula dengan `eyJ...`)
   - **service_role** key (juga panjang, mula dengan `eyJ...`) — **JANGAN kongsi/dedahkan key ni, ia sangat sensitif**

## Langkah 4 — Setup Google Cloud OAuth (untuk Sign-In)
1. Pergi https://console.cloud.google.com → buat projek baharu (atau guna sedia ada)
2. Sidebar → **APIs & Services** → **OAuth consent screen**
   - User Type: **External** → Create
   - Isi App name (contoh "Drizz Addon"), User support email, Developer contact email → Save and Continue (skip bahagian scopes/test users, terus Save)
3. Sidebar → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: apa-apa (contoh "Drizz Addon Web")
   - **Authorized redirect URIs** → Add URI → masukkan URL callback Supabase anda (dapat dari Langkah 5 di bawah — kena buat langkah 5 dulu untuk dapat URL ni, atau boleh balik edit sini lepas)
   - **Create**
4. Salin **Client ID** dan **Client Secret** yang terhasil

## Langkah 5 — Aktifkan Google Provider dalam Supabase
1. Dashboard Supabase → sidebar → **Authentication** → **Providers**
2. Cari **Google** → toggle **Enable**
3. Paste **Client ID** dan **Client Secret** dari Langkah 4
4. Supabase akan tunjukkan **Callback URL** (contoh `https://xxxxx.supabase.co/auth/v1/callback`) — **salin URL ni**
5. Balik ke Google Cloud Console (Langkah 4) → edit OAuth Client tadi → paste URL callback ni dalam **Authorized redirect URIs** → Save
6. Balik ke Supabase → **Save** provider Google

## Langkah 6 — Tambah Environment Variables di Vercel
Projek `drizzevaddon` → **Settings → Environment Variables**, tambah:
- `SUPABASE_URL` = Project URL dari Langkah 3
- `SUPABASE_ANON_KEY` = anon public key dari Langkah 3
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key dari Langkah 3 (jenis **Secret**)

Pastikan semua untuk **Production** dan **Preview**.

## Langkah 7 — Redeploy
Tab **Deployments** → **⋯** → **Redeploy**

## Selesai — Cara Guna
- Pelawat buka mana-mana laman khas addon (`/addon/<id>`)
- Scroll ke bahagian **"Komen"** → klik **"Log masuk dengan Google"**
- Lepas sign-in, boleh terus tulis komen
- Komen mengandungi kata negatif **ditolak automatik** dengan mesej ralat
- Kalau taip `/report <masalah>`, ia **tak muncul** sebagai komen awam — cuma admin boleh nampak dalam Panel Admin (laman utama senarai addon) → butang **"📋 Lihat Laporan"**

## Nota Keselamatan
- `SUPABASE_SERVICE_ROLE_KEY` **sangat sensitif** — ia bypass semua kawalan keselamatan Supabase. Jangan sekali-kali letak dalam kod frontend atau dedahkan kat mana-mana. Kod kita cuma guna key ni di server (`api/comments.js`), tak pernah hantar ke browser.
- `SUPABASE_ANON_KEY` selamat untuk didedahkan (ia memang direka untuk digunakan di frontend).

---

# Panduan Tambahan: Admin Dashboard Baharu + Ciri Lain

## Langkah 1 — Tambah medan is_admin dalam jadual comments
Kalau jadual `comments` anda dibuat sebelum ni, kena tambah satu medan baharu.
Dashboard Supabase → **SQL Editor** → **New query** → Run:
```sql
alter table comments add column is_admin boolean not null default false;
```

## Langkah 2 — Upload fail baharu ke GitHub
Fail **baharu**:
- `public/admin.html` — dashboard admin lengkap (Addon, Rupa Laman, Berita, Laporan, Pengguna, Semua Komen)
- `api/auth-page.js` — laman Sign In/Sign Up berasingan
- `api/site-config.js` — API warna latar & teks hero
- `api/news.js` — API berita

Fail **dikemas kini**:
- `public/index.html` — admin lama dibuang, tambah nav "Sign In", bahagian Berita, override warna/teks
- `api/addon-page.js` — sign-in jadi 1 butang je, sync tema/bahasa dari index.html, badge ADMIN biru
- `api/comments.js` — tambah mod "semua komen" & hantar sebagai ADMIN
- `vercel.json` — tambah laluan `/signin` dan `/admin`

## Cara Akses Admin Sekarang
- **Bukan** lagi taip "admin" pada index.html — pergi terus ke **`addon.drizzev.web.id/admin`**
- Log masuk dengan email/password admin (sama macam sebelum ini)
- Semua fungsi (urus addon, warna laman, berita, laporan, pengguna, semua komen) ada dalam satu dashboard ni

## Cara Pelawat Sign In Sekarang
- Klik "Sign In" di navigasi index.html, ATAU
- Klik butang "Sign In" di bahagian Komen laman addon
- Kedua-dua bawa ke **`/signin`** — pilih Google, atau Log Masuk/Daftar guna emel
- Selepas berjaya, automatik kembali ke laman asal

## Nota Penting
- Sesi sign-in (Supabase) dikongsi merentasi semua laman dalam domain sama — sign in sekali, terpakai di semua laman addon
- Tema gelap/terang dan bahasa yang dipilih di index.html akan **turut terpakai** bila pelawat pergi ke laman addon individu (dikongsi melalui localStorage)
- Warna latar yang admin tetapkan di tab "Rupa Laman" terpakai untuk index.html sahaja buat masa ini (laman addon individu kekal warna asal — boleh diperluaskan lagi kalau perlu)
