import { Link } from 'react-router-dom'

/**
 * CHÍNH SÁCH QUYỀN RIÊNG TƯ — công khai cho Meta App Review (URL /privacy-policy).
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 px-4 py-4 max-w-3xl mx-auto flex items-center justify-between gap-4">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← AIMAP
        </Link>
        <span className="text-xs text-slate-500">Cập nhật: 04/2026</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 pb-16 space-y-8 text-sm text-slate-800 leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Chính sách quyền riêng tư</h1>
          <p className="text-slate-500 text-xs mb-4">Privacy Policy — AIMAP</p>
          <p className="text-slate-600">
            AIMAP là ứng dụng web hỗ trợ chủ cửa hàng quản lý thương hiệu, nội dung và (tuỳ chọn) kết nối
            Facebook Page để đồng bộ dữ liệu marketing. Chính sách này mô tả dữ liệu chúng tôi xử lý, trong đó
            có dữ liệu liên quan đến Facebook khi bạn bật tính năng đó.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Chủ thể xử lý dữ liệu</h2>
          <p>
            Ứng dụng AIMAP do nhóm phát triển đồ án vận hành. Để liên hệ về quyền riêng tư hoặc dữ liệu
            Facebook: dùng email <strong>người liên hệ chính</strong> đã khai báo trong{' '}
            <strong>Meta for Developers</strong> (Cài đặt ứng dụng / Primary contact) hoặc email đăng ký tài
            khoản AIMAP của bạn.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">2. Dữ liệu từ Facebook / Meta (khi bạn kết nối)</h2>
          <p>Khi bạn đăng nhập Facebook và cấp quyền cho ứng dụng AIMAP, chúng tôi có thể xử lý:</p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
            <li>
              <strong>Mã thông báo (token)</strong> do Meta cấp (user access token trong luồng OAuth; page
              access token gắn với từng Fanpage bạn chọn kết nối).
            </li>
            <li>
              <strong>Định danh Page</strong>: ID Page, tên Page, ảnh đại diện/công khai, nhóm ngành (nếu
              Graph API trả về), số người theo dõi ước tính.
            </li>
            <li>
              <strong>Nội dung và số liệu phục vụ marketing</strong>: bài đăng trên Page (nội dung, thời
              gian), chỉ số tương tác/insight mà API cho phép (ví dụ reach, impression, engagement tùy
              quyền đã cấp), bình luận hoặc metadata bài đăng khi bạn dùng tính năng tương ứng.
            </li>
          </ul>
          <p>
            Phạm vi cụ thể phụ thuộc <strong>quyền (permissions)</strong> bạn đồng ý trên màn hình Facebook và
            cài đặt ứng dụng Meta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">3. Mục đích sử dụng</h2>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
            <li>Hiển thị danh sách Page đã kết nối và trạng thái đồng bộ trong dashboard.</li>
            <li>Đọc feed bài đăng, chỉ số, gợi ý nội dung / AI hỗ trợ marketing theo tính năng bạn bật.</li>
            <li>Vận hành kỹ thuật: lưu token an toàn phía server, làm mới khi cần, ngắt kết nối khi bạn yêu cầu.</li>
          </ul>
          <p>
            Chúng tôi <strong>không</strong> bán dữ liệu Facebook của bạn. Không dùng dữ liệu để chạy quảng
            cáo thay cho bên thứ ba ngoài phạm vận hành AIMAP, trừ khi có thỏa thuận riêng và được bạn đồng ý
            rõ ràng.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">4. Lưu trữ và bảo mật</h2>
          <p>
            Token và dữ liệu Page được lưu trên máy chủ backend (cơ sở dữ liệu do nhà phát triển quản lý),
            chỉ truy cập qua API có xác thực tài khoản AIMAP. Bạn có thể <strong>gỡ kết nối Page</strong> trong
            ứng dụng; khi đó chúng tôi xóa bản ghi token Page tương ứng theo logic hệ thống hiện tại.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">5. Bên thứ ba</h2>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
            <li>
              <strong>Meta / Facebook</strong>: dữ liệu được lấy qua Graph API theo điều khoản Meta.
            </li>
            <li>
              <strong>Dịch vụ AI</strong> (nếu bật): nội dung tóm tắt / gợi ý có thể được gửi tới máy chủ AI
              (ví dụ Ollama trên VPS) để tạo văn bản; không nhằm mục đích huấn luyện mô hình công khai trừ khi
              được mô tả riêng.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">6. Quyền của bạn</h2>
          <p>
            Bạn có thể ngừng cấp quyền trên Facebook (Cài đặt Facebook → ứng dụng và website) và/hoặc gỡ Page
            trong AIMAP. Bạn có thể yêu cầu xóa tài khoản hoặc giải thích dữ liệu đang lưu qua email liên hệ ở
            mục 1.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">7. Thay đổi chính sách</h2>
          <p>
            Chúng tôi có thể cập nhật trang này; ngày cập nhật ghi ở đầu trang. Với thay đổi quan trọng, chúng
            tôi sẽ thông báo hợp lý trong ứng dụng hoặc qua email nếu có.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-1">English (summary for reviewers)</p>
          <p>
            AIMAP processes Facebook data (tokens, Page metadata, posts, and insights as permitted) only to
            provide shop marketing features you enable. Data is stored on our backend and not sold. Contact
            the app&apos;s primary developer email listed in Meta App settings or your AIMAP account email for
            privacy requests.
          </p>
        </section>
      </main>
    </div>
  )
}
