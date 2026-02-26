import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FolderOpen, 
  Plus, 
  History, 
  BarChart3,
  Calculator 
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { to: '/add-transaction', icon: Plus, label: 'Add Transaction' },
    { to: '/transactions', icon: History, label: 'History' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-emerald-500" />
              <h1 className="text-xl font-bold text-white">Bettroi Hisab</h1>
            </div>
            <div className="text-sm text-slate-400">
              Account Tracker
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}