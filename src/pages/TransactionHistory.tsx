import { useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import { supabase, type BettroiTransaction, type BettroiProject } from '../lib/supabase'

interface TransactionWithProject extends BettroiTransaction {
  bettroi_projects: { name: string } | null
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<TransactionWithProject[]>([])
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    project_id: '',
    type: '',
    date_from: '',
    date_to: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [filters])

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

      // Apply filters
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.date_from) {
        query = query.gte('date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('date', filters.date_to)
      }

      const { data } = await query

      setTransactions(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
    }
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
      default:
        return 'text-slate-400'
    }
  }

  const calculateRunningTotal = (index: number) => {
    let total = 0
    for (let i = transactions.length - 1; i >= index; i--) {
      const tx = transactions[i]
      if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
        total += Number(tx.amount)
      } else if (tx.type === 'bill_sent' || tx.type === 'invoice') {
        total -= Number(tx.amount)
      }
    }
    return total
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-slate-400">Complete ledger of all financial transactions</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Clear All
          </button>
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
              className="block w-full rounded-md border-slate-600 bg-slate-700 text-white text-sm"
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
              className="block w-full rounded-md border-slate-600 bg-slate-700 text-white text-sm"
            >
              <option value="">All Types</option>
              <option value="payment_received">Payment Received</option>
              <option value="bill_sent">Bill Sent</option>
              <option value="invoice">Invoice</option>
              <option value="advance">Advance</option>
              <option value="by_hand">By Hand</option>
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
              className="block w-full rounded-md border-slate-600 bg-slate-700 text-white text-sm"
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
              className="block w-full rounded-md border-slate-600 bg-slate-700 text-white text-sm"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Running Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {transactions.length > 0 ? (
                transactions.map((transaction, index) => (
                  <tr key={transaction.id} className="hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {transaction.bettroi_projects?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={getTypeColor(transaction.type)}>
                        {transaction.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={getTypeColor(transaction.type)}>
                        {formatCurrency(Number(transaction.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {transaction.mode?.toUpperCase() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                      {formatCurrency(calculateRunningTotal(index))}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing {transactions.length} transactions
        </div>
      </div>
    </div>
  )
}