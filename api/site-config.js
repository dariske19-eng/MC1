// api/site-config.js — Vercel Node.js Serverless Function
// Simpan konfigurasi laman (warna latar terang/gelap, override teks hero)
// Awam boleh GET, cuma admin boleh PUT/POST

import { put, head } from '@vercel/blob';

const DATA_PATH = 'data/site-config.json';

async function readConfig(){
  try{
    const info = await head(DATA_PATH);
    const res = await fetch(info.url, { cache: 'no-store' });
    if(!res.ok) return {};
    return await res.json();
  }catch(e){
    return {};
  }
}

async function writeConfig(config){
  await put(DATA_PATH, JSON.stringify(config), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

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
  if (req.method === 'GET') {
    const config = await readConfig();
    return res.status(200).json(config);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const body = req.body || {};
    const current = await readConfig();
    const updated = { ...current, ...body };
    await writeConfig(updated);
    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Kaedah tidak disokong' });
}
