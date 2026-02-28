# AIMAP – Đọc nhanh: Nền tảng Marketing & Website AI cho Shop nhỏ

**AIMAP** = *AI-Powered Marketing Automation Platform for Small Businesses*  
Capstone Project 2 – International School, Duy Tan University

**Một nền tảng SaaS cho phép chủ shop nhỏ nhập thông tin cửa hàng một lần → AI tạo thương hiệu, nội dung, bài đăng hình ảnh, website, đăng Facebook tự động và deploy lên mạng — không cần biết code.**

---

## Điểm nổi bật (Highlights)

- **Thu thập thông tin cửa hàng một lần:** Nhập tên, sản phẩm, giá, liên hệ, sở thích thương hiệu → dùng làm nguồn dữ liệu duy nhất cho toàn bộ quy trình automation (branding, nội dung, hình ảnh, website, đăng Facebook).
- **Multi-Agent orchestration:** Nhiều agent chuyên biệt (Branding, Content, Visual Post, Website Builder, Deploy, Social Posting) phối hợp qua Orchestrator → quy trình end-to-end từ input đến website + Facebook.
- **All-in-one:** Từ store info → branding (logo, banner) → nội dung marketing (bài viết, mô tả, caption, hashtag) → ảnh bài đăng chuẩn MXH → website → chỉnh website bằng prompt → preview realtime → deploy (`shopname.aimap.app`) → **đăng tự động lên Facebook Page**, trong một dashboard.
- **Đăng Facebook tự động:** OAuth qua Meta Graph API, lưu token an toàn, đăng nội dung đã tạo lên Facebook Page đã ủy quyền.
- **AI hiểu ngữ cảnh:** Chỉnh website nhiều lần liên tiếp; AI nhớ cấu trúc hiện tại và lịch sử hội thoại, không phá layout.
- **Zero code:** Không cần HTML/CSS/JS; mọi thay đổi website qua prompt tự nhiên; không cần công cụ thiết kế rời rạc.
- **Credit & thanh toán:** Sử dụng dịch vụ theo credit; tích hợp payment gateway để mua credit; Admin theo dõi doanh thu và giao dịch.
- **Cách ly & scale:** Mỗi shop = 1 Docker container riêng; Admin quản lý user, xem log hoạt động và dashboard hiệu năng.

---

## Chi tiết chức năng & Lợi ích người dùng

### 0. Thu thập thông tin cửa hàng (Unified Store Information Input)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Nhập thông tin cửa hàng có cấu trúc** (tên, sản phẩm, giá, liên hệ, sở thích thương hiệu) | Một lần nhập dùng cho toàn bộ quy trình: branding, nội dung, ảnh bài đăng, website; không phải nhập lại nhiều nơi. |
| **Validation dữ liệu** | Đảm bảo đủ thông tin cần thiết trước khi chạy automation; giảm lỗi thiếu dữ liệu. |

**Tóm lại:** Store info là nguồn dữ liệu duy nhất cho toàn bộ hệ thống; người dùng chỉ cần điền form một lần.

---

### 1. Branding & Tạo hình ảnh (Logo, Banner, Cover)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Nhập thông tin thương hiệu** (tên shop, ngành hàng, phong cách) | AI tạo logo, banner và hình ảnh marketing phù hợp thương hiệu, tiết kiệm chi phí thuê designer. |
| **Tạo logo tự động** | Có logo chuyên nghiệp ngay từ đầu, nhất quán với ngành và phong cách đã chọn. |
| **Tạo banner & ảnh marketing** | Đủ tài nguyên để quảng cáo (Facebook, website, email) mà không cần công cụ thiết kế phức tạp. |
| **Upload ảnh riêng** | Tận dụng ảnh sẵn có (sản phẩm, ảnh thật) và vẫn quản lý chung trong thư viện. |
| **Lưu trữ & quản lý asset theo user/shop** | Mọi file (logo, banner, ảnh) được lưu riêng, an toàn; dễ tái sử dụng khi tạo hoặc sửa website. |

**Tóm lại:** Người dùng có bộ nhận diện và hình ảnh marketing cơ bản mà không cần kỹ năng thiết kế hay phần mềm chuyên dụng.

---

### 2. AI Website Builder (Tạo website frontend tự động)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Tạo website frontend hoàn chỉnh** (HTML/CSS/JS hoặc framework) | Có trang web hoàn chỉnh, sẵn sàng hiển thị, không cần viết code. |
| **Preview trong dashboard (iframe)** | Xem trực tiếp giao diện website ngay trong cùng màn hình làm việc, không phải mở tab hay tool khác. |
| **Tích hợp branding** | Logo, banner, màu sắc từ bước branding có thể được dùng ngay trên website → thương hiệu nhất quán. |

**Tóm lại:** Từ “không có gì” đến “có website” trong vài thao tác, với giao diện thống nhất với thương hiệu.

---

### 2b. Tạo nội dung marketing bằng AI (AI Marketing Content Creation)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Bài viết quảng cáo** | AI sinh bài đăng quảng cáo từ thông tin cửa hàng và sản phẩm; không cần kỹ năng copywriting. |
| **Mô tả sản phẩm** | Mô tả sản phẩm có cấu trúc, phù hợp quảng cáo và website. |
| **Caption & gợi ý hashtag** | Caption và hashtag cho mạng xã hội; dùng ngay cho bài đăng Facebook hoặc ảnh. |

**Tóm lại:** Có đủ nội dung chữ (post, mô tả, caption, hashtag) cho marketing mà không cần thuê người viết.

---

### 2c. Tạo ảnh bài đăng tự động (Automated Visual Post Creation)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Ảnh bài đăng sẵn sàng đăng MXH** | Kết hợp branding (logo, màu), thông tin sản phẩm, giá và text quảng cáo thành ảnh chuẩn đăng Facebook. |
| **Export chuẩn kích thước Facebook** | Ảnh xuất đúng tỷ lệ/kích thước yêu cầu của Facebook; không cần chỉnh tay. |

**Tóm lại:** Có ảnh bài đăng đẹp, nhất quán thương hiệu, sẵn sàng đăng lên Facebook.

---

### 2d. Đăng tự động lên Facebook Page (Facebook Page Auto-Publishing)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **OAuth ủy quyền Facebook** | Đăng nhập một lần qua Meta Graph API, ủy quyền truy cập Facebook Page; bảo mật chuẩn Meta. |
| **Lưu trữ token an toàn** | Page Access Token được lưu mã hóa; không cần đăng nhập lại mỗi lần đăng. |
| **Đăng nội dung tự động** | Đăng bài (nội dung + ảnh đã tạo) lên Facebook Page đã ủy quyền; một nút hoặc theo quy trình automation. |

**Tóm lại:** Từ nội dung và ảnh đã tạo trong hệ thống → đăng trực tiếp lên Fanpage, không copy-paste thủ công.

---

### 3. Chỉnh sửa website bằng Prompt (Prompt-based Editing)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Nhập yêu cầu bằng ngôn ngữ tự nhiên** (VD: "Làm header nhỏ lại", "Đổi màu chủ đạo sang xanh dương", "Thêm phần đánh giá khách hàng") | Chỉnh sửa nội dung và giao diện như đang nói chuyện, không cần học cú pháp hay thao tác kéo thả phức tạp. |
| **AI phân tích & áp dụng thay đổi** | AI hiểu ý và cập nhật đúng phần cần sửa, giảm thử-sai và chỉnh tay từng chi tiết. |
| **Hiểu cấu trúc website hiện tại** | AI không “quên” layout hay section đã có; chỉnh sửa bổ sung, không làm hỏng phần khác. |
| **Chỉnh sửa nhiều lần liên tiếp** | Có thể tinh chỉnh dần (lần 1: thêm section, lần 2: đổi màu nút, lần 3: sửa text) — AI nhớ ngữ cảnh qua lịch sử hội thoại. |
| **Preview cập nhật ngay** | Sau mỗi lần gửi prompt, xem kết quả ngay trên iframe; làm lại nếu chưa ưng ý. |

**Tóm lại:** Người dùng “ra lệnh” bằng câu nói thông thường, AI thực hiện và hiển thị kết quả ngay — trải nghiệm gần với chat với designer/developer.

---

### 4. Hosting & Deploy (Đưa website lên internet)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Host trên server của hệ thống** | Không cần mua hosting riêng hay cấu hình server; mọi thứ do nền tảng đảm nhiệm. |
| **Subdomain sẵn:** `shopname.aimap.app` | Có địa chỉ web chuyên nghiệp ngay (VD: `mycoffee.aimap.app`), dễ nhớ, dễ chia sẻ. |
| **Mở rộng custom domain sau** | Khi shop lớn hơn, có thể gắn tên miền riêng (VD: `mycoffee.vn`) mà không đổi cách dùng. |
| **Mỗi shop = 1 Docker riêng** | Website của từng shop chạy tách biệt → ổn định, an toàn, không ảnh hưởng lẫn nhau. |

**Tóm lại:** Một nút “Deploy” là website lên mạng với địa chỉ sẵn; không cần kiến thức kỹ thuật về hosting hay Docker.

---

### 5. Sử dụng theo Credit & Thanh toán (Credit-based Usage & Payment)

| Chức năng | Lợi ích cho người dùng |
|-----------|-------------------------|
| **Mô hình dùng theo credit** | Mỗi hành động (tạo logo, đăng Facebook, deploy website, v.v.) trừ credit; dễ kiểm soát chi phí. |
| **Mua credit qua Payment Gateway** | Nạp credit bằng cổng thanh toán tích hợp; nhận thông báo số dư và xác nhận giao dịch. |
| **Xem số dư & lịch sử** | Dashboard hiển thị số dư credit và lịch sử sử dụng/thanh toán. |

**Tóm lại:** Người dùng trả theo mức sử dụng (credit); nền tảng có mô hình doanh thu rõ ràng.

---

### 6. Quản trị hệ thống (Administrator)

| Chức năng | Lợi ích cho người review / vận hành |
|-----------|--------------------------------------|
| **Quản lý tài khoản user** | Kích hoạt, tạm khóa hoặc chỉnh sửa tài khoản; đảm bảo kiểm soát truy cập. |
| **Xem log hoạt động** | Theo dõi nhật ký hoạt động để audit, xử lý sự cố và đảm bảo tính toàn vẹn hệ thống. |
| **Theo dõi doanh thu & giao dịch credit** | Báo cáo doanh thu, thống kê sử dụng credit và giao dịch thanh toán. |
| **Dashboard hiệu năng hệ thống** | Thống kê sử dụng, số lần gọi API, tần suất đăng bài, chỉ số vận hành. |

**Tóm lại:** Admin không tham gia marketing nhưng đảm bảo ổn định, minh bạch và kiểm soát nghiệp vụ.

---

### 7. Kiến trúc Multi-Agent (Multi-Agent Orchestration)

Hệ thống dùng **Orchestrator** điều phối nhiều agent chuyên biệt:

- **Branding Agent:** Tạo logo, banner, cover từ store info và sở thích thương hiệu.
- **Content Agent:** Sinh bài viết quảng cáo, mô tả sản phẩm, caption, hashtag (LLM).
- **Visual Post Agent:** Tạo ảnh bài đăng (branding + sản phẩm + text) chuẩn Facebook.
- **Website Builder Agent:** Sinh/cập nhật website (config JSON) từ store + branding; hỗ trợ chỉnh sửa bằng prompt.
- **Deploy Agent:** Deploy website lên hosting (mỗi shop = 1 Docker), trả URL công khai.
- **Social Posting Agent:** Đăng nội dung + ảnh lên Facebook Page qua Meta Graph API.

**Lợi ích:** Tách biệt trách nhiệm, dễ bảo trì và mở rộng; quy trình end-to-end từ store info đến website + Facebook.

---

## Lợi ích tổng hợp cho người dùng

- **Tiết kiệm thời gian & chi phí:** Không thuê designer (logo/banner), copywriter (nội dung), dev (website), hay mua hosting riêng; đăng Facebook tự động thay vì copy-paste thủ công.
- **Giảm rào cản kỹ thuật:** Không cần học code, công cụ thiết kế hay quy trình OAuth; một form store info + dashboard + prompt là đủ.
- **Kiểm soát nhanh:** Chỉnh website → xem ngay → chỉnh tiếp; đăng Facebook một nút; trả phí theo credit, dễ kiểm soát.
- **Thương hiệu nhất quán:** Store info → branding → nội dung → ảnh bài đăng → website dùng chung asset và phong cách.

---

## Vì sao hệ thống gây ấn tượng (cho người review)

1. **Multi-Agent orchestration:** Nhiều agent chuyên biệt (Branding, Content, Visual Post, Website Builder, Deploy, Social Posting) phối hợp qua Orchestrator → end-to-end từ store info đến website + Facebook, dễ bảo trì và mở rộng.
2. **Kiến trúc rõ ràng, hướng production:** Frontend, Backend, AI Layer, Storage, Hosting; config-driven (JSON + template) cho website; tích hợp Meta Graph API (OAuth, token, posting) và Payment Gateway (credit).
3. **AI context đúng cách:** Lưu config hiện tại + lịch sử hội thoại; AI nhận full context mỗi lần chỉnh sửa → hỗ trợ chỉnh sửa nhiều vòng ổn định, không “quên” hoặc phá layout.
4. **Cách ly & scale:** Mỗi shop một Docker container; reverse proxy subdomain → dễ mở rộng, dễ bảo mật và triển khai.
5. **Trải nghiệm & mô hình kinh doanh:** Một luồng: Store info → Branding → Nội dung → Ảnh bài đăng → Website (chỉnh bằng prompt) → Deploy → Đăng Facebook; thanh toán theo credit. Có thể mở rộng: custom domain, WebSocket preview, thêm section type, model AI khác. Một luồng duy nhất: Branding → Website → Chỉnh bằng prompt → Preview realtime → Deploy; không yêu cầu kiến thức kỹ thuật.

---

## Tài liệu kèm theo

- **Đọc nhanh (English):** `AIMAP-Quick-Read-EN.md` — bản tiếng Anh của tài liệu này, cho reviewer quốc tế.
- **Kiến trúc chi tiết (tiếng Việt):** Xem file plan trong `.cursor/plans` hoặc README chính.
- **Kiến trúc (English):** `AIMAP-Architecture-EN.md` — tài liệu kỹ thuật tiếng Anh.
