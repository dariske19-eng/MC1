// api/download.js — Vercel Node.js Serverless Function
// Kira +1 muat turun untuk addon berkenaan, kemudian redirect ke fail sebenar di Blob

import { put, head } from '@vercel/blob';

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

async function writeAddons(addons) {
  await put(DATA_PATH, JSON.stringify(addons), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Kaedah tidak disokong' });
  }
  const { addonId, versionId } = req.query;
  if (!addonId || !versionId) {
    return res.status(400).send('Data tidak lengkap');
  }

  const addons = await readAddons();
  const idx = addons.findIndex(a => a.id === addonId);
  if (idx === -1) {
    return res.status(404).send('Addon tidak dijumpai');
  }
  const version = (addons[idx].versions || []).find(v => v.id === versionId);
  if (!version) {
    return res.status(404).send('Versi tidak dijumpai');
  }

  // kira +1 muat turun, jangan biar ralat kiraan halang proses download
  try {
    addons[idx].downloads = (addons[idx].downloads || 0) + 1;
    await writeAddons(addons);
  } catch (e) {
    console.error('Gagal kemas kini kiraan muat turun:', e);
  }

  res.redirect(302, version.fileUrl);
}
