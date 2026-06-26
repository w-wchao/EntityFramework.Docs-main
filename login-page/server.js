const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

// In-memory user store and refresh token store (demo only)
const users = {}; // { email: { passwordHash } }
// persistent refresh token store (demo)
const TOKENS_FILE = path.join(__dirname, 'refreshTokens.json');
let refreshTokens = new Set();
function loadTokens(){
  try{ const raw = fs.readFileSync(TOKENS_FILE,'utf8'); const arr = JSON.parse(raw||'[]'); refreshTokens = new Set(arr); }
  catch(e){ refreshTokens = new Set(); }
}
function saveTokens(){
  try{ fs.writeFileSync(TOKENS_FILE, JSON.stringify(Array.from(refreshTokens), null, 2), 'utf8'); }
  catch(e){ console.error('Failed to save tokens', e); }
}
loadTokens();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret';

function generateAccessToken(payload){
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(payload){
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

// Register (demo). In real apps validate inputs and persist to DB.
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(400).json({ message: 'email and password required' });
  if(users[email]) return res.status(400).json({ message: 'user exists' });
  const hash = await bcrypt.hash(password, 10);
  users[email] = { passwordHash: hash };
  return res.json({ success: true });
});

// Login: returns access token and sets HttpOnly refresh token cookie
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = users[email];
  if(!user) return res.status(401).json({ message: '邮箱或密码不正确' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ message: '邮箱或密码不正确' });

  const payload = { email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  refreshTokens.add(refreshToken);
  saveTokens();

  // Also set a non-HttpOnly CSRF cookie so the client can read and send it in headers
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie('csrfToken', csrfToken, { httpOnly: false, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

  return res.json({ accessToken, email, csrfToken });
});

// Refresh access token using HttpOnly refresh token cookie
app.post('/api/refresh', (req, res) => {
  // CSRF protection: require header x-csrf-token matching cookie
  const csrfHeader = req.get('x-csrf-token');
  const csrfCookie = req.cookies.csrfToken;
  if(!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return res.status(403).json({ message: 'CSRF token mismatch' });

  const token = req.cookies.refreshToken;
  if(!token) return res.status(401).json({ message: 'No refresh token' });
  if(!refreshTokens.has(token)) return res.status(403).json({ message: 'Invalid refresh token' });
  try{
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
    const accessToken = generateAccessToken({ email: payload.email });
    return res.json({ accessToken });
  }catch(e){
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// Logout: clear refresh token
app.post('/api/logout', (req, res) => {
  const csrfHeader = req.get('x-csrf-token');
  const csrfCookie = req.cookies.csrfToken;
  if(!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return res.status(403).json({ message: 'CSRF token mismatch' });

  const token = req.cookies.refreshToken;
  if(token && refreshTokens.has(token)){
    refreshTokens.delete(token);
    saveTokens();
  }
  res.clearCookie('refreshToken');
  res.clearCookie('csrfToken');
  return res.json({ success: true });
});

// Revoke refresh token(s) - requires CSRF header. Body: { token } or { email }
app.post('/api/revoke', (req, res) => {
  const csrfHeader = req.get('x-csrf-token');
  const csrfCookie = req.cookies.csrfToken;
  if(!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return res.status(403).json({ message: 'CSRF token mismatch' });
  const { token, email } = req.body || {};
  if(token){
    if(refreshTokens.has(token)){
      refreshTokens.delete(token); saveTokens();
      return res.json({ success: true });
    }
    return res.status(404).json({ message: 'token not found' });
  }
  if(email){
    // naive: remove tokens containing the email's payload when decoded
    let removed = 0;
    for(const t of Array.from(refreshTokens)){
      try{ const p = jwt.verify(t, REFRESH_TOKEN_SECRET); if(p.email === email){ refreshTokens.delete(t); removed++; } }
      catch(e){}
    }
    if(removed) { saveTokens(); return res.json({ success:true, removed }); }
    return res.status(404).json({ message: 'no tokens for user' });
  }
  return res.status(400).json({ message: 'token or email required' });
});

// Protected route example
app.get('/api/protected', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if(parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Missing token' });
  const token = parts[1];
  try{
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    return res.json({ message: `Hello ${payload.email}, this is protected data.` });
  }catch(e){
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Seed a demo user if none exists
(async function seed(){
  if(!users['demo@example.com']){
    users['demo@example.com'] = { passwordHash: await bcrypt.hash('password', 10) };
    console.log('Seeded demo user: demo@example.com / password');
  }
})();

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`示例后端已启动: http://localhost:${port}`));
