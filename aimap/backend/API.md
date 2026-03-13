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
