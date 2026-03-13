import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { AddTransaction } from './pages/AddTransaction'
import { TransactionHistory } from './pages/TransactionHistory'
import { Reports } from './pages/Reports'
import { Quotations } from './pages/Quotations'
import { PendingPayments } from './pages/PendingPayments'
import { Setup } from './pages/Setup'
import { MeetingMinutes } from './pages/MeetingMinutes'
import { WorkOrders } from './pages/WorkOrders'
import { StorageDebug } from './pages/StorageDebug'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/storage-debug" element={<StorageDebug />} />
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/add-transaction" element={<AddTransaction />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/pending" element={<PendingPayments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/meetings" element={<MeetingMinutes />} />
              <Route path="/work-orders" element={<WorkOrders />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App