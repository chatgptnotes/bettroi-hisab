import { useEffect, useState } from 'react'
import { FileText, Plus, Check, X, Clock, Edit3, ExternalLink, Search, Edit2, Trash2, Copy, CheckSquare, Square } from 'lucide-react'
import { supabase, type BettroiProject, type BettroiQuotation } from '../lib/supabase'
import { EditModal, type FieldDefinition } from '../components/EditModal'
import { ConfirmDialog } from '../components/ConfirmDialog'

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

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    filterAndSortQuotations()
  }, [quotations, searchTerm, statusFilter, sortBy, sortOrder])

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

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
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

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bettroi_quotations').update({ status }).eq('id', id)
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

  const statusConfig: Record<string, { bg: string, text: string, icon: any }> = {
    draft: { bg: 'bg-gray-100 text-gray-700', text: 'Draft', icon: Edit3 },
    sent: { bg: 'bg-blue-100 text-blue-700', text: 'Sent', icon: Clock },
    accepted: { bg: 'bg-emerald-100 text-emerald-700', text: 'Accepted', icon: Check },
    rejected: { bg: 'bg-red-100 text-red-700', text: 'Rejected', icon: X },
    revised: { bg: 'bg-amber-100 text-amber-700', text: 'Revised', icon: Edit3 },
  }

  const totalQuoted = quotations.reduce((sum, q) => sum + (q.amount || 0), 0)
  const totalAccepted = quotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.amount || 0), 0)
  const totalPending = quotations.filter(q => q.status === 'sent').reduce((sum, q) => sum + (q.amount || 0), 0)

  const quotationFields: FieldDefinition[] = [
    { 
      name: 'project_id', 
      label: 'Project', 
      type: 'select',
      options: [
        { value: '', label: 'No project linked' },
        ...projects.map(p => ({ value: p.id, label: p.name }))
      ]
    },
    { name: 'quote_date', label: 'Quote Date', type: 'date', required: true },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, placeholder: '150000' },
    { name: 'description', label: 'Description', type: 'text', required: true, placeholder: 'e.g. 4C Web Portal - Add-on features' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'revised', label: 'Revised' }
      ]
    },
    { name: 'quote_url', label: 'Quotation Document URL', type: 'url', placeholder: 'https://drive.google.com/...' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any additional notes...', rows: 3 }
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quotations</h1>
          <p className="text-gray-500 text-sm mt-1">Track all quotes sent to Bettroi</p>
        </div>
        <div className="flex gap-3">
          {selectedQuotations.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-gray-900 rounded-xl text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedQuotations.size})
            </button>
          )}
          <button 
            onClick={() => setShowAddForm(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-gray-900 rounded-xl text-sm font-medium transition-colors"
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
          <p className="text-xs text-gray-500 uppercase tracking-wide">Accepted</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(totalAccepted)}</p>
          <p className="text-xs text-gray-400 mt-1">{quotations.filter(q => q.status === 'accepted').length} accepted</p>
        </div>
        <div className="bg-white/80 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Response</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">{quotations.filter(q => q.status === 'sent').length} awaiting</p>
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
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="revised">Revised</option>
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

      {/* Quotations Table */}
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
                          <CheckSquare className="w-4 h-4 text-emerald-400" /> : 
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
                              className="text-emerald-400 hover:text-emerald-700 transition-colors"
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
                      {q.status === 'sent' && (
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => updateStatus(q.id, 'accepted')} className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded hover:bg-emerald-600/30 transition-colors">✓ Accept</button>
                          <button onClick={() => updateStatus(q.id, 'rejected')} className="px-2 py-1 bg-red-600/20 text-red-600 text-xs rounded hover:bg-red-600/30 transition-colors">✗ Reject</button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(q.amount)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500">{formatDate(q.quote_date)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingQuotation(q)}
                          className="text-emerald-400 hover:text-emerald-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateQuotation(q)}
                          className="text-blue-400 hover:text-blue-700 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingQuotation(q)}
                          className="text-red-600 hover:text-red-700 transition-colors"
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

      {/* Add/Edit Quotation Modal */}
      <EditModal
        isOpen={showAddForm || !!editingQuotation}
        onClose={() => {
          setShowAddForm(false)
          setEditingQuotation(null)
        }}
        title={editingQuotation ? 'Edit Quotation' : 'Add New Quotation'}
        fields={quotationFields}
        initialData={editingQuotation || { 
          quote_date: new Date().toISOString().split('T')[0], 
          status: 'sent' 
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
    </div>
  )
}