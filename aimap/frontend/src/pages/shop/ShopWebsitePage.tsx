import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

export default function ShopWebsitePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const [selectedWeb, setSelectedWeb] = useState('v1')
  const [prompt, setPrompt] = useState('')

  if (!id) return null

  // Mock data for analytics
  const metrics = [
    { label: 'Doanh thu', value: '$4,532', change: '+12%', color: 'text-emerald-600' },
    { label: 'Lượt xem trang', value: '12.4k', change: '+5.2%', color: 'text-blue-600' },
    { label: 'Tỷ lệ thoát', value: '34.2%', change: '-2.1%', color: 'text-orange-600' },
    { label: 'Thời gian phiên', value: '2m 45s', change: '+15s', color: 'text-violet-600' },
  ]

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website của Shop</h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
        {/* LEFT: DASHBOARD ANALYTICS */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Dashboard Website</h2>
                <p className="text-xs text-slate-400 mt-1">Dữ liệu thời gian thực cho trang web của bạn</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Chọn Website</span>
                  <select
                    value={selectedWeb}
                    onChange={(e) => setSelectedWeb(e.target.value)}
                    className="text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all cursor-pointer"
                  >
                    <option value="v1">Website Chính (v1.0)</option>
                    <option value="v2">Bản nháp Sự kiện (v1.1)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MOCK CHARTS */}
            <div className="grid grid-cols-2 gap-10 mb-10">
              <div className="flex flex-col items-center group cursor-default">
                <div className="relative h-44 w-44 group-hover:scale-105 transition-transform duration-500">
                  {/* SVG Pie Chart Mockup */}
                  <svg viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-sm">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f8fafc" strokeWidth="18" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="18" strokeDasharray="180 251.2" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray="70 251.2" strokeDashoffset="-180" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray="1.2 251.2" strokeDashoffset="-250" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Traffic</span>
                    <span className="text-sm font-bold text-slate-700">72%</span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Nguồn truy cập</p>
                  <div className="flex gap-2 mt-2 justify-center">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <div className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center group cursor-default">
                <div className="relative h-44 w-44 group-hover:scale-105 transition-transform duration-500">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-sm">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f8fafc" strokeWidth="18" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="18" strokeDasharray="120 251.2" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" strokeWidth="18" strokeDasharray="131.2 251.2" strokeDashoffset="-120" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Users</span>
                    <span className="text-sm font-bold text-slate-700">48%</span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Nhân khẩu học</p>
                  <div className="flex gap-2 mt-2 justify-center">
                     <div className="w-2 h-2 rounded-full bg-violet-500" />
                     <div className="w-2 h-2 rounded-full bg-pink-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all duration-300">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</p>
                  <div className="flex items-end justify-between">
                    <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
                    <span className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                      {m.change.startsWith('+') ? '↑' : '↓'} {m.change}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.color.replace('text-', 'bg-')}`} style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end">
               <button className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                 <span>Xem Website</span>
                 <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
               </button>
            </div>
          </div>
        </div>

        {/* RIGHT: WEBSITE PREVIEW & EDITOR */}
        <div className="flex flex-col bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative group/preview">
          {/* Browser-like Toolbar */}
          <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-400 flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">🔒</span>
                <span>dsdsa.captone2.site</span>
              </div>
              <button className="hover:text-slate-600 transition-colors">↻</button>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="flex-1 p-10 flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
            {/* Mock website content elements */}
            <div className="w-full max-w-lg aspect-video bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 p-8 flex flex-col gap-6 relative z-10 animate-in zoom-in-95 duration-700">
               <div className="flex justify-between items-center">
                 <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner">🏢</div>
                 <div className="flex gap-4">
                    <div className="w-16 h-2 bg-slate-100 rounded-full" />
                    <div className="w-16 h-2 bg-slate-100 rounded-full" />
                 </div>
               </div>
               <div className="flex-1 bg-slate-50 rounded-2xl flex items-center justify-center text-6xl opacity-20 shadow-inner">
                 🖼️
               </div>
               <div className="flex justify-center items-center gap-8 mt-4">
                 <div className="flex flex-col items-center gap-3">
                   <div className="text-5xl hover:scale-110 transition-transform cursor-default">💻</div>
                   <div className="w-16 h-1.5 bg-slate-100 rounded-full" />
                 </div>
                 <div className="text-4xl text-slate-200 font-light">→</div>
                 <div className="flex flex-col items-center gap-3">
                   <div className="text-5xl hover:scale-110 transition-transform cursor-default">📱</div>
                   <div className="w-16 h-1.5 bg-slate-100 rounded-full" />
                 </div>
                 <div className="text-4xl text-slate-200 font-light">→</div>
                 <div className="text-5xl hover:scale-110 transition-transform cursor-default">🌐</div>
               </div>
            </div>
            
            {/* Decoration Elements */}
            <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-blue-100/30 blur-3xl -z-0" />
            <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-emerald-100/30 blur-3xl -z-0" />
          </div>

          {/* Prompt Editor Panel (Floating) */}
          <div className="absolute bottom-8 right-8 w-80 bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] p-5 z-20 transition-all duration-300 hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-900 animate-pulse" />
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">AI Assistant</p>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Nhập yêu cầu chỉnh sửa giao diện..."
              className="w-full h-28 rounded-2xl border-none bg-slate-100/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-slate-900/5 placeholder:text-slate-400 font-medium transition-all"
            />
            <div className="mt-4 flex justify-end">
              <button 
                className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20"
              >
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
