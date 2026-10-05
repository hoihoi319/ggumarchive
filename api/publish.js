import { samePassword, wait } from './_auth.js';

const FILE = 'data/projects.json';
const CATS = new Set(['game', 'story', 'edu', 'lab']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 받아요' });
  }
  if (!samePassword(req.headers['x-admin-password'])) {
    await wait(700);
    return res.status(401).json({ error: '비밀번호가 맞지 않아요' });
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = process.env;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({ error: 'GITHUB_TOKEN / GITHUB_REPO 환경 변수가 없어요' });
  }

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return res.status(400).json({ error: 'JSON이 아니에요' }); }
  }
  const problem = validate(data);
  if (problem) return res.status(400).json({ error: problem });

  const text = JSON.stringify(data, null, 2) + '\n';
  if (Buffer.byteLength(text) > 900_000) return res.status(413).json({ error: '내용이 너무 커요' });

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ggumgorae-archive',
  };

  // 지금 파일의 sha를 알아야 덮어쓸 수 있다.
  const cur = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
  if (!cur.ok && cur.status !== 404) {
    return res.status(502).json({ error: `GitHub 읽기 실패 (${cur.status})` });
  }
  const sha = cur.ok ? (await cur.json()).sha : undefined;

  const put = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `사이트 내용 업데이트 (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`,
      content: Buffer.from(text).toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (put.status === 409 || put.status === 422) {
    return res.status(409).json({ error: '다른 곳에서 먼저 바뀌었어요' });
  }
  if (!put.ok) return res.status(502).json({ error: `GitHub 저장 실패 (${put.status})` });

  return res.status(200).json({ ok: true });
}

function validate(d) {
  if (!d || typeof d !== 'object') return '형식이 맞지 않아요';
  if (!Array.isArray(d.statuses) || !d.statuses.every((s) => typeof s === 'string' && s.length <= 20)) return '상태 목록이 이상해요';
  if (!Array.isArray(d.projects) || d.projects.length > 500) return '프로젝트 목록이 이상해요';
  for (const p of d.projects) {
    if (!p || typeof p.id !== 'string' || typeof p.title !== 'string' || !p.title.trim()) return '제목 없는 프로젝트가 있어요';
    if (!CATS.has(p.cat)) return `"${p.title}"의 분류가 이상해요`;
    if (!Number.isInteger(p.icon) || p.icon < 0 || p.icon > 11) return `"${p.title}"의 아이콘이 이상해요`;
  }
  return null;
}
