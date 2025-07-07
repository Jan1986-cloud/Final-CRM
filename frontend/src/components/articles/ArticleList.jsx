import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { articleService, excelService, downloadFile, formatCurrency } from '../../services/api'
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

function ArticleList() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0
  })
  const [selectedArticles, setSelectedArticles] = useState([])
  const [showActions, setShowActions] = useState({})
  const [categories, setCategories] = useState([])
  
  const { success, error: showError } = useToast()

  useEffect(() => {
    loadArticles()
  }, [pagination.page, searchTerm, categoryFilter, stockFilter])

  const loadArticles = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        per_page: pagination.per_page
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }
      if (categoryFilter) {
        params.category_id = categoryFilter
      }
      if (stockFilter) {
        // backend expects low_stock boolean flag for low or out of stock filtering
        if (stockFilter === 'low_stock') {
          params.low_stock = true
        } else if (stockFilter === 'out_of_stock') {
          params.low_stock = false
        }
      }
      
      const response = await articleService.getAll(params)
      setArticles(response.data.articles)
      setPagination(response.data.pagination)
      
      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.articles.map(a => a.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      showError('Fout bij laden van artikelen')
      console.error('Error loading articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleCategoryFilter = (e) => {
    setCategoryFilter(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleStockFilter = (e) => {
    setStockFilter(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (articleId) => {
    if (!confirm('Weet je zeker dat je dit artikel wilt verwijderen?')) {
      return
    }

    try {
      await articleService.delete(articleId)
      success('Artikel succesvol verwijderd')
      loadArticles()
    } catch (error) {
      showError('Fout bij verwijderen van artikel')
    }
  }

  const handleExport = async () => {
    try {
      const response = await excelService.exportArticles()
      downloadFile(response.data, 'artikelen_export.xlsx')
      success('Artikelen geëxporteerd naar Excel')
    } catch (error) {
      showError('Fout bij exporteren van artikelen')
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const response = await excelService.importArticles(file)
      success(`Import voltooid: ${response.data.imported} toegevoegd, ${response.data.updated} bijgewerkt`)
      loadArticles()
    } catch (error) {
      showError('Fout bij importeren van artikelen')
    }
    
    // Reset file input
    event.target.value = ''
  }

  const toggleArticleSelection = (articleId) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    )
  }

  const toggleAllArticles = () => {
    if (selectedArticles.length === articles.length) {
      setSelectedArticles([])
    } else {
      setSelectedArticles(articles.map(a => a.id))
    }
  }

  const toggleActions = (articleId) => {
    setShowActions(prev => ({
      ...prev,
      [articleId]: !prev[articleId]
    }))
  }

  const getStockStatus = (article) => {
    if (article.stock_quantity <= 0) {
      return { status: 'out_of_stock', color: 'text-red-600', icon: AlertTriangle, text: 'Uitverkocht' }
    } else if (article.stock_quantity <= article.minimum_stock) {
      return { status: 'low_stock', color: 'text-yellow-600', icon: AlertTriangle, text: 'Laag' }
    } else {
      return { status: 'in_stock', color: 'text-green-600', icon: CheckCircle, text: 'Op voorraad' }
    }
  }

  if (loading && articles.length === 0) {
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

  if (!loading && articles.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Geen artikelen gevonden.</p>
        <Link
          to="/articles/new"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Artikel
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Artikelen</h1>
          <p className="text-gray-600">Beheer je voorraad en prijzen</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/articles/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuw Artikel
          </Link>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Zoek artikelen..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={handleCategoryFilter}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle categorieën</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={stockFilter}
                onChange={handleStockFilter}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle voorraad</option>
                <option value="in_stock">Op voorraad</option>
                <option value="low_stock">Laag</option>
                <option value="out_of_stock">Uitverkocht</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
              
              <label className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer">
                <Upload className="h-4 w-4 mr-1" />
                Import
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Article List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedArticles.length === articles.length && articles.length > 0}
                    onChange={toggleAllArticles}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artikel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prijzen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voorraad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {articles.map((article) => {
                const stockStatus = getStockStatus(article)
                const StatusIcon = stockStatus.icon
                
                return (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedArticles.includes(article.id)}
                        onChange={() => toggleArticleSelection(article.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {article.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {article.article_code}
                          </div>
                          {article.description && (
                            <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                              {article.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {article.category || 'Geen categorie'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                          {formatCurrency(article.selling_price)}
                        </div>
                        {article.purchase_price > 0 && (
                          <div className="flex items-center text-sm text-gray-500">
                            <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                            {formatCurrency(article.purchase_price)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {article.stock_quantity} {article.unit}
                      </div>
                      {article.minimum_stock > 0 && (
                        <div className="text-xs text-gray-500">
                          Min: {article.minimum_stock}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center ${stockStatus.color}`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">{stockStatus.text}</span>
                      </div>
                      {!article.is_active && (
                        <div className="text-xs text-gray-400 mt-1">Inactief</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => toggleActions(article.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {showActions[article.id] && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <Link
                                to={`/articles/${article.id}/edit`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => toggleActions(article.id)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Bewerken
                              </Link>
                              <Link
                                to={`/quotes/new?article_id=${article.id}`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => toggleActions(article.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Toevoegen aan Offerte
                              </Link>
                              <button
                                onClick={() => {
                                  handleDelete(article.id)
                                  toggleActions(article.id)
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

      {/* Empty State */}
      {!loading && articles.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen artikelen gevonden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || categoryFilter || stockFilter 
              ? 'Probeer andere filters.' 
              : 'Begin door je eerste artikel toe te voegen.'}
          </p>
          {!searchTerm && !categoryFilter && !stockFilter && (
            <div className="mt-6">
              <Link
                to="/articles/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuw Artikel
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ArticleList

