import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Save, ArrowLeft, ExternalLink } from 'lucide-react'
import { supabase, type BettroiProject } from '../lib/supabase'

export const AddTransaction = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedProjectId = searchParams.get('project_id')
  
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    project_id: preselectedProjectId || '',
    date: new Date().toISOString().split('T')[0],
    type: 'payment_received',
    amount: '',
    mode: 'bank',
    notes: '',
    attachment_url: '',
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('bettroi_projects')
        .select('*')
        .order('name')
      
      if (data) {
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('bettroi_transactions')
        .insert({
          project_id: formData.project_id,
          date: formData.date,
          type: formData.type,
          amount: parseFloat(formData.amount),
          mode: formData.mode || null,
          notes: formData.notes || null,
          attachment_url: formData.attachment_url || null,
        })

      if (error) {
        console.error('Error adding transaction:', error)
        alert('Error adding transaction')
      } else {
        alert('Transaction added successfully!')
        // Navigate back to project detail if came from there, otherwise to dashboard
        if (preselectedProjectId) {
          navigate(`/project/${preselectedProjectId}`)
        } else {
          navigate('/')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error adding transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const getTransactionTypeDescription = (type: string) => {
    switch (type) {
      case 'payment_received':
        return 'Money received from client'
      case 'bill_sent':
        return 'Bill/invoice sent to client'
      case 'invoice':
        return 'Formal invoice issued'
      case 'advance':
        return 'Advance payment received'
      case 'by_hand':
        return 'Cash/hand payment'
      case 'credit_note':
        return 'Credit note issued'
      case 'refund':
        return 'Refund processed'
      default:
        return ''
    }
  }

  const selectedProject = projects.find(p => p.id === formData.project_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Transaction</h1>
          <p className="text-gray-500">
            Record a new financial transaction
            {selectedProject && (
              <span className="text-emerald-400 ml-2">
                for {selectedProject.name}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Project Context Info */}
      {selectedProject && (
        <div className="bg-emerald-100/20 border border-emerald-300/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-emerald-700 font-medium">Adding transaction to:</h3>
              <p className="text-gray-900 font-semibold mt-1">{selectedProject.name}</p>
              {selectedProject.client_name && (
                <p className="text-gray-500 text-sm">Client: {selectedProject.client_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-emerald-700 text-sm">Total Value</p>
              <p className="text-gray-900 font-bold">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedProject.total_value)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-600 mb-2">
                Project *
              </label>
              <select
                id="project_id"
                name="project_id"
                required
                value={formData.project_id}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.client_name && `(${project.client_name})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-600 mb-2">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-600 mb-2">
                Transaction Type *
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
              >
                <option value="payment_received">Payment Received</option>
                <option value="bill_sent">Bill Sent</option>
                <option value="invoice">Invoice</option>
                <option value="advance">Advance</option>
                <option value="by_hand">By Hand</option>
                <option value="credit_note">Credit Note</option>
                <option value="refund">Refund</option>
              </select>
              {formData.type && (
                <p className="mt-1 text-xs text-gray-500">
                  {getTransactionTypeDescription(formData.type)}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-600 mb-2">
                Amount (₹) *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="50000"
                className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-gray-600 mb-2">
                Payment Mode
              </label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
              >
                <option value="">Select mode...</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="by_hand">By Hand</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="attachment_url" className="block text-sm font-medium text-gray-600 mb-2">
                Attachment URL
              </label>
              <div className="flex">
                <input
                  type="url"
                  id="attachment_url"
                  name="attachment_url"
                  value={formData.attachment_url}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                  className="block w-full rounded-l-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                />
                {formData.attachment_url && (
                  <a
                    href={formData.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 bg-emerald-600 border border-emerald-300 rounded-r-lg text-gray-900 hover:bg-emerald-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Link to invoice, receipt, or supporting document
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-600 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional details about this transaction..."
              className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          {/* Transaction Preview */}
          {formData.project_id && formData.amount && (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 className="text-gray-600 font-medium mb-2">Transaction Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Project</p>
                  <p className="text-gray-900 font-medium">{selectedProject?.name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="text-gray-900 font-medium">
                    {formData.type.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Amount</p>
                  <p className="text-gray-900 font-medium">
                    {formData.amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(formData.amount)) : '₹0'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Mode</p>
                  <p className="text-gray-900 font-medium">
                    {formData.mode ? formData.mode.toUpperCase() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-900 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}