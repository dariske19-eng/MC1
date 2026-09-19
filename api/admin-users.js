// api/admin-users.js — Vercel Node.js Serverless Function
// Papar jumlah & senarai pengguna yang dah sign in/daftar (Supabase Auth)
// CUMA admin boleh akses

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function checkAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const sep = decoded.indexOf(':');
  const email = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  return email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Kaedah tidak disokong' });
  }
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Tidak sah' });
  }
  try{
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });
    const users = (data.users || []).map(u => ({
      email: u.email,
      username: u.user_metadata?.username || u.user_metadata?.full_name || u.user_metadata?.name || '',
      provider: u.app_metadata?.provider || 'email',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json({ count: users.length, users });
  }catch(e){
    return res.status(500).json({ error: 'Gagal muat senarai pengguna. Pastikan SUPABASE_SERVICE_ROLE_KEY betul.' });
  }
}
