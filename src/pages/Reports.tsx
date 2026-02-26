import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Download, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface MonthlyData {
  month: string
  billed: number
  received: number
}

interface ProjectData {
  name: string
  totalValue: number
  received: number
  balance: number
}

export const Reports = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [projectData, setProjectData] = useState<ProjectData[]>([])
  const [summaryStats, setSummaryStats] = useState({
    totalProjects: 0,
    totalValue: 0,
    totalReceived: 0,
    totalPending: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      // Fetch projects with transactions
      const { data: projects } = await supabase
        .from('bettroi_projects')
        .select('*')

      const { data: transactions } = await supabase
        .from('bettroi_transactions')
        .select(`
          *,
          bettroi_projects(name, total_value)
        `)

      if (!projects || !transactions) return

      // Calculate monthly data
      const monthlyMap = new Map<string, { billed: number; received: number }>()
      
      transactions.forEach(tx => {
        const date = new Date(tx.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { billed: 0, received: 0 })
        }
        
        const monthData = monthlyMap.get(monthKey)!
        
        if (tx.type === 'bill_sent' || tx.type === 'invoice') {
          monthData.billed += Number(tx.amount)
        } else if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
          monthData.received += Number(tx.amount)
        }
      })

      const monthlyChartData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          billed: data.billed,
          received: data.received,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      // Calculate project data
      const projectMap = new Map<string, { totalValue: number; received: number }>()
      
      projects.forEach(project => {
        projectMap.set(project.id, {
          totalValue: Number(project.total_value),
          received: 0,
        })
      })

      transactions.forEach(tx => {
        if (tx.project_id && (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand')) {
          const projectData = projectMap.get(tx.project_id)
          if (projectData) {
            projectData.received += Number(tx.amount)
          }
        }
      })

      const projectChartData = projects.map(project => ({
        name: project.name,
        totalValue: Number(project.total_value),
        received: projectMap.get(project.id)?.received || 0,
        balance: Number(project.total_value) - (projectMap.get(project.id)?.received || 0),
      }))

      // Calculate summary stats
      const totalValue = projects.reduce((sum, p) => sum + Number(p.total_value), 0)
      const totalReceived = Array.from(projectMap.values()).reduce((sum, p) => sum + p.received, 0)
      const totalPending = totalValue - totalReceived
      const completionRate = totalValue > 0 ? (totalReceived / totalValue) * 100 : 0

      setMonthlyData(monthlyChartData)
      setProjectData(projectChartData)
      setSummaryStats({
        totalProjects: projects.length,
        totalValue,
        totalReceived,
        totalPending,
        completionRate,
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching report data:', error)
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

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400">Financial insights and project performance</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700">
          <Download className="h-4 w-4 mr-2" />
          Export Reports
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Total Projects
                </dt>
                <dd className="text-lg font-medium text-white">
                  {summaryStats.totalProjects}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Total Portfolio Value
                </dt>
                <dd className="text-lg font-medium text-white">
                  {formatCurrency(summaryStats.totalValue)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Amount Collected
                </dt>
                <dd className="text-lg font-medium text-white">
                  {formatCurrency(summaryStats.totalReceived)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-400 truncate">
                  Collection Rate
                </dt>
                <dd className="text-lg font-medium text-white">
                  {summaryStats.completionRate.toFixed(1)}%
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Monthly Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                  formatter={(value: number | undefined) => [formatCurrency(value || 0), '']}
                />
                <Bar dataKey="billed" fill="#f59e0b" name="Billed" />
                <Bar dataKey="received" fill="#10b981" name="Received" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Distribution */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Project Value Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalValue"
                >
                  {projectData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                  formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Performance Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">Project Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Project
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
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {projectData.map((project, index) => {
                const progress = project.totalValue > 0 ? (project.received / project.totalValue) * 100 : 0
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatCurrency(project.totalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                      {formatCurrency(project.received)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={project.balance > 0 ? 'text-yellow-400' : 'text-green-400'}>
                        {formatCurrency(project.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <div className="flex items-center">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              progress === 100 ? 'bg-green-500' :
                              progress >= 75 ? 'bg-emerald-500' :
                              progress >= 50 ? 'bg-yellow-500' :
                              progress >= 25 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-slate-400">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}