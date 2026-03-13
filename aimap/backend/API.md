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
