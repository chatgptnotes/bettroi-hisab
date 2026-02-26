import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { AddTransaction } from './pages/AddTransaction'
import { TransactionHistory } from './pages/TransactionHistory'
import { Reports } from './pages/Reports'
import { Setup } from './pages/Setup'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/setup" element={<Setup />} />
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
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  )
}

export default App