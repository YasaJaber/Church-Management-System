'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  FireIcon,
  GiftIcon,
  PencilSquareIcon,
  PlusIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import PageBackButton from '@/components/ui/PageBackButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContextSimple'
import { classesAPI, pointsAPI } from '@/services/api'

interface ClassItem {
  _id: string
  name: string
  grade?: string
}

interface Category {
  _id: string
  name: string
}

interface LeaderboardChild {
  _id: string
  name: string
  score: number
  image?: string | null
}

interface PointCycle {
  _id: string
  startedAt: string
  endsAt: string
}

interface PointEntry {
  _id: string
  points: number
  createdAt: string
  child?: { _id: string; name: string }
  category?: { _id: string; name: string }
}

interface PointsDashboard {
  class: ClassItem
  cycle: PointCycle
  categories: Category[]
  leaderboard: LeaderboardChild[]
  recentEntries: PointEntry[]
}

const roleCanUsePoints = (role?: string) =>
  role === 'admin' || role === 'serviceLeader' || role === 'classTeacher' || role === 'servant'

const formatDate = (date?: string) => {
  if (!date) return '--'
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(date))
}

export default function PointsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [dashboard, setDashboard] = useState<PointsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingName, setEditingName] = useState('')

  const isSupervisor = user?.role === 'admin' || user?.role === 'serviceLeader'

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isLoading && isAuthenticated && !roleCanUsePoints(user?.role)) {
      toast.error('ليس لديك صلاحية للوصول إلى نظام النقاط')
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router, user?.role])

  const loadClasses = useCallback(async () => {
    const response = await classesAPI.getAllClasses()
    if (!response.success || !response.data?.length) {
      toast.error(response.error || 'لا توجد فصول متاحة')
      return
    }

    const filtered = (response.data as ClassItem[]).filter((item) => {
      const name = item.name.toLowerCase()
      return !name.includes('تجريبي') && !name.includes('اختبار') && !name.includes('test')
    })
    setClasses(filtered)
    const assignedId = user?.assignedClass?._id
    setSelectedClassId(isSupervisor ? filtered[0]?._id || '' : assignedId || filtered[0]?._id || '')
  }, [isSupervisor, user?.assignedClass?._id])

  const loadDashboard = useCallback(async () => {
    if (!selectedClassId) return
    setLoading(true)
    const response = await pointsAPI.getDashboard(selectedClassId)
    if (response.success) setDashboard(response.data)
    else toast.error(response.error)
    setLoading(false)
  }, [selectedClassId])

  useEffect(() => {
    if (isAuthenticated && user && roleCanUsePoints(user.role)) loadClasses()
  }, [isAuthenticated, user, loadClasses])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const daysLeft = useMemo(() => {
    if (!dashboard?.cycle?.endsAt) return 0
    return Math.max(0, Math.ceil((new Date(dashboard.cycle.endsAt).getTime() - Date.now()) / 86400000))
  }, [dashboard?.cycle?.endsAt])

  const addEntry = async (child: LeaderboardChild, category: Category, points: number) => {
    setSaving(true)
    const response = await pointsAPI.addEntry({
      classId: selectedClassId,
      childId: child._id,
      categoryId: category._id,
      points,
    })
    if (response.success) {
      toast.success(`${points > 0 ? 'تمت إضافة' : 'تم خصم'} ${Math.abs(points)} نقطة لـ ${child.name}`)
      await loadDashboard()
    } else toast.error(response.error)
    setSaving(false)
  }

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newCategory.trim()) return
    setSaving(true)
    const response = await pointsAPI.addCategory(selectedClassId, newCategory.trim())
    if (response.success) {
      setNewCategory('')
      toast.success('تمت إضافة بند النقاط')
      await loadDashboard()
    } else toast.error(response.error)
    setSaving(false)
  }

  const saveCategoryName = async () => {
    if (!editingCategory || !editingName.trim()) return
    setSaving(true)
    const response = await pointsAPI.renameCategory(editingCategory._id, editingName.trim())
    if (response.success) {
      setEditingCategory(null)
      toast.success('تم تعديل اسم البند')
      await loadDashboard()
    } else toast.error(response.error)
    setSaving(false)
  }

  const archiveCategory = async (category: Category) => {
    if (!window.confirm(`إخفاء بند «${category.name}» من الجدول؟`)) return
    setSaving(true)
    const response = await pointsAPI.archiveCategory(category._id)
    if (response.success) {
      toast.success('تم إخفاء البند')
      await loadDashboard()
    } else toast.error(response.error)
    setSaving(false)
  }

  const resetCycle = async () => {
    if (!window.confirm('سيتم حفظ الدورة الحالية كسجل وبدء دورة جديدة بنقاط صفر. هل تريد المتابعة؟')) return
    setSaving(true)
    const response = await pointsAPI.resetCycle(selectedClassId)
    if (response.success) {
      toast.success('بدأت دورة نقاط جديدة')
      await loadDashboard()
    } else toast.error(response.error)
    setSaving(false)
  }

  if (isLoading || (!isAuthenticated && loading)) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-6 text-right transition-colors duration-300 dark:bg-[#0b1420] sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <PageBackButton className="mb-5" />

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#132b3f] via-[#174a55] to-[#1c766e] px-6 py-8 text-white shadow-xl shadow-teal-950/10 sm:px-9">
          <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-7rem] right-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-amber-200">
                <TrophyIcon className="h-5 w-5" />
                <span className="text-sm font-bold tracking-wide">تحفيز الأطفال • دورة ٤ أسابيع</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">نظام النقاط</h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-teal-50/80">
                سجّل السلوكيات الإيجابية بسهولة، تابع ترتيب أطفال الفصل، واختَر صاحب أعلى نقاط في نهاية الدورة.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isSupervisor && (
                <label className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm backdrop-blur">
                  <span className="text-teal-50/80">الفصل</span>
                  <select
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="max-w-[180px] border-0 bg-transparent font-bold text-white outline-none [color-scheme:dark]"
                    aria-label="اختيار الفصل"
                  >
                    {classes.map((item) => <option className="text-gray-900" key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                  <ChevronDownIcon className="h-4 w-4" />
                </label>
              )}
              <button
                onClick={resetCycle}
                disabled={saving || !dashboard}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-[#163747] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowPathIcon className="h-5 w-5" />
                بدء دورة جديدة
              </button>
            </div>
          </div>
          <div className="relative mt-7 flex flex-wrap gap-3 text-xs font-bold text-teal-50/80">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{dashboard?.class?.name || 'جاري تحميل الفصل'}</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">تبدأ {formatDate(dashboard?.cycle?.startedAt)}</span>
            <span className="rounded-full bg-amber-300/20 px-3 py-1.5 text-amber-100">متبقي {daysLeft} يوم</span>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center"><LoadingSpinner size="lg" /></div>
        ) : dashboard ? (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={<UserGroupIcon />} label="أطفال الفصل" value={dashboard.leaderboard.length} tone="blue" />
              <StatCard icon={<FireIcon />} label="إجمالي النقاط" value={dashboard.leaderboard.reduce((sum, child) => sum + child.score, 0)} tone="orange" />
              <StatCard icon={<CheckBadgeIcon />} label="بنود التقييم" value={dashboard.categories.length} tone="green" />
              <StatCard icon={<GiftIcon />} label="المتصدر" value={dashboard.leaderboard[0]?.score || 0} detail={dashboard.leaderboard[0]?.name || 'لم يبدأ التسجيل'} tone="purple" />
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">ترتيب الأطفال</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">اضغط + أو − بجوار البند لتسجيل الحركة فورًا.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <TrophyIcon className="h-4 w-4" /> أعلى نقاط يفوز بالجائزة
                  </div>
                </div>

                {dashboard.leaderboard.length === 0 ? (
                  <div className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">لا يوجد أطفال نشطون في هذا الفصل.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {dashboard.leaderboard.map((child, index) => (
                      <div key={child._id} className="group px-4 py-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/70 sm:px-7">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${index === 0 && child.score > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {index < 3 && child.score > 0 ? <TrophyIcon className="h-5 w-5" /> : index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-extrabold text-slate-900 dark:text-slate-100">{child.name}</p>
                              {index === 0 && child.score > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">المتصدر</span>}
                            </div>
                            <div className="mt-1 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, child.score) / Math.max(1, (dashboard.leaderboard[0]?.score || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <div className="min-w-[58px] text-center">
                            <span className="block text-xl font-black text-slate-900 dark:text-slate-100">{child.score}</span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">نقطة</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 pr-12 sm:pr-12">
                          {dashboard.categories.map((category) => (
                            <div key={category._id} className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                              <button
                                onClick={() => addEntry(child, category, -1)}
                                disabled={saving}
                                title={`خصم نقطة: ${category.name}`}
                                className="flex h-8 w-8 items-center justify-center text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-50"
                              ><ArrowDownIcon className="h-4 w-4" /></button>
                              <span className="max-w-[110px] truncate border-x border-slate-100 px-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">{category.name}</span>
                              <button
                                onClick={() => addEntry(child, category, 1)}
                                disabled={saving}
                                title={`إضافة نقطة: ${category.name}`}
                                className="flex h-8 w-8 items-center justify-center text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                              ><ArrowUpIcon className="h-4 w-4" /></button>
                            </div>
                          ))}
                          {dashboard.categories.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">أضف بنودًا من لوحة البنود لبدء التسجيل.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cog6ToothIcon className="h-5 w-5 text-teal-600" />
                      <h2 className="font-black text-slate-900 dark:text-slate-100">بنود النقاط</h2>
                    </div>
                    <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{dashboard.categories.length} بنود</span>
                  </div>
                  <form onSubmit={addCategory} className="mb-4 flex gap-2">
                    <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="مثال: حضور القداس" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-teal-900/40" aria-label="اسم بند نقاط جديد" />
                    <button disabled={saving || !newCategory.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50" title="إضافة بند"><PlusIcon className="h-5 w-5" /></button>
                  </form>
                  <div className="space-y-2">
                    {dashboard.categories.map((category) => (
                      <div key={category._id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                        <span className="h-2 w-2 rounded-full bg-teal-500" />
                        {editingCategory?._id === category._id ? (
                          <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && saveCategoryName()} className="min-w-0 flex-1 rounded-lg border border-teal-300 bg-white px-2 py-1 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100" />
                        ) : <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700 dark:text-slate-200">{category.name}</span>}
                        {editingCategory?._id === category._id ? (
                          <><button onClick={saveCategoryName} className="text-emerald-600" title="حفظ"><CheckBadgeIcon className="h-5 w-5" /></button><button onClick={() => setEditingCategory(null)} className="text-slate-400" title="إلغاء"><XMarkIcon className="h-5 w-5" /></button></>
                        ) : (
                          <><button onClick={() => { setEditingCategory(category); setEditingName(category.name) }} className="text-slate-400 transition hover:text-teal-600" title="تعديل"><PencilSquareIcon className="h-4 w-4" /></button><button onClick={() => archiveCategory(category)} className="text-slate-400 transition hover:text-rose-600" title="إخفاء البند"><XMarkIcon className="h-4 w-4" /></button></>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-400 dark:text-slate-500">كل بند له زر إضافة وزر خصم بجوار كل طفل، ويمكنك إضافة أي سلوك يناسب الفصل.</p>
                </section>

                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5 text-indigo-500" /><h2 className="font-black text-slate-900 dark:text-slate-100">آخر الحركات</h2></div>
                  <div className="space-y-3">
                    {dashboard.recentEntries.slice(0, 6).map((entry) => (
                      <div key={entry._id} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${entry.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {entry.points > 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-700 dark:text-slate-200">{entry.child?.name || 'طفل'} • {entry.category?.name || 'بند'}</p><p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(entry.createdAt)}</p></div>
                        <span className={`text-sm font-black ${entry.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.points > 0 ? '+' : ''}{entry.points}</span>
                      </div>
                    ))}
                    {dashboard.recentEntries.length === 0 && <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">لا توجد حركات مسجلة بعد.</p>}
                  </div>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number; detail?: string; tone: 'blue' | 'orange' | 'green' | 'purple' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    purple: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  }
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 sm:p-5"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-400 dark:text-slate-500">{label}</p><p className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>{detail && <p className="truncate text-xs font-bold text-violet-600 dark:text-violet-300">{detail}</p>}</div></div></div>
}
