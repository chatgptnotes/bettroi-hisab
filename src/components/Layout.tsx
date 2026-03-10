import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Plus,
  History,
  BarChart3,
  FileText,
  Calculator,
  Clock,
  LogOut,
  MessageSquare,
  ClipboardList
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth()
  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { to: '/add-transaction', icon: Plus, label: 'Add Transaction' },
    { to: '/quotations', icon: FileText, label: 'Quotations' },
    { to: '/transactions', icon: History, label: 'History' },
    { to: '/pending', icon: Clock, label: 'Pending' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/meetings', icon: MessageSquare, label: 'Meetings' },
    { to: '/work-orders', icon: ClipboardList, label: 'Work Orders' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-emerald-600" />
              <h1 className="text-xl font-bold text-gray-900">Hisab</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
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
