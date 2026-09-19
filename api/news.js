// api/news.js — Vercel Node.js Serverless Function
// Urus pos berita/news untuk index.html

import { put, head } from '@vercel/blob';
import { randomUUID } from 'crypto';

const DATA_PATH = 'data/news.json';

async function readNews(){
  try{
    const info = await head(DATA_PATH);
    const res = await fetch(info.url, { cache: 'no-store' });
    if(!res.ok) return [];
    return await res.json();
  }catch(e){
    return [];
  }
}

async function writeNews(news){
  await put(DATA_PATH, JSON.stringify(news), {
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
    const news = await readNews();
    news.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return res.status(200).json(news);
  }

  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const body = req.body || {};
    if (!body.title) return res.status(400).json({ error: 'Tajuk diperlukan' });
    const news = await readNews();
    const newItem = {
      id: randomUUID(),
      title: body.title,
      content: body.content || '',
      image: body.image || '',
      createdAt: Date.now()
    };
    news.push(newItem);
    await writeNews(news);
    return res.status(200).json(newItem);
  }

  if (req.method === 'DELETE') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const { id } = req.query;
    let news = await readNews();
    news = news.filter(n => n.id !== id);
    await writeNews(news);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Kaedah tidak disokong' });
}
