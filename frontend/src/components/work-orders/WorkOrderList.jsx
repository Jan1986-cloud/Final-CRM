import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { workOrderService, formatCurrency, formatDate } from '../../services/api'
import { 
  Receipt, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  CheckCircle,
  Clock,
  Play,
  Pause,
  MoreVertical,
  Camera,
  MapPin
} from 'lucide-react'

function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0
  })
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([])
  const [showActions, setShowActions] = useState({})
  
  const { success, error: showError } = useToast()

  const statusOptions = [
    { value: '', label: 'Alle statussen' },
    { value: 'draft', label: 'Concept' },
    { value: 'scheduled', label: 'Ingepland' },
    { value: 'in_progress', label: 'In uitvoering' },
    { value: 'completed', label: 'Voltooid' },
    { value: 'invoiced', label: 'Gefactureerd' }
  ]

  useEffect(() => {
    loadWorkOrders()
  }, [pagination.page, searchTerm, statusFilter])

  const loadWorkOrders = async () => {
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
      
      const response = await workOrderService.getAll(params)
      setWorkOrders(response.data.work_orders)
      setPagination(response.data.pagination)
    } catch (error) {
      showError('Fout bij laden van werkbonnen')
      console.error('Error loading work orders:', error)
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

  const handleDelete = async (workOrderId) => {
    if (!confirm('Weet je zeker dat je deze werkbon wilt verwijderen?')) {
      return
    }

    try {
      await workOrderService.delete(workOrderId)
      success('Werkbon succesvol verwijderd')
      loadWorkOrders()
    } catch (error) {
      showError('Fout bij verwijderen van werkbon')
    }
  }

  const handleComplete = async (workOrderId) => {
    if (!confirm('Wil je deze werkbon markeren als voltooid?')) {
      return
    }

    try {
      await workOrderService.complete(workOrderId)
      success('Werkbon gemarkeerd als voltooid')
      loadWorkOrders()
    } catch (error) {
      showError('Fout bij voltooien van werkbon')
    }
  }

  const toggleWorkOrderSelection = (workOrderId) => {
    setSelectedWorkOrders(prev => 
      prev.includes(workOrderId)
        ? prev.filter(id => id !== workOrderId)
        : [...prev, workOrderId]
    )
  }

  const toggleAllWorkOrders = () => {
    if (selectedWorkOrders.length === workOrders.length) {
      setSelectedWorkOrders([])
    } else {
      setSelectedWorkOrders(workOrders.map(wo => wo.id))
    }
  }

  const toggleActions = (workOrderId) => {
    setShowActions(prev => ({
      ...prev,
      [workOrderId]: !prev[workOrderId]
    }))
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock, text: 'Concept' },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Ingepland' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Play, text: 'In uitvoering' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Voltooid' },
      invoiced: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, text: 'Gefactureerd' }
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

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { color: 'bg-green-100 text-green-800', text: 'Laag' },
      normal: { color: 'bg-gray-100 text-gray-800', text: 'Normaal' },
      high: { color: 'bg-orange-100 text-orange-800', text: 'Hoog' },
      urgent: { color: 'bg-red-100 text-red-800', text: 'Urgent' }
    }
    
    const config = priorityConfig[priority] || priorityConfig.normal
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading && workOrders.length === 0) {
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

  if (!loading && workOrders.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Geen werkbonnen gevonden.</p>
        <Link
          to="/work-orders/new"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Werkbon
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Werkbonnen</h1>
          <p className="text-gray-600">Beheer uitgevoerd werk en urenregistratie</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/work-orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Werkbon
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
                placeholder="Zoek werkbonnen..."
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

        {/* Work Order List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedWorkOrders.length === workOrders.length && workOrders.length > 0}
                    onChange={toggleAllWorkOrders}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Werkbon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Klant & Locatie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Werk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Prioriteit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((workOrder) => (
                <tr key={workOrder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedWorkOrders.includes(workOrder.id)}
                      onChange={() => toggleWorkOrderSelection(workOrder.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {workOrder.work_order_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {workOrder.title || 'Werkbon'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{workOrder.customer?.name}</div>
                    {workOrder.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {workOrder.location}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {workOrder.description}
                    </div>
                    {workOrder.hours_worked > 0 && (
                      <div className="text-sm text-gray-500">
                        {workOrder.hours_worked} uur gewerkt
                      </div>
                    )}
                    {workOrder.photos_count > 0 && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Camera className="h-3 w-3 mr-1" />
                        {workOrder.photos_count} foto's
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {getStatusBadge(workOrder.status)}
                      {workOrder.priority && workOrder.priority !== 'normal' && (
                        <div>{getPriorityBadge(workOrder.priority)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(workOrder.work_date)}
                    </div>
                    {workOrder.scheduled_time && (
                      <div className="text-sm text-gray-500">
                        {workOrder.scheduled_time}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => toggleActions(workOrder.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showActions[workOrder.id] && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <Link
                              to={`/work-orders/${workOrder.id}`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => toggleActions(workOrder.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Bekijken
                            </Link>
                            <Link
                              to={`/work-orders/${workOrder.id}/edit`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => toggleActions(workOrder.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Bewerken
                            </Link>
                            {workOrder.status !== 'completed' && workOrder.status !== 'invoiced' && (
                              <button
                                onClick={() => {
                                  handleComplete(workOrder.id)
                                  toggleActions(workOrder.id)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Markeren als voltooid
                              </button>
                            )}
                            {workOrder.status === 'completed' && (
                              <Link
                                to={`/invoices/new?work_order_id=${workOrder.id}`}
                                className="flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                onClick={() => toggleActions(workOrder.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Factureren
                              </Link>
                            )}
                            <Link
                              to={`/work-orders/${workOrder.id}/duplicate`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => toggleActions(workOrder.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Dupliceren
                            </Link>
                            <button
                              onClick={() => {
                                handleDelete(workOrder.id)
                                toggleActions(workOrder.id)
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
              ))}
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

      {/* Empty State */}
      {!loading && workOrders.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen werkbonnen gevonden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter 
              ? 'Probeer andere filters.' 
              : 'Begin door je eerste werkbon aan te maken.'}
          </p>
          {!searchTerm && !statusFilter && (
            <div className="mt-6">
              <Link
                to="/work-orders/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Werkbon
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkOrderList

