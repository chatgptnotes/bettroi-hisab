import { useState } from 'react'
import { Database, CheckCircle, AlertCircle } from 'lucide-react'
import { setupDatabase } from '../setup/database'

export const Setup = () => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSetup = async () => {
    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      await setupDatabase()
      setStatus('success')
      setMessage('Database setup completed successfully! You can now navigate to other pages.')
    } catch (error) {
      console.error('Setup error:', error)
      setStatus('error')
      setMessage('Error setting up database. Please check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <Database className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Setup</h1>
          <p className="text-gray-500 mb-6">
            Initialize the Bettroi Hisab database with sample projects and transactions.
          </p>

          {status === 'idle' && (
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up...
                </>
              ) : (
                'Setup Database'
              )}
            </button>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 text-sm mb-4">{message}</p>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-emerald-600 hover:bg-emerald-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-600 text-sm mb-4">{message}</p>
              <button
                onClick={handleSetup}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-emerald-600 hover:bg-emerald-700"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-400 text-left">
            <p className="font-medium mb-2">This will create:</p>
            <ul className="space-y-1 pl-4">
              <li>• Linkist project (₹2,40,000)</li>
              <li>• Neuro project with milestones (₹2,75,000)</li>
              <li>• 4C project (₹1,50,000)</li>
              <li>• Headz project (pending PO)</li>
              <li>• Various transactions (₹2,80,000)</li>
              <li>• Sample transactions and action items</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}