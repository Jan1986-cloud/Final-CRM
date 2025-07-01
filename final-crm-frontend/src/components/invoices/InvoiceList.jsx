import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { invoiceService, formatCurrency, formatDate } from '../../services/api'
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  Download
} from 'lucide-react'

function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0
  })
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [showActions, setShowActions] = useState({})
  
  const { success, error: showError } = useToast()

  const statusOptions = [
    { value: '', label: 'Alle statussen' },
    { value: 'draft', label: 'Concept' },
    { value: 'sent', label: 'Verzonden' },
    { value: 'paid', label: 'Betaald' },
    { value: 'overdue', label: 'Achterstallig' },
    { value: 'cancelled', label: 'Geannuleerd' }
  ]

  useEffect(() => {
    loadInvoices()
  }, [pagination.page, searchTerm, statusFilter])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        per_page: pagination.per_page
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }
      if (statusFilter) {
        params.status = statusFilter
      }
      
      const response = await invoiceService.getAll(params)
      setInvoices(response.data.invoices)
      setPagination(response.data.pagination)
    } catch (error) {
      showError('Fout bij laden van facturen')
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (invoiceId) => {
    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) {
      return
    }

    try {
      await invoiceService.delete(invoiceId)
      success('Factuur succesvol verwijderd')
      loadInvoices()
    } catch (error) {
      showError('Fout bij verwijderen van factuur')
    }
  }

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const toggleAllInvoices = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id))
    }
  }

  const toggleActions = (invoiceId) => {
    setShowActions(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }))
  }

  const getStatusBadge = (status, dueDate) => {
    // Check if overdue
    const isOverdue = status === 'sent' && dueDate && new Date(dueDate) < new Date()
    
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock, text: 'Concept' },
      sent: { 
        color: isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800', 
        icon: isOverdue ? AlertTriangle : Send, 
        text: isOverdue ? 'Achterstallig' : 'Verzonden' 
      },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Betaald' },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Achterstallig' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: Clock, text: 'Geannuleerd' }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    )
  }

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = today - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  if (loading && invoices.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturen</h1>
          <p className="text-gray-600">Beheer je facturen en betalingen</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/invoices/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Factuur
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Zoek facturen..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={handleStatusFilter}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                    onChange={toggleAllInvoices}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factuur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Klant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bedrag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datums
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const daysOverdue = getDaysOverdue(invoice.due_date)
                
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => toggleInvoiceSelection(invoice.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.title || 'Factuur'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.customer?.name}</div>
                      <div className="text-sm text-gray-500">{invoice.customer?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Excl. BTW: {formatCurrency(invoice.subtotal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getStatusBadge(invoice.status, invoice.due_date)}
                        {daysOverdue > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            {daysOverdue} dagen te laat
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Factuur: {formatDate(invoice.invoice_date)}
                      </div>
                      {invoice.due_date && (
                        <div className={`text-sm ${daysOverdue > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          Vervalt: {formatDate(invoice.due_date)}
                        </div>
                      )}
                      {invoice.paid_date && (
                        <div className="text-sm text-green-600">
                          Betaald: {formatDate(invoice.paid_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => toggleActions(invoice.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {showActions[invoice.id] && (
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <Link
                                to={`/invoices/${invoice.id}`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => toggleActions(invoice.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Bekijken
                              </Link>
                              <Link
                                to={`/invoices/${invoice.id}/edit`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => toggleActions(invoice.id)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Bewerken
                              </Link>
                              <button
                                onClick={() => {
                                  // Download PDF functionality would go here
                                  success('PDF download gestart')
                                  toggleActions(invoice.id)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </button>
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => {
                                    // Send invoice functionality would go here
                                    success('Factuur verzonden')
                                    toggleActions(invoice.id)
                                    loadInvoices()
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Verzenden
                                </button>
                              )}
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <button
                                  onClick={() => {
                                    // Mark as paid functionality would go here
                                    success('Factuur gemarkeerd als betaald')
                                    toggleActions(invoice.id)
                                    loadInvoices()
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Markeren als betaald
                                </button>
                              )}
                              <Link
                                to={`/invoices/${invoice.id}/duplicate`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => toggleActions(invoice.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Dupliceren
                              </Link>
                              <button
                                onClick={() => {
                                  handleDelete(invoice.id)
                                  toggleActions(invoice.id)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Verwijderen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Vorige
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Volgende
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Toont{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.per_page + 1}
                    </span>{' '}
                    tot{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.per_page, pagination.total)}
                    </span>{' '}
                    van{' '}
                    <span className="font-medium">{pagination.total}</span> resultaten
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Vorige
                    </button>
                    {[...Array(pagination.pages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === i + 1
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Volgende
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Totaal Uitstaand</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.total_amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Achterstallig</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(invoices.filter(inv => getDaysOverdue(inv.due_date) > 0).reduce((sum, inv) => sum + inv.total_amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Deze Maand Betaald</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(invoices.filter(inv => inv.status === 'paid' && inv.paid_date && new Date(inv.paid_date).getMonth() === new Date().getMonth()).reduce((sum, inv) => sum + inv.total_amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Concepten</div>
          <div className="text-2xl font-bold text-gray-600">
            {invoices.filter(inv => inv.status === 'draft').length}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!loading && invoices.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen facturen gevonden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter 
              ? 'Probeer andere filters.' 
              : 'Begin door je eerste factuur aan te maken.'}
          </p>
          {!searchTerm && !statusFilter && (
            <div className="mt-6">
              <Link
                to="/invoices/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Factuur
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default InvoiceList

