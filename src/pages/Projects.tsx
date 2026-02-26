import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ExternalLink } from 'lucide-react'
import { supabase, type BettroiProject } from '../lib/supabase'

interface ProjectWithBalance extends BettroiProject {
  totalReceived: number
  balance: number
}

export const Projects = () => {
  const [projects, setProjects] = useState<ProjectWithBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data: projectsData } = await supabase
        .from('bettroi_projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (!projectsData) return

      // Calculate received amounts for each project
      const projectsWithBalance = await Promise.all(
        projectsData.map(async (project) => {
          const { data: transactions } = await supabase
            .from('bettroi_transactions')
            .select('amount, type')
            .eq('project_id', project.id)

          let totalReceived = 0
          if (transactions) {
            transactions.forEach(tx => {
              if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
                totalReceived += Number(tx.amount)
              }
            })
          }

          return {
            ...project,
            totalReceived,
            balance: Number(project.total_value) - totalReceived,
          }
        })
      )

      setProjects(projectsWithBalance)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching projects:', error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400">Manage Bettroi project accounts</p>
        </div>
        <Link
          to="/add-transaction"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Link>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {project.name}
                        </div>
                        {project.client_name && (
                          <div className="text-sm text-slate-400">
                            {project.client_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatCurrency(Number(project.total_value))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                      {formatCurrency(project.totalReceived)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={project.balance > 0 ? 'text-yellow-400' : 'text-green-400'}>
                        {formatCurrency(project.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/project/${project.id}`}
                        className="text-emerald-400 hover:text-emerald-300 inline-flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                    No projects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}