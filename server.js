const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE  = path.join(__dirname, 'data', 'site-data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Создаём папки если нет
[UPLOAD_DIR, path.join(__dirname, 'data')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer — сохранение файлов с уникальным именем
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Разрешены только изображения'));
  }
});

app.use(express.json({ limit: '10mb' }));
// Кэш для статических ресурсов (изображения, шрифты, CSS, JS) — 7 дней
app.use(function(req, res, next){
  var ext = req.path.split('.').pop().toLowerCase();
  if(['png','jpg','jpeg','woff','woff2','css','js'].includes(ext)){
    res.setHeader('Cache-Control','public,max-age=604800,immutable');
  } else {
    res.setHeader('Cache-Control','no-cache');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Загрузка изображения ──────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ── Получить данные сайта ─────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json({ hasData: false });
    const raw  = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error('Ошибка чтения данных:', e);
    res.status(500).json({ error: 'Ошибка чтения данных' });
  }
});

// ── Сохранить данные сайта ────────────────────────────────────────────
app.post('/api/save', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Ошибка сохранения:', e);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Сервер Александра Волкова запущен: http://localhost:${PORT}`);
});
