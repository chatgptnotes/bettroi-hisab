import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Clock, DollarSign, Upload, Paperclip, Eye, Download, Trash2, X, FileText, Link } from 'lucide-react'
import { supabase, type TransactionDocument } from '../lib/supabase'

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
  const [docModalTxId, setDocModalTxId] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch projects
      const { data: projects } = await supabase
        .from('bettroi_projects')
        .select('*')

      // Fetch ALL transactions for stats
      const { data: allTransactions } = await supabase
        .from('bettroi_transactions')
        .select('type, amount')

      // Fetch recent 10 for display
      const { data: recentTxns } = await supabase
        .from('bettroi_transactions')
        .select(`
          *,
          bettroi_projects(name)
        `)
        .order('date', { ascending: false })
        .limit(10)

      // Total Billed = sum of all project total_values (the contract/project value)
      let totalBilled = 0
      if (projects) {
        totalBilled = projects.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0)
      }

      // Total Received = sum of all payment transactions
      let totalReceived = 0
      if (allTransactions) {
        allTransactions.forEach(tx => {
          if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
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

      setRecentTransactions(recentTxns || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  const getTransactionDocs = (txId: string): TransactionDocument[] => {
    const tx = recentTransactions.find((t: any) => t.id === txId)
    return (tx?.documents as TransactionDocument[]) || []
  }

  const uploadDocument = async (txId: string, file: File) => {
    setUploadingDoc(true)
    try {
      const path = `${txId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type })
      if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploadingDoc(false); return }
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const newDoc: TransactionDocument = { name: file.name, url: urlData.publicUrl, type: 'upload', mime: file.type, uploadedAt: new Date().toISOString() }
      const docs = [...getTransactionDocs(txId), newDoc]
      await supabase.from('bettroi_transactions').update({ documents: docs }).eq('id', txId)
      await fetchDashboardData()
    } catch { alert('Upload failed') }
    setUploadingDoc(false)
  }

  const addDocumentLink = async (txId: string, url: string) => {
    if (!url.trim()) return
    const newDoc: TransactionDocument = { name: url.split('/').pop() || 'Link', url: url.trim(), type: 'link', uploadedAt: new Date().toISOString() }
    const docs = [...getTransactionDocs(txId), newDoc]
    await supabase.from('bettroi_transactions').update({ documents: docs }).eq('id', txId)
    setLinkInput('')
    await fetchDashboardData()
  }

  const removeDocument = async (txId: string, docIndex: number) => {
    const docs = getTransactionDocs(txId)
    const doc = docs[docIndex]
    if (doc.type === 'upload') {
      const path = doc.url.split('/receipts/')[1]
      if (path) await supabase.storage.from('receipts').remove([decodeURIComponent(path)])
    }
    const newDocs = docs.filter((_: any, i: number) => i !== docIndex)
    await supabase.from('bettroi_transactions').update({ documents: newDocs }).eq('id', txId)
    await fetchDashboardData()
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
            recentTransactions.map((transaction: any) => {
              const docs = (transaction.documents as TransactionDocument[]) || []
              const totalDocs = docs.length + (transaction.attachment_url ? 1 : 0)
              return (
                <div key={transaction.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {transaction.bettroi_projects?.name || 'Unknown Project'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {transaction.type.replace('_', ' ').toUpperCase()} • {new Date(transaction.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {/* Upload / Docs Button */}
                  <div className="flex-shrink-0">
                    {totalDocs > 0 ? (
                      <button
                        onClick={() => setDocModalTxId(transaction.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/50 border border-emerald-600 text-emerald-300 hover:bg-emerald-800/50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        {totalDocs} Doc{totalDocs > 1 ? 's' : ''}
                      </button>
                    ) : (
                      <button
                        onClick={() => setDocModalTxId(transaction.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 border border-blue-600/50 text-blue-300 hover:bg-blue-800/50 hover:border-blue-500 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
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
              )
            })
          ) : (
            <div className="p-6 text-center text-slate-400">
              No transactions found
            </div>
          )}
        </div>
      </div>
      {/* Document Modal */}
      {docModalTxId && (() => {
        const tx = recentTransactions.find((t: any) => t.id === docModalTxId)
        if (!tx) return null
        const docs = (tx.documents as TransactionDocument[]) || []

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDocModalTxId(null)}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-700">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-emerald-400" />
                    Upload Receipt / Document
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {tx.bettroi_projects?.name} — {formatCurrency(Number(tx.amount))} — {new Date(tx.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <button onClick={() => setDocModalTxId(null)} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                {docs.map((doc: TransactionDocument, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-700/50 border border-slate-600 rounded-xl">
                    {doc.type === 'upload' ? <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" /> : <Link className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.type === 'upload' ? '📎 Uploaded' : '🔗 Link'} • {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex gap-1">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-emerald-400 hover:bg-emerald-900/50 rounded-lg"><Eye className="w-4 h-4" /></a>
                      <a href={doc.url} download={doc.name} className="p-1.5 text-blue-400 hover:bg-blue-900/50 rounded-lg"><Download className="w-4 h-4" /></a>
                      <button onClick={() => removeDocument(docModalTxId!, i)} className="p-1.5 text-red-400 hover:bg-red-900/50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {docs.length === 0 && (
                  <div className="text-center py-6 text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents attached yet</p>
                    <p className="text-xs mt-1">Upload a bank receipt or paste a link below</p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-700 space-y-3">
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file && docModalTxId) uploadDocument(docModalTxId, file); e.target.value = '' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Upload className="w-5 h-5" />
                  {uploadingDoc ? 'Uploading...' : '📤 Upload Bank Receipt / Invoice PDF'}
                </button>
                <div className="flex gap-2">
                  <input type="url" value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Or paste document URL here..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => { if (e.key === 'Enter' && linkInput.trim()) addDocumentLink(docModalTxId!, linkInput) }} />
                  <button onClick={() => addDocumentLink(docModalTxId!, linkInput)} disabled={!linkInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                    <Link className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}