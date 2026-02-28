import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, Send, CheckCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase, type BettroiProject, type BettroiTransaction } from '../lib/supabase'

interface PendingItem {
  project: BettroiProject
  totalBilled: number
  totalReceived: number
  pending: number
  invoices: BettroiTransaction[]
  payments: BettroiTransaction[]
  lastInvoiceDate: string | null
  daysSinceInvoice: number | null
}

export const PendingPayments = () => {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'amount' | 'days'>('amount')

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      const { data: projects } = await supabase.from('bettroi_projects').select('*').order('name')
      const { data: transactions } = await supabase.from('bettroi_transactions').select('*').order('date', { ascending: false })

      if (!projects || !transactions) { setLoading(false); return }

      const items: PendingItem[] = []

      for (const project of projects) {
        const projectTxns = transactions.filter(t => t.project_id === project.id)
        
        const invoices = projectTxns.filter(t => t.type === 'bill_sent' || t.type === 'invoice')
        const payments = projectTxns.filter(t => t.type === 'payment_received' || t.type === 'advance' || t.type === 'by_hand')
        const credits = projectTxns.filter(t => t.type === 'credit_note' || t.type === 'refund')

        const totalBilled = invoices.reduce((sum, t) => sum + Number(t.amount), 0) + (project.total_value || 0)
        const totalReceived = payments.reduce((sum, t) => sum + Number(t.amount), 0)
        const totalCredits = credits.reduce((sum, t) => sum + Number(t.amount), 0)
        const pending = totalBilled - totalReceived - totalCredits

        if (pending <= 0) continue // Skip fully paid

        const lastInvoice = invoices.length > 0 ? invoices[0] : null
        const lastInvoiceDate = lastInvoice?.date || null
        const daysSinceInvoice = lastInvoiceDate 
          ? Math.floor((Date.now() - new Date(lastInvoiceDate).getTime()) / 86400000)
          : null

        items.push({
          project,
          totalBilled,
          totalReceived,
          pending,
          invoices,
          payments,
          lastInvoiceDate,
          daysSinceInvoice,
        })
      }

      // Sort
      items.sort((a, b) => sortBy === 'amount' ? b.pending - a.pending : (b.daysSinceInvoice || 0) - (a.daysSinceInvoice || 0))

      setPendingItems(items)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pendingItems.length > 0) {
      const sorted = [...pendingItems].sort((a, b) => 
        sortBy === 'amount' ? b.pending - a.pending : (b.daysSinceInvoice || 0) - (a.daysSinceInvoice || 0)
      )
      setPendingItems(sorted)
    }
  }, [sortBy])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
  }

  const getUrgencyColor = (days: number | null) => {
    if (!days) return 'text-slate-400'
    if (days > 60) return 'text-red-400'
    if (days > 30) return 'text-amber-400'
    if (days > 14) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  const getUrgencyBg = (days: number | null) => {
    if (!days) return 'bg-slate-800 border-slate-700'
    if (days > 60) return 'bg-red-950/30 border-red-800/50'
    if (days > 30) return 'bg-amber-950/30 border-amber-800/50'
    return 'bg-slate-800 border-slate-700'
  }

  const getUrgencyLabel = (days: number | null) => {
    if (!days) return { text: 'No Invoice', color: 'bg-slate-700 text-slate-300' }
    if (days > 60) return { text: '🔴 Overdue', color: 'bg-red-900/50 text-red-300 border border-red-700' }
    if (days > 30) return { text: '🟡 Follow Up', color: 'bg-amber-900/50 text-amber-300 border border-amber-700' }
    if (days > 14) return { text: '🟢 Normal', color: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' }
    return { text: '✅ Recent', color: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' }
  }

  const totalPending = pendingItems.reduce((sum, item) => sum + item.pending, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-400" />
            Pending Payments
          </h1>
          <p className="text-slate-400">Invoiced amounts awaiting payment</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'amount' | 'days')}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="amount">Sort by Amount</option>
            <option value="days">Sort by Age</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Pending</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Projects with Dues</p>
          <p className="text-2xl font-bold text-white mt-1">{pendingItems.length}</p>
        </div>
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5">
          <p className="text-xs text-red-400 uppercase tracking-wider">Overdue (&gt;60 days)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {formatCurrency(pendingItems.filter(i => (i.daysSinceInvoice || 0) > 60).reduce((s, i) => s + i.pending, 0))}
          </p>
        </div>
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-5">
          <p className="text-xs text-amber-400 uppercase tracking-wider">Follow Up (30-60d)</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {formatCurrency(pendingItems.filter(i => {const d = i.daysSinceInvoice || 0; return d > 30 && d <= 60}).reduce((s, i) => s + i.pending, 0))}
          </p>
        </div>
      </div>

      {/* Pending Items */}
      <div className="space-y-3">
        {pendingItems.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p className="text-lg font-medium text-white">All caught up!</p>
            <p className="text-slate-400 text-sm mt-1">No pending payments at the moment.</p>
          </div>
        ) : (
          pendingItems.map((item) => {
            const urgency = getUrgencyLabel(item.daysSinceInvoice)
            const isExpanded = expandedProject === item.project.id
            const progressPct = item.totalBilled > 0 ? Math.min(100, (item.totalReceived / item.totalBilled) * 100) : 0

            return (
              <div key={item.project.id} className={`rounded-xl border overflow-hidden ${getUrgencyBg(item.daysSinceInvoice)}`}>
                {/* Main Row */}
                <div 
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedProject(isExpanded ? null : item.project.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-white">{item.project.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${urgency.color}`}>
                        {urgency.text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.project.client_name || 'No client'} 
                      {item.lastInvoiceDate && ` • Last invoice: ${new Date(item.lastInvoiceDate).toLocaleDateString('en-IN')}`}
                      {item.daysSinceInvoice !== null && ` (${item.daysSinceInvoice} days ago)`}
                    </p>
                  </div>

                  {/* Amount Summary */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-amber-400">{formatCurrency(item.pending)}</p>
                    <p className="text-xs text-slate-400">
                      of {formatCurrency(item.totalBilled)} billed
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-24 flex-shrink-0 hidden sm:block">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-1">{Math.round(progressPct)}% paid</p>
                  </div>

                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-700 bg-slate-900/50 p-4 space-y-4">
                    {/* Payment Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Total Value / Billed</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(item.totalBilled)}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Received</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(item.totalReceived)}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Pending</p>
                        <p className="text-lg font-bold text-amber-400">{formatCurrency(item.pending)}</p>
                      </div>
                    </div>

                    {/* Invoice History */}
                    {item.invoices.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Send className="w-3 h-3" /> Invoices Sent
                        </h4>
                        <div className="space-y-1">
                          {item.invoices.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-800/50 rounded-lg text-sm">
                              <span className="text-slate-300">
                                {new Date(inv.date).toLocaleDateString('en-IN')}
                              </span>
                              <span className="text-yellow-400 font-medium">{formatCurrency(Number(inv.amount))}</span>
                              <span className="text-xs text-slate-500 truncate max-w-[200px]">{inv.notes || ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment History */}
                    {item.payments.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Payments Received
                        </h4>
                        <div className="space-y-1">
                          {item.payments.map(pay => (
                            <div key={pay.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-800/50 rounded-lg text-sm">
                              <span className="text-slate-300">
                                {new Date(pay.date).toLocaleDateString('en-IN')}
                              </span>
                              <span className="text-emerald-400 font-medium">{formatCurrency(Number(pay.amount))}</span>
                              <span className="text-xs text-slate-500 truncate max-w-[200px]">{pay.notes || ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {item.project.notes && (
                      <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3">
                        <span className="font-semibold text-slate-300">Notes:</span> {item.project.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
