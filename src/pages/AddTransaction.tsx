import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, ArrowLeft } from 'lucide-react'
import { supabase, type BettroiProject } from '../lib/supabase'

export const AddTransaction = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<BettroiProject[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'payment_received',
    amount: '',
    mode: 'bank',
    notes: '',
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
          mode: formData.mode,
          notes: formData.notes || null,
        })

      if (error) {
        console.error('Error adding transaction:', error)
        alert('Error adding transaction')
      } else {
        alert('Transaction added successfully!')
        navigate('/')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 border border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Transaction</h1>
          <p className="text-slate-400">Record a new financial transaction</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-slate-300 mb-2">
                Project *
              </label>
              <select
                id="project_id"
                name="project_id"
                required
                value={formData.project_id}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-600 bg-slate-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-600 bg-slate-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-2">
                Transaction Type *
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-600 bg-slate-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="payment_received">Payment Received</option>
                <option value="bill_sent">Bill Sent</option>
                <option value="invoice">Invoice</option>
                <option value="advance">Advance</option>
                <option value="by_hand">By Hand</option>
              </select>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
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
                placeholder="0.00"
                className="block w-full rounded-md border-slate-600 bg-slate-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-slate-300 mb-2">
                Payment Mode
              </label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="block w-full rounded-md border-slate-600 bg-slate-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="by_hand">By Hand</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this transaction..."
              className="block w-full rounded-md border-slate-600 bg-slate-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
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