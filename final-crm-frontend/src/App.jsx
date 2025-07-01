import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/layout/Layout'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import DocumentWizard from './components/documents/DocumentWizard'

// Customer components
import CustomerList from './components/customers/CustomerList'
import CustomerForm from './components/customers/CustomerForm'

// Article components
import ArticleList from './components/articles/ArticleList'
import ArticleForm from './components/articles/ArticleForm'

// Quote components
import QuoteList from './components/quotes/QuoteList'
import QuoteForm from './components/quotes/QuoteForm'

// Work Order components
import WorkOrderList from './components/work-orders/WorkOrderList'
import WorkOrderForm from './components/work-orders/WorkOrderForm'

// Invoice components
import InvoiceList from './components/invoices/InvoiceList'
import InvoiceForm from './components/invoices/InvoiceForm'

// Settings
import Settings from './components/settings/Settings'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Navigate to="/dashboard" />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/documents" element={
                <ProtectedRoute>
                  <Layout>
                    <DocumentWizard />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Customer routes */}
              <Route path="/customers" element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/customers/new" element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/customers/:id/edit" element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Article routes */}
              <Route path="/articles" element={
                <ProtectedRoute>
                  <Layout>
                    <ArticleList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/articles/new" element={
                <ProtectedRoute>
                  <Layout>
                    <ArticleForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/articles/:id/edit" element={
                <ProtectedRoute>
                  <Layout>
                    <ArticleForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Quote routes */}
              <Route path="/quotes" element={
                <ProtectedRoute>
                  <Layout>
                    <QuoteList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/quotes/new" element={
                <ProtectedRoute>
                  <Layout>
                    <QuoteForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/quotes/:id/edit" element={
                <ProtectedRoute>
                  <Layout>
                    <QuoteForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Work Order routes */}
              <Route path="/work-orders" element={
                <ProtectedRoute>
                  <Layout>
                    <WorkOrderList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/work-orders/new" element={
                <ProtectedRoute>
                  <Layout>
                    <WorkOrderForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/work-orders/:id/edit" element={
                <ProtectedRoute>
                  <Layout>
                    <WorkOrderForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Invoice routes */}
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/invoices/new" element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/invoices/:id/edit" element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceForm />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Settings */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App

