---
name: ShopList ShopDetail UI Struct
overview: Phân tích giao diện hiện tại, chi tiết hóa ShopListPage + form tạo shop (theo DB) + Shop Detail (layout riêng, sidebar 5 mục + Credit balance), và cập nhật toàn bộ yêu cầu vào READ_CONTEXT/UI STRUCT.md.
todos: []
isProject: false
---

# Phân tích giao diện & Cập nhật UI STRUCT (ShopList, Form tạo shop, Shop Detail)

## 1. Phân tích giao diện hệ thống hiện tại

### 1.1 Layouts và luồng


| Khu vực              | Layout                                                            | Header                                                                                                                                                                                | Nội dung                                                                                                                          |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Public**           | Full page                                                         | [HomePage](aimap/frontend/src/pages/HomePage.tsx): logo AIMAP, nav (Features, How it works, Pricing), LanguageSwitcher, UserMenu hoặc Login/Get Started                               | Hero, Features, How it works, CTA, Footer                                                                                         |
| **Auth**             | [AuthLayout](aimap/frontend/src/layouts/AuthLayout.tsx)           | Logo + LanguageSwitcher + "Back home"                                                                                                                                                 | Centered card (login, register, verify, forgot/reset password, change password)                                                   |
| **Dashboard (user)** | [DashboardLayout](aimap/frontend/src/layouts/DashboardLayout.tsx) | **Sidebar trái:** logo AIMAP, nav (Dashboard, Shops), **dưới cùng:** khối "Credit balance" (hiện "—"). **Vùng phải:** header (title trang, LanguageSwitcher, UserMenu) + `<Outlet />` | DashboardPage, ProfilePage. Route `/shops` có trong nav nhưng **chưa có route/page** trong [App.tsx](aimap/frontend/src/App.tsx). |


- **ProfilePage / HomePage (khi đã login):** Header dùng chung pattern: LanguageSwitcher + UserMenu (tên user + dropdown). Shop Detail sẽ dùng **cùng header** này (title có thể là tên shop hoặc "Shop Dashboard").
- **DashboardPage:** Card Active Shops, Live Websites; bảng Activity log; bảng Access log (placeholder data).

### 1.2 Kết luận cho Shop & Shop Detail

- **ShopListPage** sẽ nằm trong **Dashboard Layout** hiện tại (sidebar Dashboard + Shops, Credit balance; header chung).
- **Shop Detail** là **một layout riêng** (không dùng sidebar Dashboard/Shops) nhưng **header giống** (LanguageSwitcher + UserMenu), **sidebar trái riêng** với 5 mục + Credit balance ở dưới.

---

## 2. ShopListPage — phân tích chi tiết

### 2.1 Mục đích

Trang danh sách cửa hàng của user: xem, mở chi tiết, tạo shop mới.

### 2.2 Nội dung cần hiển thị cho user

- **Tiêu đề trang:** "Shops" (hoặc tương đương i18n).
- **CTA chính:** Nút **"Tạo cửa hàng"** (Create shop) dẫn đến `/shops/create` — nổi bật (primary button), có thể đặt góc phải header của main content hoặc trên cùng danh sách.
- **Danh sách shop của user:**
  - Hiển thị theo **grid** (card) hoặc **list** (row); nên có toggle grid/list nếu cần.
  - Mỗi item (card/row) gồm:
    - **Logo shop** (hoặc placeholder nếu chưa có `logo_url`).
    - **Tên shop** (`name`).
    - **Slug / subdomain** (ví dụ `myshop.aimap.app` hoặc slug) — từ `shops.slug`.
    - **Ngành hàng** (`industry`) — tag ngắn.
    - **Trạng thái** (active/inactive) — `shops.status`.
    - **Quick actions:** "Vào shop" (link `/shops/[id]`), "Chỉnh sửa" (link `/shops/[id]/edit`).
  - **Empty state:** Khi user chưa có shop: thông báo "Bạn chưa có cửa hàng nào", nút "Tạo cửa hàng đầu tiên" → `/shops/create`.
- **Thống kê nhanh (tùy chọn):** Giống DashboardPage có thể thêm 1–2 card nhỏ: "Tổng số shop", "Website đang live" (số site deployed) — giúp user thấy tổng quan trước khi vào từng shop.
- **Phân trang hoặc "Load more":** Nếu API hỗ trợ, khi số shop nhiều.

### 2.3 Dữ liệu cần từ API

- `GET /shops` (hoặc tương đương): danh sách shop của user hiện tại.
- Trả về: `id`, `name`, `slug`, `industry`, `description` (rút gọn), `logo_url`, `cover_url`, `status`, `created_at`; nếu có: site status (draft/deployed) để hiển thị "Live" badge.

### 2.4 Route

- `/shops` — ShopListPage (trong Dashboard Layout).
- `/shops/create` — Form tạo shop (có thể cùng Dashboard Layout hoặc layout đơn giản với header chung).

---

## 3. Form tạo shop — phân tích chi tiết (theo database)

Tham chiếu: [database_design.md](READ_CONTEXT/database_design.md) (Bước 4 — shops; contact_info; Bước 5f, 5e).

### 3.1 Bảng `shops` và `contact_info`

- **shops:** `user_id` (set từ auth), `name`, `slug`, `industry`, `description`, `address`, `city`, `district`, `country`, `postal_code`, `contact_info` (JSONB).
- **contact_info (JSONB):** `{ "phone": string, "email": string, "owner_name": string }` — **bắt buộc** lúc tạo; dùng làm context cho AI (content, ảnh, web).
- **Không nhập lúc tạo:** `products`, `website_url` — bổ sung sau tại `/shops/[id]/edit`.

### 3.2 Các trường form tạo shop (Create Shop — `/shops/create`)


| Trường form          | DB / JSON                 | Bắt buộc | Ghi chú                                                                                      |
| -------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| Tên cửa hàng         | `shops.name`              | Có       | Text, max ~255                                                                               |
| Slug (URL/subdomain) | `shops.slug`              | Có       | Unique; chỉ chữ thường, số, gạch ngang; validate unique qua API                              |
| Ngành hàng           | `shops.industry`          | Có       | Select hoặc autocomplete từ `industry_tag_mappings.industry` (hoặc danh sách cố định 40 tag) |
| Mô tả ngắn           | `shops.description`       | Có       | Textarea                                                                                     |
| Địa chỉ trụ sở       | `shops.address`           | Có       | Text/textarea                                                                                |
| Thành phố            | `shops.city`              | Có       | Text                                                                                         |
| Quận/Huyện           | `shops.district`          | Có       | Text                                                                                         |
| Quốc gia             | `shops.country`           | Có       | Text hoặc select (mặc định Vietnam)                                                          |
| Mã bưu chính         | `shops.postal_code`       | Có       | Text                                                                                         |
| Số điện thoại shop   | `contact_info.phone`      | Có       | Tel input                                                                                    |
| Email shop           | `contact_info.email`      | Có       | Email input                                                                                  |
| Tên chủ shop         | `contact_info.owner_name` | Có       | Text                                                                                         |


**Optional (có thể để trống lúc tạo):** `website_url`, `social_links`, `opening_hours`, `brand_preferences`, `logo_url`, `cover_url`, `tags` — chỉ thu thập ở form **Edit shop** (`/shops/[id]/edit`).

### 3.3 UX form

- Một trang form (có thể chia 2 section: "Thông tin cửa hàng" và "Liên hệ & Chủ shop").
- Validation: required, format (email, slug), unique slug (API).
- Submit → POST tạo shop → redirect `/shops/[id]` hoặc `/shops` với thông báo thành công.

---

## 4. Shop Detail — trang quản lý riêng, layout và sidebar

### 4.1 Layout riêng (Shop Layout)

- **Header:** Giống Dashboard/Profile: **cùng component header** (LanguageSwitcher + UserMenu); tiêu đề có thể là tên shop hiện tại hoặc "Shop Dashboard".
- **Sidebar trái (riêng cho Shop Detail):**
  1. **Shop Dashboard** — trang tổng quan của shop (trang mặc định khi vào `/shops/[id]`): thống kê nhanh (số ảnh, số content, site status, pipeline gần nhất…).
  2. **Bot tạo ảnh** — entry vào AI tạo ảnh (logo, banner, post) cho shop này; lưu vào assets của shop.
  3. **Storage (Lưu trữ)** — toàn bộ hình ảnh của shop (assets: logo, banner, cover, post); có thể mở rộng xem marketing_content.
  4. **Support marketing** — kho content marketing (ad post, product description, caption/hashtag) — tạo/sửa/xem.
  5. **Pipeline** — quản lý và xem quy trình tự động (chạy pipeline, xem lịch sử runs, trạng thái từng bước).
- **Dưới cùng sidebar:** Khối **Credit balance** giống [DashboardLayout](aimap/frontend/src/layouts/DashboardLayout.tsx) (hiện số dư hoặc "—" nếu chưa có API).

### 4.2 Route Shop Detail

- `/shops/[id]` — Layout shop (header chung + sidebar trái 5 mục + Credit balance) + Outlet.
  - Index: Shop Dashboard.
  - `/shops/[id]/image-bot` hoặc tương đương — Bot tạo ảnh.
  - `/shops/[id]/storage` — Storage (ảnh).
  - `/shops/[id]/marketing` — Support marketing.
  - `/shops/[id]/pipeline` — Pipeline.

### 4.3 Đồng bộ với UI STRUCT và kiến trúc

- AI Tools (Bot tạo ảnh, content) và Pipeline **điểm vào từ Shop Detail**, không từ sidebar Dashboard chính — khớp [UI STRUCT.md](READ_CONTEXT/UI STRUCT.md) và [AIMAP-Architecture-VN.md](READ_CONTEXT/AIMAP-Architecture-VN.md).
- Mỗi shop có storage và content riêng; Credit balance là theo **user** (không theo shop).

---

## 5. Cập nhật READ_CONTEXT/UI STRUCT.md

Cần **cập nhật/sửa** file [READ_CONTEXT/UI STRUCT.md](READ_CONTEXT/UI STRUCT.md) như sau (khi thực thi, thực hiện chỉnh sửa file):

### 5.1 Bổ sung / làm rõ mục "Quản lý Cửa hàng (Shops)"

- `**/shops` (ShopListPage):**
  - Nội dung: Danh sách shop của user (grid/list); mỗi card: logo, tên, slug, industry, status; quick actions "Vào shop", "Chỉnh sửa".
  - CTA: Nút "Tạo cửa hàng" → `/shops/create`.
  - Empty state: "Chưa có cửa hàng", nút "Tạo cửa hàng đầu tiên".
  - Tùy chọn: Thống kê nhanh (tổng shop, website live).
- `**/shops/create` (Form tạo shop):**
  - Chỉ thu thập thông tin cơ bản theo DB: name, slug, industry, description, address, city, district, country, postal_code, contact_info (phone, email, owner_name). Bắt buộc đủ các trường trên; không nhập products, website_url lúc tạo.
  - Chi tiết trường form: liệt kê đúng 12 trường bắt buộc như bảng ở mục 3.2 trên.
- `**/shops/[id]` (Chi tiết cửa hàng — layout riêng):**
  - **Header:** Dùng chung với Dashboard (LanguageSwitcher + UserMenu); title có thể là tên shop hoặc "Shop Dashboard".
  - **Left sidebar (riêng):**
    - Shop Dashboard (tổng quan shop)
    - Bot tạo ảnh (AI tạo ảnh cho shop)
    - Storage (lưu trữ toàn bộ hình ảnh của shop)
    - Support marketing (kho content: ad post, mô tả, caption)
    - Pipeline (quản lý và xem quy trình tự động)
    - **Dưới cùng sidebar:** Credit balance (giống left sidebar DashboardPage).
  - Các route con: `/shops/[id]`, `/shops/[id]/image-bot`, `/shops/[id]/storage`, `/shops/[id]/marketing`, `/shops/[id]/pipeline`; có thể thêm `/shops/[id]/edit` (form cập nhật shop, bổ sung products, website_url…).

### 5.2 Sơ đồ routing

- Thêm nhánh Shop Detail layout vào sơ đồ: từ UserRoute → Shops → ShopDetailLayout (sidebar riêng) → các route con (dashboard, image-bot, storage, marketing, pipeline).
- Ghi rõ: Shop List và Create dùng Dashboard Layout; Shop Detail dùng layout riêng (header chung, sidebar 5 mục + Credit balance).

### 5.3 Đồng bộ với Assets, AI Tools, Pipeline

- Giữ nguyên mô tả: Assets theo shop (mức 2 khi vào shop = Storage trong Shop Detail); AI Tools (Bot tạo ảnh) và Pipeline **điểm vào từ trang Shop Detail**, không mục riêng trên sidebar Dashboard chính.
- Trang "Storage" trong Shop Detail = xem ảnh + content của shop đó (có thể link thêm upload tại đây).

Khi **thực thi** (sau khi user duyệt plan), cần chỉnh sửa file [READ_CONTEXT/UI STRUCT.md](READ_CONTEXT/UI STRUCT.md) để bổ sung toàn bộ nội dung trên vào đúng các section hiện có (và cập nhật sơ đồ mermaid nếu cần).

---

## 6. Tóm tắt thực hiện (khi thoát plan mode)

1. **Không sửa code** trong bước này (chỉ plan).
2. **Cập nhật [READ_CONTEXT/UI STRUCT.md](READ_CONTEXT/UI STRUCT.md):**
  - Mở rộng section "Quản lý Cửa hàng (Shops)" với mô tả chi tiết ShopListPage, Form tạo shop (12 trường bắt buộc), Shop Detail layout (header chung + sidebar 5 mục + Credit balance).
  - Cập nhật sơ đồ routing (mermaid) để có Shop Detail layout và route con.
  - Đồng bộ mô tả Assets / AI Tools / Pipeline với entry từ Shop Detail.
3. **Implement sau:** Tạo ShopListPage, CreateShopPage (form), ShopDetailLayout (sidebar + Credit balance), các trang con (Shop Dashboard, Bot tạo ảnh, Storage, Marketing, Pipeline) và route trong App.tsx.

---

## 7. Bổ sung: Domain, Slug (kiểm tra trùng), Industry (40 ngành)

### 7.1 Trang web hệ thống — captone2.site

- **Trang web hệ thống hiện tại:** [captone2.site](https://captone2.site)
- Đã ghi chú vào các file READ_CONTEXT: [UI STRUCT.md](READ_CONTEXT/UI STRUCT.md), [database_design.md](READ_CONTEXT/database_design.md), [AIMAP-Architecture-VN.md](READ_CONTEXT/AIMAP-Architecture-VN.md), [AIMAP-Quick-ReadVN.md](READ_CONTEXT/AIMAP-Quick-ReadVN.md), [AIMAP-3-Image-ModelsAI-VN.md](READ_CONTEXT/AIMAP-3-Image-ModelsAI-VN.md), [Cau_truc_folder.md](READ_CONTEXT/Cau_truc_folder.md), [AIMAP-Project-Plan-Schedule.md](READ_CONTEXT/AIMAP-Project-Plan-Schedule.md).
- Subdomain shop hiển thị dạng **slug.captone2.site** (trong form tạo shop và ShopListPage).

### 7.2 Slug (URL/subdomain) — kiểm tra trùng ngay khi nhập

- **Yêu cầu:** Báo trực tiếp lên giao diện nếu slug đã bị trùng; không đợi user click submit mới kiểm tra.
- **Cách làm:** Mỗi lần user nhập một ký tự thì kiểm tra ngay (so sánh với danh sách slug đã dùng). Để **tránh gọi database liên tục**: khi mở form tạo shop, gọi API **một lần** lấy toàn bộ slug đã được sử dụng (ví dụ `GET /api/shops/slugs` trả `string[]`), lưu vào cache (state Set). Sau đó mỗi lần nhập chỉ cần `takenSlugs.has(normalizeSlug(form.slug))` và hiển thị lỗi "Slug đã được sử dụng" ngay dưới ô nhập.
- **Implement:** CreateShopPage: `useEffect` load taken slugs khi mount; `useEffect` với dependency `[form.slug, takenSlugs]` để set `slugTaken`; ô slug hiển thị border đỏ + message khi `slugTaken`; nút Submit disabled khi `slugTaken`.

### 7.3 Industry — 40 ngành hàng (Tiếng Việt + English), bắt chọn từ list, hỗ trợ tìm kiếm

- **Yêu cầu:** User **bắt buộc chọn** từ danh sách 40 ngành (không được nhập bừa); đồng thời **hỗ trợ tìm kiếm**: nhập tới đâu gợi ý tới đó (filter theo tag và mô tả). **Đa ngôn ngữ:** Hiển thị label theo locale (vi / en) — cần có cả mô tả tiếng Việt và tiếng Anh cho từng ngành.
- **Implement:** File `constants/industries.ts` export `INDUSTRIES` với `labelVi` và `labelEn` (hoặc dùng i18n key); `getIndustryLabel(opt, locale)`. Form CreateShopPage: combobox; user gõ → filter theo tag + label (theo locale hiện tại); chọn một mục → lưu **tag** (hoặc label tương ứng) vào `form.industry` để gửi API/DB; submit chỉ hợp lệ khi giá trị nằm trong 40 mục.
- **Bảng 40 ngành — Tag | Tiếng Việt | English:**


| #   | Tag        | Tiếng Việt                                         | English                                           |
| --- | ---------- | -------------------------------------------------- | ------------------------------------------------- |
| 1   | DOUONG     | Đồ uống, cafe, trà sữa, nước ép, smoothie          | Beverages, coffee, milk tea, juice, smoothie      |
| 2   | DOAN       | Đồ ăn, nhà hàng, quán ăn, bakery, fastfood         | Food, restaurant, bakery, fast food               |
| 3   | AOQUAN     | Quần áo, thời trang nam/nữ                         | Apparel, men's/women's fashion                    |
| 4   | GIAYDEP    | Giày dép, sneaker, sandal                          | Footwear, sneakers, sandals                       |
| 5   | PHUKIEN    | Phụ kiện thời trang: túi xách, mũ, kính, trang sức | Fashion accessories: bags, hats, eyewear, jewelry |
| 6   | DULICH     | Du lịch, tour, dịch vụ lữ hành                     | Travel, tours, travel services                    |
| 7   | BOOKING    | Đặt phòng, khách sạn, homestay, resort             | Booking, hotel, homestay, resort                  |
| 8   | GIAODUC    | Giáo dục, trung tâm, khóa học, luyện thi           | Education, training center, courses               |
| 9   | SUCKHOE    | Sức khỏe, phòng khám, dược phẩm                    | Healthcare, clinic, pharmacy                      |
| 10  | SPA        | Spa, massage, chăm sóc cơ thể                      | Spa, massage, body care                           |
| 11  | GYM        | Gym, fitness, yoga, pilates                        | Gym, fitness, yoga, pilates                       |
| 12  | MYPHAM     | Mỹ phẩm, skincare, makeup, làm đẹp                 | Cosmetics, skincare, makeup                       |
| 13  | TOCHUC     | Tóc, barbershop, salon tóc                         | Hair, barbershop, hair salon                      |
| 14  | CONGNGHE   | Công nghệ, điện tử, gadget, phần mềm               | Technology, electronics, gadgets, software        |
| 15  | NOITHAT    | Nội thất, trang trí nhà, decor                     | Furniture, home decor                             |
| 16  | XAYDUNG    | Xây dựng, vật liệu, kiến trúc                      | Construction, materials, architecture             |
| 17  | BATDONGSAN | Bất động sản, môi giới, cho thuê nhà               | Real estate, brokerage, rental                    |
| 18  | OTO        | Ô tô, xe hơi, đại lý, phụ tùng                     | Automotive, car dealer, parts                     |
| 19  | XEMAY      | Xe máy, xe điện, phụ kiện xe                       | Motorcycle, e-bike, accessories                   |
| 20  | THUYCUNG   | Thú cưng, pet shop, pet care, thú y                | Pets, pet shop, pet care, veterinary              |
| 21  | HOAQUA     | Hoa quả, trái cây, nông sản sạch                   | Fruits, fresh produce, organic                    |
| 22  | HOA        | Hoa tươi, shop hoa, quà tặng hoa                   | Fresh flowers, flower shop, gifts                 |
| 23  | SUKIEN     | Tổ chức sự kiện, wedding, party, hội nghị          | Events, wedding, party, conference                |
| 24  | NHIEPAN    | Nhiếp ảnh, studio, chụp hình, quay phim            | Photography, studio, video                        |
| 25  | INANUONG   | In ấn, thiết kế đồ họa, bao bì                     | Printing, graphic design, packaging               |
| 26  | VANTAI     | Vận tải, giao hàng, logistics, chuyển phát         | Transport, delivery, logistics                    |
| 27  | TAICHINH   | Tài chính, bảo hiểm, ngân hàng, đầu tư             | Finance, insurance, banking, investment           |
| 28  | LUATPHAP   | Luật, tư vấn pháp lý, kế toán                      | Legal, legal advice, accounting                   |
| 29  | NONGSAN    | Nông sản, thực phẩm sạch, organic                  | Farm produce, organic food                        |
| 30  | THUISAN    | Thủy hải sản, hải sản tươi sống                    | Seafood, fresh seafood                            |
| 31  | TREEM      | Trẻ em, mẹ & bé, đồ chơi, quần áo trẻ em           | Kids, mother & baby, toys, children's wear        |
| 32  | THETHAO    | Thể thao, dụng cụ thể thao, sportswear             | Sports, sports equipment, sportswear              |
| 33  | GAME       | Game, esports, gaming gear                         | Gaming, esports, gaming gear                      |
| 34  | SACH       | Sách, văn phòng phẩm, nhà sách                     | Books, stationery, bookstore                      |
| 35  | DIENGIA    | Điện gia dụng, thiết bị nhà bếp, gia dụng          | Home appliances, kitchen, household               |
| 36  | THUOCLA    | Vape, shisha, phụ kiện (nếu hợp pháp)              | Vape, shisha, accessories (if legal)              |
| 37  | NHACCU     | Nhạc cụ, âm nhạc, studio thu âm                    | Musical instruments, music, recording studio      |
| 38  | HANDMADE   | Handmade, thủ công mỹ nghệ, DIY                    | Handmade, crafts, DIY                             |
| 39  | NGOAINGU   | Ngoại ngữ, trung tâm Anh/Nhật/Hàn/Trung            | Language learning, language center                |
| 40  | GENERAL    | Dùng chung cho mọi ngành (prompt tổng quát)        | General purpose (generic prompts)                 |


---

## 8. Lộ trình Backend (ShopList, Create Shop, Shop Detail)

Backend cần cung cấp API và dịch vụ để frontend ShopList, form tạo shop, và Shop Detail hoạt động đầy đủ. Thứ tự gợi ý theo dependency.

### 8.1 Phase 1 — Shops CRUD & Slug cache


| Thứ tự | Hạng mục                 | Mô tả                                                                                                                                                                                                        |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | **GET /api/shops**       | Trả danh sách shop của user hiện tại (auth). Fields: id, name, slug, industry, description (rút gọn), logo_url, cover_url, status, created_at; tùy chọn site status cho badge "Live".                        |
| 2      | **GET /api/shops/slugs** | Trả mảng `string[]` tất cả slug đã tồn tại (để frontend cache và kiểm tra trùng khi nhập). Có thể public hoặc cần auth tùy chính sách.                                                                       |
| 3      | **POST /api/shops**      | Tạo shop mới. Body: name, slug, industry, description, address, city, district, country, postal_code, contact_info (phone, email, owner_name). Validate unique slug; trả 201 + shop hoặc 409 nếu slug trùng. |
| 4      | **GET /api/shops/:id**   | Chi tiết một shop (chỉ user sở hữu hoặc admin). Dùng cho Shop Detail layout (tên shop, thống kê).                                                                                                            |
| 5      | **PATCH /api/shops/:id** | Cập nhật shop (Edit shop). Body tương tự POST, có thể bổ sung products, website_url, social_links, v.v.                                                                                                      |


- **DB:** Đảm bảo bảng `shops` (và `industry_tag_mappings` nếu dùng) đã migrate; unique constraint trên `shops.slug`.

### 8.2 Phase 2 — Shop Detail: Assets, Content, Pipeline


| Thứ tự | Hạng mục                                  | Mô tả                                                                                     |
| ------ | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| 6      | **GET /api/shops/:id/assets**             | Danh sách assets (ảnh) của shop: logo, banner, cover, post. Phân trang, filter theo type. |
| 7      | **POST /api/shops/:id/assets**            | Upload ảnh vào shop (Storage). Trả URL/path và metadata.                                  |
| 8      | **GET /api/shops/:id/marketing-content**  | Danh sách marketing_content (ad_post, product_description, caption_hashtag) của shop.     |
| 9      | **POST /api/shops/:id/marketing-content** | Tạo/sửa content (khi dùng Bot tạo ảnh / Support marketing).                               |
| 10     | **GET /api/shops/:id/pipeline-runs**      | Lịch sử pipeline runs của shop (trạng thái, steps, thời gian).                            |
| 11     | **POST /api/shops/:id/pipeline-runs**     | Khởi chạy pipeline mới (Store → Branding → Content → Visual…).                            |


- **DB:** Bảng `assets`, `marketing_content`, `pipeline_runs` (Sprint 2); quyền theo `shop_id` + user.

### 8.3 Phase 3 — Credit balance & Dashboard stats


| Thứ tự | Hạng mục                                                      | Mô tả                                                                                                   |
| ------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 12     | **GET /api/users/me/credit** hoặc **GET /api/credit/balance** | Số dư credit của user (sidebar Dashboard & Shop Detail).                                                |
| 13     | **GET /api/shops/:id/stats** (tùy chọn)                       | Thống kê nhanh cho Shop Dashboard: số assets, số marketing content, site status, pipeline run gần nhất. |


### 8.4 Thứ tự triển khai gợi ý

1. Migrations: `shops`, `sites`, `industry_tag_mappings` (nếu chưa có).
2. Implement Phase 1 (shops CRUD + slugs) → frontend ShopListPage, CreateShopPage có thể gọi API thật.
3. Implement Phase 3 (credit balance) → hiển thị số dư thật trên sidebar.
4. Implement Phase 2 (assets, marketing, pipeline) → các trang Shop Detail (Storage, Marketing, Pipeline) có dữ liệu thật.

