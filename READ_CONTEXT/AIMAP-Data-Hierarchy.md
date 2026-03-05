---
name: AIMAP Data Hierarchy (Canonical)
overview: "Chuẩn hệ thống: 1 User → N Shops; mỗi Shop có Storage (image, content, product), Web, Manager Facebook Page, và Generate (AI image, content, web). Tài liệu tham chiếu cho kiến trúc, database và UI."
todos: []
isProject: false
---

# AIMAP – Chuẩn cấu trúc dữ liệu (Data Hierarchy)

Đây là **mô hình chuẩn** của hệ thống AIMAP. Mọi thiết kế kiến trúc, database và UI cần bám theo cấu trúc này.

---

## 1. Sơ đồ tổng quan

```
1 USER (user_profiles)
│
├── SHOP 1
│   ├── STORAGE
│   │   ├── IMAGE (assets: logo, banner, cover, post)
│   │   ├── CONTENT (marketing_content: ad_post, product_description, caption_hashtag)
│   │   └── PRODUCT (shops.products JSONB)
│   ├── WEB (sites: 1 shop = 1 site, config_json, deploy → subdomain)
│   ├── MANAGER FACEBOOK PAGE (facebook_page_tokens: 1 page per shop)
│   └── GENERATE (AI pipeline scoped to this shop)
│       ├── Image (logo, banner, post)
│       ├── Content (ad, description, caption)
│       └── Web source (website config from prompt)
│
├── SHOP 2
│   ├── STORAGE (image, content, product)
│   ├── WEB
│   ├── MANAGER FACEBOOK PAGE
│   └── GENERATE (image, content, web source)
│
├── SHOP 3
│   └── ...
│
├── Credit & Billing (user-level: credit_transactions, payments)
└── Profile (user-level: logins, user_profiles)
```

---

## 2. Nguyên tắc

| Nguyên tắc | Mô tả |
|------------|--------|
| **1 User → N Shops** | Một tài khoản (user_profile) sở hữu nhiều cửa hàng (shops). Mọi dữ liệu nghiệp vụ (storage, web, Facebook, pipeline) đều gắn với **một shop cụ thể**. |
| **Storage per shop** | Hình ảnh (assets), nội dung (marketing_content), và sản phẩm (shops.products) thuộc **từng shop**. Object storage dùng namespace `shops/:shopId/assets/`. Không lẫn dữ liệu giữa các shop. |
| **Web per shop** | Mỗi shop có **1 site** (bảng sites, shop_id). Deploy → 1 Docker container → 1 subdomain (shopname.aimap.app). |
| **Facebook Page per shop** | Mỗi shop quản lý **1 (hoặc nhiều) Facebook Page** đã kết nối; token lưu theo shop_id (facebook_page_tokens). |
| **Generate per shop** | Mọi bước AI (tạo logo, banner, content, web config) chạy trong **ngữ cảnh một shop**: dùng store info, assets và content của shop đó. Pipeline runs có shop_id. |

---

## 3. Ánh xạ sang Database

| Thành phần | Bảng / Trường | Ghi chú |
|------------|----------------|--------|
| User | logins, user_profiles | 1 user = 1 profile. |
| Shops | shops | user_id → user_profiles.id. |
| Storage – Image | assets | shop_id (FK shops); type logo/banner/cover/post. |
| Storage – Content | marketing_content | shop_id (FK shops); type ad_post, product_description, caption_hashtag. |
| Storage – Product | shops.products | JSONB trong bảng shops. |
| Web | sites, site_deployments | sites.shop_id; 1 shop = 1 site. site_deployments.subdomain. |
| Manager Facebook Page | facebook_page_tokens | user_id, shop_id; 1 page (hoặc N) per shop. |
| Generate (pipeline) | pipeline_runs | shop_id, user_id; steps tham chiếu assets/marketing_content của shop. |
| Credit (user-level) | credit_transactions, payments | user_id; không gắn shop. |

---

## 4. Ánh xạ sang UI / Routes

- **Dashboard, Profile, Credit:** Thuộc user (không cần chọn shop).
- **My Shops:** Danh sách shop của user; vào từng shop (chi tiết / chỉnh sửa).
- **Assets, AI Tools, Website, Facebook, Pipeline:** Hoạt động trong **ngữ cảnh một shop** đã chọn. Có thể:
  - Dùng **shop context** (dropdown “Current shop” hoặc từ URL `/shops/[id]` rồi vào Assets/Website/Facebook/Pipeline của shop đó), hoặc
  - Dùng **route theo shop:** `/shops/[id]/assets`, `/shops/[id]/website`, `/shops/[id]/facebook`, `/shops/[id]/pipeline` (tùy thiết kế frontend).
- Đảm bảo: Khi xem/thêm/sửa **Storage (image, content, product), Web, Facebook, Generate**, hệ thống luôn biết **shop_id** để không lẫn dữ liệu giữa các shop.

---

## 5. Tài liệu liên quan

- [AIMAP-Architecture-VN.md](AIMAP-Architecture-VN.md) / [AIMAP-Architecture-EN.md](AIMAP-Architecture-EN.md): Kiến trúc tổng thể, storage per shop.
- [database_design.md](database_design.md): Schema chi tiết, quan hệ 1–N user–shops, FK shop_id.
- [UI STRUCT.md](UI STRUCT.md): Routes và scope theo shop (assets, website, Facebook, pipeline).
