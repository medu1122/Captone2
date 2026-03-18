# API Backend - AIMAP

Base URL: `http://localhost:4111/api`

---

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
Response: trả về `token` và `user` info

---

**GET /auth/me** - Lấy thông tin profile hiện tại
```
Headers: 
  Content-Type: application/json
  Authorization: Bearer <token>
```
Response: tất cả fields của user profile

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
- Chỉ trả các lần **đăng nhập thành công** sau khi backend ghi log (`action = login` trong `activity_logs`). Lần đăng nhập trước khi deploy tính năng này sẽ không có trong danh sách.
- IP chính xác hơn khi reverse proxy bật: đặt biến môi trường **`TRUST_PROXY=1`** trên server (xem `index.js`).

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

---

## Shops API

Tất cả endpoint shops (trừ GET /shops/slugs) cần header:
```
Authorization: Bearer <token>
```

---

**GET /shops** - Danh sách shop của user
```
Headers: Authorization: Bearer <token>
```
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

**PATCH /shops/:id** - Cập nhật shop
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body (chỉ gửi fields cần đổi): name, industry, description, address, city, district, country, postal_code, contact_info, products, website_url, logo_url, cover_url, social_links, opening_hours, status
```
Chỉ chủ sở hữu. Ghi activity_log `update_shop`. Response: 200 + shop đã cập nhật.

---

**GET /health** - Kiểm tra server hoạt động
```
Không cần headers hay body
```
Response: `{ "status": "ok" }`

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
