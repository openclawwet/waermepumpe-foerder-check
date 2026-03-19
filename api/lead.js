import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const record = { ...body, receivedAt: new Date().toISOString() };
  const file = path.join('/tmp', 'w-rmepumpe-f-rder-check-leads.jsonl');
  await fs.appendFile(file, JSON.stringify(record) + '\n');
  res.status(200).json({ ok: true });
}
