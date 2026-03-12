# Hướng dẫn triển khai AIMAP trên VPS

Tài liệu này mô tả cách chạy ứng dụng bằng Docker trên VPS và cấu hình Nginx (trên host) để truy cập qua domain **không cần gõ port** (ví dụ `http://domain.com` thay vì `http://domain.com:8080`).

## Kiến trúc

- **Nginx (host)** lắng nghe port 80 → reverse proxy tới container frontend (localhost:8080).
- **Frontend container** (port 8080) phục vụ SPA và proxy `/api` tới backend container.
- **Backend container** (port 4111) xử lý API.

```
User → http://domain.com (port 80)
         ↓
       Nginx (host)
         ↓
       localhost:8080 (frontend container)
         ↓ /api → backend:4111
```

---

## 1. Chuẩn bị trên VPS

- Cài Docker, Docker Compose, Nginx (nếu chưa có).
- Domain đã trỏ A record về IP VPS (ví dụ `103.77.215.133`).
- PostgreSQL chạy (trên host hoặc máy khác); backend dùng `DATABASE_URL` trong `docker-compose.yml`.

---

## 2. Clone và chạy Docker

Trên VPS (ví dụ trong thư mục home):

```bash
cd ~
git clone <url-repo> testKhaThi
cd testKhaThi/aimap
docker compose up -d --build
```

Kiểm tra:

```bash
docker compose ps
curl -s http://127.0.0.1:8080 | head -5
curl -s http://127.0.0.1:4111/health
```

Nếu dùng domain, nên đặt `FRONTEND_URL` trước khi build/run (xem mục 4).

---

## 3. Cấu hình Nginx trên host (để truy cập qua domain, port 80)

### 3.1. Copy file cấu hình

Từ thư mục `aimap` trên VPS:

```bash
sudo cp nginx-host.conf /etc/nginx/sites-available/aimap
```

### 3.2. Sửa domain

Mở file vừa copy và thay `domain.com` / `www.domain.com` bằng domain thật:

```bash
sudo nano /etc/nginx/sites-available/aimap
```

Ví dụ:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

### 3.3. Bật site và kiểm tra cấu hình

```bash
sudo ln -sf /etc/nginx/sites-available/aimap /etc/nginx/sites-enabled/
sudo nginx -t
```

Nếu `nginx -t` báo OK:

```bash
sudo systemctl reload nginx
```

### 3.4. Kiểm tra truy cập

- Trình duyệt: `http://yourdomain.com` (không cần `:8080`).
- API vẫn dùng cùng domain: `http://yourdomain.com/api/...` (frontend container tự proxy tới backend).

---

## 4. Khi dùng domain: cập nhật FRONTEND_URL (CORS + link trong email)

Backend dùng `FRONTEND_URL` cho CORS và link trong email (ví dụ reset mật khẩu). Nếu bạn truy cập qua domain, nên đặt đúng URL domain.

**Cách 1 – Biến môi trường khi chạy:**

```bash
export FRONTEND_URL=http://yourdomain.com
docker compose up -d --build
```

**Cách 2 – File `.env` trong thư mục `aimap`:**

Tạo file `aimap/.env` (không commit nếu có secret):

```env
FRONTEND_URL=http://yourdomain.com
```

Sau đó:

```bash
docker compose up -d --build
```

`docker-compose.yml` đã dùng `${FRONTEND_URL:-http://103.77.215.133}`, nên nếu không đặt `FRONTEND_URL` thì vẫn dùng IP.

---

## 5. Các lệnh thường dùng trên VPS

| Việc cần làm | Lệnh |
|--------------|------|
| Xem trạng thái container | `cd ~/testKhaThi/aimap && docker compose ps` |
| Xem log frontend/backend | `docker compose logs -f frontend` hoặc `backend` |
| Rebuild và chạy lại | `docker compose up -d --build` |
| Dừng ứng dụng | `docker compose down` |
| Kiểm tra Nginx | `sudo nginx -t` |
| Reload Nginx sau khi sửa config | `sudo systemctl reload nginx` |
| Xem Nginx đang lắng nghe port nào | `sudo ss -tlnp \| grep nginx` hoặc `sudo lsof -i :80` |

---

## 6. Xử lý nhanh

- **Trang trắng hoặc 502:** Kiểm tra `docker compose ps`, `curl http://127.0.0.1:8080`. Đảm bảo Nginx host `proxy_pass` đúng `http://127.0.0.1:8080`.
- **API lỗi / CORS:** Kiểm tra `FRONTEND_URL` có đúng domain (http hoặc https) và đã rebuild/restart backend.
- **Port 80 đã bị dùng:** Nginx host đang chiếm 80 là đúng; không cần bind Docker vào 80, chỉ cần proxy từ Nginx xuống 8080 như trên.

---

## 7. Bật HTTPS (gợi ý)

Trên Nginx host có thể dùng Certbot (Let’s Encrypt):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Sau khi có HTTPS, cập nhật `FRONTEND_URL=https://yourdomain.com` và reload/rebuild backend.
