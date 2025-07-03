import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { articleService } from '../../services/api'
import { ArrowLeft, Save, Package, DollarSign, BarChart3 } from 'lucide-react'

function ArticleForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    article_code: '',
    name: '',
    description: '',
    category: '',
    unit: 'stuks',
    purchase_price: '',
    selling_price: '',
    vat_rate: '21',
    stock_quantity: '',
    minimum_stock: '',
    supplier: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)

  const units = [
    'stuks', 'meter', 'kilogram', 'liter', 'uur', 'vierkante meter', 
    'kubieke meter', 'pak', 'doos', 'rol', 'set', 'paar'
  ]

  const categories = [
    'Installatiemateriaal', 'Gereedschap', 'Elektrisch materiaal', 
    'Leidingwerk', 'Verwarming', 'Ventilatie', 'Sanitair', 
    'Isolatie', 'Bevestigingsmateriaal', 'Veiligheid', 'Onderhoud'
  ]

  useEffect(() => {
    if (isEdit) {
      loadArticle()
    } else {
      // Generate article code for new articles
      generateArticleCode()
    }
  }, [id, isEdit])

  const generateArticleCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    setFormData(prev => ({
      ...prev,
      article_code: `ART${timestamp}`
    }))
  }

  const loadArticle = async () => {
    try {
      setInitialLoading(true)
      const response = await articleService.getById(id)
      setFormData({
        ...response.data,
        purchase_price: response.data.purchase_price?.toString() || '',
        selling_price: response.data.selling_price?.toString() || '',
        vat_rate: response.data.vat_rate?.toString() || '21',
        stock_quantity: response.data.stock_quantity?.toString() || '',
        minimum_stock: response.data.minimum_stock?.toString() || ''
      })
    } catch (error) {
      showError('Fout bij laden van artikelgegevens')
      navigate('/articles')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Convert string numbers to actual numbers
      const submitData = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        vat_rate: parseFloat(formData.vat_rate) || 21,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        minimum_stock: parseInt(formData.minimum_stock) || 0
      }

      if (isEdit) {
        await articleService.update(id, submitData)
        success('Artikel succesvol bijgewerkt')
      } else {
        await articleService.create(submitData)
        success('Artikel succesvol aangemaakt')
      }
      navigate('/articles')
    } catch (error) {
      showError(error.response?.data?.error || 'Fout bij opslaan van artikel')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/articles')
  }

  const calculateMargin = () => {
    const purchase = parseFloat(formData.purchase_price) || 0
    const selling = parseFloat(formData.selling_price) || 0
    if (purchase > 0 && selling > 0) {
      const margin = ((selling - purchase) / selling * 100).toFixed(1)
      return `${margin}%`
    }
    return '-'
  }

  const calculateMarkup = () => {
    const purchase = parseFloat(formData.purchase_price) || 0
    const selling = parseFloat(formData.selling_price) || 0
    if (purchase > 0 && selling > 0) {
      const markup = ((selling - purchase) / purchase * 100).toFixed(1)
      return `${markup}%`
    }
    return '-'
  }

  if (initialLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={handleCancel}
          className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Artikel Bewerken' : 'Nieuw Artikel'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Wijzig de artikelgegevens' : 'Voeg een nieuw artikel toe aan je voorraad'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Basisgegevens</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="article_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Artikelcode *
                </label>
                <input
                  type="text"
                  id="article_code"
                  name="article_code"
                  required
                  value={formData.article_code}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ART001"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Artikelnaam *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Voorbeeld artikel"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Beschrijving
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gedetailleerde beschrijving van het artikel..."
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categorie
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecteer categorie</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Eenheid *
                </label>
                <select
                  id="unit"
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                  Leverancier
                </label>
                <input
                  type="text"
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leverancier B.V."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Artikel is actief
                </label>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Prijsinformatie</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Inkoopprijs (€)
                </label>
                <input
                  type="number"
                  id="purchase_price"
                  name="purchase_price"
                  step="0.01"
                  min="0"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="selling_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Verkoopprijs (€) *
                </label>
                <input
                  type="number"
                  id="selling_price"
                  name="selling_price"
                  step="0.01"
                  min="0"
                  required
                  value={formData.selling_price}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="vat_rate" className="block text-sm font-medium text-gray-700 mb-1">
                  BTW-percentage (%)
                </label>
                <select
                  id="vat_rate"
                  name="vat_rate"
                  value={formData.vat_rate}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">0% (vrijgesteld)</option>
                  <option value="9">9% (laag tarief)</option>
                  <option value="21">21% (hoog tarief)</option>
                </select>
              </div>
            </div>

            {/* Price Analysis */}
            {formData.purchase_price && formData.selling_price && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Prijsanalyse</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Marge:</span>
                    <span className="ml-2 font-medium text-green-600">{calculateMargin()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Opslag:</span>
                    <span className="ml-2 font-medium text-blue-600">{calculateMarkup()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Voorraadgegevens</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Huidige voorraad
                </label>
                <input
                  type="number"
                  id="stock_quantity"
                  name="stock_quantity"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="minimum_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum voorraad
                </label>
                <input
                  type="number"
                  id="minimum_stock"
                  name="minimum_stock"
                  min="0"
                  value={formData.minimum_stock}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Waarschuwing wanneer voorraad onder dit niveau komt
                </p>
              </div>
            </div>

            {/* Stock Status */}
            {formData.stock_quantity && formData.minimum_stock && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Voorraadstatus</h3>
                <div className="flex items-center">
                  {parseInt(formData.stock_quantity) <= parseInt(formData.minimum_stock) ? (
                    <div className="flex items-center text-yellow-600">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm">Lage voorraad - bijbestellen aanbevolen</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm">Voorraad op niveau</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? 'Bijwerken' : 'Aanmaken'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ArticleForm

