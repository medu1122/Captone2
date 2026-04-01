import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

type PageRow = { id: string; name: string; followers: number; score: number; avatarUrl?: string }
type PostRow = { id: string; pageId: string; title: string; text: string; image: string | null; reach: number; reactions: number; comments: number; shares: number; time: string }

const STORAGE_IMAGES = ['/icons/logo-aimap.png', '/icons/logo-aimap.png', '/icons/logo-aimap.png', '/icons/logo-aimap.png']

function CenterModal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'md' | 'lg'
}) {
  if (!open) return null
  const maxW = size === 'lg' ? 'max-w-4xl' : 'max-w-3xl'
  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 flex items-center justify-center">
      <div className={`w-full ${maxW} bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[90vh] flex flex-col`}>
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <button type="button" onClick={onClose} className="text-sm text-slate-600 hover:text-slate-900">Close</button>
        </div>
        <div className="p-4 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  )
}

function Avatar({ page }: { page: PageRow | null }) {
  if (!page) return <div className="h-10 w-10 rounded-full bg-slate-300" />
  if (page.avatarUrl) return <img src={page.avatarUrl} alt={page.name} className="h-10 w-10 rounded-full object-cover" />
  const initial = page.name.trim().charAt(0).toUpperCase() || 'F'
  return <div className="h-10 w-10 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{initial}</div>
}

export default function ShopMarketingFacebookWorkspacePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()

  const [pages, setPages] = useState<PageRow[]>([
    { id: '12345', name: 'AIMAP Coffee', followers: 13200, score: 78 },
    { id: '67890', name: 'AIMAP Tea', followers: 8300, score: 65 },
    { id: '11111', name: 'AIMAP Bakery', followers: 4100, score: 52 },
    { id: '22222', name: 'AIMAP Juice', followers: 9800, score: 71 },
    { id: '33333', name: 'AIMAP Bistro', followers: 2100, score: 44 },
    { id: '44444', name: 'AIMAP Roastery', followers: 15600, score: 82 },
  ])
  const [selectedPageId, setSelectedPageId] = useState('12345')
  const [writeText, setWriteText] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([
    { id: 'p1', pageId: '12345', title: 'Khuyến mãi cuối tuần', text: 'Ưu đãi 20% cho combo mới. Đặt ngay hôm nay.', image: null, reach: 12200, reactions: 870, comments: 123, shares: 27, time: '2h' },
    { id: 'p2', pageId: '12345', title: 'Combo mới', text: 'Thử combo mới.', image: null, reach: 5400, reactions: 120, comments: 18, shares: 5, time: '1d' },
    { id: 'p3', pageId: '12345', title: 'Mở cửa sớm', text: '7h sáng.', image: null, reach: 8900, reactions: 200, comments: 40, shares: 12, time: '3d' },
    { id: 'p4', pageId: '12345', title: 'Feedback khách', text: 'Cảm ơn bạn.', image: null, reach: 3200, reactions: 90, comments: 22, shares: 3, time: '4d' },
    { id: 'p5', pageId: '12345', title: 'Livestream tối nay', text: '20h.', image: null, reach: 15000, reactions: 400, comments: 80, shares: 30, time: '5d' },
    { id: 'p6', pageId: '12345', title: 'Menu tuần', text: 'Cập nhật menu.', image: null, reach: 6700, reactions: 150, comments: 25, shares: 8, time: '6d' },
  ])

  const [openConnect, setOpenConnect] = useState(false)
  const [openPageDetail, setOpenPageDetail] = useState(false)
  const [detailPage, setDetailPage] = useState<PageRow | null>(null)
  const [openDashboard, setOpenDashboard] = useState(false)
  const [openAiAssist, setOpenAiAssist] = useState(false)
  const [openImagePicker, setOpenImagePicker] = useState(false)
  const [openStats, setOpenStats] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [activePost, setActivePost] = useState<PostRow | null>(null)
  const [newPageName, setNewPageName] = useState('')
  const [newPageId, setNewPageId] = useState('')
  const [aiGuide, setAiGuide] = useState('')

  const selectedPage = pages.find((item) => item.id === selectedPageId) || null
  const postsByPage = useMemo(() => posts.filter((item) => item.pageId === selectedPageId), [posts, selectedPageId])

  if (!id) return null

  const addPage = () => {
    if (!newPageName.trim() || !newPageId.trim()) return
    const next: PageRow = { id: newPageId.trim(), name: newPageName.trim(), followers: 0, score: 0 }
    setPages((prev) => [next, ...prev]); setSelectedPageId(next.id); setNewPageName(''); setNewPageId(''); setOpenConnect(false)
  }
  const applyAi = () => { const hint = aiGuide.trim() || 'Văn phong rõ ràng, ngắn gọn, có CTA.'; setWriteText(`${writeText.trim()}\n\n${hint}\n#aimap #marketing`.trim()); setAiGuide(''); setOpenAiAssist(false) }
  const publishUiOnly = () => { if (!previewText.trim()) return; setPosts((prev) => [{ id: `post-${Date.now()}`, pageId: selectedPageId, title: previewText.slice(0, 36) || 'New post', text: previewText, image: previewImage, reach: 0, reactions: 0, comments: 0, shares: 0, time: 'Now' }, ...prev]) }
  const editActivePost = () => { if (!activePost) return; setPosts((prev) => prev.map((item) => (item.id === activePost.id ? activePost : item))); setOpenEdit(false) }
  const deleteActivePost = () => { if (!activePost) return; setPosts((prev) => prev.filter((item) => item.id !== activePost.id)); setOpenDelete(false) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('marketing.facebookWorkspaceTitle')}</h1>
        <Link to={`/shops/${id}/marketing`} className="text-sm text-primary hover:underline">{t('marketing.backToPlatforms')}</Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div><p className="text-sm font-semibold text-slate-900">{t('marketing.facebookPages')}</p><p className="text-xs text-slate-500">{pages.length} pages</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpenConnect(true)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50">{t('marketing.connectPage')}</button>
            <button type="button" onClick={() => setOpenDashboard(true)} className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">{t('marketing.viewPageDashboard')}</button>
          </div>
        </div>
        <div className="max-h-[12.5rem] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr className="text-slate-600">
                <th className="text-left px-3 py-2">{t('marketing.pageName')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pageId')}</th>
                <th className="text-left px-3 py-2">{t('marketing.followers')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pageScore')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pageDetailColumn')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pagePickColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{item.name}</td>
                  <td className="px-3 py-2 text-slate-500">{item.id}</td>
                  <td className="px-3 py-2 text-slate-700">{item.followers}</td>
                  <td className="px-3 py-2 text-slate-700">{item.score}/100</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailPage(item)
                        setOpenPageDetail(true)
                      }}
                      className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      {t('marketing.pageDetailBtn')}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPageId(item.id)}
                      className={`px-2 py-1 text-xs rounded-md border ${selectedPageId === item.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      {selectedPageId === item.id ? t('marketing.pageSelected') : t('marketing.pageSelect')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] gap-4 items-stretch">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 max-h-[420px] min-h-0 overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between mb-2"><p className="text-sm font-semibold text-slate-900">{t('marketing.writeContent')}</p><button type="button" onClick={() => setOpenAiAssist(true)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50">{t('marketing.aiAssist')}</button></div>
          <textarea value={writeText} onChange={(e) => setWriteText(e.target.value)} placeholder={t('marketing.writePlaceholder')} rows={8} className="w-full flex-1 min-h-0 max-h-full rounded-xl border border-slate-200 px-3 py-3 text-sm resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="hidden lg:flex items-center justify-center"><button type="button" onClick={() => setPreviewText(writeText)} title={t('marketing.sendToOverview')} className="h-11 w-11 rounded-full bg-slate-900 text-white text-lg hover:bg-slate-800">→</button></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 min-h-[420px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold text-slate-900">{t('marketing.overviewPost')}</p><button type="button" onClick={() => setPreviewText(writeText)} className="lg:hidden px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-white">{t('marketing.sendToOverview')}</button></div>
          <div className="rounded-xl border border-slate-300 bg-white min-h-0 h-full overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2"><Avatar page={selectedPage} /><div><p className="text-sm font-semibold text-slate-800">{selectedPage?.name || 'Facebook Page'}</p><p className="text-[11px] text-slate-500">Right now · Public</p></div></div><p className="text-slate-500">•••</p></div>
            <div className="px-3 py-2 max-h-40 overflow-auto"><p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-5">{previewText || t('marketing.overviewEmpty')}</p></div>
            <div className="px-3 pb-2">{previewImage ? <img src={previewImage} alt="preview" className="w-full h-44 object-cover rounded-lg border border-slate-200" /> : <button type="button" onClick={() => setOpenImagePicker(true)} className="w-full h-44 rounded-lg border-2 border-dashed border-slate-300 text-3xl text-slate-500 hover:bg-slate-100">+</button>}</div>
            <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between"><span>0 reactions</span><span>0 comments · 0 shares</span></div>
            <div className="grid grid-cols-3 border-t border-slate-100"><button type="button" className="py-2 text-xs text-slate-600 hover:bg-slate-50">Like</button><button type="button" className="py-2 text-xs text-slate-600 border-x border-slate-100 hover:bg-slate-50">Comment</button><button type="button" className="py-2 text-xs text-slate-600 hover:bg-slate-50">Share</button></div>
            <div className="px-3 py-2 border-t border-slate-100 flex justify-end"><button type="button" onClick={publishUiOnly} className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800">Publish (UI only)</button></div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold text-slate-900">{t('marketing.managerPosts')}</p><select value={selectedPageId} onChange={(e) => setSelectedPageId(e.target.value)} className="text-sm rounded-lg border border-slate-200 px-3 py-1.5">{pages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="max-h-[12.5rem] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm"><thead className="bg-slate-50 sticky top-0"><tr className="text-slate-600"><th className="text-left p-2">{t('marketing.postTitle')}</th><th className="text-left p-2">Reach</th><th className="text-left p-2">React</th><th className="text-left p-2">Comments</th><th className="text-left p-2">Shares</th><th className="text-left p-2">Time</th><th className="text-left p-2">{t('marketing.actions')}</th></tr></thead>
            <tbody>{postsByPage.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-2 text-slate-700">{item.title}</td><td className="p-2 text-slate-700">{item.reach}</td><td className="p-2 text-slate-700">{item.reactions}</td><td className="p-2 text-slate-700">{item.comments}</td><td className="p-2 text-slate-700">{item.shares}</td><td className="p-2 text-slate-700">{item.time}</td><td className="p-2"><div className="flex items-center gap-2"><button type="button" onClick={() => { setActivePost(item); setOpenStats(true) }} className="text-xs text-slate-700 hover:underline">View</button><button type="button" onClick={() => { setActivePost(item); setOpenEdit(true) }} className="text-xs text-slate-700 hover:underline">Edit</button><button type="button" onClick={() => { setActivePost(item); setOpenDelete(true) }} className="text-xs text-red-600 hover:underline">Delete</button></div></td></tr>)}
              {postsByPage.length === 0 && <tr><td colSpan={7} className="p-3 text-xs text-slate-400">{t('marketing.noPosts')}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <CenterModal open={openPageDetail} title={detailPage ? `${detailPage.name} · ${detailPage.id}` : ''} onClose={() => { setOpenPageDetail(false); setDetailPage(null) }} size="lg">
        {detailPage && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">{t('marketing.pageDetailChartsHint')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-700 mb-2">{t('marketing.chartReachMock')}</p>
                <div className="h-28 flex items-end gap-1.5">
                  {[42, 58, 48, 72, 55, 68, 62].map((h, i) => (
                    <div key={i} className="flex-1 min-w-0 rounded-t bg-blue-500/85" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-700 mb-2">{t('marketing.chartMixMock')}</p>
                <div className="space-y-2 pt-1">
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '62%' }} /></div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-amber-500" style={{ width: '38%' }} /></div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-violet-500" style={{ width: '24%' }} /></div>
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="h-20 w-20 rounded-full border-4 border-slate-200" style={{ background: 'conic-gradient(rgb(16 185 129) 0% 40%, rgb(245 158 11) 40% 72%, rgb(139 92 246) 72% 100%)' }} />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700 mb-1">{t('marketing.aiInsightTitle')}</p>
              <p className="text-sm text-slate-600">{t('marketing.aiInsightMock')}</p>
            </div>
          </div>
        )}
      </CenterModal>
      <CenterModal open={openConnect} title={t('marketing.connectPage')} onClose={() => setOpenConnect(false)}><div className="space-y-3"><input value={newPageName} onChange={(e) => setNewPageName(e.target.value)} placeholder={t('marketing.pageName')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><input value={newPageId} onChange={(e) => setNewPageId(e.target.value)} placeholder={t('marketing.pageId')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="flex justify-end"><button type="button" onClick={addPage} className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">{t('marketing.addPage')}</button></div></div></CenterModal>
      <CenterModal open={openDashboard} title={t('marketing.pageDashboard')} onClose={() => setOpenDashboard(false)}><div className="grid grid-cols-3 gap-3"><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">{t('marketing.followers')}</p><p className="text-lg font-semibold text-slate-900">{selectedPage?.followers ?? 0}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">{t('marketing.engagement')}</p><p className="text-lg font-semibold text-slate-900">{selectedPage?.score ?? 0}/100</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">{t('marketing.overall')}</p><p className="text-lg font-semibold text-slate-900">{(selectedPage?.score ?? 0) > 70 ? 'Good' : 'Average'}</p></div></div></CenterModal>
      <CenterModal open={openAiAssist} title={t('marketing.aiAssist')} onClose={() => setOpenAiAssist(false)}><div className="space-y-3"><textarea value={aiGuide} onChange={(e) => setAiGuide(e.target.value)} rows={4} placeholder={t('marketing.aiPromptPlaceholder')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="flex justify-end"><button type="button" onClick={applyAi} className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">{t('marketing.applyAi')}</button></div></div></CenterModal>
      <CenterModal open={openImagePicker} title={t('marketing.pickImage')} onClose={() => setOpenImagePicker(false)}><div className="grid grid-cols-4 gap-2">{STORAGE_IMAGES.map((img, index) => <button key={`${img}-${index}`} type="button" onClick={() => { setPreviewImage(img); setOpenImagePicker(false) }} className="rounded-lg overflow-hidden border border-slate-200"><img src={img} alt="storage" className="h-16 w-full object-cover" /></button>)}</div><div className="mt-3 flex justify-end"><Link to={`/shops/${id}/image-bot`} className="text-sm text-primary hover:underline">{t('marketing.useImageBot')}</Link></div></CenterModal>
      <CenterModal open={openStats} title={t('marketing.postStats')} onClose={() => setOpenStats(false)}><div className="grid grid-cols-4 gap-3"><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Reach</p><p className="text-lg font-semibold">{activePost?.reach ?? 0}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Reactions</p><p className="text-lg font-semibold">{activePost?.reactions ?? 0}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Comments</p><p className="text-lg font-semibold">{activePost?.comments ?? 0}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Shares</p><p className="text-lg font-semibold">{activePost?.shares ?? 0}</p></div></div></CenterModal>
      <CenterModal open={openEdit} title={t('marketing.editPost')} onClose={() => setOpenEdit(false)}><div className="space-y-3"><input value={activePost?.title || ''} onChange={(e) => setActivePost((prev) => (prev ? { ...prev, title: e.target.value } : prev))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><textarea value={activePost?.text || ''} onChange={(e) => setActivePost((prev) => (prev ? { ...prev, text: e.target.value } : prev))} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="flex justify-end"><button type="button" onClick={editActivePost} className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">{t('marketing.save')}</button></div></div></CenterModal>
      <CenterModal open={openDelete} title={t('marketing.deletePost')} onClose={() => setOpenDelete(false)}><p className="text-sm text-slate-700 mb-3">{t('marketing.deleteConfirm')}</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpenDelete(false)} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">{t('shopDetail.cancelEdit')}</button><button type="button" onClick={deleteActivePost} className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">{t('storage.delete')}</button></div></CenterModal>
    </div>
  )
}

