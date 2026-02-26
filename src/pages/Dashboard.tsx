import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  totalBilled: number
  totalReceived: number
  pendingReceivable: number
  projectsCount: number
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBilled: 0,
    totalReceived: 0,
    pendingReceivable: 0,
    projectsCount: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch projects
      const { data: projects } = await supabase
        .from('bettroi_projects')
        .select('*')

      // Fetch transactions with project names
      const { data: transactions } = await supabase
        .from('bettroi_transactions')
        .select(`
          *,
          bettroi_projects(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Calculate stats
      let totalBilled = 0
      let totalReceived = 0
      
      if (transactions) {
        transactions.forEach(tx => {
          if (tx.type === 'bill_sent' || tx.type === 'invoice') {
            totalBilled += Number(tx.amount)
          } else if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
            totalReceived += Number(tx.amount)
          }
        })
      }

      setStats({
        totalBilled,
        totalReceived,
        pendingReceivable: totalBilled - totalReceived,
        projectsCount: projects?.length || 0,
      })

      setRecentTransactions(transactions || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Financial overview of Bettroi projects</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Total Billed
                </dt>
                <dd className="text-lg font-medium text-white">
                  {formatCurrency(stats.totalBilled)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Total Received
                </dt>
                <dd className="text-lg font-medium text-white">
                  {formatCurrency(stats.totalReceived)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Pending Receivable
                </dt>
                <dd className="text-lg font-medium text-white">
                  {formatCurrency(stats.pendingReceivable)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Active Projects
                </dt>
                <dd className="text-lg font-medium text-white">
                  {stats.projectsCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <div key={transaction.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {transaction.bettroi_projects?.name || 'Unknown Project'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {transaction.type.replace('_', ' ').toUpperCase()} • {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    transaction.type === 'payment_received' || transaction.type === 'advance' || transaction.type === 'by_hand'
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}>
                    {formatCurrency(Number(transaction.amount))}
                  </p>
                  <p className="text-xs text-slate-400">
                    {transaction.mode?.toUpperCase() || 'N/A'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}