import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { quoteService, customerService, articleService, formatCurrency } from '../../services/api'
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Plus, 
  Trash2, 
  Search,
  Calculator,
  User,
  Package
} from 'lucide-react'

function QuoteForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer_id') || '',
    title: '',
    description: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'draft',
    notes: '',
    terms_conditions: 'Standaard leveringsvoorwaarden van toepassing.'
  })

  const [quoteLines, setQuoteLines] = useState([
    {
      id: Date.now(),
      article_id: searchParams.get('article_id') || '',
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      total: 0
    }
  ])

  const [customers, setCustomers] = useState([])
  const [articles, setArticles] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [articleSearches, setArticleSearches] = useState({})
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)

  useEffect(() => {
    loadCustomers()
    loadArticles()
    if (isEdit) {
      loadQuote()
    }
  }, [id, isEdit])

  useEffect(() => {
    calculateTotals()
  }, [quoteLines])

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll({ per_page: 100 })
      setCustomers(response.data.customers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadArticles = async () => {
    try {
      const response = await articleService.getAll({ per_page: 100 })
      setArticles(response.data.articles)
    } catch (error) {
      console.error('Error loading articles:', error)
    }
  }

  const loadQuote = async () => {
    try {
      setInitialLoading(true)
      const response = await quoteService.getById(id)
      const quote = response.data
      
      setFormData({
        customer_id: quote.customer_id,
        title: quote.title || '',
        description: quote.description || '',
        quote_date: quote.quote_date.split('T')[0],
        valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
        status: quote.status,
        notes: quote.notes || '',
        terms_conditions: quote.terms_conditions || 'Standaard leveringsvoorwaarden van toepassing.'
      })
      
      setQuoteLines(quote.quote_lines.map(line => ({
        id: line.id,
        article_id: line.article_id || '',
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        vat_rate: line.vat_rate,
        total: line.total
      })))
    } catch (error) {
      showError('Fout bij laden van offerte')
      navigate('/quotes')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLineChange = (lineId, field, value) => {
    setQuoteLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const updatedLine = { ...line, [field]: value }
        
        // Auto-fill from article if article is selected
        if (field === 'article_id' && value) {
          const article = articles.find(a => a.id === parseInt(value))
          if (article) {
            updatedLine.description = article.name
            updatedLine.unit_price = article.selling_price
            updatedLine.vat_rate = article.vat_rate
          }
        }
        
        // Recalculate total
        updatedLine.total = updatedLine.quantity * updatedLine.unit_price
        
        return updatedLine
      }
      return line
    }))
  }

  const addQuoteLine = () => {
    const newLine = {
      id: Date.now(),
      article_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      total: 0
    }
    setQuoteLines(prev => [...prev, newLine])
  }

  const removeQuoteLine = (lineId) => {
    if (quoteLines.length > 1) {
      setQuoteLines(prev => prev.filter(line => line.id !== lineId))
    }
  }

  const calculateTotals = () => {
    const subtotal = quoteLines.reduce((sum, line) => sum + line.total, 0)
    const vatAmount = quoteLines.reduce((sum, line) => {
      return sum + (line.total * line.vat_rate / 100)
    }, 0)
    const total = subtotal + vatAmount
    
    return { subtotal, vatAmount, total }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { subtotal, vatAmount, total } = calculateTotals()
      
      const submitData = {
        ...formData,
        quote_lines: quoteLines.map(line => ({
          article_id: line.article_id || null,
          description: line.description,
          quantity: parseFloat(line.quantity),
          unit_price: parseFloat(line.unit_price),
          vat_rate: parseFloat(line.vat_rate),
          total: parseFloat(line.total)
        })),
        subtotal,
        vat_amount: vatAmount,
        total_amount: total
      }

      if (isEdit) {
        await quoteService.update(id, submitData)
        success('Offerte succesvol bijgewerkt')
      } else {
        await quoteService.create(submitData)
        success('Offerte succesvol aangemaakt')
      }
      navigate('/quotes')
    } catch (error) {
      showError(error.response?.data?.error || 'Fout bij opslaan van offerte')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/quotes')
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const getFilteredArticles = (searchTerm) => {
    if (!searchTerm) return articles.slice(0, 10)
    return articles.filter(article =>
      article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.article_code.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10)
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

  const { subtotal, vatAmount, total } = calculateTotals()

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
            {isEdit ? 'Offerte Bewerken' : 'Nieuwe Offerte'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Wijzig de offertegegevens' : 'Maak een nieuwe offerte aan'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Offertegegevens</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Klant *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="customer_id"
                    name="customer_id"
                    required
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecteer klant</option>
                    {filteredCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titel
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Offerte voor..."
                />
              </div>

              <div>
                <label htmlFor="quote_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Offertedatum *
                </label>
                <input
                  type="date"
                  id="quote_date"
                  name="quote_date"
                  required
                  value={formData.quote_date}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700 mb-1">
                  Geldig tot
                </label>
                <input
                  type="date"
                  id="valid_until"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  placeholder="Algemene beschrijving van de offerte..."
                />
              </div>
            </div>
          </div>

          {/* Quote Lines */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Offerteregels</h2>
              </div>
              <button
                type="button"
                onClick={addQuoteLine}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Regel toevoegen
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-medium text-gray-700">Artikel</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700">Beschrijving</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-20">Aantal</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Prijs</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-20">BTW%</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Totaal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {quoteLines.map((line, index) => (
                    <tr key={line.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <select
                          value={line.article_id}
                          onChange={(e) => handleLineChange(line.id, 'article_id', e.target.value)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Selecteer artikel</option>
                          {articles.map(article => (
                            <option key={article.id} value={article.id}>
                              {article.article_code} - {article.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Beschrijving..."
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => handleLineChange(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3">
                        <select
                          value={line.vat_rate}
                          onChange={(e) => handleLineChange(line.id, 'vat_rate', parseFloat(e.target.value))}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="0">0%</option>
                          <option value="9">9%</option>
                          <option value="21">21%</option>
                        </select>
                      </td>
                      <td className="py-3 text-sm font-medium">
                        {formatCurrency(line.total)}
                      </td>
                      <td className="py-3">
                        {quoteLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuoteLine(line.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotaal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>BTW:</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Totaal:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aanvullende informatie</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Interne notities
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Interne notities (niet zichtbaar voor klant)..."
                />
              </div>

              <div>
                <label htmlFor="terms_conditions" className="block text-sm font-medium text-gray-700 mb-1">
                  Voorwaarden
                </label>
                <textarea
                  id="terms_conditions"
                  name="terms_conditions"
                  rows={4}
                  value={formData.terms_conditions}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Algemene voorwaarden en leveringsvoorwaarden..."
                />
              </div>
            </div>
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

export default QuoteForm

