import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { supabase, type BettroiProject, type BettroiTransaction, type BettroiMilestone, type BettroiActionItem } from '../lib/supabase'

interface ProjectDetailData {
  project: BettroiProject | null
  transactions: (BettroiTransaction & { bettroi_projects: { name: string } | null })[]
  milestones: BettroiMilestone[]
  actionItems: BettroiActionItem[]
  totalReceived: number
  totalBilled: number
  balance: number
}

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ProjectDetailData>({
    project: null,
    transactions: [],
    milestones: [],
    actionItems: [],
    totalReceived: 0,
    totalBilled: 0,
    balance: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchProjectDetail(id)
    }
  }, [id])

  const fetchProjectDetail = async (projectId: string) => {
    try {
      // Fetch project details
      const { data: project } = await supabase
        .from('bettroi_projects')
        .select('*')
        .eq('id', projectId)
        .single()

      // Fetch transactions
      const { data: transactions } = await supabase
        .from('bettroi_transactions')
        .select(`
          *,
          bettroi_projects(name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      // Fetch milestones
      const { data: milestones } = await supabase
        .from('bettroi_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      // Fetch action items
      const { data: actionItems } = await supabase
        .from('bettroi_action_items')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })

      // Calculate totals
      let totalReceived = 0
      let totalBilled = 0

      if (transactions) {
        transactions.forEach(tx => {
          if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
            totalReceived += Number(tx.amount)
          } else if (tx.type === 'bill_sent' || tx.type === 'invoice') {
            totalBilled += Number(tx.amount)
          }
        })
      }

      setData({
        project: project || null,
        transactions: transactions || [],
        milestones: milestones || [],
        actionItems: actionItems || [],
        totalReceived,
        totalBilled,
        balance: (project?.total_value || 0) - totalReceived,
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching project detail:', error)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-300'
      case 'completed':
        return 'bg-blue-900 text-blue-300'
      case 'pending':
        return 'bg-yellow-900 text-yellow-300'
      case 'in_process':
        return 'bg-orange-900 text-orange-300'
      default:
        return 'bg-slate-900 text-slate-300'
    }
  }

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'invoiced':
        return <Clock className="h-5 w-5 text-yellow-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-slate-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading project details...</div>
      </div>
    )
  }

  if (!data.project) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">Project not found</div>
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/projects"
            className="inline-flex items-center px-3 py-2 border border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{data.project.name}</h1>
            <p className="text-slate-400">{data.project.client_name || 'Project Details'}</p>
          </div>
        </div>
        <Link
          to="/add-transaction"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Link>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Value</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(Number(data.project.total_value))}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.project.status)}`}>
              {data.project.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div>
            <p className="text-sm font-medium text-slate-400">Total Received</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(data.totalReceived)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {((data.totalReceived / Number(data.project.total_value)) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div>
            <p className="text-sm font-medium text-slate-400">Balance</p>
            <p className={`text-2xl font-bold ${data.balance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {formatCurrency(data.balance)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {data.balance > 0 ? 'Outstanding' : 'Fully paid'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-medium text-white">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
            {data.transactions.length > 0 ? (
              data.transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      transaction.type === 'payment_received' || transaction.type === 'advance' || transaction.type === 'by_hand'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {transaction.type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(transaction.date).toLocaleDateString()} • {transaction.mode?.toUpperCase() || 'N/A'}
                    </p>
                    {transaction.notes && (
                      <p className="text-xs text-slate-500 mt-1">{transaction.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      transaction.type === 'payment_received' || transaction.type === 'advance' || transaction.type === 'by_hand'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {formatCurrency(Number(transaction.amount))}
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

        {/* Milestones */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-medium text-white">Milestones</h3>
          </div>
          <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
            {data.milestones.length > 0 ? (
              data.milestones.map((milestone) => (
                <div key={milestone.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getMilestoneStatusIcon(milestone.status)}
                    <div>
                      <p className="text-sm font-medium text-white">{milestone.name}</p>
                      {milestone.percentage && (
                        <p className="text-xs text-slate-400">
                          {milestone.percentage}% of project
                        </p>
                      )}
                      {milestone.due_date && (
                        <p className="text-xs text-slate-500">
                          Due: {new Date(milestone.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {milestone.amount && (
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(Number(milestone.amount))}
                      </p>
                    )}
                    <p className={`text-xs font-medium ${
                      milestone.status === 'paid' ? 'text-green-400' :
                      milestone.status === 'invoiced' ? 'text-yellow-400' : 'text-slate-400'
                    }`}>
                      {milestone.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400">
                No milestones found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      {data.actionItems.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-medium text-white">Action Items</h3>
          </div>
          <div className="divide-y divide-slate-700">
            {data.actionItems.map((item) => (
              <div key={item.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {item.status === 'done' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      item.status === 'done' ? 'text-slate-400 line-through' : 'text-white'
                    }`}>
                      {item.description}
                    </p>
                    {item.due_date && (
                      <p className="text-xs text-slate-500">
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.status === 'done'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-yellow-900 text-yellow-300'
                }`}>
                  {item.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Notes */}
      {data.project.notes && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-3">Notes</h3>
          <p className="text-slate-300">{data.project.notes}</p>
        </div>
      )}
    </div>
  )
}