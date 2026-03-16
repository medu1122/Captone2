import { useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

export default function ShopPipelinePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      <p className="text-slate-600">
        {t('shopDetail.pipelineIntro')} <code className="text-xs bg-slate-200 px-1 rounded">{id}</code>
      </p>
      <div className="bg-white border border-slate-300 rounded-lg p-8 text-center text-slate-500">
        {t('shopDetail.placeholder')}
      </div>
    </div>
  )
}
