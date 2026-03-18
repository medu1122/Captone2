import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

const steps = [
  { key: 'pipeline.stepStore', doneKey: 'pipeline.stepStoreHint', path: 'edit' as const },
  { key: 'pipeline.stepImages', doneKey: 'pipeline.stepImagesDesc', path: 'image-bot' as const },
  { key: 'pipeline.stepStorage', doneKey: 'pipeline.stepStorageDesc', path: 'storage' as const },
  { key: 'pipeline.stepMarketing', doneKey: 'pipeline.stepMarketingDesc', path: 'marketing' as const },
  { key: 'pipeline.stepWebsite', doneKey: 'pipeline.stepWebsiteDesc', path: 'website' as const },
]

export default function ShopPipelinePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()

  if (!id) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-slate-600 text-sm">{t('shopDetail.pipelineIntro')}</p>
      <p className="text-xs text-slate-500">{t('pipeline.staticHint')}</p>

      <ol className="space-y-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
        {steps.map((step, i) => (
          <li
            key={step.path}
            className={`flex gap-4 p-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/shops/${id}/${step.path}`}
                className="text-sm font-semibold text-slate-900 hover:text-primary"
              >
                {t(step.key)}
              </Link>
              <p className="text-xs text-slate-500 mt-1">{t(step.doneKey)}</p>
            </div>
            <Link
              to={`/shops/${id}/${step.path}`}
              className="shrink-0 text-xs font-medium text-primary hover:underline self-center"
            >
              →
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
