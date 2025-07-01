import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  quoteService, 
  workOrderService, 
  invoiceService, 
  customerService,
  formatCurrency,
  formatDate 
} from '../../services/api'
import { 
  FileText, 
  Users, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  Edit
} from 'lucide-react'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    quotes: { total: 0, pending: 0, accepted: 0, total_value: 0 },
    workOrders: { total: 0, pending: 0, completed: 0, hours_worked: 0 },
    invoices: { total: 0, paid: 0, outstanding: 0, total_amount: 0 },
    customers: { total: 0, active: 0 }
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load statistics based on user role
      const promises = []
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'sales') {
        promises.push(quoteService.getStats())
      }
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'technician') {
        promises.push(workOrderService.getStats())
      }
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'financial') {
        promises.push(invoiceService.getStats())
      }
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'sales') {
        promises.push(customerService.getAll({ page: 1, per_page: 5 }))
      }

      const results = await Promise.allSettled(promises)
      
      // Process results
      let quoteStats = null
      let workOrderStats = null
      let invoiceStats = null
      let customerData = null
      
      let resultIndex = 0
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'sales') {
        if (results[resultIndex]?.status === 'fulfilled') {
          quoteStats = results[resultIndex].value.data
        }
        resultIndex++
      }
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'technician') {
        if (results[resultIndex]?.status === 'fulfilled') {
          workOrderStats = results[resultIndex].value.data
        }
        resultIndex++
      }
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'financial') {
        if (results[resultIndex]?.status === 'fulfilled') {
          invoiceStats = results[resultIndex].value.data
        }
        resultIndex++
      }
      
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'sales') {
        if (results[resultIndex]?.status === 'fulfilled') {
          customerData = results[resultIndex].value.data
        }
      }

      setStats({
        quotes: quoteStats || { total: 0, pending: 0, accepted: 0, total_value: 0 },
        workOrders: workOrderStats || { total: 0, pending: 0, completed: 0, hours_worked: 0 },
        invoices: invoiceStats || { total: 0, paid: 0, outstanding: 0, total_amount: 0 },
        customers: { 
          total: customerData?.pagination?.total || 0, 
          active: customerData?.customers?.length || 0 
        }
      })

      // Mock recent activity (in real app, this would come from an activity log)
      setRecentActivity([
        {
          id: 1,
          type: 'quote',
          title: 'Offerte O2024-0156 aangemaakt',
          description: 'Voor ABC Company B.V.',
          time: '2 uur geleden',
          icon: FileText,
          color: 'text-blue-500'
        },
        {
          id: 2,
          type: 'work_order',
          title: 'Werkbon W2024-0234 voltooid',
          description: 'Installatie bij XYZ B.V.',
          time: '4 uur geleden',
          icon: Receipt,
          color: 'text-orange-500'
        },
        {
          id: 3,
          type: 'invoice',
          title: 'Factuur F2024-0123 verzonden',
          description: 'Betaling binnen 30 dagen',
          time: '1 dag geleden',
          icon: CreditCard,
          color: 'text-red-500'
        },
        {
          id: 4,
          type: 'customer',
          title: 'Nieuwe klant toegevoegd',
          description: 'DEF Installaties B.V.',
          time: '2 dagen geleden',
          icon: Users,
          color: 'text-green-500'
        }
      ])
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Goedemorgen'
    if (hour < 18) return 'Goedemiddag'
    return 'Goedenavond'
  }

  const statCards = [
    {
      title: 'Offertes',
      value: stats.quotes.total,
      subtitle: `${stats.quotes.pending} openstaand`,
      icon: FileText,
      color: 'bg-blue-500',
      link: '/quotes',
      show: user.role === 'admin' || user.role === 'manager' || user.role === 'sales'
    },
    {
      title: 'Werkbonnen',
      value: stats.workOrders.total,
      subtitle: `${stats.workOrders.completed} voltooid`,
      icon: Receipt,
      color: 'bg-orange-500',
      link: '/work-orders',
      show: user.role === 'admin' || user.role === 'manager' || user.role === 'technician'
    },
    {
      title: 'Facturen',
      value: stats.invoices.total,
      subtitle: `${formatCurrency(stats.invoices.total_amount)}`,
      icon: CreditCard,
      color: 'bg-red-500',
      link: '/invoices',
      show: user.role === 'admin' || user.role === 'manager' || user.role === 'financial'
    },
    {
      title: 'Klanten',
      value: stats.customers.total,
      subtitle: `${stats.customers.active} actief`,
      icon: Users,
      color: 'bg-green-500',
      link: '/customers',
      show: user.role === 'admin' || user.role === 'manager' || user.role === 'sales'
    }
  ].filter(card => card.show)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Hier is een overzicht van je bedrijfsactiviteiten
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-4">
          <Link
            to="/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nieuw Document
          </Link>
          {(user.role === 'admin' || user.role === 'manager' || user.role === 'sales') && (
            <Link
              to="/customers/new"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
            >
              <Users className="h-5 w-5 mr-2" />
              Nieuwe Klant
            </Link>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`${card.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recente Activiteit</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`${activity.color} mt-1`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deze Maand</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Omzet</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(stats.invoices.total_amount * 0.3)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gewerkte Uren</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(stats.workOrders.hours_worked || 0)} uur
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Nieuwe Klanten</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(stats.customers.total * 0.1)}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aandachtspunten</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {stats.invoices.outstanding} openstaande facturen
                  </p>
                  <p className="text-xs text-gray-500">
                    Totaal: {formatCurrency(stats.invoices.total_amount * 0.4)}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {stats.quotes.pending} offertes wachten op reactie
                  </p>
                  <p className="text-xs text-gray-500">
                    Waarde: {formatCurrency(stats.quotes.total_value * 0.6)}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {stats.workOrders.completed} werkbonnen voltooid
                  </p>
                  <p className="text-xs text-gray-500">
                    Klaar voor facturering
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Snelle Acties</h3>
            <div className="space-y-2">
              <Link
                to="/create"
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Nieuw document maken
              </Link>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  to="/settings"
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Bedrijfsinstellingen
                </Link>
              )}
              <Link
                to="/customers"
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Klanten beheren
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

