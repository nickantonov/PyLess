# 🚀 Installation Guide — PyLess

## Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+ / any Linux with systemd
- **RAM**: 512MB minimum, 1GB recommended
- **Disk**: 2GB free space
- **Network**: Port 80 (HTTP), Port 443 (HTTPS)

## Quick Install (Recommended)

```bash
# One command installs everything
curl -fsSL https://raw.githubusercontent.com/borodachamba/PyLess/main/install.sh | sudo bash
```

The installer will:
1. Install nginx, Node.js 20, Python dependencies
2. Clone PyLess to `/opt/pyless`
3. Build the frontend
4. Configure environment variables
5. Setup systemd service
6. Configure nginx reverse proxy
7. Optionally setup SSL (Let's Encrypt)

## Manual Installation

### 1. Install Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx python3 python3-pip nodejs npm git

# Install Node.js 20 (if not available)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone Repository

```bash
sudo git clone https://github.com/borodachamba/PyLess.git /opt/pyless
cd /opt/pyless
```

### 3. Install Python Dependencies

```bash
sudo pip3 install -r requirements.txt
```

### 4. Build Frontend

```bash
cd frontend
sudo npm install
sudo npm run build
cd ..
```

### 5. Configure Environment

```bash
sudo cp /opt/pyless/.env.example /opt/pyless/.env
sudo nano /opt/pyless/.env
```

Set these values:
```bash
# Generate a secret key
JWT_SECRET=$(openssl rand -hex 32)

# Your domain
DOMAIN=your-domain.com

# Optional: Groq API key for AI tutor
GROQ_API_KEY=

# Database directory
DB_DIR=/opt/pyless/data

# Admin code for first promotion
ADMIN_CODE=your-admin-code
```

### 6. Create Systemd Service

```bash
sudo tee /etc/systemd/system/pyless.service << EOF
[Unit]
Description=PyLess Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pyless
EnvironmentFile=/opt/pyless/.env
ExecStart=/usr/bin/python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable pyless
sudo systemctl start pyless
```

### 7. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/pyless << EOF
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/pyless /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Setup SSL

#### Option A: Cloudflare (Recommended)
1. Add DNS A record: `your-domain.com` → your server IP
2. Enable Cloudflare proxy (orange cloud)
3. Set SSL mode to "Flexible"
4. Done! No server-side SSL needed.

#### Option B: Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 9. First Login

1. Open `https://your-domain.com`
2. Register an account
3. Promote yourself to admin:
```bash
curl -X POST http://localhost:8000/api/auth/promote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code": "YOUR_ADMIN_CODE"}'
```

4. Open admin panel and configure settings

---

## Docker Installation

### Development

```bash
docker compose up --build
```

### Production

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

---

## Updating

```bash
cd /opt/pyless
git pull
cd frontend && npm run build && cd ..
sudo systemctl restart pyless
```

---

## Backup

Daily backups are configured automatically. Manual backup:

```bash
/opt/pyless/scripts/backup.sh
```

Restore:
```bash
sqlite3 /opt/pyless/data/pylesss.db < backup.sql
```

---

## Troubleshooting

### Server won't start
```bash
sudo journalctl -u pyless -n 50
```

### Port 80 already in use
```bash
sudo fuser -k 80/tcp
sudo systemctl restart pyless
```

### Database errors
```bash
# Check database
sqlite3 /opt/pyless/data/pylesss.db ".tables"

# Reset database (WARNING: deletes all data)
rm /opt/pyless/data/pylesss.db
sudo systemctl restart pyless
```

### Frontend not loading
```bash
cd /opt/pyless/frontend
npm run build
sudo systemctl restart pyless
```
