import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const required = ['TELEGRAM_BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HOST_TELEGRAM_IDS'];
for (const key of required) {
  if (!process.env[key] || process.env[key].startsWith('replace_')) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const hostIds = new Set(process.env.HOST_TELEGRAM_IDS.split(',').map(v => v.trim()).filter(Boolean));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(cors({
  origin(origin, callback) {
    const allowed = process.env.ALLOWED_ORIGIN;
    if (!origin || !allowed || origin === allowed) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  }
}));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false }));

function verifyTelegramInitData(initData) {
  if (typeof initData !== 'string' || !initData || initData.length > 8192) throw new Error('Missing Telegram initData');
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) throw new Error('Invalid Telegram signature');
  if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 86400) throw new Error('Expired Telegram session');
  params.delete('hash');
  params.delete('signature');
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = crypto.createHmac('sha256', secretKey).update(checkString).digest();
  const supplied = Buffer.from(receivedHash, 'hex');
  if (supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) throw new Error('Invalid Telegram signature');
  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Telegram user missing');
  const user = JSON.parse(rawUser);
  if (!Number.isSafeInteger(Number(user.id))) throw new Error('Invalid Telegram user');
  return { id: String(user.id), first_name: String(user.first_name || '').slice(0, 128), username: String(user.username || '').slice(0, 64) };
}

function auth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const initData = header.startsWith('tma ') ? header.slice(4) : '';
    req.telegramUser = verifyTelegramInitData(initData);
    req.isHost = hostIds.has(req.telegramUser.id);
    next();
  } catch {
    res.status(401).json({ error: 'Telegram authentication failed. Open this app from Telegram and try again.' });
  }
}
app.get('/health', (_req, res) => res.json({ ok: true, service: 'top-dice-api', mode: 'chat-foundation' }));
app.get('/api/me', auth, (req, res) => res.json({ user: req.telegramUser, isHost: req.isHost }));

app.get('/api/messages', auth, async (req, res) => {
  const target = req.isHost ? String(req.query.userId || '') : req.telegramUser.id;
  if (!/^\d{1,20}$/.test(target)) return res.status(400).json({ error: 'A valid conversation userId is required.' });
  const { data, error } = await supabase.from('chat_messages').select('id,conversation_user_id,sender_telegram_id,sender_role,message,created_at').eq('conversation_user_id', target).order('created_at', { ascending: true }).limit(200);
  if (error) return res.status(500).json({ error: 'Could not load messages.' });
  res.json({ messages: data || [] });
});

app.post('/api/messages', auth, async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 2000) return res.status(400).json({ error: 'Message must be between 1 and 2000 characters.' });
  const target = req.isHost ? String(req.body?.userId || '') : req.telegramUser.id;
  if (!/^\d{1,20}$/.test(target)) return res.status(400).json({ error: 'A valid conversation userId is required.' });
  const row = {
    conversation_user_id: target,
    sender_telegram_id: req.telegramUser.id,
    sender_role: req.isHost ? 'host' : 'user',
    message
  };
  const { data, error } = await supabase.from('chat_messages').insert(row).select('id,conversation_user_id,sender_telegram_id,sender_role,message,created_at').single();
  if (error) return res.status(500).json({ error: 'Could not send message.' });
  res.status(201).json({ message: data });
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed.' });
  console.error('Unhandled API error:', err?.message || 'unknown');
  res.status(500).json({ error: 'Unexpected server error.' });
});
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`TOP DICE API listening on port ${port}`));
