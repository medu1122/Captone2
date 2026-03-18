import { useEffect, useRef, useState } from 'react'

type TagItem = { tag: string; label: string }

const TAG_EN: Record<string, string> = {
  DOUONG: 'Beverages',
  AOQUAN: 'Clothing',
  GIAYDEP: 'Footwear',
  PHUKIEN: 'Accessories',
  DOAN: 'Food',
  DULỊCH: 'Travel',
  DULICH: 'Travel',
  BOOKING: 'Hotel / Booking',
  GIAODUC: 'Education',
  SUCKHOE: 'Health',
  SPA: 'Spa & Beauty',
  GYMYOGA: 'Gym / Yoga',
  MYPHAM: 'Cosmetics',
  SALONTOC: 'Hair Salon',
  CONGNGHE: 'Technology',
  NOITHAT: 'Furniture',
  XAYDUNG: 'Construction',
  BATDONGSAN: 'Real Estate',
  OTO: 'Automobiles',
  XEMAY: 'Motorbikes',
  THUCUNG: 'Pets',
  HOQUA: 'Fruits',
  HOAQUA: 'Fruits',
  HOATƯƠI: 'Fresh Flowers',
  HOATUOI: 'Fresh Flowers',
  SUKIEN: 'Events',
  NHIEPẢNH: 'Photography',
  NHIEPẢNH2: 'Photography',
  NHIÊPẢNH: 'Photography',
  NHIÊPANH: 'Photography',
  INAN: 'Printing',
  VANTAI: 'Logistics',
  TAICHINH: 'Finance',
  LUAT: 'Legal',
  NONGSẢN: 'Agriculture',
  NONGSẢN2: 'Agriculture',
  NONGSAN: 'Agriculture',
  THUYHAISẢN: 'Seafood',
  THUYHAISẢN2: 'Seafood',
  THUYHAISSAN: 'Seafood',
  TREEM: 'Kids',
  THETHAO: 'Sports',
  GAME: 'Gaming',
  SACH: 'Books',
  DIENGIADỤNG: 'Home Appliances',
  DIENGIADUNG: 'Home Appliances',
  GENERAL: 'General',
}

function getEnLabel(tag: string): string {
  return TAG_EN[tag] ?? TAG_EN[tag.toUpperCase()] ?? tag
}

type Props = {
  value: string
  onChange: (tag: string) => void
  allTags: TagItem[]
  suggestedTags: string[]
  t: (key: string) => string
}

export default function ProductTypePicker({ value, onChange, allTags, suggestedTags, t }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  const suggested = allTags.filter((item) => suggestedTags.includes(item.tag))
  const rest = allTags.filter((item) => !suggestedTags.includes(item.tag))
  const ordered = [...suggested, ...rest]

  const filtered = search.trim()
    ? ordered.filter((item) => {
        const q = search.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          getEnLabel(item.tag).toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q)
        )
      })
    : ordered

  const selectedItem = allTags.find((item) => item.tag === value)

  const select = (tag: string) => {
    onChange(tag)
    setOpen(false)
    setSearch('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
        {t('products.fieldTags')}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
          open
            ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        {selectedItem ? (
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium text-slate-800 truncate">{selectedItem.label}</span>
            <span className="text-slate-400 text-xs shrink-0">/ {getEnLabel(selectedItem.tag)}</span>
          </span>
        ) : (
          <span className="text-slate-400">{t('products.typePlaceholder')}</span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={clear}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              title="Clear"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-400 shrink-0">
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('products.typeSearchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy loại phù hợp</p>
            ) : (
              filtered.map((item) => {
                const isSuggested = suggestedTags.includes(item.tag)
                const isSelected = value === item.tag
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => select(item.tag)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : isSuggested
                        ? 'hover:bg-blue-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isSuggested && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      )}
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-blue-600 shrink-0">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {!isSuggested && !isSelected && <span className="w-3.5 shrink-0" />}
                      <span className={`font-medium truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </span>
                    <span className="text-slate-400 text-xs shrink-0">{getEnLabel(item.tag)}</span>
                  </button>
                )
              })
            )}
          </div>

          {suggested.length > 0 && !search && (
            <div className="border-t border-slate-100 px-3 py-1.5">
              <p className="text-[10px] text-slate-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 align-middle" />
                {t('products.industryTagsHint')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
