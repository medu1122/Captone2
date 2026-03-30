# AIMAP Backend — Biến môi trường

**Nguồn mẫu (chạy trực tiếp backend):** [aimap/backend/.env.example](../aimap/backend/.env.example) — copy thành `aimap/backend/.env` và điền giá trị thật.

**Docker/Production (docker compose):** dùng file `aimap/.env` (nguồn mẫu: [aimap/.env.example](../aimap/.env.example)).
Compose sẽ inject biến vào container backend (không dùng `aimap/backend/.env`).

**Không commit** file `.env` lên git. Khi thêm biến env mới trong code backend, cập nhật `.env.example` và bảng dưới đây.

| Biến | Mục đích |
|------|----------|
| `NODE_ENV` | `development` / `production` |
| `PORT` | Cổng HTTP backend (mặc định 4111) |
| `TRUST_PROXY` | `1` hoặc `true` nếu sau reverse proxy (IP client) |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `DATABASE_SSL` | Khác `false` → bật SSL tới DB |
| `JWT_SECRET` | Ký JWT |
| `JWT_EXPIRES_IN` | Thời hạn token (vd. `7d`) |
| `FRONTEND_URL` | Origin frontend — CORS + link trong email |
| `SMTP_*`, `MAIL_FROM` | Gửi email verify / reset password |
| `OPENAI_API_KEY` | Tạo ảnh nhánh GPT |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` (khuyến nghị) hoặc `dall-e-3` |
| `GEMINI_API_KEY` | Tạo ảnh nhánh Gemini / Imagen |
| `GEMINI_IMAGEN_MODEL` | Imagen qua API predict (vd. `imagen-3.0-generate-002`) |
| `GEMINI_USE_IMAGEN` | `false` để bỏ qua Imagen, chỉ native Gemini image |
| `GEMINI_IMAGE_MODEL` | Fallback generateContent + IMAGE |
| `ASSET_STORAGE_PATH` | Thư mục lưu file ảnh shop |
| `API_PUBLIC_URL` | URL **gốc** backend **không** có `/api` — dùng cho link ảnh `/uploads/...` trong DB |
| `CREDIT_VND_RATE` | Số VND cho 1 credit khi tạo đơn nạp (mặc định `1000`) |
| `IMAGE_GENERATE_CREDIT_COST` | Trừ credit mỗi variant ảnh image bot (mặc định `1`) |
| `PAYMENT_PROVIDER` | `mock` = tự xác nhận đơn sau vài giây; khác = `vietqr_polling` (chưa gắn API thật) |
| `PAYMENT_POLL_ENABLED` | `0` = tắt vòng poll nền |
| `PAYMENT_POLL_INTERVAL_MS` | Chu kỳ poll (mặc định `15000`) |
| `PAYMENT_MOCK_DELAY_SEC` | Đơn mock chỉ hoàn tất sau khi đã tạo ít nhất N giây (mặc định `5`) |
| `PAYMENT_EXPIRY_MINUTES` | Hết hạn đơn pending (mặc định `30`) |
| `PAYMENT_MIN_AMOUNT_VND` | Tối thiểu số tiền mỗi lần tạo intent (mặc định `10000`) |
| `PAYMENT_METHOD_MOCK` | `0` = ẩn phương thức mock trong `GET /credits/methods` |
| `PAYMENT_METHOD_VIETQR` | `0` = ẩn VietQR dù đã cấu hình BIN/tài khoản |
| `VIETQR_BANK_BIN` | Mã BIN ngân hàng (6 số) — sinh URL ảnh QR `img.vietqr.io` |
| `VIETQR_ACCOUNT_NO` | Số tài khoản nhận (không khoảng trắng) |
| `CASSO_WEBHOOK_BEARER` | (Tuỳ chọn) Nếu set, `POST /api/webhooks/casso` yêu cầu `Authorization: Bearer <giá trị>` |

**Frontend:** `VITE_API_URL` trong `aimap/frontend/.env` phải trỏ tới API có suffix `/api`, vd. `http://localhost:4111/api`. Không nhầm với `API_PUBLIC_URL`.

**Ghi chú Docker/Production:**
- Backend thường gọi DB theo `DATABASE_URL` trong `aimap/.env`.
- Nếu chạy sau reverse proxy (Nginx/Caddy) nên set `TRUST_PROXY=1` để log IP đúng.
