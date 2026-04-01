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
| `PAYMENT_PROVIDER` | Không dùng để auto-success; luồng production xác nhận qua webhook VietQR API Service |
| `PAYMENT_POLL_ENABLED` | `0` = tắt vòng poll nền |
| `PAYMENT_POLL_INTERVAL_MS` | Chu kỳ poll (mặc định `15000`) |
| `PAYMENT_EXPIRY_MINUTES` | Hết hạn đơn pending (mặc định `30`) |
| `PAYMENT_MIN_AMOUNT_VND` | Tối thiểu số tiền mỗi lần tạo intent (mặc định `10000`) |
| `PAYMENT_METHOD_VIETQR` | `0` = ẩn VietQR dù đã cấu hình BIN/tài khoản |
| `VIETQR_BANK_BIN` | Mã BIN ngân hàng (6 số) — sinh URL ảnh QR `img.vietqr.io` |
| `VIETQR_ACCOUNT_NO` | Số tài khoản nhận (không khoảng trắng) |
| `VIETQR_WEBHOOK_BEARER` | (Tuỳ chọn) Nếu set, `POST /api/webhooks/vietqr` yêu cầu `Authorization: Bearer <giá trị>` |
| `VIETQR_CLIENT_USERNAME` | (Tuỳ chọn) Username Basic Auth phía khách hàng cấu hình trong VietQR API Service |
| `VIETQR_CLIENT_PASSWORD` | (Tuỳ chọn) Password Basic Auth phía khách hàng cấu hình trong VietQR API Service |
| `VIETQR_CALLBACK_SECRET` | (Tuỳ chọn) Secret để verify trường `sign` callback VietQR (nếu tài khoản có bật) |
| `VIETQR_CLIENT_TOKEN_TTL_SEC` | TTL token cấp bởi endpoint `POST /vqr/api/token_generate` (mặc định `900` giây) |
| `FB_APP_ID` | Meta App ID (OAuth / tool Meta) — có thể trùng `META_APP_ID` |
| `FB_APP_SECRET` | Meta App Secret để exchange code lấy user token (OAuth — khi triển khai flow đầy đủ) |
| `META_APP_ID` | **Bắt buộc nếu cần biết bài post do app nào tạo** — dùng trong `routes/shopFacebookMarketing.js` để set `canEditViaApi` / PATCH post |
| `FACEBOOK_GRAPH_VERSION` | Version Graph API khi gọi từ backend (mặc định `v20.0`) — biến dùng trong `facebookGraphService.js` |
| `FB_GRAPH_VERSION` | (Tuỳ chọn) Alias / tài liệu cũ; ưu tiên `FACEBOOK_GRAPH_VERSION` trong code hiện tại |
| `FB_OAUTH_SCOPES` | Scope OAuth cho page flow (vd. `pages_show_list,pages_manage_posts,pages_read_engagement`) |
| `MARKETING_AI_BASE_URL` | URL Ollama trên VPS (vd. `http://IP:11434`) — tóm tắt comment / đánh giá bài / AI assist; không set → API vẫn chạy, phần AI trả placeholder |
| `MARKETING_AI_MODEL` | Tên model Ollama (mặc định `qwen2.5:7b`) |
| `MARKETING_AI_TIMEOUT_MS` | Timeout gọi Ollama (mặc định `45000`) |
| `MARKETING_MODEL_PROVIDER` | (Tùy module khác) Provider text marketing `openai` / `gemini` nếu có route tách |
| `MARKETING_OPENAI_MODEL` | Model OpenAI cho draft content (vd. `gpt-4o-mini`) |
| `MARKETING_GEMINI_MODEL` | Model Gemini cho draft content (vd. `gemini-2.5-flash`) |

**Frontend:** `VITE_API_URL` trong `aimap/frontend/.env` phải trỏ tới API có suffix `/api`, vd. `http://localhost:4111/api`. Không nhầm với `API_PUBLIC_URL`.

**Ghi chú Docker/Production:**
- Backend thường gọi DB theo `DATABASE_URL` trong `aimap/.env`.
- Nếu chạy sau reverse proxy (Nginx/Caddy) nên set `TRUST_PROXY=1` để log IP đúng.
- Để VietQR API Service test pass E05: frontend nginx phải proxy thêm đường dẫn `/vqr` về backend.
