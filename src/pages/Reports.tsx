import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Download, Calendar, FileText, Filter, Search, Printer } from 'lucide-react'
import { supabase, type BettroiProject, type BettroiTransaction } from '../lib/supabase'

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
  id: string
}

interface AgingData {
  range: string
  count: number
  amount: number
  color: string
}

export const Reports = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [projectData, setProjectData] = useState<ProjectData[]>([])
  const [agingData, setAgingData] = useState<AgingData[]>([])
  const [allTransactions, setAllTransactions] = useState<BettroiTransaction[]>([])

  const [summaryStats, setSummaryStats] = useState({
    totalProjects: 0,
    totalValue: 0,
    totalReceived: 0,
    totalPending: 0,
    completionRate: 0,
    totalOutstanding: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    projectId: '',
    searchTerm: ''
  })
  const [projects, setProjects] = useState<BettroiProject[]>([])

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

      setProjects(projects)
      setAllTransactions(transactions)

      generateReportData(projects, transactions)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching report data:', error)
      setLoading(false)
    }
  }

  const generateReportData = (projects: any[], transactions: any[]) => {
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
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12) // Last 12 months

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
      id: project.id,
      totalValue: Number(project.total_value),
      received: projectMap.get(project.id)?.received || 0,
      balance: Number(project.total_value) - (projectMap.get(project.id)?.received || 0),
    }))

    // Calculate aging analysis
    const now = new Date()
    const aging = {
      current: { count: 0, amount: 0 }, // 0-30 days
      month1: { count: 0, amount: 0 },  // 31-60 days
      month2: { count: 0, amount: 0 },  // 61-90 days
      month3: { count: 0, amount: 0 },  // 91+ days
    }

    projectChartData.forEach(project => {
      if (project.balance > 0) {
        // Find the latest bill/invoice for this project
        const lastBill = transactions
          .filter(tx => tx.project_id === project.id && (tx.type === 'bill_sent' || tx.type === 'invoice'))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

        if (lastBill) {
          const daysDiff = Math.floor((now.getTime() - new Date(lastBill.date).getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff <= 30) {
            aging.current.count++
            aging.current.amount += project.balance
          } else if (daysDiff <= 60) {
            aging.month1.count++
            aging.month1.amount += project.balance
          } else if (daysDiff <= 90) {
            aging.month2.count++
            aging.month2.amount += project.balance
          } else {
            aging.month3.count++
            aging.month3.amount += project.balance
          }
        }
      }
    })

    const agingChartData: AgingData[] = [
      { range: '0-30 days', count: aging.current.count, amount: aging.current.amount, color: '#10b981' },
      { range: '31-60 days', count: aging.month1.count, amount: aging.month1.amount, color: '#f59e0b' },
      { range: '61-90 days', count: aging.month2.count, amount: aging.month2.amount, color: '#ef4444' },
      { range: '90+ days', count: aging.month3.count, amount: aging.month3.amount, color: '#7c2d12' },
    ]

    // Calculate summary stats
    const totalValue = projects.reduce((sum, p) => sum + Number(p.total_value), 0)
    const totalReceived = Array.from(projectMap.values()).reduce((sum, p) => sum + p.received, 0)
    const totalPending = totalValue - totalReceived
    const completionRate = totalValue > 0 ? (totalReceived / totalValue) * 100 : 0
    const totalOutstanding = projectChartData.reduce((sum, p) => sum + p.balance, 0)

    setMonthlyData(monthlyChartData)
    setProjectData(projectChartData)
    setAgingData(agingChartData)
    setSummaryStats({
      totalProjects: projects.length,
      totalValue,
      totalReceived,
      totalPending,
      completionRate,
      totalOutstanding,
    })
  }



  const exportToPDF = () => {
    window.print()
  }

  const exportToCSV = () => {
    // Export transactions as CSV
    const headers = ['Date', 'Project', 'Type', 'Amount', 'Mode', 'Notes']
    const csvData = allTransactions.map(tx => [
      tx.date,
      tx.project_id,
      tx.type,
      tx.amount,
      tx.mode || '',
      tx.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bettroi-transactions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const exportProjectsCSV = () => {
    // Export projects as CSV
    const headers = ['Project', 'Client', 'Total Value', 'Received', 'Balance', 'Status']
    const csvData = projectData.map(p => {
      const project = projects.find(pr => pr.id === p.id)
      return [
        p.name,
        project?.client_name || '',
        p.totalValue,
        p.received,
        p.balance,
        project?.status || ''
      ]
    })

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bettroi-projects-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
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
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400">Financial insights and project performance</p>
        </div>
        <div className="flex gap-3 no-print">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Transactions
          </button>
          <button 
            onClick={exportProjectsCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export Projects
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 no-print">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="print-area">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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
                    Portfolio Value
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
                <TrendingUp className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-400 truncate">
                    Total Outstanding
                  </dt>
                  <dd className="text-lg font-medium text-white">
                    {formatCurrency(summaryStats.totalOutstanding)}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trend */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Monthly Trends (Last 12 Months)</h3>
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

          {/* Aging Analysis */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Aging Analysis</h3>
            <div className="space-y-4">
              {agingData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-white font-medium">{item.range}</p>
                      <p className="text-slate-400 text-sm">{item.count} projects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}
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
    </div>
  )
}