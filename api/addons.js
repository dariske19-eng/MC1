// api/addons.js — Vercel Node.js Serverless Function
// Simpan & urus senarai addon (dengan Kumpulan/Group) — data disimpan sebagai
// fail JSON dalam Vercel Blob (tiada Redis/Upstash diperlukan)

import { put, del, head } from '@vercel/blob';
import { randomUUID } from 'crypto';

const DATA_PATH = 'data/addons.json';

async function readAddons() {
  try {
    const info = await head(DATA_PATH);
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return []; // fail belum wujud lagi (addon pertama akan dibuat)
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
    const addons = await readAddons();
    return res.status(200).json(addons);
  }

  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const body = req.body || {};
    if (!body.title || !body.group) {
      return res.status(400).json({ error: 'Kumpulan dan tajuk diperlukan' });
    }
    const addons = await readAddons();
    const newAddon = {
      id: randomUUID(),
      group: body.group,
      title: body.title,
      image: body.image || '',
      link: body.link || '',
      desc: body.desc || '',
      badge: body.badge || 'Muat Turun',
      howTo: body.howTo || '',
      videoUrl: body.videoUrl || '',
      downloads: 0,
      createdAt: Date.now(),
      versions: []
    };
    addons.push(newAddon);
    await writeAddons(addons);
    return res.status(200).json(newAddon);
  }

  if (req.method === 'PUT') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'ID addon diperlukan' });
    const addons = await readAddons();
    const idx = addons.findIndex(a => a.id === body.id);
    if (idx === -1) return res.status(404).json({ error: 'Addon tidak dijumpai' });
    addons[idx] = {
      ...addons[idx],
      group: body.group || addons[idx].group,
      title: body.title || addons[idx].title,
      image: body.image ?? addons[idx].image,
      link: body.link ?? addons[idx].link,
      desc: body.desc ?? addons[idx].desc,
      badge: body.badge || addons[idx].badge,
      howTo: body.howTo ?? addons[idx].howTo,
      videoUrl: body.videoUrl ?? addons[idx].videoUrl
    };
    await writeAddons(addons);
    return res.status(200).json(addons[idx]);
  }

  if (req.method === 'DELETE') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const { id } = req.query;
    let addons = await readAddons();
    const target = addons.find(a => a.id === id);
    if (target && target.versions) {
      for (const v of target.versions) {
        try { await del(v.fileUrl); } catch (e) {}
      }
    }
    addons = addons.filter(a => a.id !== id);
    await writeAddons(addons);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Kaedah tidak disokong' });
}
