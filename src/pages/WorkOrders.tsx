/*
 * WorkOrders page
 *
 * Required Supabase table (run this SQL in your Supabase SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS work_orders (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   quotation_id uuid REFERENCES bettroi_quotations(id),
 *   project_id uuid REFERENCES bettroi_projects(id),
 *   title text NOT NULL,
 *   description text,
 *   amount numeric DEFAULT 0,
 *   status text DEFAULT 'active' CHECK (status IN ('active','in_progress','completed','cancelled','on_hold')),
 *   start_date date,
 *   due_date date,
 *   notes text,
 *   created_at timestamptz DEFAULT now()
 * );
 */

import { useEffect, useState } from 'react'
import {
  ClipboardList, Plus, X, Save, Edit2, Trash2,
  LayoutList, LayoutGrid, ExternalLink, Calendar
} from 'lucide-react'
import { supabase, type BettroiProject } from '../lib/supabase'

interface WorkOrder {
  id: string
  quotation_id?: string
  project_id?: string
  title: string
  description?: string
  amount: number
  status: 'active' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  start_date?: string
  due_date?: string
  notes?: string
  created_at: string
  bettroi_projects?: { name: string }
  bettroi_quotations?: { description: string }
}

const statusConfig: Record<string, { bg: string; label: string }> = {
  active:      { bg: 'bg-blue-100 text-blue-700',    label: 'Active' },
  in_progress: { bg: 'bg-indigo-100 text-indigo-700', label: 'In Progress' },
  completed:   { bg: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
  cancelled:   { bg: 'bg-red-100 text-red-700',      label: 'Cancelled' },
  on_hold:     { bg: 'bg-amber-100 text-amber-700',  label: 'On Hold' },
}

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS work_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid REFERENCES bettroi_quotations(id),
  project_id uuid REFERENCES bettroi_projects(id),
  title text NOT NULL,
  description text,
  amount numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','in_progress','completed','cancelled','on_hold')),
  start_date date,
  due_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);`

// ─── Work Order Modal ──────────────────────────────────────────────────────────
const WorkOrderModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  projects,
  title: modalTitle,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<WorkOrder>) => Promise<void>
  initialData: Partial<WorkOrder> | null
  projects: BettroiProject[]
  title: string
}) => {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<WorkOrder['status']>('active')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '')
      setProjectId(initialData?.project_id || '')
      setAmount(initialData?.amount?.toString() || '')
      setStatus(initialData?.status || 'active')
      setStartDate(initialData?.start_date || '')
      setDueDate(initialData?.due_date || '')
      setDescription(initialData?.description || '')
      setNotes(initialData?.notes || '')
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        title,
        project_id: projectId || undefined,
        amount: Number(amount) || 0,
        status,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        description: description || undefined,
        notes: notes || undefined,
        quotation_id: initialData?.quotation_id,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{modalTitle}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="e.g. API Integration Work Order"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Project</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
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
                  value={status}
                  onChange={e => setStatus(e.target.value as WorkOrder['status'])}
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
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Scope and details of the work order..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Work Order'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const WorkOrders = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<WorkOrder | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('work-orders-view') as 'card' | 'list') || 'card'
  })

  useEffect(() => { fetchData() }, [])
  useEffect(() => { localStorage.setItem('work-orders-view', viewMode) }, [viewMode])

  const fetchData = async () => {
    setLoading(true)
    const { data: wo, error } = await supabase
      .from('work_orders')
      .select('*, bettroi_projects(name), bettroi_quotations(description)')
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setTableError(true)
      }
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from('bettroi_projects').select('*')
    setWorkOrders(wo || [])
    setProjects(p || [])
    setTableError(false)
    setLoading(false)
  }

  const handleSave = async (data: Partial<WorkOrder>) => {
    if (editingOrder) {
      await supabase.from('work_orders').update({
        title: data.title,
        project_id: data.project_id || null,
        amount: data.amount,
        status: data.status,
        start_date: data.start_date || null,
        due_date: data.due_date || null,
        description: data.description || null,
        notes: data.notes || null,
      }).eq('id', editingOrder.id)
    } else {
      await supabase.from('work_orders').insert({
        title: data.title,
        project_id: data.project_id || null,
        quotation_id: data.quotation_id || null,
        amount: data.amount,
        status: data.status,
        start_date: data.start_date || null,
        due_date: data.due_date || null,
        description: data.description || null,
        notes: data.notes || null,
      })
    }
    setEditingOrder(null)
    fetchData()
  }

  const handleDelete = async () => {
    if (!deletingOrder) return
    await supabase.from('work_orders').delete().eq('id', deletingOrder.id)
    setDeletingOrder(null)
    fetchData()
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const totalActive = workOrders.filter(w => w.status === 'active' || w.status === 'in_progress').length
  const totalValue = workOrders.reduce((s, w) => s + (w.amount || 0), 0)
  const totalCompleted = workOrders.filter(w => w.status === 'completed').length

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
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Active work orders from accepted quotations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => { setEditingOrder(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        </div>
      </div>

      {/* Table not set up */}
      {tableError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-amber-800 font-semibold mb-2">Table not set up yet</h3>
          <p className="text-amber-700 text-sm mb-4">
            The <code className="bg-amber-100 px-1 rounded">work_orders</code> table doesn't exist yet. Run this SQL in your Supabase SQL editor:
          </p>
          <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {SETUP_SQL}
          </pre>
        </div>
      )}

      {!tableError && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Active</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{totalActive}</p>
              <p className="text-xs text-gray-400 mt-1">active + in progress</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-gray-400 mt-1">{workOrders.length} work orders</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{totalCompleted}</p>
              <p className="text-xs text-gray-400 mt-1">delivered</p>
            </div>
          </div>

          {/* ====== CARD VIEW ====== */}
          {viewMode === 'card' && (
            <>
              {workOrders.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No work orders yet.</p>
                  <button
                    onClick={() => { setEditingOrder(null); setShowModal(true) }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Create first work order
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workOrders.map(wo => {
                    const sc = statusConfig[wo.status] || statusConfig.active
                    return (
                      <div key={wo.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-gray-900 font-bold text-sm truncate">{wo.title}</h3>
                            {wo.bettroi_projects?.name && (
                              <p className="text-gray-500 text-xs mt-0.5">{wo.bettroi_projects.name}</p>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${sc.bg}`}>
                            {sc.label}
                          </span>
                        </div>

                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(wo.amount)}</p>

                        {wo.description && (
                          <p className="text-gray-500 text-xs line-clamp-2">{wo.description}</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {wo.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Start: {formatDate(wo.start_date)}
                            </span>
                          )}
                          {wo.due_date && (
                            <span className="flex items-center gap-1">
                              Due: {formatDate(wo.due_date)}
                            </span>
                          )}
                        </div>

                        {wo.bettroi_quotations?.description && (
                          <div className="flex items-center gap-1 text-xs text-indigo-600">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">From quotation: {wo.bettroi_quotations.description}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                          <button
                            onClick={() => { setEditingOrder(wo); setShowModal(true) }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingOrder(wo)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors ml-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ====== LIST VIEW ====== */}
          {viewMode === 'list' && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">No work orders yet.</td>
                      </tr>
                    ) : workOrders.map(wo => {
                      const sc = statusConfig[wo.status] || statusConfig.active
                      return (
                        <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-gray-900 font-semibold text-sm">{wo.title}</p>
                              {wo.bettroi_projects?.name && (
                                <p className="text-gray-500 text-xs mt-0.5">{wo.bettroi_projects.name}</p>
                              )}
                              {wo.description && (
                                <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{wo.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(wo.amount)}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-500 space-y-0.5">
                              {wo.start_date && <p>Start: {formatDate(wo.start_date)}</p>}
                              {wo.due_date && <p>Due: {formatDate(wo.due_date)}</p>}
                              {!wo.start_date && !wo.due_date && <span className="text-gray-300">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setEditingOrder(wo); setShowModal(true) }}
                                className="text-emerald-500 hover:text-emerald-700 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingOrder(wo)}
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
        </>
      )}

      {/* Add/Edit Modal */}
      <WorkOrderModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingOrder(null) }}
        onSave={handleSave}
        initialData={editingOrder}
        projects={projects}
        title={editingOrder ? 'Edit Work Order' : 'New Work Order'}
      />

      {/* Delete Confirm */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeletingOrder(null)} />
            <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-gray-900 font-semibold mb-2">Delete Work Order</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete "<strong>{deletingOrder.title}</strong>"? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
