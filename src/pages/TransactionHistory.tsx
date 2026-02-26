import { useEffect, useState } from 'react'
import { Filter, Search, Edit2, Trash2, Plus, CheckSquare, Square, ExternalLink } from 'lucide-react'
import { supabase, type BettroiTransaction, type BettroiProject } from '../lib/supabase'
import { EditModal, type FieldDefinition } from '../components/EditModal'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface TransactionWithProject extends BettroiTransaction {
  bettroi_projects: { name: string } | null
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<TransactionWithProject[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithProject[]>([])
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    project_id: '',
    type: '',
    date_from: '',
    date_to: '',
  })
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithProject | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionWithProject | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterAndSortTransactions()
  }, [transactions, searchTerm, filters, sortBy, sortOrder])

  const fetchData = async () => {
    try {
      // Fetch projects for filter dropdown
      const { data: projectsData } = await supabase
        .from('bettroi_projects')
        .select('*')
        .order('name')

      if (projectsData) {
        setProjects(projectsData)
      }

      await fetchTransactions()
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('bettroi_transactions')
        .select(`
          *,
          bettroi_projects(name)
        `)
        .order('date', { ascending: false })

      const { data } = await query
      setTransactions(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
    }
  }

  const filterAndSortTransactions = () => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.bettroi_projects?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesProject = !filters.project_id || transaction.project_id === filters.project_id
      const matchesType = !filters.type || transaction.type === filters.type
      const matchesDateFrom = !filters.date_from || transaction.date >= filters.date_from
      const matchesDateTo = !filters.date_to || transaction.date <= filters.date_to
      
      return matchesSearch && matchesProject && matchesType && matchesDateFrom && matchesDateTo
    })

    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      if (sortBy === 'date') {
        aVal = new Date(a.date).getTime()
        bVal = new Date(b.date).getTime()
      } else if (sortBy === 'amount') {
        aVal = a.amount
        bVal = b.amount
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    setFilteredTransactions(filtered)
  }

  const createTransaction = async (data: Record<string, any>) => {
    await supabase.from('bettroi_transactions').insert({
      project_id: data.project_id,
      date: data.date,
      type: data.type,
      amount: Number(data.amount) || 0,
      mode: data.mode,
      notes: data.notes,
      attachment_url: data.attachment_url
    })
    fetchTransactions()
  }

  const updateTransaction = async (data: Record<string, any>) => {
    await supabase.from('bettroi_transactions').update({
      project_id: data.project_id,
      date: data.date,
      type: data.type,
      amount: Number(data.amount) || 0,
      mode: data.mode,
      notes: data.notes,
      attachment_url: data.attachment_url
    }).eq('id', editingTransaction!.id)
    fetchTransactions()
  }

  const deleteTransaction = async () => {
    if (!deletingTransaction) return
    await supabase.from('bettroi_transactions').delete().eq('id', deletingTransaction.id)
    fetchTransactions()
  }

  const bulkDelete = async () => {
    const ids = Array.from(selectedTransactions)
    await supabase.from('bettroi_transactions').delete().in('id', ids)
    setSelectedTransactions(new Set())
    fetchTransactions()
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const clearFilters = () => {
    setFilters({
      project_id: '',
      type: '',
      date_from: '',
      date_to: '',
    })
    setSearchTerm('')
  }

  const toggleTransactionSelection = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const selectAllTransactions = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment_received':
      case 'advance':
      case 'by_hand':
        return 'text-green-400'
      case 'bill_sent':
      case 'invoice':
        return 'text-yellow-400'
      case 'credit_note':
        return 'text-blue-400'
      case 'refund':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const calculateRunningTotal = (index: number) => {
    let total = 0
    for (let i = filteredTransactions.length - 1; i >= index; i--) {
      const tx = filteredTransactions[i]
      if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
        total += Number(tx.amount)
      } else if (tx.type === 'bill_sent' || tx.type === 'invoice') {
        total -= Number(tx.amount)
      } else if (tx.type === 'credit_note') {
        total -= Number(tx.amount)
      } else if (tx.type === 'refund') {
        total -= Number(tx.amount)
      }
    }
    return total
  }

  const transactionFields: FieldDefinition[] = [
    { 
      name: 'project_id', 
      label: 'Project', 
      type: 'select', 
      required: true,
      options: projects.map(p => ({ value: p.id, label: p.name }))
    },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { 
      name: 'type', 
      label: 'Transaction Type', 
      type: 'select', 
      required: true,
      options: [
        { value: 'bill_sent', label: 'Bill Sent' },
        { value: 'payment_received', label: 'Payment Received' },
        { value: 'invoice', label: 'Invoice' },
        { value: 'advance', label: 'Advance' },
        { value: 'by_hand', label: 'By Hand' },
        { value: 'credit_note', label: 'Credit Note' },
        { value: 'refund', label: 'Refund' }
      ]
    },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, placeholder: '50000' },
    { 
      name: 'mode', 
      label: 'Payment Mode', 
      type: 'select',
      options: [
        { value: 'cash', label: 'Cash' },
        { value: 'bank', label: 'Bank Transfer' },
        { value: 'upi', label: 'UPI' },
        { value: 'by_hand', label: 'By Hand' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'other', label: 'Other' }
      ]
    },
    { name: 'attachment_url', label: 'Attachment URL', type: 'url', placeholder: 'https://drive.google.com/...' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Transaction details...', rows: 3 }
  ]

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
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-slate-400">Complete ledger of all financial transactions</p>
        </div>
        <div className="flex gap-3">
          {selectedTransactions.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedTransactions.size})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Search & Filters
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions or projects..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as any)
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount High-Low</option>
              <option value="amount-asc">Amount Low-High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-slate-300 mb-1">
              Project
            </label>
            <select
              id="project_id"
              name="project_id"
              value={filters.project_id}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-1">
              Type
            </label>
            <select
              id="type"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Types</option>
              <option value="payment_received">Payment Received</option>
              <option value="bill_sent">Bill Sent</option>
              <option value="invoice">Invoice</option>
              <option value="advance">Advance</option>
              <option value="by_hand">By Hand</option>
              <option value="credit_note">Credit Note</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-slate-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="date_from"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-slate-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="date_to"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={selectAllTransactions}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0 ? 
                      <CheckSquare className="w-4 h-4" /> : 
                      <Square className="w-4 h-4" />
                    }
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Running Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className="hover:bg-slate-700">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleTransactionSelection(transaction.id)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {selectedTransactions.has(transaction.id) ? 
                          <CheckSquare className="w-4 h-4 text-emerald-400" /> : 
                          <Square className="w-4 h-4" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(transaction.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                      {transaction.bettroi_projects?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getTypeColor(transaction.type)}`}>
                        {transaction.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className={getTypeColor(transaction.type)}>
                          {formatCurrency(Number(transaction.amount))}
                        </span>
                        {transaction.attachment_url && (
                          <a
                            href={transaction.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="View Attachment"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                      {transaction.mode?.toUpperCase() || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                      {formatCurrency(calculateRunningTotal(index))}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingTransaction(transaction)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTransaction(transaction)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    {searchTerm || Object.values(filters).some(f => f) ? 'No transactions match your filters' : 'No transactions found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      <EditModal
        isOpen={showAddForm || !!editingTransaction}
        onClose={() => {
          setShowAddForm(false)
          setEditingTransaction(null)
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
        fields={transactionFields}
        initialData={editingTransaction || { 
          date: new Date().toISOString().split('T')[0],
          type: 'payment_received'
        }}
        onSave={editingTransaction ? updateTransaction : createTransaction}
      />

      {/* Delete Transaction Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={deleteTransaction}
        title="Delete Transaction"
        message={`Are you sure you want to delete this ${deletingTransaction?.type} transaction of ${formatCurrency(Number(deletingTransaction?.amount || 0))}? This action cannot be undone.`}
        confirmText="Delete Transaction"
        type="danger"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={bulkDelete}
        title="Delete Transactions"
        message={`Are you sure you want to delete ${selectedTransactions.size} transactions? This action cannot be undone.`}
        confirmText="Delete All"
        type="danger"
      />
    </div>
  )
}