# AIMAP – Database Schema (Read Reference)

Tài liệu đọc nhanh về schema database Sprint 1 — dùng khi cần context bảng, quan hệ, FK cho prompt/agent.

---

## Tổng quan

- **6 bảng chính:** `logins`, `user_profiles`, `shops`, `sites`, `credit_transactions`, `payments`
- **logins** = chỉ đăng nhập (username, email, password). **user_profiles** = thông tin cá nhân, là bảng trung tâm — mọi bảng nghiệp vụ FK tới `user_profiles(id)`
- **1 user (user_profiles)** có thể có **nhiều shop**. Mỗi shop có 1 site (website).

---

## Quan hệ

| Quan hệ | Ý nghĩa |
|---------|---------|
| logins 1:1 user_profiles | Mỗi tài khoản đăng nhập có đúng 1 profile |
| user_profiles 1 → N shops | Một user sở hữu nhiều shop |
| user_profiles 1 → N credit_transactions | Ledger credit của user |
| user_profiles 1 → N payments | Lịch sử thanh toán của user |
| shops 1 → 1 sites | Mỗi shop có 1 website |
| payments → credit_transactions | Payment thành công tạo 1 dòng topup (reference_type='payment', reference_id=payments.id) |

---

## Bảng chi tiết

### logins
- **id** UUID PK  
- **username** VARCHAR(50) UNIQUE NOT NULL  
- **email** VARCHAR(255) UNIQUE NOT NULL  
- **password_hash** VARCHAR(255) NOT NULL  
- **role** VARCHAR(20) NOT NULL default 'user' — 'user' | 'admin'  
- **status** VARCHAR(20) NOT NULL default 'active' — 'active' | 'suspended'  
- **created_at**, **updated_at** TIMESTAMP  

### user_profiles
- **id** UUID PK  
- **login_id** UUID FK → logins(id) UNIQUE NOT NULL  
- **name** VARCHAR(255) NOT NULL  
- **phone** VARCHAR(20), **avatar_url** VARCHAR(500), **address** TEXT  
- **date_of_birth** DATE, **gender** VARCHAR(10)  
- **created_at**, **updated_at** TIMESTAMP  

### shops
- **id** UUID PK  
- **user_id** UUID FK → user_profiles(id) NOT NULL  
- **name** VARCHAR(255) NOT NULL, **slug** VARCHAR(100) UNIQUE NOT NULL  
- **industry** VARCHAR(100), **description** TEXT  
- **products** JSONB default '[]' — [{name, price, description, image}]  
- **contact_info** JSONB default '{}'  
- **brand_preferences** JSONB default '{}'  
- **status** VARCHAR(20) default 'active'  
- **created_at**, **updated_at** TIMESTAMP  

### sites
- **id** UUID PK  
- **shop_id** UUID FK → shops(id) NOT NULL  
- **user_id** UUID FK → user_profiles(id) NOT NULL  
- **name** VARCHAR(255), **slug** VARCHAR(100) UNIQUE  
- **config_json** JSONB default '{}'  
- **status** VARCHAR(20) default 'draft'  
- **created_at**, **updated_at** TIMESTAMP  

### credit_transactions (ledger)
- **id** UUID PK  
- **user_id** UUID FK → user_profiles(id) NOT NULL  
- **amount** INTEGER NOT NULL — dương = cộng, âm = trừ  
- **type** VARCHAR(30) NOT NULL — 'topup' | 'deduct' | 'refund' | 'admin_adjust'  
- **reference_type**, **reference_id** VARCHAR — nguồn giao dịch  
- **description** VARCHAR(500), **created_at** TIMESTAMP  

**Balance:** `SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE user_id = $1`

### payments
- **id** UUID PK  
- **user_id** UUID FK → user_profiles(id) NOT NULL  
- **amount_money** INTEGER NOT NULL (VND)  
- **credits** INTEGER NOT NULL  
- **gateway** VARCHAR(30) NOT NULL — 'vnpay' | 'momo' | ...  
- **gateway_txn_id** VARCHAR(255) UNIQUE  
- **status** VARCHAR(20) NOT NULL default 'pending' — 'pending' | 'success' | 'failed' | 'expired'  
- **callback_data** JSONB  
- **created_at**, **updated_at** TIMESTAMP  

---

## Flow API (tóm tắt)

- **Register:** insert `logins` + `user_profiles` trong 1 transaction.  
- **Login:** SELECT logins by email/username → JWT chứa `{ loginId, role }`.  
- **requireAuth:** decode JWT → query `user_profiles WHERE login_id = loginId` → `req.user = profile`; dùng `req.user.id` (user_profiles.id) làm FK cho shops, payments, credit_transactions.  
- **Credit balance:** SUM(amount) từ credit_transactions theo user_id.  
- **Topup:** payment callback success → UPDATE payments status → INSERT credit_transactions (amount dương, type 'topup').
