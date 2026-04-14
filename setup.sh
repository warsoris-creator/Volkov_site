#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Установка сайта Александра Волкова на чистый Ubuntu-сервер
# Использование: bash setup.sh
# ─────────────────────────────────────────────────────────────

set -e  # остановить при любой ошибке

REPO="https://github.com/warsoris-creator/Volkov_site.git"
APP_DIR="$HOME/volkov-site"
PORT=3000

echo ""
echo "════════════════════════════════════════"
echo "  Установка сайта Александра Волкова"
echo "════════════════════════════════════════"
echo ""

# ── 1. Обновление системы ─────────────────────────────────────
echo "▶ Обновляем систему..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Установка Node.js 20 ───────────────────────────────────
echo ""
echo "▶ Устанавливаем Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "  Node.js: $(node -v)"
echo "  npm:     $(npm -v)"

# ── 3. Установка PM2 (менеджер процессов) ─────────────────────
echo ""
echo "▶ Устанавливаем PM2..."
sudo npm install -g pm2

# ── 4. Клонирование репозитория ───────────────────────────────
echo ""
echo "▶ Клонируем репозиторий..."
if [ -d "$APP_DIR" ]; then
  echo "  Папка уже есть — обновляем (git pull)..."
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Установка зависимостей ─────────────────────────────────
echo ""
echo "▶ Устанавливаем зависимости npm..."
npm install --production

# ── 6. Создаём папки data и uploads ──────────────────────────
mkdir -p data uploads

# ── 7. Запуск через PM2 ───────────────────────────────────────
echo ""
echo "▶ Запускаем сервер через PM2..."
pm2 delete volkov 2>/dev/null || true
pm2 start server.js --name volkov -- --port $PORT
pm2 save

# ── 8. Автозапуск PM2 при перезагрузке сервера ───────────────
echo ""
echo "▶ Настраиваем автозапуск..."
pm2 startup | tail -1 | sudo bash || true
pm2 save

# ── 9. Открываем порт в firewall ─────────────────────────────
echo ""
echo "▶ Открываем порт $PORT..."
sudo ufw allow $PORT/tcp 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

# ── Готово ────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  ✓ Установка завершена!"
echo ""
echo "  Сайт доступен по адресу:"
echo "  http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "  Полезные команды:"
echo "  pm2 status          — статус"
echo "  pm2 logs volkov     — логи"
echo "  pm2 restart volkov  — перезапуск"
echo "════════════════════════════════════════"
echo ""
