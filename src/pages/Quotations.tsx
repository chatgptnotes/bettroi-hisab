import { useEffect, useState } from 'react'
import {
  FileText, Plus, Check, X, Clock, Edit3, ExternalLink, Search,
  Edit2, Trash2, Copy, CheckSquare, Square, LayoutList, LayoutGrid,
  LayoutTemplate, ClipboardList, Save
} from 'lucide-react'
import { supabase, type BettroiProject, type BettroiQuotation } from '../lib/supabase'
import { QuotationModal } from '../components/QuotationModal'
import { ConfirmDialog } from '../components/ConfirmDialog'

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
  sent_to_bt:          { bg: 'bg-indigo-100 text-indigo-700',  text: 'Sent to BT',                    icon: Clock },
  bt_sent_to_client:   { bg: 'bg-blue-100 text-blue-700',      text: 'BT Sent to Client',              icon: Clock },
  client_accepted:     { bg: 'bg-emerald-100 text-emerald-700',text: 'Client Accepted – Go Ahead',     icon: Check },
  sent_to_bt_revision: { bg: 'bg-amber-100 text-amber-700',    text: 'Sent to BT – Needs Revision',   icon: Edit3 },
  draft:               { bg: 'bg-gray-100 text-gray-700',      text: 'Draft',                          icon: Edit3 },
  rejected_by_client:  { bg: 'bg-red-100 text-red-700',        text: 'Rejected by Client',             icon: X },
  on_hold:             { bg: 'bg-slate-100 text-slate-700',    text: 'On Hold',                        icon: Clock },
  client_revision:     { bg: 'bg-orange-100 text-orange-700',  text: 'Client Requested Revision',      icon: Edit3 },
  expired:             { bg: 'bg-rose-100 text-rose-700',      text: 'Quote Expired',                  icon: X },
  negotiating:         { bg: 'bg-purple-100 text-purple-700',  text: 'Under Negotiation',              icon: Clock },
  // legacy fallbacks
  sent:     { bg: 'bg-blue-100 text-blue-700',    text: 'Sent',     icon: Clock },
  accepted: { bg: 'bg-emerald-100 text-emerald-700', text: 'Accepted', icon: Check },
  rejected: { bg: 'bg-red-100 text-red-700',      text: 'Rejected', icon: X },
  revised:  { bg: 'bg-amber-100 text-amber-700',  text: 'Revised',  icon: Edit3 },
}

export const Quotations = () => {
  const [quotations, setQuotations] = useState<BettroiQuotation[]>([])
  const [filteredQuotations, setFilteredQuotations] = useState<BettroiQuotation[]>([])
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedQuotations, setSelectedQuotations] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<BettroiQuotation | null>(null)
  const [deletingQuotation, setDeletingQuotation] = useState<BettroiQuotation | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'pipeline'>(() => {
    return (localStorage.getItem('quotations-view') as 'list' | 'card' | 'pipeline') || 'list'
  })
  const [creatingWorkOrderFrom, setCreatingWorkOrderFrom] = useState<BettroiQuotation | null>(null)
  const [woTitle, setWoTitle] = useState('')
  const [woProjectId, setWoProjectId] = useState('')
  const [woAmount, setWoAmount] = useState('')
  const [woStatus, setWoStatus] = useState('active')
  const [woStartDate, setWoStartDate] = useState('')
  const [woDueDate, setWoDueDate] = useState('')
  const [woDescription, setWoDescription] = useState('')
  const [woNotes, setWoNotes] = useState('')
  const [woSaving, setWoSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    filterAndSortQuotations()
  }, [quotations, searchTerm, statusFilter, sortBy, sortOrder])

  useEffect(() => {
    localStorage.setItem('quotations-view', viewMode)
  }, [viewMode])

  const openCreateWorkOrder = (q: BettroiQuotation) => {
    setCreatingWorkOrderFrom(q)
    setWoTitle(q.bettroi_projects?.name ? `${q.bettroi_projects.name} – Work Order` : 'Work Order')
    setWoProjectId(q.project_id || '')
    setWoAmount(q.amount?.toString() || '')
    setWoStatus('active')
    setWoStartDate(new Date().toISOString().split('T')[0])
    setWoDueDate('')
    setWoDescription(q.description || '')
    setWoNotes(q.notes || '')
  }

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creatingWorkOrderFrom) return
    setWoSaving(true)
    try {
      await supabase.from('work_orders').insert({
        quotation_id: creatingWorkOrderFrom.id,
        project_id: woProjectId || null,
        title: woTitle,
        description: woDescription || null,
        amount: Number(woAmount) || 0,
        status: woStatus,
        start_date: woStartDate || null,
        due_date: woDueDate || null,
        notes: woNotes || null,
      })
      setCreatingWorkOrderFrom(null)
    } finally {
      setWoSaving(false)
    }
  }

  const daysAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return '1 day ago'
    return `${diff} days ago`
  }

  const fetchData = async () => {
    const { data: q } = await supabase.from('bettroi_quotations').select('*, bettroi_projects(name)').order('quote_date', { ascending: false })
    const { data: p } = await supabase.from('bettroi_projects').select('*')
    setQuotations(q || [])
    setProjects(p || [])
    setLoading(false)
  }

  const filterAndSortQuotations = () => {
    let filtered = quotations.filter(quotation => {
      const matchesSearch = quotation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (quotation.bettroi_projects?.name && quotation.bettroi_projects.name.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      if (sortBy === 'date') {
        aVal = new Date(a.quote_date).getTime()
        bVal = new Date(b.quote_date).getTime()
      } else if (sortBy === 'amount') {
        aVal = a.amount
        bVal = b.amount
      } else if (sortBy === 'status') {
        aVal = a.status.toLowerCase()
        bVal = b.status.toLowerCase()
      }
      if (sortOrder === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      else return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    })

    setFilteredQuotations(filtered)
  }

  const createQuotation = async (data: Record<string, any>) => {
    await supabase.from('bettroi_quotations').insert({
      project_id: data.project_id || null,
      quote_date: data.quote_date,
      amount: Number(data.amount) || 0,
      description: data.description,
      status: data.status,
      notes: data.notes,
      quote_url: data.quote_url
    })
    fetchData()
  }

  const updateQuotation = async (data: Record<string, any>) => {
    await supabase.from('bettroi_quotations').update({
      project_id: data.project_id || null,
      quote_date: data.quote_date,
      amount: Number(data.amount) || 0,
      description: data.description,
      status: data.status,
      notes: data.notes,
      quote_url: data.quote_url
    }).eq('id', editingQuotation!.id)
    fetchData()
  }

  const duplicateQuotation = async (original: BettroiQuotation) => {
    await supabase.from('bettroi_quotations').insert({
      project_id: original.project_id,
      quote_date: new Date().toISOString().split('T')[0],
      amount: original.amount,
      description: `${original.description} (Copy)`,
      status: 'draft',
      notes: original.notes,
      quote_url: original.quote_url
    })
    fetchData()
  }

  const deleteQuotation = async () => {
    if (!deletingQuotation) return
    await supabase.from('bettroi_quotations').delete().eq('id', deletingQuotation.id)
    fetchData()
  }

  const bulkDelete = async () => {
    const ids = Array.from(selectedQuotations)
    await supabase.from('bettroi_quotations').delete().in('id', ids)
    setSelectedQuotations(new Set())
    fetchData()
  }

  const toggleQuotationSelection = (quotationId: string) => {
    const newSelected = new Set(selectedQuotations)
    if (newSelected.has(quotationId)) {
      newSelected.delete(quotationId)
    } else {
      newSelected.add(quotationId)
    }
    setSelectedQuotations(newSelected)
  }

  const selectAllQuotations = () => {
    if (selectedQuotations.size === filteredQuotations.length) {
      setSelectedQuotations(new Set())
    } else {
      setSelectedQuotations(new Set(filteredQuotations.map(q => q.id)))
    }
  }

  const formatCurrency = (n: number) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—'
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  // Summary counts using new statuses
  const totalQuoted = quotations.reduce((sum, q) => sum + (q.amount || 0), 0)
  const totalAccepted = quotations.filter(q => q.status === 'client_accepted').reduce((sum, q) => sum + (q.amount || 0), 0)
  const totalPending = quotations.filter(q => q.status === 'bt_sent_to_client' || q.status === 'sent_to_bt').reduce((sum, q) => sum + (q.amount || 0), 0)
  const acceptedCount = quotations.filter(q => q.status === 'client_accepted').length
  const pendingCount = quotations.filter(q => q.status === 'bt_sent_to_client' || q.status === 'sent_to_bt').length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quotations</h1>
          <p className="text-gray-500 text-sm mt-1">Track all quotes sent to Bettroi</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-2 transition-colors ${viewMode === 'pipeline' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Pipeline view"
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
          </div>

          {selectedQuotations.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedQuotations.size})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Quote
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Quoted</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalQuoted)}</p>
          <p className="text-xs text-gray-400 mt-1">{quotations.length} quotations</p>
        </div>
        <div className="bg-white/80 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Client Accepted</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalAccepted)}</p>
          <p className="text-xs text-gray-400 mt-1">{acceptedCount} accepted</p>
        </div>
        <div className="bg-white/80 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Response</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingCount} awaiting</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quotations or projects..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="sent_to_bt">Sent to BT</option>
            <option value="bt_sent_to_client">BT Sent to Client</option>
            <option value="client_accepted">Client Accepted – Go Ahead</option>
            <option value="sent_to_bt_revision">Sent to BT – Needs Revision</option>
            <option value="draft">Draft</option>
            <option value="rejected_by_client">Rejected by Client</option>
            <option value="on_hold">On Hold</option>
            <option value="client_revision">Client Requested Revision</option>
            <option value="expired">Quote Expired</option>
            <option value="negotiating">Under Negotiation</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field as any)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount High-Low</option>
            <option value="amount-asc">Amount Low-High</option>
            <option value="status-asc">Status A-Z</option>
          </select>
        </div>
      </div>

      {/* ====== LIST VIEW ====== */}
      {viewMode === 'list' && (
        <div className="bg-white/80 border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={selectAllQuotations}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {selectedQuotations.size === filteredQuotations.length && filteredQuotations.length > 0 ?
                        <CheckSquare className="w-4 h-4" /> :
                        <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {searchTerm || statusFilter !== 'all' ? 'No quotations match your filters' : 'No quotations found'}
                      </p>
                    </td>
                  </tr>
                ) : filteredQuotations.map(q => {
                  const sc = statusConfig[q.status] || statusConfig.draft
                  const Icon = sc.icon
                  return (
                    <tr key={q.id} className="hover:bg-gray-100 transition-colors">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleQuotationSelection(q.id)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {selectedQuotations.has(q.id) ?
                            <CheckSquare className="w-4 h-4 text-emerald-500" /> :
                            <Square className="w-4 h-4" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-gray-900 font-semibold text-sm">{q.bettroi_projects?.name || 'Unlinked'}</h3>
                            {q.quote_url && (
                              <a
                                href={q.quote_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500 hover:text-emerald-700 transition-colors"
                                title="View Document"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {q.description && <p className="text-gray-600 text-sm mt-1">{q.description}</p>}
                          {q.notes && <p className="text-gray-400 text-xs mt-1">{q.notes}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg}`}>
                          <Icon className="w-3 h-3" /> {sc.text}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(q.amount)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-500">{formatDate(q.quote_date)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {q.status === 'client_accepted' && (
                            <button
                              onClick={() => openCreateWorkOrder(q)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors"
                              title="Create Work Order"
                            >
                              <ClipboardList className="w-3 h-3" /> WO
                            </button>
                          )}
                          <button
                            onClick={() => setEditingQuotation(q)}
                            className="text-emerald-500 hover:text-emerald-700 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duplicateQuotation(q)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingQuotation(q)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== CARD VIEW ====== */}
      {viewMode === 'card' && (
        <div>
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-16 bg-white/80 border border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' ? 'No quotations match your filters' : 'No quotations found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuotations.map(q => {
                const sc = statusConfig[q.status] || statusConfig.draft
                const Icon = sc.icon
                return (
                  <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    {/* Top: checkbox + project name */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => toggleQuotationSelection(q.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
                      >
                        {selectedQuotations.has(q.id) ?
                          <CheckSquare className="w-4 h-4 text-emerald-500" /> :
                          <Square className="w-4 h-4" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-bold text-sm truncate">
                          {q.bettroi_projects?.name || 'Unlinked'}
                        </h3>
                        {q.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{q.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(q.amount)}</p>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full w-fit ${sc.bg}`}>
                      <Icon className="w-3 h-3" /> {sc.text}
                    </span>

                    {/* Date */}
                    <p className="text-xs text-gray-400">{formatDate(q.quote_date)}</p>

                    {/* Quote URL */}
                    {q.quote_url && (
                      <a
                        href={q.quote_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors truncate"
                        title={q.quote_url}
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{q.quote_url}</span>
                      </a>
                    )}

                    {/* Added X days ago */}
                    <p className="text-xs text-gray-400">Added {daysAgo(q.quote_date)}</p>

                    {/* Create Work Order button for accepted quotes */}
                    {q.status === 'client_accepted' && (
                      <button
                        onClick={() => openCreateWorkOrder(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors w-full justify-center"
                      >
                        <ClipboardList className="w-3.5 h-3.5" /> Create Work Order
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => setEditingQuotation(q)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => duplicateQuotation(q)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" /> Duplicate
                      </button>
                      <button
                        onClick={() => setDeletingQuotation(q)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors ml-auto"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== PIPELINE VIEW ====== */}
      {viewMode === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {[
              { key: 'draft',               label: 'Draft',                      color: 'bg-gray-100 text-gray-700',    border: 'border-gray-300' },
              { key: 'sent_to_bt',          label: 'Sent to BT',                 color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-300' },
              { key: 'bt_sent_to_client',   label: 'BT Sent to Client',          color: 'bg-blue-100 text-blue-700',    border: 'border-blue-300' },
              { key: 'client_accepted',     label: 'Client Accepted',            color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300' },
              { key: 'sent_to_bt_revision', label: 'Needs Revision',             color: 'bg-amber-100 text-amber-700',  border: 'border-amber-300' },
              { key: 'negotiating',         label: 'Under Negotiation',          color: 'bg-purple-100 text-purple-700', border: 'border-purple-300' },
              { key: 'on_hold',             label: 'On Hold',                    color: 'bg-slate-100 text-slate-700',  border: 'border-slate-300' },
              { key: 'client_revision',     label: 'Client Revision',            color: 'bg-orange-100 text-orange-700', border: 'border-orange-300' },
              { key: 'rejected_by_client',  label: 'Rejected',                   color: 'bg-red-100 text-red-700',      border: 'border-red-300' },
              { key: 'expired',             label: 'Expired',                    color: 'bg-rose-100 text-rose-700',    border: 'border-rose-300' },
            ].map(col => {
              const colQuotations = filteredQuotations.filter(q => q.status === col.key)
              const colTotal = colQuotations.reduce((s, q) => s + (q.amount || 0), 0)
              return (
                <div key={col.key} className={`flex-shrink-0 w-56 bg-white border rounded-xl overflow-hidden ${col.border}`} style={{ minWidth: '220px' }}>
                  {/* Column header */}
                  <div className={`px-3 py-2 ${col.color} border-b ${col.border}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{col.label}</span>
                      <span className="text-xs font-bold bg-white bg-opacity-60 rounded-full px-1.5 py-0.5">
                        {colQuotations.length}
                      </span>
                    </div>
                    {colTotal > 0 && (
                      <p className="text-xs font-medium mt-0.5 opacity-80">
                        {formatCurrency(colTotal)}
                      </p>
                    )}
                  </div>
                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[120px]">
                    {colQuotations.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">Empty</p>
                    ) : colQuotations.map(q => (
                      <div key={q.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 hover:shadow-sm transition-shadow">
                        <p className="text-gray-900 font-semibold text-xs truncate">
                          {q.bettroi_projects?.name || 'Unlinked'}
                        </p>
                        {q.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{q.description}</p>
                        )}
                        <p className="text-gray-900 font-bold text-sm mt-1.5">{formatCurrency(q.amount)}</p>
                        <p className="text-gray-400 text-xs mt-1">{formatDate(q.quote_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Quotation Modal */}
      <QuotationModal
        isOpen={showAddForm || !!editingQuotation}
        onClose={() => {
          setShowAddForm(false)
          setEditingQuotation(null)
        }}
        title={editingQuotation ? 'Edit Quotation' : 'Add New Quotation'}
        projects={projects}
        initialData={editingQuotation || {
          quote_date: new Date().toISOString().split('T')[0],
          status: 'sent_to_bt'
        }}
        onSave={editingQuotation ? updateQuotation : createQuotation}
      />

      {/* Delete Quotation Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingQuotation}
        onClose={() => setDeletingQuotation(null)}
        onConfirm={deleteQuotation}
        title="Delete Quotation"
        message={`Are you sure you want to delete this quotation for "${deletingQuotation?.description}"? This action cannot be undone.`}
        confirmText="Delete Quotation"
        type="danger"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={bulkDelete}
        title="Delete Quotations"
        message={`Are you sure you want to delete ${selectedQuotations.size} quotations? This action cannot be undone.`}
        confirmText="Delete All"
        type="danger"
      />

      {/* Create Work Order Modal */}
      {creatingWorkOrderFrom && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setCreatingWorkOrderFrom(null)} />
            <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create Work Order</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    From quotation: {creatingWorkOrderFrom.description || creatingWorkOrderFrom.bettroi_projects?.name}
                  </p>
                </div>
                <button onClick={() => setCreatingWorkOrderFrom(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWorkOrder} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={woTitle}
                    onChange={e => setWoTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Project</label>
                    <select
                      value={woProjectId}
                      onChange={e => setWoProjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">No project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Status</label>
                    <select
                      value={woStatus}
                      onChange={e => setWoStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="active">Active</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Amount (INR)</label>
                  <input
                    type="number"
                    value={woAmount}
                    onChange={e => setWoAmount(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={woStartDate}
                      onChange={e => setWoStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={woDueDate}
                      onChange={e => setWoDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Description</label>
                  <textarea
                    value={woDescription}
                    onChange={e => setWoDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={woNotes}
                    onChange={e => setWoNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={woSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {woSaving ? 'Creating...' : 'Create Work Order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingWorkOrderFrom(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
