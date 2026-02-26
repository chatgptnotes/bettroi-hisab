import { useEffect, useState } from 'react'
import { FileText, Plus, Calendar, Check, X, Clock, Edit3 } from 'lucide-react'
import { supabase, type BettroiProject } from '../lib/supabase'

interface Quotation {
  id: string
  project_id: string
  quote_date: string
  amount: number
  description: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised'
  notes: string
  created_at: string
  bettroi_projects?: { name: string }
}

export const Quotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ project_id: '', quote_date: new Date().toISOString().split('T')[0], amount: '', description: '', status: 'sent', notes: '' })
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: q } = await supabase.from('bettroi_quotations').select('*, bettroi_projects(name)').order('quote_date', { ascending: false })
    const { data: p } = await supabase.from('bettroi_projects').select('*')
    setQuotations(q || [])
    setProjects(p || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('bettroi_quotations').insert({
      project_id: form.project_id || null,
      quote_date: form.quote_date,
      amount: Number(form.amount) || 0,
      description: form.description,
      status: form.status,
      notes: form.notes,
    })
    setForm({ project_id: '', quote_date: new Date().toISOString().split('T')[0], amount: '', description: '', status: 'sent', notes: '' })
    setShowForm(false)
    fetchData()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bettroi_quotations').update({ status }).eq('id', id)
    fetchData()
  }

  const formatCurrency = (n: number) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—'
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const statusConfig: Record<string, { bg: string, text: string, icon: any }> = {
    draft: { bg: 'bg-gray-100 text-gray-700', text: 'Draft', icon: Edit3 },
    sent: { bg: 'bg-blue-100 text-blue-700', text: 'Sent', icon: Clock },
    accepted: { bg: 'bg-emerald-100 text-emerald-700', text: 'Accepted', icon: Check },
    rejected: { bg: 'bg-red-100 text-red-700', text: 'Rejected', icon: X },
    revised: { bg: 'bg-amber-100 text-amber-700', text: 'Revised', icon: Edit3 },
  }

  const filtered = filter === 'all' ? quotations : quotations.filter(q => q.status === filter)

  const totalQuoted = quotations.reduce((sum, q) => sum + (q.amount || 0), 0)
  const totalAccepted = quotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.amount || 0), 0)
  const totalPending = quotations.filter(q => q.status === 'sent').reduce((sum, q) => sum + (q.amount || 0), 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quotations</h1>
          <p className="text-slate-400 text-sm mt-1">Track all quotes sent to Bettroi</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Quote
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Quoted</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalQuoted)}</p>
          <p className="text-xs text-slate-500 mt-1">{quotations.length} quotations</p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Accepted</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(totalAccepted)}</p>
          <p className="text-xs text-slate-500 mt-1">{quotations.filter(q => q.status === 'accepted').length} accepted</p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Pending Response</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-500 mt-1">{quotations.filter(q => q.status === 'sent').length} awaiting</p>
        </div>
      </div>

      {/* Add Quote Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Add New Quotation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Project</label>
              <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Quote Date *</label>
              <input type="date" required value={form.quote_date} onChange={e => setForm({ ...form, quote_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Amount (₹) *</label>
              <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="150000" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="revised">Revised</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Description</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. 4C Web Portal - Add-on features" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              placeholder="Any details..." className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">Save Quotation</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'sent', 'accepted', 'rejected', 'revised', 'draft'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            {f === 'all' ? `All (${quotations.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${quotations.filter(q => q.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Quotations List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No quotations found</p>
          </div>
        ) : filtered.map(q => {
          const sc = statusConfig[q.status] || statusConfig.draft
          const Icon = sc.icon
          return (
            <div key={q.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white font-semibold">{q.bettroi_projects?.name || 'Unlinked'}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg}`}>
                      <Icon className="w-3 h-3" /> {sc.text}
                    </span>
                  </div>
                  {q.description && <p className="text-slate-300 text-sm mt-1">{q.description}</p>}
                  {q.notes && <p className="text-slate-500 text-xs mt-1">{q.notes}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Quoted on {formatDate(q.quote_date)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-white">{formatCurrency(q.amount)}</p>
                  {q.status === 'sent' && (
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => updateStatus(q.id, 'accepted')} className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded hover:bg-emerald-600/30 transition-colors">✓ Accept</button>
                      <button onClick={() => updateStatus(q.id, 'rejected')} className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded hover:bg-red-600/30 transition-colors">✗ Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
