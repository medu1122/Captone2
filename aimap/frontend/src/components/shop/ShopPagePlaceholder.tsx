import { useLocale } from '../../contexts/LocaleContext'

/** Vùng main trống cho các trang shop chưa build nội dung (header + sidebar do layout). */
export function ShopPagePlaceholder() {
  const { t } = useLocale()
  return (
    <div
      className="min-h-[min(45vh,280px)] w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-center p-10"
      aria-label={t('shopDetail.placeholder')}
    >
      <p className="text-sm text-slate-400 text-center max-w-md">{t('shopDetail.placeholder')}</p>
    </div>
  )
}
