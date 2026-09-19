// api/comments.js — Vercel Node.js Serverless Function
// Urus komen setiap addon guna Supabase (Auth Google Sign-In + Database Postgres)
// - Awam boleh baca & hantar komen (perlu sign-in Google)
// - Komen mengandungi kata negatif ditolak automatik
// - Command /report <teks> disimpan berasingan, CUMA admin boleh nampak

import { createClient } from '@supabase/supabase-js';

// client "admin" guna Service Role Key — cuma dipakai di server, jangan sekali-kali
// hantar key ni ke browser
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function checkAdminAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const sep = decoded.indexOf(':');
  const email = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  return email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;
}

// senarai kata negatif/kesat ringkas (BM/BI) — komen mengandungi ni akan ditolak
const NEGATIVE_WORDS = [
  'teruk','sampah','buruk','jelek','bodoh','tipu','penipu','scam','rosak',
  'tak berguna','tak guna','busuk','hancur','sial','celaka','bangsat','tolol',
  'goblok','anjing','babi','kampang','worst','terrible','awful','trash',
  'garbage','useless','hate','sucks','crap','fraud','jahat','payah','menipu'
];
function containsNegative(text){
  const lower = text.toLowerCase();
  return NEGATIVE_WORDS.some(w => lower.includes(w));
}

// sahkan access token Supabase yang dihantar dari browser, dapatkan maklumat pengguna sebenar
async function getUserFromToken(accessToken){
  if (!accessToken) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { addonId, adminReports, allComments } = req.query;

    // senarai SEMUA komen (semua addon) — CUMA admin
    if (allComments === '1') {
      if (!checkAdminAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // senarai /report — CUMA admin
    if (adminReports === '1') {
      if (!checkAdminAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*')
        .eq('type', 'report')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    if (!addonId) return res.status(400).json({ error: 'addonId diperlukan' });
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('addon_id', addonId)
      .eq('type', 'comment') // awam TAK NAMPAK report langsung
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { addonId, text } = body;
    const authHeader = req.headers.authorization || '';

    if (!addonId || !text) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    // ---- MOD ADMIN: guna Basic Auth (email/password admin), bukan login Google/emel ----
    if (authHeader.startsWith('Basic ')) {
      if (!checkAdminAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
      const trimmedText = String(text).trim();
      if (!trimmedText) return res.status(400).json({ error: 'Komen tidak boleh kosong' });
      const { error } = await supabaseAdmin.from('comments').insert({
        addon_id: addonId,
        user_email: 'admin@drizz',
        user_name: 'ADMIN',
        user_picture: '',
        text: trimmedText,
        type: 'comment',
        is_admin: true
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, type: 'comment' });
    }

    // ---- MOD BIASA: pengguna log masuk (Google atau emel/password) ----
    const accessToken = authHeader.replace('Bearer ', '');

    const user = await getUserFromToken(accessToken);
    if (!user || !user.email) {
      return res.status(401).json({ error: 'Sila log masuk dahulu.' });
    }

    const trimmedText = String(text).trim();
    if (!trimmedText) return res.status(400).json({ error: 'Komen tidak boleh kosong' });
    if (trimmedText.length > 500) return res.status(400).json({ error: 'Komen terlalu panjang (max 500 aksara)' });

    const isReport = trimmedText.toLowerCase().startsWith('/report ');
    const cleanText = isReport ? trimmedText.slice(8).trim() : trimmedText;
    if (!cleanText) return res.status(400).json({ error: 'Sila isi kandungan selepas /report' });

    // tapisan kata negatif — HANYA untuk komen biasa (report memang untuk lapor isu)
    if (!isReport && containsNegative(cleanText)) {
      return res.status(400).json({ error: 'Komen anda mengandungi bahasa negatif dan tidak dibenarkan disiarkan.' });
    }

    const userName = user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email;
    const userPicture = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

    const { error } = await supabaseAdmin.from('comments').insert({
      addon_id: addonId,
      user_email: user.email,
      user_name: userName,
      user_picture: userPicture,
      text: cleanText,
      type: isReport ? 'report' : 'comment'
    });
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, type: isReport ? 'report' : 'comment' });
  }

  if (req.method === 'DELETE') {
    if (!checkAdminAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('comments').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Kaedah tidak disokong' });
}
