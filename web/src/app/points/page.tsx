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
}

interface PointEntry {
  _id: string
  points: number
  createdAt: string
  entryType?: 'category' | 'bonus'
  child?: { _id: string; name: string }
  category?: { _id: string; name: string }
}

interface PendingPointEntry {
  childId: string
  categoryId?: string
  entryType: 'category' | 'bonus'
  points: number
}

interface PointsDashboard {
  class: ClassItem
  cycle: PointCycle | null
  categories: Category[]
  leaderboard: LeaderboardChild[]
  bonusByChild?: Record<string, number>
  recentEntries: PointEntry[]
}

const roleCanUsePoints = (role?: string) =>
  role === 'admin' || role === 'serviceLeader' || role === 'classTeacher' || role === 'servant'

const formatDate = (date?: string) => {
  if (!date) return '--'
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(date))
}

const getLastFridayInput = () => {
  const date = new Date()
  const daysSinceFriday = (date.getDay() + 2) % 7
  date.setDate(date.getDate() - daysSinceFriday)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isFridayInput = (value: string) => {
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && date.getDay() === 5
}

export default function PointsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [dashboard, setDashboard] = useState<PointsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingEntries, setPendingEntries] = useState<PendingPointEntry[]>([])

  const isSupervisor = user?.role === 'admin' || user?.role === 'serviceLeader'

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    setSelectedDate(getLastFridayInput())
  }, [])

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
    if (!selectedClassId || !selectedDate) return
    setLoading(true)
    const response = await pointsAPI.getDashboard(selectedClassId, selectedDate)
    if (response.success) setDashboard(response.data)
    else toast.error(response.error)
    setLoading(false)
  }, [selectedClassId, selectedDate])

  useEffect(() => {
    if (isAuthenticated && user && roleCanUsePoints(user.role)) loadClasses()
  }, [isAuthenticated, user, loadClasses])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const savedStatusByKey = useMemo(() => {
    const statuses: Record<string, number> = {}
    dashboard?.recentEntries.forEach((entry) => {
      const childId = entry.child?._id
      const categoryId = entry.category?._id
      if (!childId || !categoryId) return
      const key = `${childId}:${categoryId}`
      // The API returns newest entries first. Keep the newest status if old
      // duplicate records exist from the previous multi-point behavior.
      if (statuses[key] === undefined) statuses[key] = entry.points > 0 ? 1 : -1
    })
    return statuses
  }, [dashboard?.recentEntries])

  const pendingStatusByKey = useMemo(() => {
    return pendingEntries.reduce<Record<string, number>>((statuses, entry) => {
      if (entry.entryType !== 'category' || !entry.categoryId) return statuses
      statuses[`${entry.childId}:${entry.categoryId}`] = entry.points
      return statuses
    }, {})
  }, [pendingEntries])

  const pendingBonusByChild = useMemo(() => {
    return pendingEntries.reduce<Record<string, number>>((bonuses, entry) => {
      if (entry.entryType !== 'bonus') return bonuses
      bonuses[entry.childId] = (bonuses[entry.childId] || 0) + entry.points
      return bonuses
    }, {})
  }, [pendingEntries])

  const getPointStatus = (childId: string, categoryId: string) =>
    pendingStatusByKey[`${childId}:${categoryId}`] ?? savedStatusByKey[`${childId}:${categoryId}`] ?? 0

  const pendingScoreByChild = useMemo(() => {
    return pendingEntries.reduce<Record<string, number>>((scores, entry) => {
      if (entry.entryType === 'bonus') {
        scores[entry.childId] = (scores[entry.childId] || 0) + entry.points
        return scores
      }
      if (!entry.categoryId) return scores
      const key = `${entry.childId}:${entry.categoryId}`
      scores[entry.childId] = (scores[entry.childId] || 0) + entry.points - (savedStatusByKey[key] || 0)
      return scores
    }, {})
  }, [pendingEntries, savedStatusByKey])

  const getBonusScore = (childId: string) =>
    (dashboard?.bonusByChild?.[childId] || 0) + (pendingBonusByChild[childId] || 0)

  const displayLeaderboard = useMemo(() => {
    if (!dashboard) return []
    return dashboard.leaderboard
      .map((child) => ({
        ...child,
        pending: pendingScoreByChild[child._id] || 0,
        score: child.score + (pendingScoreByChild[child._id] || 0),
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ar'))
  }, [dashboard, pendingScoreByChild])

  const pendingSummary = useMemo(() => {
    const childNames = new Map((dashboard?.leaderboard || []).map((child) => [child._id, child.name]))
    const categoryNames = new Map((dashboard?.categories || []).map((category) => [category._id, category.name]))
    const items = pendingEntries.map((entry, index) => {
      const key = entry.categoryId ? `${entry.childId}:${entry.categoryId}` : ''
      const savedStatus = entry.entryType === 'bonus' ? 0 : (savedStatusByKey[key] || 0)
      return {
        ...entry,
        index,
        savedStatus,
        delta: entry.entryType === 'bonus' ? entry.points : entry.points - savedStatus,
        childName: childNames.get(entry.childId) || 'طفل غير معروف',
        categoryName: entry.entryType === 'bonus' ? 'بونص' : (categoryNames.get(entry.categoryId || '') || 'بند غير معروف'),
      }
    })
    return {
      additions: items.reduce((total, item) => total + (item.delta > 0 ? item.delta : 0), 0),
      deductions: items.reduce((total, item) => total + (item.delta < 0 ? Math.abs(item.delta) : 0), 0),
      net: items.reduce((total, item) => total + item.delta, 0),
      items,
    }
  }, [dashboard, pendingEntries, savedStatusByKey])

  const queueEntry = (child: LeaderboardChild, category: Category, points: number) => {
    const key = `${child._id}:${category._id}`
    const savedStatus = savedStatusByKey[key] || 0
    setPendingEntries((current) => {
      // Pressing the same state twice does not add another point.
      if (points === savedStatus) return current.filter((entry) => `${entry.childId}:${entry.categoryId}` !== key)
      const nextEntry: PendingPointEntry = { childId: child._id, categoryId: category._id, entryType: 'category', points }
      const existingIndex = current.findIndex((entry) => entry.entryType === 'category' && `${entry.childId}:${entry.categoryId}` === key)
      if (existingIndex === -1) return [...current, nextEntry]
      return current.map((entry, index) => index === existingIndex ? nextEntry : entry)
    })
  }

  const queueBonus = (child: LeaderboardChild, points: number) => {
    setPendingEntries((current) => {
      const existingIndex = current.findIndex((entry) => entry.entryType === 'bonus' && entry.childId === child._id)
      const existing = existingIndex === -1 ? 0 : current[existingIndex].points
      const nextPoints = existing + points
      if (nextPoints === 0) return current.filter((_, index) => index !== existingIndex)
      const nextEntry: PendingPointEntry = { childId: child._id, entryType: 'bonus', points: nextPoints }
      if (existingIndex === -1) return [...current, nextEntry]
      return current.map((entry, index) => index === existingIndex ? nextEntry : entry)
    })
  }

  const removePendingEntry = (index: number) => {
    setPendingEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
  }

  const savePendingEntries = async () => {
    if (!pendingEntries.length || !selectedClassId || !selectedDate) return
    setSaving(true)
    const response = await pointsAPI.addEntriesBatch({
      classId: selectedClassId,
      date: selectedDate,
      entries: pendingEntries,
    })
    if (response.success) {
      setPendingEntries([])
      toast.success(response.message || 'تم حفظ كل النقاط بنجاح')
      await loadDashboard()
    } else {
      toast.error(response.error)
    }
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
      toast.success(response.message || 'تم تصفير الدورة، وستبدأ الجديدة مع أول نقطة')
      await loadDashboard()
    } else toast.error(response.error)
    setSaving(false)
  }

  const handleDateChange = (value: string) => {
    if (value && !isFridayInput(value)) {
      toast.error('نظام النقاط مخصص ليوم الجمعة فقط')
      return
    }
    if (pendingEntries.length && !window.confirm('هناك نقاط لم يتم حفظها. تغيير التاريخ سيحذف التعديلات المعلقة. هل تريد المتابعة؟')) return
    setPendingEntries([])
    setSelectedDate(value)
  }

  const handleClassChange = (value: string) => {
    if (pendingEntries.length && !window.confirm('هناك نقاط لم يتم حفظها. تغيير الفصل سيحذف التعديلات المعلقة. هل تريد المتابعة؟')) return
    setPendingEntries([])
    setSelectedClassId(value)
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
                <span className="text-sm font-bold tracking-wide">تحفيز الأطفال • دورة ٤ جمعات</span>
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
                    onChange={(event) => handleClassChange(event.target.value)}
                    className="max-w-[180px] border-0 bg-transparent font-bold text-white outline-none [color-scheme:dark]"
                    aria-label="اختيار الفصل"
                  >
                    {classes.map((item) => <option className="text-gray-900" key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                  <ChevronDownIcon className="h-4 w-4" />
                </label>
              )}
              <label className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm backdrop-blur">
                <span className="text-teal-50/80">التاريخ</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="w-[142px] border-0 bg-transparent font-bold text-white outline-none [color-scheme:dark]"
                  aria-label="اختيار تاريخ تسجيل النقاط"
                />
              </label>
              <button
                type="button"
                onClick={() => handleDateChange(getLastFridayInput())}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                آخر جمعة
              </button>
              <button
                type="button"
                onClick={savePendingEntries}
                disabled={saving || !pendingEntries.length}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-extrabold text-[#103d38] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckBadgeIcon className="h-5 w-5" />
                حفظ الكل{pendingEntries.length ? ` (${pendingEntries.length})` : ''}
              </button>
              <button
                onClick={resetCycle}
                disabled={saving || !dashboard?.cycle}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-[#163747] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowPathIcon className="h-5 w-5" />
                بدء دورة جديدة
              </button>
            </div>
          </div>
          <div className="relative mt-7 flex flex-wrap gap-3 text-xs font-bold text-teal-50/80">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{dashboard?.class?.name || 'جاري تحميل الفصل'}</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{dashboard?.cycle ? `بدأت الدورة ${formatDate(dashboard.cycle.startedAt)}` : 'لم تبدأ الدورة بعد'}</span>
            <span className="rounded-full bg-amber-300/20 px-3 py-1.5 text-amber-100">التسجيل ليوم {formatDate(selectedDate)}</span>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center"><LoadingSpinner size="lg" /></div>
        ) : dashboard ? (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={<UserGroupIcon />} label="أطفال الفصل" value={dashboard.leaderboard.length} tone="blue" />
              <StatCard icon={<FireIcon />} label="إجمالي النقاط" value={displayLeaderboard.reduce((sum, child) => sum + child.score, 0)} tone="orange" />
              <StatCard icon={<CheckBadgeIcon />} label="بنود التقييم" value={dashboard.categories.length} tone="green" />
              <StatCard icon={<GiftIcon />} label="المتصدر" value={displayLeaderboard[0]?.score || 0} detail={displayLeaderboard[0]?.name || 'لم يبدأ التسجيل'} tone="purple" />
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">ترتيب الأطفال</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">اضغط + أو − لكل الأطفال، ثم احفظ كل الحركات مرة واحدة. البونص يتجمع مع كل ضغطة.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <TrophyIcon className="h-4 w-4" /> أعلى نقاط يفوز بالجائزة
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">أخضر +1</span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">أحمر -1</span>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">بونص متجمع</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">لم يسجل</span>
                  </div>
                </div>

                {displayLeaderboard.length === 0 ? (
                  <div className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">لا يوجد أطفال نشطون في هذا الفصل.</div>
                ) : (
                  <>
                  {pendingEntries.length > 0 && (
                    <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200 sm:mx-7">
                      <span>هناك {pendingEntries.length} حركة معلقة لم تُحفظ بعد.</span>
                      <button type="button" onClick={() => setPendingEntries([])} className="shrink-0 text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100">مسح التعديلات</button>
                    </div>
                  )}
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {displayLeaderboard.map((child, index) => (
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
                              <div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, child.score) / Math.max(1, (displayLeaderboard[0]?.score || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <div className="min-w-[58px] text-center">
                            <span className="block text-xl font-black text-slate-900 dark:text-slate-100">{child.score}</span>
                            {child.pending !== 0 && <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-300">{child.pending > 0 ? '+' : ''}{child.pending} غير محفوظ</span>}
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">نقطة</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 pr-12 sm:pr-12">
                          {dashboard.categories.map((category) => {
                            const status = getPointStatus(child._id, category._id)
                            const isPending = pendingStatusByKey[`${child._id}:${category._id}`] !== undefined
                            return (
                            <div key={category._id} className={`inline-flex items-center overflow-hidden rounded-xl border shadow-sm ${status > 0 ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30' : status < 0 ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'} ${isPending ? 'ring-2 ring-amber-300/70 dark:ring-amber-600/60' : ''}`}>
                              <button
                                onClick={() => queueEntry(child, category, -1)}
                                disabled={saving}
                                title={`خصم نقطة: ${category.name}`}
                                className={`flex h-8 w-8 items-center justify-center transition disabled:opacity-50 ${status < 0 ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40'}`}
                              ><ArrowDownIcon className="h-4 w-4" /></button>
                              <span className={`max-w-[110px] truncate border-x px-2 text-xs font-bold ${status > 0 ? 'border-emerald-200 text-emerald-800 dark:border-emerald-700 dark:text-emerald-200' : status < 0 ? 'border-rose-200 text-rose-800 dark:border-rose-700 dark:text-rose-200' : 'border-slate-100 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{category.name}</span>
                              <button
                                onClick={() => queueEntry(child, category, 1)}
                                disabled={saving}
                                title={`إضافة نقطة: ${category.name}`}
                                className={`flex h-8 w-8 items-center justify-center transition disabled:opacity-50 ${status > 0 ? 'bg-emerald-500 text-white' : 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
                              ><ArrowUpIcon className="h-4 w-4" /></button>
                            </div>
                            )
                          })}
                          <div className={`inline-flex items-center overflow-hidden rounded-xl border shadow-sm ${getBonusScore(child._id) > 0 ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/30' : getBonusScore(child._id) < 0 ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'} ${pendingBonusByChild[child._id] !== undefined ? 'ring-2 ring-amber-300/70 dark:ring-amber-600/60' : ''}`}>
                            <button
                              onClick={() => queueBonus(child, -1)}
                              disabled={saving}
                              title="خصم نقطة بونص"
                              className={`flex h-8 w-8 items-center justify-center transition disabled:opacity-50 ${getBonusScore(child._id) < 0 ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40'}`}
                            ><ArrowDownIcon className="h-4 w-4" /></button>
                            <span className={`border-x px-2 text-xs font-black ${getBonusScore(child._id) !== 0 ? 'border-violet-200 text-violet-800 dark:border-violet-700 dark:text-violet-200' : 'border-slate-100 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>بونص {getBonusScore(child._id) > 0 ? '+' : ''}{getBonusScore(child._id)}</span>
                            <button
                              onClick={() => queueBonus(child, 1)}
                              disabled={saving}
                              title="إضافة نقطة بونص"
                              className={`flex h-8 w-8 items-center justify-center transition disabled:opacity-50 ${getBonusScore(child._id) > 0 ? 'bg-violet-500 text-white' : 'text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40'}`}
                            ><ArrowUpIcon className="h-4 w-4" /></button>
                          </div>
                          {dashboard.categories.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">أضف بنودًا من لوحة البنود لبدء التسجيل.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </section>

              <aside className="space-y-6">
                {pendingEntries.length > 0 && (
                  <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-800/60 dark:from-amber-950/40 dark:to-slate-900">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckBadgeIcon className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                          <h2 className="font-black text-amber-950 dark:text-amber-100">عداد التعديلات</h2>
                        </div>
                        <p className="mt-1 text-xs font-bold text-amber-700/80 dark:text-amber-300/80">التغييرات التي ستُحفظ معًا</p>
                      </div>
                      <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-black text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">{pendingEntries.length}</span>
                    </div>
                    <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white/80 px-2 py-2 dark:bg-slate-900/70"><span className="block text-lg font-black text-emerald-600 dark:text-emerald-300">+{pendingSummary.additions}</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">إضافة</span></div>
                      <div className="rounded-2xl bg-white/80 px-2 py-2 dark:bg-slate-900/70"><span className="block text-lg font-black text-rose-600 dark:text-rose-300">-{pendingSummary.deductions}</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">خصم</span></div>
                      <div className="rounded-2xl bg-white/80 px-2 py-2 dark:bg-slate-900/70"><span className="block text-lg font-black text-slate-800 dark:text-slate-100">{pendingSummary.net > 0 ? '+' : ''}{pendingSummary.net}</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">الصافي</span></div>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pl-1">
                      {pendingSummary.items.slice().reverse().map((item) => (
                        <div key={`${item.index}-${item.childId}-${item.categoryId}`} className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2.5 dark:bg-slate-900/70">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.delta > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'}`}>
                            {item.delta > 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{item.childName}</p>
                            <p className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.entryType === 'bonus' ? `${item.categoryName} • ${item.points > 0 ? '+' : ''}${item.points}` : `${item.categoryName} • الحالة ${item.points > 0 ? '+1' : '-1'}`}</p>
                          </div>
                          <span className={`text-sm font-black ${item.delta > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`} title="التغيير الفعلي في الإجمالي">{item.delta > 0 ? '+' : ''}{item.delta}</span>
                          <button type="button" onClick={() => removePendingEntry(item.index)} className="text-slate-400 transition hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-300" title="تراجع عن الحركة" aria-label={`التراجع عن حركة ${item.childName}`}><XMarkIcon className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
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
                  <div className="mb-4 flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5 text-indigo-500" /><h2 className="font-black text-slate-900 dark:text-slate-100">حركات {formatDate(selectedDate)}</h2></div>
                  <div className="space-y-3">
                    {dashboard.recentEntries.slice(0, 6).map((entry) => (
                      <div key={entry._id} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${entry.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {entry.points > 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-700 dark:text-slate-200">{entry.child?.name || 'طفل'} • {entry.entryType === 'bonus' ? 'بونص' : (entry.category?.name || 'بند')}</p><p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(entry.createdAt)}</p></div>
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
