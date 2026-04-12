# API Backend - AIMAP (Tài liệu tham chiếu chính)

> **Đây là file tài liệu API duy nhất của dự án.**
> Mọi thêm/sửa/xóa endpoint đều phải cập nhật vào file này.
> File `API.md` đã bị xóa — không dùng nữa.

Base URL: `http://localhost:4111/api`

---

## Credit (số dư)

- Số dư = tổng `amount` trong bảng `credit_transactions` theo `user_id` (profile id).
- Sau **POST /auth/verify** thành công, user mới nhận **1000 credit** (bonus đăng ký, `reference_type`: `signup_bonus`; có thể đổi trong code `SIGNUP_CREDIT_BONUS`).
- User cũ (tạo trước khi có tính năng) có thể có số dư **0** cho đến khi admin cấp thêm.

---

## Auth API

**POST /auth/register** - Đăng ký tài khoản mới
```
Headers: Content-Type: application/json
Body:
{
  "email": "test@example.com",
  "password": "123456",
  "name": "Nguyen Van A"
}
```
Response: trả về mã 6 số gửi qua email (nếu chưa config SMTP thì trả trong response luôn)

---

**POST /auth/verify** - Xác thực email bằng mã 6 số
```
Headers: Content-Type: application/json
Body:
{
  "email": "test@example.com",
  "code": "123456"
}
```

---

**POST /auth/resend-verify-code** - Gửi lại mã xác thực
```
Headers: Content-Type: application/json
Body:
{
  "email": "test@example.com"
}
```

---

**POST /auth/login** - Đăng nhập
```
Headers: Content-Type: application/json
Body:
{
  "email": "test@example.com",
  "password": "123456"
}
```
Response: trả về `token` và `user` (gồm **`creditBalance`**: số credit hiện có).

---

**GET /auth/me** - Lấy thông tin profile hiện tại
```
Headers: 
  Content-Type: application/json
  Authorization: Bearer <token>
```
Response: tất cả fields của user profile + **`creditBalance`** (integer).

---

**PUT /auth/me** - Cập nhật thông tin profile
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body:
{
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "emailContact": "contact@example.com",
  "companyName": "ABC Company",
  "address": "123 Nguyen Hue",
  "city": "Ho Chi Minh",
  "district": "Quan 1",
  "country": "Vietnam",
  "postalCode": "70000",
  "dateOfBirth": "1990-01-15",
  "gender": "Male",
  "bio": "Software developer",
  "timezone": "Asia/Ho_Chi_Minh",
  "locale": "vi",
  "avatarUrl": "https://..."
}
```
Lưu ý: `name` bắt buộc, `locale` chỉ được `vi` hoặc `en`

---

**GET /auth/me/activity** - Nhật ký hoạt động (cho Dashboard Activity log)
```
Headers:
  Authorization: Bearer <token>
Query:
  limit=20 (mặc định 20, tối đa 100)
  offset=0
```
Response:
```json
{
  "activity": [
    {
      "action": "create_shop",
      "entity_type": "shop",
      "entity_id": "uuid",
      "details": { "shop_name": "...", "slug": "..." },
      "severity": "info",
      "created_at": "2025-03-16T..."
    }
  ]
}
```

---

**GET /auth/me/access-log** - Nhật ký truy cập (đăng nhập: IP + thời gian)
```
Headers:
  Authorization: Bearer <token>
Query:
  limit=20 (mặc định 20, tối đa 100)
  offset=0
```
Response:
```json
{
  "access": [
    { "ip_address": "1.2.3.4", "created_at": "2025-03-16T..." }
  ]
}
```
- Chỉ trả các lần **đăng nhập thành công** (`action = login` trong `activity_logs`).
- IP chính xác hơn khi bật reverse proxy: đặt `TRUST_PROXY=1` trong env.

---

**PUT /auth/password** - Đổi mật khẩu
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body:
{
  "currentPassword": "123456",
  "newPassword": "654321"
}
```
Lưu ý: mật khẩu mới tối thiểu 6 ký tự

---

**POST /auth/forgot-password** - Quên mật khẩu (gửi link reset qua email)
```
Headers: Content-Type: application/json
Body:
{
  "email": "test@example.com"
}
```

---

**POST /auth/reset-password** - Đặt lại mật khẩu (dùng token từ link)
```
Headers: Content-Type: application/json
Body:
{
  "token": "<token từ link email>",
  "newPassword": "newpass123"
}
```

---

## Shops API

Tất cả endpoint shops (trừ GET /shops/slugs) cần header:
```
Authorization: Bearer <token>
```

---

**GET /shops** - Danh sách shop mà user sở hữu (dùng cho ShopListPage)
```
Headers: Authorization: Bearer <token>
```
Trả về các shop có `user_id` = profileId của user đăng nhập, sắp xếp theo `created_at` giảm dần.
Response:
```json
{
  "shops": [
    {
      "id": "uuid",
      "name": "...",
      "slug": "my-shop",
      "industry": "...",
      "description": "...",
      "logo_url": null,
      "cover_url": null,
      "status": "active",
      "created_at": "..."
    }
  ]
}
```

---

**GET /shops/slugs** - Danh sách tất cả slug (dùng cho form tạo shop kiểm tra trùng)
```
Không bắt buộc token
```
Response: `["slug1", "slug2", ...]`

---

**POST /shops** - Tạo shop mới
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body:
{
  "name": "Tên cửa hàng",
  "slug": "my-shop",
  "industry": "Đồ uống",
  "description": "Mô tả ngắn",
  "address": "123 Đường X",
  "city": "TP.HCM",
  "district": "Quận 1",
  "country": "Vietnam",
  "postal_code": "700000",
  "contact_info": {
    "phone": "0901234567",
    "email": "shop@example.com",
    "owner_name": "Nguyễn Văn A"
  }
}
```
- Bắt buộc: name, slug, contact_info.phone, contact_info.email, contact_info.owner_name.
- Slug: chỉ a-z, 0-9, dấu gạch; unique (409 nếu trùng).
Response: 201 + object shop vừa tạo. Ghi activity_log `create_shop`.

---

**GET /shops/:id** - Chi tiết một shop
```
Chỉ trả về nếu shop thuộc user (user_id = profileId). 404 nếu không tồn tại, 403 nếu không thuộc user.
```

---

**GET /shops/:id/assets** - Danh sách ảnh (assets) của shop
```
Headers: Authorization: Bearer <token>
```
Dùng cho Image bot gallery / Storage. Trả `{ "assets": [ { id, type, name, storage_path_or_url, mime_type, model_source, created_at } ] }`. Nếu bảng `assets` chưa có thì trả `assets: []`.

**DELETE /shops/:id/assets/:assetId** - Xóa asset (chủ shop). Xóa row; nếu file nằm dưới `uploads/shops/:id/` trên server thì xóa file. Response `{ "ok": true }`.

---

**PATCH /shops/:id** - Cập nhật shop
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body (chỉ gửi fields cần đổi): name, industry, description, address, city, district, country, postal_code, contact_info, products, website_url, logo_url, cover_url, social_links, opening_hours, status
```
Chỉ chủ sở hữu. Ghi activity_log `update_shop`. Response: 200 + shop đã cập nhật.

---

**PUT /shops/:id/products** - Cập nhật mảng sản phẩm (JSONB `shops.products`)
```
Headers: Authorization, Content-Type: application/json
Body: JSON array, ví dụ:
[
  {
    "id": "1",
    "name": "Trà sữa",
    "price": "35k",
    "description": "Size M",
    "image_url": "https://...",
    "tags": ["DOUONG", "GENERAL"]
  }
]
```
Response: `{ "products": [...] }`. Ghi log `update_shop_products`.

---

**GET /shops/:id/industry-tags** - Lấy danh sách tags ngành hàng của shop (để gắn tag cho sản phẩm)
```
Headers: Authorization: Bearer <token>
```
Response:
```json
{
  "industry": "Đồ uống",
  "tags": ["DOUONG", "GENERAL"],
  "allTags": [
    { "tag": "DOUONG", "label": "Đồ uống" },
    { "tag": "GENERAL", "label": "Chung (tất cả ngành)" }
  ]
}
```
- `tags`: các tag gợi ý theo ngành shop (từ `industry_tag_mappings`)
- `allTags`: toàn bộ 40 tag để hiển thị multi-select

---

**GET /shops/:id/image-prompts** - Danh sách template ảnh (`prompt_templates`, category=image)
```
Query: ?use_case=post (optional, lọc theo type)
```
Lọc theo tag từ `industry_tag_mappings` khớp `shops.industry`. Trả `{ "prompts": [ { id, name, type, tags, preview } ] }`.

---

**POST /shops/:id/images/generate** - Tạo ảnh (OpenAI / Gemini)
```
Body:
  prompt_template_id (optional — nếu bỏ trống tự động chọn template theo ngành shop),
  aspect (1:1|2:3|3:2|4:5|16:9),
  image_style / style (ad|product_intro|price_board|banner_shop),
  shop_only (boolean),
  selectedProductKeys hoặc product_indices,
  user_prompt (ý tưởng thêm từ user),
  ref_images (optional — mảng base64 data URL ảnh tham khảo, dùng cho Gemini multimodal),
  model: "openai"|"gemini"|"gpt"|"google",
  variant_count (1–5, default 3)
```
Trả: `image_urls[]`, `image_data_urls[]`, `model_source`, `prompt_template_id`, `final_prompt`.
Trừ credit sau khi tạo thành công: `IMAGE_GENERATE_CREDIT_COST × variant_count` credit (default **1**/variant, env `IMAGE_GENERATE_CREDIT_COST`).

**POST /shops/:id/images/generate-stream** — Cùng body như `generate` (backend tự chọn template; mỗi ảnh một prompt khác nhau, reuse nếu ít template), response **NDJSON**:
- `{ type: "prompt", prompt_template_id, variant_count, model }` — không gửi full prompt (bảo mật).
- `{ type: "variant", index, image_url?, image_data_url? }` — mỗi ảnh xong một dòng.
- `{ type: "error", index, message }` — lỗi tại variant (stream có thể dừng).
- `{ type: "done", model_source, prompt_template_id, generated }` — kết thúc.
Trừ credit theo số variant tạo thành công.

---

**POST /shops/:id/images/save** - Lưu ảnh vào disk + bảng `assets`
```
Body: image_url HOẶC image_base64 (data URL), prompt_template_id, user_prompt,
  model_source: imagen|dall-e-3|flux, type: post|logo|…, name (optional)
```

---

**POST /shops/:id/images/edit** - Chỉnh theo prompt (regenerate)
```
Body: edit_prompt, model, aspect, base_prompt (optional)
```

---

**POST /shops/:id/images/rebuild** - Tạo lại như generate (override_prompt / user_prompt / template)
```
Body tương tự generate + override_prompt (optional) + ref_images (optional)
```
Trừ credit tương tự generate.

---

## Website Builder (shop website)

Prefix: `/api/shops/:shopId/website/...` — `:shopId` = UUID shop. Header: `Authorization: Bearer <token>`.

Quy ước URL:
- Public URL mặc định: `https://{slug}.{WEBSITE_PUBLIC_BASE_DOMAIN}` (mặc định `captone2.site`).
- Preview URL mặc định: `{WEBSITE_PREVIEW_BASE_URL}/sites/{shopId}` (mặc định `https://preview.captone2.site`).

**GET /shops/:shopId/website/overview** — Tổng quan website cho trang `/website`

Response:
```json
{
  "overview": {
    "siteId": "uuid",
    "slug": "my-shop",
    "status": "draft",
    "versionCount": 3,
    "publicUrl": "https://my-shop.captone2.site",
    "previewUrl": "https://preview.captone2.site/sites/<shopId>",
    "updatedAt": "2026-04-08T...",
    "promptCount": 2,
    "promptSuccessRate": 100,
    "creditsUsed": null,
    "lastPrompt": "Rút gọn hero",
    "template": "catalog",
    "tone": "balanced",
    "selectedAssetIds": ["asset-id-1"]
  },
  "history": [
    {
      "id": "uuid",
      "type": "prompt",
      "title": "Rút gọn hero",
      "createdAt": "2026-04-08T...",
      "summary": "Updated hero content.",
      "restorable": true
    }
  ]
}
```

---

**GET /shops/:shopId/website/builder-state** — State đầy đủ cho builder

Response: `site`, `config`, `sections`, `assets`, `theme`, `selectedTemplate`, `draftPreviewUrl`, `publicUrl`, `previewUrl`, `deploy`, `shop`, `versions`.

---

**POST /shops/:shopId/website/create-from-idea** — Tạo / cập nhật bản nháp website từ ý tưởng + cấu hình tay

```json
{
  "idea": "Website giới thiệu quán theo tone thân thiện, ưu tiên gọi điện nhanh",
  "template": "catalog",
  "tone": "friendly",
  "palette": {
    "primary": "#14532d",
    "accent": "#16a34a",
    "background": "#f6fef9",
    "surface": "#ffffff"
  },
  "selectedAssetIds": ["uuid-1", "uuid-2"]
}
```

Response: `{ ok, site, config, sections, summary }`

---

**POST /shops/:shopId/website/sections/:sectionId/update** — Chỉnh tay một section hoặc theme/settings

```json
{
  "props": {
    "title": "Headline mới",
    "subtitle": "Mô tả mới"
  },
  "theme": {
    "primary": "#0f172a",
    "accent": "#2563eb"
  },
  "settings": {
    "tone": "balanced"
  },
  "selectedAssetIds": ["uuid-1"],
  "moveDirection": "up"
}
```

`moveDirection` optional: `up | down`

---

**POST /shops/:shopId/website/prompt/preview** — AI preview thay đổi, chưa lưu DB

```json
{
  "prompt": "Sửa @section:hero cho ngắn hơn và CTA rõ hơn",
  "scope": "selected",
  "sectionId": "hero",
  "creativity": "balanced"
}
```

Response:
```json
{
  "summary": "Updated hero.",
  "affectedSections": ["hero"],
  "draftConfig": { "...": "config_json preview" },
  "draftPreviewUrl": "https://preview.captone2.site/sites/<shopId>"
}
```

---

**POST /shops/:shopId/website/prompt/apply** — Áp dụng prompt vào config thật + ghi history

Body giống `/prompt/preview`

Response: `{ ok, message, previewUrl, affectedSections, config, site }`

---

**POST /shops/:shopId/website/rebuild** — Làm lại website draft từ input hiện tại

Body gần giống `/create-from-idea`; có thể truyền `idea` hoặc `prompt` để reset toàn bộ config.

---

**GET /shops/:shopId/website/versions** — Danh sách version để restore

Response:
```json
{
  "versions": [
    {
      "id": "uuid",
      "title": "Rút gọn hero",
      "source": "prompt",
      "summary": "Updated hero content.",
      "createdAt": "2026-04-08T..."
    }
  ]
}
```

---

**POST /shops/:shopId/website/versions/:versionId/restore** — Khôi phục một version cũ

Response: `{ ok, site, config, sections, summary }`

---

**GET /shops/:shopId/website/deploy/status** — Trạng thái deploy hiện tại + live stats

Response: `{ deployment, liveStats, publicUrl, previewUrl }`

---

**POST /shops/:shopId/website/deploy** — Deploy website từ module website

Response: `{ ok, deployment, publicUrl, previewUrl }`

---

**GET /shops/preview/sites/:shopId** — Public preview runtime (không cần token)

- Trả trực tiếp file `index.html` đã publish ở `ASSET_STORAGE_PATH/shops/:shopId/index.html`.
- Dùng cho reverse proxy hoặc link preview runtime thật (không phải `iframe srcDoc`).
- Response:
  - `200 text/html` nếu có bản preview đã publish.
  - `404 Preview not ready` nếu shop chưa có static publish.

---

## Shops — Docker Deploy (per-shop container)

**POST /shops/:id/deploy** - Tạo và start container Nginx cho shop
```
Headers: Authorization: Bearer <token>
```
Response 201:
```json
{
  "deployment": {
    "id": "uuid",
    "shop_id": "uuid",
    "container_id": "abc123",
    "container_name": "aimap-shop-<shopId>",
    "status": "running",
    "port": 32001,
    "deployed_at": "2026-03-16T10:00:00Z"
  }
}
```
- Nếu container đang chạy → 409 Conflict
- Docker socket phải có tại `DOCKER_SOCKET_PATH` (mặc định `/var/run/docker.sock`)

---

**GET /shops/:id/container** - Trạng thái container + live stats
```
Headers: Authorization: Bearer <token>
```
Response:
```json
{
  "deployment": { "...site_deployments row..." },
  "liveStats": {
    "status": "running",
    "running": true,
    "startedAt": "...",
    "cpuPercent": 0.4,
    "memUsageMb": 12.3
  }
}
```

---

**POST /shops/:id/container/stop** - Dừng container (graceful, 10s)
```
Headers: Authorization: Bearer <token>
```
Response: `{ "ok": true }`

---

**DELETE /shops/:id/container** - Xoá container khỏi Docker + reset deployment record
```
Headers: Authorization: Bearer <token>
```
Response: `{ "ok": true }`

---

## Credits / Payment (VietQR API Service)

**Quy ước:** User nhập **số tiền VND**; `credits` = floor(amountVnd / `CREDIT_VND_RATE`). Tạo intent → CK đúng **amount_money** và **transfer_content** → webhook VietQR khớp nội dung `AIMAP-*` và số tiền → cộng `credit_transactions`.

**GET /credits/methods** — Danh sách phương thức + tỷ quy đổi + tối thiểu VND
```
Headers: Authorization: Bearer <token>
```
Response: `{ "methods": [ { "id": "vietqr_bank", "label": "VietQR chuyển khoản", "bankBin": "970423", "bankName": "TPBank", "accountNo": "0809..." } ], "creditVndRate": 1000, "minAmountVnd": 10000 }`

**POST /credits/topup/intent** — Tạo đơn pending + (tuỳ chọn) URL ảnh QR VietQR
```
Headers: Authorization: Bearer <token>, Content-Type: application/json
Body: { "amountVnd": 100000, "methodId": "vietqr_bank" }
```
Response 201: `{ "payment": { "id", "amountMoney", "credits", "status", "transferContent", "qrImageUrl", "expiresAt", "createdAt" }, "creditVndRate": 1000 }`

**GET /credits/payments/:id** — Trạng thái đơn (poll từ FE)
```
Headers: Authorization: Bearer <token>
```

**GET /credits/history** — Lịch sử `credit_transactions` của user
```
Headers: Authorization: Bearer <token>
Query: limit=20, offset=0
```
Response: `{ "transactions": [ { "id", "amount", "type", "reference_type", "reference_id", "description", "created_at" } ] }`

**Migration DB:** chạy `aimap/backend/db/migrations/005_payments_vietqr.sql` nếu chưa có bảng `payments`.

**POST /webhooks/vietqr** — Webhook VietQR API Service (không cần JWT user). Body JSON chứa mảng giao dịch; hệ thống tìm `content/description` có `AIMAP-...` khớp `transfer_content` và `amount` khớp `amount_money` của đơn pending → xác nhận thanh toán.
```
Headers:
  - Authorization: Bearer <VIETQR_WEBHOOK_BEARER> (nếu bật bearer), hoặc
  - Authorization: Basic <base64(username:password)> (nếu bật basic auth)
Content-Type: application/json
```
Response:
`{ "error": false, "errorReason": null, "toastMessage": "ok", "object": { "processed": 1, "received": 1, "invalidSign": 0 } }`

Verify `sign` (nếu có cấu hình `VIETQR_CALLBACK_SECRET`):
- Chuỗi ký: `transactionId + amount(10 số, padStart) + transactionTime + orderId`
- Thuật toán: HMAC-SHA256

**Các endpoint tương thích format VietQR API Service (path `vqr`):**
- `POST /vqr/api/token_generate` — cấp token theo Basic Auth (`VIETQR_CLIENT_USERNAME` / `VIETQR_CLIENT_PASSWORD`).
- Response chuẩn theo VietQR tutorial: `{ "access_token": "...", "token_type": "Bearer", "expires_in": 300 }`
- `POST /vqr/bank/api/test/transaction-callback` — callback test từ VietQR.
- `POST /vqr/bank/api/transaction-callback` — callback production từ VietQR.
- `POST /vqr/bank/api/transaction-sync` — callback production theo endpoint trong API Transaction Sync.
- Cả callback test/prod dùng chung logic match `AIMAP-*` + amount và cùng cấu hình auth/sign.

---

## Config

**GET /config/image-models** — Model tạo ảnh đã cấu hình key chưa (cho UI disable Gemini)
```
Không cần auth
```
Response: `{ "openai": true, "gemini": false }`

---

**GET /config/marketing-ai** — Bot Ollama marketing (caption assist, tóm tắt comment, …) đã cấu hình chưa
```
Không cần auth
```
Response: `{ "configured": true, "model": "qwen2.5:7b", "timeoutMs": 45000 }`
- `configured`: `true` khi đã set `MARKETING_AI_BASE_URL` (không trả URL đầy đủ trong JSON).

---

## Health

**GET /health** - Kiểm tra server hoạt động
```
Không cần headers hay body
```
Response: `{ "ok": true, "service": "aimap-backend" }`

---

## API TẠM THỜI (XÓA SAU KHI TEST XONG)

**GET /auth/users** - Danh sách user (id, name, email)
```
Không cần headers
```

---

**DELETE /auth/users/:id** - Xóa user theo id
```
Không cần headers hay body
Thay :id bằng user id cần xóa
VD: DELETE /api/auth/users/123e4567-e89b-12d3-a456-426614174000
```

---

## ADMIN APIs (cần role = admin)

Tất cả API admin cần header:
```
Authorization: Bearer <token của admin>
```

---

**GET /admin/users** - Danh sách users (có pagination, search)
```
Query params:
  page=1 (số trang)
  limit=10 (số items mỗi trang)
  search=keyword (tìm theo email hoặc name)
  
VD: GET /api/admin/users?page=1&limit=10&search=test
```

---

**GET /admin/users/:id** - Chi tiết 1 user
```
VD: GET /api/admin/users/89897634-7222-424c-81bc-6ea486b98428
```

---

**PUT /admin/users/:id** - Cập nhật thông tin user
```
Body (gửi fields muốn update):
{
  "name": "New Name",
  "phone": "0901234567",
  "city": "Ha Noi"
}
```
Lưu ý: Không update được email, password, role

---

**GET /admin/credits/transactions** - Danh sách giao dịch credit (toàn hệ thống)
```
Query: userId=uuid (optional), type=topup|deduct|bonus (optional), page=1, limit=50
```

---

**GET /admin/users/:id/credits/detail** - Số dư + email user
```
VD: GET /api/admin/users/<profileId>/credits/detail
```

---

**POST /admin/users/:id/credits/deduct** - Trừ credit (ghi `credit_transactions` amount âm, type `deduct`)
```
Body: { "amount": 10, "description": "..." }
```

---

**POST /admin/payments/:id/confirm** - Xác nhận thủ công một đơn `payments` pending (khi polling lỗi)
```
Body: { "gatewayTxnId": "optional" }
```

---

**POST /admin/users/:id/credits** - Admin cấp thêm credit cho user (`:id` = `user_profiles.id`)
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <token admin>
Body:
{
  "amount": 50,
  "description": "Khuyến mãi tháng 3"
}
```
- `amount`: số nguyên dương, tối đa 1_000_000 (bắt buộc).
- `description`: tùy chọn, tối đa 500 ký tự.

Response:
```json
{ "success": true, "creditBalance": 150 }
```
(`creditBalance` = số dư mới của user sau khi cộng.)

---

**PUT /admin/users/:id/status** - Block/Unblock user
```
Body:
{
  "status": "suspended"
}
```
Giá trị: "active" (unblock) hoặc "suspended" (block)

---

**DELETE /admin/users/:id** - Xóa user
```
Không cần body
Không thể xóa chính mình
```

---

## Admin — Docker Containers

**GET /admin/containers** - Danh sách tất cả containers (có pagination + filter)
```
Headers: Authorization: Bearer <admin-token>
Query params:
  - status: running|stopped|building|error|draft (optional)
  - page: 1 (default)
  - limit: 50 (default, max 100)
```
Response:
```json
{
  "containers": [
    {
      "id": "uuid",
      "shop_id": "...", "shop_name": "...", "shop_slug": "...", "shop_industry": "...",
      "user_id": "...", "user_name": "...", "user_email": "...",
      "container_id": "...", "container_name": "aimap-shop-...",
      "status": "running", "port": 32001, "subdomain": null,
      "deployed_at": "...", "last_build_at": "...", "error_message": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 3, "totalPages": 1 }
}
```

---

**GET /admin/users/:id/containers** - Containers của 1 user cụ thể
```
Headers: Authorization: Bearer <admin-token>
```
Response: `{ "containers": [...] }`

---

**GET /admin/containers/:shopId** - Chi tiết container + live stats + logs (tuỳ chọn)
```
Headers: Authorization: Bearer <admin-token>
Query: ?logs=true  (để kéo 100 dòng log cuối từ container)
```
Response:
```json
{
  "deployment": { "...full row + shop_name + user_name..." },
  "liveStats": { "running": true, "cpuPercent": 0.4, "memUsageMb": 12.3, "startedAt": "..." },
  "logs": "...(last 100 lines)..."
}
```

---

**POST /admin/containers/:shopId/stop** - Admin force stop container
```
Headers: Authorization: Bearer <admin-token>
```
Response: `{ "ok": true }`

---

## Facebook Marketing (Graph API + bot Ollama)

Prefix: `/api/shops/:shopId/facebook/...` — `:shopId` = UUID shop. Header: `Authorization: Bearer <token>`.

**Env server:** `MARKETING_AI_BASE_URL` (Ollama, vd. `http://IP_VPS:11434`), `MARKETING_AI_MODEL` (vd. `qwen2.5:7b`), `META_APP_ID` (để biết bài nào sửa được qua API), `FACEBOOK_GRAPH_VERSION` (mặc định `v20.0`). OAuth Page: `FB_APP_ID` (hoặc `META_APP_ID`), `FB_APP_SECRET`, `FACEBOOK_OAUTH_REDIRECT_URI` (phải khớp App Meta, ví dụ `https://<host>/api/facebook/oauth/callback`), `FB_OAUTH_SCOPES` (mặc định `pages_show_list,pages_read_engagement,pages_manage_posts,public_profile`), `FRONTEND_URL` (redirect sau callback).

**Migration DB:** `psql $DATABASE_URL -f aimap/backend/db/migrations/006_facebook_marketing.sql`

---

**GET /shops/:shopId/facebook/oauth/url** — Trả URL Facebook Login (dialog OAuth) + `state` JWT (`purpose: fb_oauth`, `shopId`, `profileId`, TTL 15 phút).

- `503` + `code: OAUTH_NOT_CONFIGURED` nếu thiếu `FB_APP_ID`/`META_APP_ID` hoặc `FACEBOOK_OAUTH_REDIRECT_URI`.

Response: `{ "url": "https://www.facebook.com/v20.0/dialog/oauth?..." }`

**Test Postman:** `GET {{base}}/shops/<shopId>/facebook/oauth/url` + Bearer token → mở `url` trên trình duyệt (hoặc frontend `window.location = url`).

---

**GET /api/facebook/oauth/callback** — Meta redirect sau khi user đăng nhập (không Bearer). Query: `code`, `state` (JWT từ bước trên). Đổi `code` → user token → long-lived → `GET /me/accounts` → upsert từng Page vào `facebook_page_tokens`. Cuối cùng redirect `302` về `FRONTEND_URL/shops/:shopId/marketing/facebook?fb=connected&pages=N` hoặc `?fb_error=...`.

**Cấu hình Meta Developer:** Valid OAuth Redirect URIs = đúng `FACEBOOK_OAUTH_REDIRECT_URI` (vd. `http://localhost:4111/api/facebook/oauth/callback` khi dev).

---

**GET /shops/:shopId/facebook/pages** — Danh sách Page đã lưu token.

Query: `sync=true` (optional) — gọi Graph cập nhật tên, followers, ảnh.

Response: `{ "pages": [ { "pageId", "name", "followers", "category", "pictureUrl", "updatedAt" } ] }`

---

**POST /shops/:shopId/facebook/pages/connect** — Lưu Page access token (test / chờ OAuth).

Body:
```json
{
  "pageId": "123456789",
  "pageName": "Tên page (optional)",
  "accessToken": "EAA...",
  "expiresAt": "2026-12-01T00:00:00.000Z"
}
```

Backend gọi Graph xác minh token rồi `UPSERT` vào `facebook_page_tokens`. Lỗi token: `400` + `code` từ Graph.

---

**DELETE /shops/:shopId/facebook/pages/:pageId** — Xóa Page khỏi shop (xóa dòng `facebook_page_tokens`).

Response: `{ "ok": true }` — `404` nếu chưa có Page đó.

---

**GET /shops/:shopId/facebook/pages/:pageId/detail** — KPI + trend + AI actions (Ollama).

Query: `range=7d|30d`

Response: `{ pageId, range, kpis, trendBars, engagementMix, bestTimes, topPosts, aiActions, sources: { insightsSyncedAt, isPartial } }`

---

**GET /shops/:shopId/facebook/pages/:pageId/posts** — Feed bài đăng.

Query: `limit` (default 25, max 50)

Response: `{ "posts": [ { "postId", "title", "messagePreview", "createdTime", "timeLabel", "reach", "engagementRate", "reactions", "comments", "shares", "canEditViaApi", "canDeleteViaApi", "permalinkUrl" } ], "paging" }`

---

**GET /shops/:shopId/facebook/posts/:postId/detail** — Modal xem bài: insight, comment AI, bot score.

Response: `insights`, `sparkline`, `commentAi`, `botEvaluation`, `capabilities`, `permalinkUrl`, `isPartial`

---

**POST /shops/:shopId/facebook/pages/:pageId/posts** — Đăng bài mới lên Facebook Page.

Body:
```json
{ "message": "Nội dung bài", "imageUrl": "https://..." }
```
- `message` bắt buộc. `imageUrl` tuỳ chọn — phải là URL https public; nếu có sẽ đăng lên `/{pageId}/photos`, không có thì đăng text-only `/{pageId}/feed`.
- Response 201: `{ "ok": true, "postId": "..." }`
- Lỗi 403 thiếu quyền `pages_manage_posts`; 401 token hết hạn.

---

**PATCH /shops/:shopId/facebook/posts/:postId** — Sửa `message` (chỉ khi bài do app Meta có `META_APP_ID` đăng).

Body: `{ "message": "..." }` — Lỗi `409` `POST_NOT_EDITABLE_APP_ONLY`.

---

**DELETE /shops/:shopId/facebook/posts/:postId** — Xóa bài trên Facebook.

---

**POST /shops/:shopId/facebook/assist** — AI gợi ý caption (Ollama).

Body: `{ "draftMessage": "", "instruction": "", "locale": "vi" }`

Response: `{ "suggestedMessage", "skipped": true nếu chưa cấu hình bot, "error" (optional), "cached": true|false }`
- Kết quả trùng `draftMessage` + `instruction` + `locale` được cache trong `marketing_ai_cache` (`kind = write_assist`, TTL ~2h).
