/**
 * 40 ngành hàng (industry) cho form tạo shop — map với industry_tag_mappings / prompt_templates.
 * User bắt buộc chọn từ list; hỗ trợ tìm kiếm/gợi ý khi nhập.
 * Đa ngôn ngữ: labelVi (Tiếng Việt) + labelEn (English).
 */
export type Locale = 'vi' | 'en'

export interface IndustryOption {
  tag: string
  labelVi: string
  labelEn: string
}

export const INDUSTRIES: IndustryOption[] = [
  { tag: 'DOUONG', labelVi: 'Đồ uống, cafe, trà sữa, nước ép, smoothie', labelEn: 'Beverages, coffee, milk tea, juice, smoothie' },
  { tag: 'DOAN', labelVi: 'Đồ ăn, nhà hàng, quán ăn, bakery, fastfood', labelEn: 'Food, restaurant, bakery, fast food' },
  { tag: 'AOQUAN', labelVi: 'Quần áo, thời trang nam/nữ', labelEn: "Apparel, men's/women's fashion" },
  { tag: 'GIAYDEP', labelVi: 'Giày dép, sneaker, sandal', labelEn: 'Footwear, sneakers, sandals' },
  { tag: 'PHUKIEN', labelVi: 'Phụ kiện thời trang: túi xách, mũ, kính, trang sức', labelEn: 'Fashion accessories: bags, hats, eyewear, jewelry' },
  { tag: 'DULICH', labelVi: 'Du lịch, tour, dịch vụ lữ hành', labelEn: 'Travel, tours, travel services' },
  { tag: 'BOOKING', labelVi: 'Đặt phòng, khách sạn, homestay, resort', labelEn: 'Booking, hotel, homestay, resort' },
  { tag: 'GIAODUC', labelVi: 'Giáo dục, trung tâm, khóa học, luyện thi', labelEn: 'Education, training center, courses' },
  { tag: 'SUCKHOE', labelVi: 'Sức khỏe, phòng khám, dược phẩm', labelEn: 'Healthcare, clinic, pharmacy' },
  { tag: 'SPA', labelVi: 'Spa, massage, chăm sóc cơ thể', labelEn: 'Spa, massage, body care' },
  { tag: 'GYM', labelVi: 'Gym, fitness, yoga, pilates', labelEn: 'Gym, fitness, yoga, pilates' },
  { tag: 'MYPHAM', labelVi: 'Mỹ phẩm, skincare, makeup, làm đẹp', labelEn: 'Cosmetics, skincare, makeup' },
  { tag: 'TOCHUC', labelVi: 'Tóc, barbershop, salon tóc', labelEn: 'Hair, barbershop, hair salon' },
  { tag: 'CONGNGHE', labelVi: 'Công nghệ, điện tử, gadget, phần mềm', labelEn: 'Technology, electronics, gadgets, software' },
  { tag: 'NOITHAT', labelVi: 'Nội thất, trang trí nhà, decor', labelEn: 'Furniture, home decor' },
  { tag: 'XAYDUNG', labelVi: 'Xây dựng, vật liệu, kiến trúc', labelEn: 'Construction, materials, architecture' },
  { tag: 'BATDONGSAN', labelVi: 'Bất động sản, môi giới, cho thuê nhà', labelEn: 'Real estate, brokerage, rental' },
  { tag: 'OTO', labelVi: 'Ô tô, xe hơi, đại lý, phụ tùng', labelEn: 'Automotive, car dealer, parts' },
  { tag: 'XEMAY', labelVi: 'Xe máy, xe điện, phụ kiện xe', labelEn: 'Motorcycle, e-bike, accessories' },
  { tag: 'THUYCUNG', labelVi: 'Thú cưng, pet shop, pet care, thú y', labelEn: 'Pets, pet shop, pet care, veterinary' },
  { tag: 'HOAQUA', labelVi: 'Hoa quả, trái cây, nông sản sạch', labelEn: 'Fruits, fresh produce, organic' },
  { tag: 'HOA', labelVi: 'Hoa tươi, shop hoa, quà tặng hoa', labelEn: 'Fresh flowers, flower shop, gifts' },
  { tag: 'SUKIEN', labelVi: 'Tổ chức sự kiện, wedding, party, hội nghị', labelEn: 'Events, wedding, party, conference' },
  { tag: 'NHIEPAN', labelVi: 'Nhiếp ảnh, studio, chụp hình, quay phim', labelEn: 'Photography, studio, video' },
  { tag: 'INANUONG', labelVi: 'In ấn, thiết kế đồ họa, bao bì', labelEn: 'Printing, graphic design, packaging' },
  { tag: 'VANTAI', labelVi: 'Vận tải, giao hàng, logistics, chuyển phát', labelEn: 'Transport, delivery, logistics' },
  { tag: 'TAICHINH', labelVi: 'Tài chính, bảo hiểm, ngân hàng, đầu tư', labelEn: 'Finance, insurance, banking, investment' },
  { tag: 'LUATPHAP', labelVi: 'Luật, tư vấn pháp lý, kế toán', labelEn: 'Legal, legal advice, accounting' },
  { tag: 'NONGSAN', labelVi: 'Nông sản, thực phẩm sạch, organic', labelEn: 'Farm produce, organic food' },
  { tag: 'THUISAN', labelVi: 'Thủy hải sản, hải sản tươi sống', labelEn: 'Seafood, fresh seafood' },
  { tag: 'TREEM', labelVi: 'Trẻ em, mẹ & bé, đồ chơi, quần áo trẻ em', labelEn: "Kids, mother & baby, toys, children's wear" },
  { tag: 'THETHAO', labelVi: 'Thể thao, dụng cụ thể thao, sportswear', labelEn: 'Sports, sports equipment, sportswear' },
  { tag: 'GAME', labelVi: 'Game, esports, gaming gear', labelEn: 'Gaming, esports, gaming gear' },
  { tag: 'SACH', labelVi: 'Sách, văn phòng phẩm, nhà sách', labelEn: 'Books, stationery, bookstore' },
  { tag: 'DIENGIA', labelVi: 'Điện gia dụng, thiết bị nhà bếp, gia dụng', labelEn: 'Home appliances, kitchen, household' },
  { tag: 'THUOCLA', labelVi: 'Vape, shisha, phụ kiện (nếu hợp pháp)', labelEn: 'Vape, shisha, accessories (if legal)' },
  { tag: 'NHACCU', labelVi: 'Nhạc cụ, âm nhạc, studio thu âm', labelEn: 'Musical instruments, music, recording studio' },
  { tag: 'HANDMADE', labelVi: 'Handmade, thủ công mỹ nghệ, DIY', labelEn: 'Handmade, crafts, DIY' },
  { tag: 'NGOAINGU', labelVi: 'Ngoại ngữ, trung tâm Anh/Nhật/Hàn/Trung', labelEn: 'Language learning, language center' },
  { tag: 'GENERAL', labelVi: 'Dùng chung cho mọi ngành (prompt tổng quát)', labelEn: 'General purpose (generic prompts)' },
]

/** Lấy label theo locale (vi | en). */
export function getIndustryLabel(opt: IndustryOption, locale: Locale): string {
  return locale === 'en' ? opt.labelEn : opt.labelVi
}

/** Tìm option theo tag. */
export function getIndustryByTag(tag: string): IndustryOption | undefined {
  return INDUSTRIES.find((i) => i.tag === tag)
}

/** Normalize slug for comparison: lowercase, only a-z 0-9 - */
export function normalizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/** Filter industries by search string (tag + labelVi + labelEn, case-insensitive). */
export function filterIndustries(search: string, _locale: Locale = 'vi'): IndustryOption[] {
  if (!search.trim()) return INDUSTRIES
  const q = search.trim().toLowerCase()
  return INDUSTRIES.filter(
    (i) =>
      i.tag.toLowerCase().includes(q) ||
      i.labelVi.toLowerCase().includes(q) ||
      i.labelEn.toLowerCase().includes(q)
  )
}
