import { samePassword, wait } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 받아요' });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD 환경 변수가 없어요' });
  }
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  if (!samePassword(body && body.password)) {
    await wait(700);
    return res.status(401).json({ error: '비밀번호가 맞지 않아요' });
  }
  return res.status(200).json({ ok: true });
}

function safeParse(s) {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}
