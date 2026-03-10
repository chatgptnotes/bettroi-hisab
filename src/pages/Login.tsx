import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Zap } from 'lucide-react'

const DEFAULT_EMAIL = 'cmd@hopehospital.com'
const DEFAULT_PASSWORD = 'Nagpur@1'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const autoFill = () => {
    setEmail(DEFAULT_EMAIL)
    setPassword(DEFAULT_PASSWORD)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.svg" alt="logo" className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-white">Bettroi Hisab</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Quick sign-in card */}
        <div className="bg-indigo-900/40 border border-indigo-700 rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-0.5">Quick Sign In</p>
            <p className="text-white text-sm font-medium">{DEFAULT_EMAIL}</p>
          </div>
          <button
            type="button"
            onClick={autoFill}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Fill</span>
          </button>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="bg-slate-800 rounded-2xl p-8 shadow-xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
