import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, Clock, AlertCircle, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { supabase, type BettroiProject, type BettroiTransaction, type BettroiMilestone, type BettroiActionItem } from '../lib/supabase'
import { EditModal, type FieldDefinition } from '../components/EditModal'
import { ConfirmDialog } from '../components/ConfirmDialog'

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
  
  // Edit states
  const [editingProject, setEditingProject] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [editingMilestone, setEditingMilestone] = useState<any>(null)
  const [editingActionItem, setEditingActionItem] = useState<any>(null)
  
  // Add states
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [showAddActionItem, setShowAddActionItem] = useState(false)
  
  // Delete states
  const [deletingItem, setDeletingItem] = useState<{ type: string, item: any } | null>(null)

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

  const updateProject = async (formData: Record<string, any>) => {
    if (!data.project) return
    await supabase.from('bettroi_projects').update({
      name: formData.name,
      client_name: formData.client_name,
      total_value: Number(formData.total_value),
      status: formData.status,
      notes: formData.notes,
      quote_url: formData.quote_url
    }).eq('id', data.project.id)
    fetchProjectDetail(data.project.id)
  }

  const createTransaction = async (formData: Record<string, any>) => {
    if (!data.project) return
    await supabase.from('bettroi_transactions').insert({
      project_id: data.project.id,
      date: formData.date,
      type: formData.type,
      amount: Number(formData.amount),
      mode: formData.mode,
      notes: formData.notes,
      attachment_url: formData.attachment_url
    })
    fetchProjectDetail(data.project.id)
  }

  const updateTransaction = async (formData: Record<string, any>) => {
    await supabase.from('bettroi_transactions').update({
      date: formData.date,
      type: formData.type,
      amount: Number(formData.amount),
      mode: formData.mode,
      notes: formData.notes,
      attachment_url: formData.attachment_url
    }).eq('id', editingTransaction.id)
    fetchProjectDetail(data.project!.id)
  }

  const createMilestone = async (formData: Record<string, any>) => {
    if (!data.project) return
    await supabase.from('bettroi_milestones').insert({
      project_id: data.project.id,
      name: formData.name,
      percentage: formData.percentage ? Number(formData.percentage) : null,
      amount: formData.amount ? Number(formData.amount) : null,
      status: formData.status,
      due_date: formData.due_date || null,
      notes: formData.notes
    })
    fetchProjectDetail(data.project.id)
  }

  const updateMilestone = async (formData: Record<string, any>) => {
    await supabase.from('bettroi_milestones').update({
      name: formData.name,
      percentage: formData.percentage ? Number(formData.percentage) : null,
      amount: formData.amount ? Number(formData.amount) : null,
      status: formData.status,
      due_date: formData.due_date || null,
      notes: formData.notes
    }).eq('id', editingMilestone.id)
    fetchProjectDetail(data.project!.id)
  }

  const toggleMilestoneStatus = async (milestone: BettroiMilestone) => {
    const nextStatus = milestone.status === 'pending' ? 'invoiced' : 
                     milestone.status === 'invoiced' ? 'paid' : 'pending'
    await supabase.from('bettroi_milestones').update({ status: nextStatus }).eq('id', milestone.id)
    fetchProjectDetail(data.project!.id)
  }

  const createActionItem = async (formData: Record<string, any>) => {
    if (!data.project) return
    await supabase.from('bettroi_action_items').insert({
      project_id: data.project.id,
      description: formData.description,
      due_date: formData.due_date || null,
      status: formData.status
    })
    fetchProjectDetail(data.project.id)
  }

  const updateActionItem = async (formData: Record<string, any>) => {
    await supabase.from('bettroi_action_items').update({
      description: formData.description,
      due_date: formData.due_date || null,
      status: formData.status
    }).eq('id', editingActionItem.id)
    fetchProjectDetail(data.project!.id)
  }

  const toggleActionItemStatus = async (item: BettroiActionItem) => {
    const newStatus = item.status === 'pending' ? 'done' : 'pending'
    await supabase.from('bettroi_action_items').update({ status: newStatus }).eq('id', item.id)
    fetchProjectDetail(data.project!.id)
  }

  const deleteItem = async () => {
    if (!deletingItem) return
    const { type, item } = deletingItem
    
    if (type === 'transaction') {
      await supabase.from('bettroi_transactions').delete().eq('id', item.id)
    } else if (type === 'milestone') {
      await supabase.from('bettroi_milestones').delete().eq('id', item.id)
    } else if (type === 'actionItem') {
      await supabase.from('bettroi_action_items').delete().eq('id', item.id)
    }
    
    fetchProjectDetail(data.project!.id)
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
        return 'bg-green-100 text-green-700'
      case 'completed':
        return 'bg-blue-100 text-blue-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'in_process':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-50 text-gray-600'
    }
  }

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'invoiced':
        return <Clock className="h-5 w-5 text-yellow-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const calculateProgress = () => {
    const completedMilestones = data.milestones.filter(m => m.status === 'paid').length
    const totalMilestones = data.milestones.length
    return totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
  }

  // Field definitions
  const projectFields: FieldDefinition[] = [
    { name: 'name', label: 'Project Name', type: 'text', required: true },
    { name: 'client_name', label: 'Client Name', type: 'text' },
    { name: 'total_value', label: 'Total Value (₹)', type: 'number', required: true },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'in_process', label: 'In Process' },
        { value: 'completed', label: 'Completed' }
      ]
    },
    { name: 'quote_url', label: 'Quotation URL', type: 'url', placeholder: 'https://drive.google.com/...' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 }
  ]

  const transactionFields: FieldDefinition[] = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { 
      name: 'type', 
      label: 'Type', 
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
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { 
      name: 'mode', 
      label: 'Mode', 
      type: 'select',
      options: [
        { value: 'cash', label: 'Cash' },
        { value: 'bank', label: 'Bank' },
        { value: 'upi', label: 'UPI' },
        { value: 'by_hand', label: 'By Hand' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'other', label: 'Other' }
      ]
    },
    { name: 'attachment_url', label: 'Attachment URL', type: 'url' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 }
  ]

  const milestoneFields: FieldDefinition[] = [
    { name: 'name', label: 'Milestone Name', type: 'text', required: true },
    { name: 'percentage', label: 'Percentage', type: 'number', placeholder: '25' },
    { name: 'amount', label: 'Amount (₹)', type: 'number' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'invoiced', label: 'Invoiced' },
        { value: 'paid', label: 'Paid' }
      ]
    },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 }
  ]

  const actionItemFields: FieldDefinition[] = [
    { name: 'description', label: 'Description', type: 'text', required: true },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'done', label: 'Done' }
      ]
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data.project) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">Project not found</div>
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-emerald-600 hover:bg-emerald-700"
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
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-600 bg-white hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{data.project.name}</h1>
              {data.project.quote_url && (
                <a
                  href={data.project.quote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-700 transition-colors"
                  title="View Quotation"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
              <button
                onClick={() => setEditingProject(true)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Edit Project"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-500">{data.project.client_name || 'Project Details'}</p>
          </div>
        </div>
        <Link
          to={`/add-transaction?project_id=${data.project.id}`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-900 bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Link>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Number(data.project.total_value))}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.project.status)}`}>
              {data.project.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Received</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(data.totalReceived)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {((data.totalReceived / Number(data.project.total_value)) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-500">Balance</p>
            <p className={`text-2xl font-bold ${data.balance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {formatCurrency(data.balance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {data.balance > 0 ? 'Outstanding' : 'Fully paid'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-500">Progress</p>
            <p className="text-2xl font-bold text-blue-400">
              {calculateProgress().toFixed(0)}%
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="text-emerald-400 hover:text-emerald-700 transition-colors"
              title="Add Transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {data.transactions.length > 0 ? (
              data.transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'payment_received' || transaction.type === 'advance' || transaction.type === 'by_hand'
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }`}>
                        {transaction.type.replace('_', ' ').toUpperCase()}
                      </p>
                      {transaction.attachment_url && (
                        <a
                          href={transaction.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-700 transition-colors"
                          title="View Attachment"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()} • {transaction.mode?.toUpperCase() || 'N/A'}
                    </p>
                    {transaction.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{transaction.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'payment_received' || transaction.type === 'advance' || transaction.type === 'by_hand'
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }`}>
                        {formatCurrency(Number(transaction.amount))}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingTransaction(transaction)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeletingItem({ type: 'transaction', item: transaction })}
                        className="text-red-600 hover:text-red-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No transactions found
                <button
                  onClick={() => setShowAddTransaction(true)}
                  className="block mx-auto mt-2 text-emerald-400 hover:text-emerald-700 text-sm transition-colors"
                >
                  Add first transaction
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Milestones</h3>
            <button
              onClick={() => setShowAddMilestone(true)}
              className="text-emerald-400 hover:text-emerald-700 transition-colors"
              title="Add Milestone"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {data.milestones.length > 0 ? (
              data.milestones.map((milestone) => (
                <div key={milestone.id} className="p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <button
                        onClick={() => toggleMilestoneStatus(milestone)}
                        className="transition-colors"
                        title="Toggle Status"
                      >
                        {getMilestoneStatusIcon(milestone.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{milestone.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {milestone.percentage && (
                            <p className="text-xs text-gray-500">
                              {milestone.percentage}%
                            </p>
                          )}
                          {milestone.due_date && (
                            <p className="text-xs text-gray-400">
                              Due: {new Date(milestone.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {milestone.amount && (
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(Number(milestone.amount))}
                          </p>
                        )}
                        <p className={`text-xs font-medium ${
                          milestone.status === 'paid' ? 'text-green-400' :
                          milestone.status === 'invoiced' ? 'text-yellow-400' : 'text-gray-500'
                        }`}>
                          {milestone.status.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingMilestone(milestone)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingItem({ type: 'milestone', item: milestone })}
                          className="text-red-600 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No milestones found
                <button
                  onClick={() => setShowAddMilestone(true)}
                  className="block mx-auto mt-2 text-emerald-400 hover:text-emerald-700 text-sm transition-colors"
                >
                  Add first milestone
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Action Items</h3>
          <button
            onClick={() => setShowAddActionItem(true)}
            className="text-emerald-400 hover:text-emerald-700 transition-colors"
            title="Add Action Item"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {data.actionItems.length > 0 ? (
            data.actionItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={() => toggleActionItemStatus(item)}
                    className="transition-colors"
                    title="Toggle Status"
                  >
                    {item.status === 'done' ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      item.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-900'
                    } truncate`}>
                      {item.description}
                    </p>
                    {item.due_date && (
                      <p className="text-xs text-gray-400">
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingActionItem(item)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeletingItem({ type: 'actionItem', item })}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No action items found
              <button
                onClick={() => setShowAddActionItem(true)}
                className="block mx-auto mt-2 text-emerald-400 hover:text-emerald-700 text-sm transition-colors"
              >
                Add first action item
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Notes */}
      {data.project.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{data.project.notes}</p>
        </div>
      )}

      {/* Edit Project Modal */}
      <EditModal
        isOpen={editingProject}
        onClose={() => setEditingProject(false)}
        title="Edit Project"
        fields={projectFields}
        initialData={data.project}
        onSave={updateProject}
      />

      {/* Add/Edit Transaction Modal */}
      <EditModal
        isOpen={showAddTransaction || !!editingTransaction}
        onClose={() => {
          setShowAddTransaction(false)
          setEditingTransaction(null)
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        fields={transactionFields}
        initialData={editingTransaction || { 
          date: new Date().toISOString().split('T')[0],
          type: 'payment_received'
        }}
        onSave={editingTransaction ? updateTransaction : createTransaction}
      />

      {/* Add/Edit Milestone Modal */}
      <EditModal
        isOpen={showAddMilestone || !!editingMilestone}
        onClose={() => {
          setShowAddMilestone(false)
          setEditingMilestone(null)
        }}
        title={editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
        fields={milestoneFields}
        initialData={editingMilestone || { status: 'pending' }}
        onSave={editingMilestone ? updateMilestone : createMilestone}
      />

      {/* Add/Edit Action Item Modal */}
      <EditModal
        isOpen={showAddActionItem || !!editingActionItem}
        onClose={() => {
          setShowAddActionItem(false)
          setEditingActionItem(null)
        }}
        title={editingActionItem ? 'Edit Action Item' : 'Add Action Item'}
        fields={actionItemFields}
        initialData={editingActionItem || { status: 'pending' }}
        onSave={editingActionItem ? updateActionItem : createActionItem}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={deleteItem}
        title={`Delete ${deletingItem?.type === 'transaction' ? 'Transaction' : 
                deletingItem?.type === 'milestone' ? 'Milestone' : 'Action Item'}`}
        message={`Are you sure you want to delete this ${deletingItem?.type}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}