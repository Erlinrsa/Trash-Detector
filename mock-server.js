// mock-server.js
// Mock Server Sederhana untuk Uji Coba Protected API (Week 5)
const http = require('http');

const PORT = 3000;

// Penyimpanan token aktif di memory server
let validTokens = new Set();

// Data contoh sampah / programs
const trashData = [
  {
    id: 1,
    title: 'Botol Plastik Air Mineral (PET)',
    category: 'Anorganik',
    confidence: 98,
    instruction: 'Bilas bersih, remas hingga pipih, buang ke tempat kuning.',
    icon: '🧴',
  },
  {
    id: 2,
    title: 'Kulit Pisang & Sisa Buah',
    category: 'Organik',
    confidence: 95,
    instruction: 'Buang ke komposter atau tempat hijau untuk pupuk.',
    icon: '🍌',
  },
  {
    id: 3,
    title: 'Baterai Bekas Alkaline AA',
    category: 'Limbah B3',
    confidence: 99,
    instruction: 'Limbah berbahaya! Buang ke e-waste drop point.',
    icon: '🔋',
  },
];

const server = http.createServer((req, res) => {
  // Set CORS headers agar bisa diakses dari web/HP
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;
  const method = req.method;

  // 1. Endpoint POST /login
  if (method === 'POST' && url === '/login') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const token = `token_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      validTokens.add(token);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Login berhasil',
        access_token: token,
        user: { name: 'Mahasiswa Warga Indonesia', email: 'user@mail.com' },
      }));
    });
    return;
  }

  // 2. Endpoint POST /logout
  if (method === 'POST' && url === '/logout') {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      validTokens.delete(token);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Logout berhasil, token telah dicabut (revoked).' }));
    return;
  }

  // 3. Endpoint GET /programs atau GET /trash (PROTECTED ENDPOINT - PERSIS SLIDE DOSEN)
  if (method === 'GET' && (url === '/programs' || url === '/trash')) {
    const authHeader = req.headers['authorization'];

    // Validasi Header Authorization (Slide 5, 11, 13)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unauthorized: Header Authorization Bearer token wajib disertakan.',
      }));
      return;
    }

    const token = authHeader.split(' ')[1];

    // Cek apakah token masih aktif atau sudah logout/revoked (Persis di layar dosen)
    if (!validTokens.has(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unauthorized: Sesi telah diakhiri (token revoked / telah logout). Silakan login kembali.',
      }));
      return;
    }

    // Jika token sah, kirim data (Status 200 OK)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(trashData));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 [MOCK SERVER WEEK 5 BERJALAN DI PORT ${PORT}]`);
  console.log('Endpoints:');
  console.log(`  POST http://localhost:${PORT}/login`);
  console.log(`  POST http://localhost:${PORT}/logout`);
  console.log(`  GET  http://localhost:${PORT}/programs (Protected)`);
  console.log(`  GET  http://localhost:${PORT}/trash    (Protected)\n`);
});
