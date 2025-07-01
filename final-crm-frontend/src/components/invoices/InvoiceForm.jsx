import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { invoiceService, customerService, workOrderService, formatCurrency } from '../../services/api'
import { 
  ArrowLeft, 
  Save, 
  CreditCard, 
  Plus, 
  Trash2, 
  User,
  Receipt,
  Calculator
} from 'lucide-react'

function InvoiceForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer_id') || '',
    invoice_type: searchParams.get('type') === 'combined' ? 'combined' : 'standard',
    title: 'Factuur Onderhoud Kantoor',
    description: 'Factuur voor uitgevoerde onderhoudswerkzaamheden',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: '14',
    status: 'draft',
    notes: 'Contact voor vragen: info@bedrijf.nl',
    terms_conditions: 'Betaling binnen 14 dagen na factuurdatum.'
  })

  const [invoiceLines, setInvoiceLines] = useState([
    {
      id: Date.now(),
      description: 'Schilderwerk binnenkant kantoor',
      quantity: 10,
      unit_price: 50,
      vat_rate: 21,
      total: 10 * 50
    }
  ])

  const [selectedWorkOrders, setSelectedWorkOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)

  const paymentTermsOptions = [
    { value: '0', label: 'Direct' },
    { value: '14', label: '14 dagen' },
    { value: '30', label: '30 dagen' },
    { value: '60', label: '60 dagen' },
    { value: '90', label: '90 dagen' }
  ]

  useEffect(() => {
    loadCustomers()
    loadWorkOrders()
    if (isEdit) {
      loadInvoice()
    }
    
    // Auto-select work order if provided in URL
    const workOrderId = searchParams.get('work_order_id')
    if (workOrderId) {
      setSelectedWorkOrders([parseInt(workOrderId)])
      setFormData(prev => ({ ...prev, invoice_type: 'combined' }))
    }
  }, [id, isEdit])

  useEffect(() => {
    calculateTotals()
  }, [invoiceLines])

  useEffect(() => {
    // Update due date when payment terms change
    if (formData.invoice_date && formData.payment_terms) {
      const invoiceDate = new Date(formData.invoice_date)
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + parseInt(formData.payment_terms))
      setFormData(prev => ({
        ...prev,
        due_date: dueDate.toISOString().split('T')[0]
      }))
    }
  }, [formData.invoice_date, formData.payment_terms])

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll({ per_page: 100 })
      setCustomers(response.data.customers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadWorkOrders = async () => {
    try {
      const response = await workOrderService.getAll({ per_page: 100, status: 'completed' })
      setWorkOrders(response.data.work_orders)
    } catch (error) {
      console.error('Error loading work orders:', error)
    }
  }

  const loadInvoice = async () => {
    try {
      setInitialLoading(true)
      const response = await invoiceService.getById(id)
      const invoice = response.data
      
      setFormData({
        customer_id: invoice.customer_id,
        invoice_type: invoice.invoice_type || 'standard',
        title: invoice.title || '',
        description: invoice.description || '',
        invoice_date: invoice.invoice_date.split('T')[0],
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        payment_terms: invoice.payment_terms?.toString() || '30',
        status: invoice.status,
        notes: invoice.notes || '',
        terms_conditions: invoice.terms_conditions || 'Betaling binnen 30 dagen na factuurdatum.'
      })
      
      if (invoice.invoice_lines && invoice.invoice_lines.length > 0) {
        setInvoiceLines(invoice.invoice_lines.map(line => ({
          id: line.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          vat_rate: line.vat_rate,
          total: line.total
        })))
      }
      
      if (invoice.work_orders && invoice.work_orders.length > 0) {
        setSelectedWorkOrders(invoice.work_orders.map(wo => wo.id))
      }
    } catch (error) {
      showError('Fout bij laden van factuur')
      navigate('/invoices')
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
    setInvoiceLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const updatedLine = { ...line, [field]: value }
        updatedLine.total = updatedLine.quantity * updatedLine.unit_price
        return updatedLine
      }
      return line
    }))
  }

  const addInvoiceLine = () => {
    const newLine = {
      id: Date.now(),
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      total: 0
    }
    setInvoiceLines(prev => [...prev, newLine])
  }

  const removeInvoiceLine = (lineId) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines(prev => prev.filter(line => line.id !== lineId))
    }
  }

  const handleWorkOrderSelection = (workOrderId) => {
    setSelectedWorkOrders(prev => 
      prev.includes(workOrderId)
        ? prev.filter(id => id !== workOrderId)
        : [...prev, workOrderId]
    )
  }

  const calculateTotals = () => {
    let subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0)
    let vatAmount = invoiceLines.reduce((sum, line) => {
      return sum + (line.total * line.vat_rate / 100)
    }, 0)
    
    // Add work order totals if combined invoice
    if (formData.invoice_type === 'combined') {
      const selectedWOs = workOrders.filter(wo => selectedWorkOrders.includes(wo.id))
      const workOrderTotal = selectedWOs.reduce((sum, wo) => {
        const laborCost = (wo.hours_worked || 0) * 75 // €75 per hour default
        const materialCost = wo.material_cost || 0
        return sum + laborCost + materialCost
      }, 0)
      
      subtotal += workOrderTotal
      vatAmount += workOrderTotal * 0.21 // 21% VAT on work orders
    }
    
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
        payment_terms: parseInt(formData.payment_terms),
        invoice_lines: invoiceLines.map(line => ({
          description: line.description,
          quantity: parseFloat(line.quantity),
          unit_price: parseFloat(line.unit_price),
          vat_rate: parseFloat(line.vat_rate),
          total: parseFloat(line.total)
        })),
        work_order_ids: formData.invoice_type === 'combined' ? selectedWorkOrders : [],
        subtotal,
        vat_amount: vatAmount,
        total_amount: total
      }

      if (isEdit) {
        await invoiceService.update(id, submitData)
        success('Factuur succesvol bijgewerkt')
      } else {
        if (formData.invoice_type === 'combined' && selectedWorkOrders.length > 0) {
          const response = await invoiceService.createFromWorkOrders(selectedWorkOrders)
          success('Factuur succesvol aangemaakt vanuit werkbonnen')
        } else {
          await invoiceService.create(submitData)
          success('Factuur succesvol aangemaakt')
        }
      }
      navigate('/invoices')
    } catch (error) {
      showError(error.response?.data?.error || 'Fout bij opslaan van factuur')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/invoices')
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
  const filteredWorkOrders = workOrders.filter(wo => 
    !formData.customer_id || wo.customer_id === parseInt(formData.customer_id)
  )

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
            {isEdit ? 'Factuur Bewerken' : 'Nieuwe Factuur'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Wijzig de factuurgegevens' : 'Maak een nieuwe factuur aan'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Factuurgegevens</h2>
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
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="invoice_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Factuurtype
                </label>
                <select
                  id="invoice_type"
                  name="invoice_type"
                  value={formData.invoice_type}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standaard factuur</option>
                  <option value="combined">Gecombineerde factuur (werkbonnen)</option>
                </select>
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
                  placeholder="Factuur voor..."
                />
              </div>

              <div>
                <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Factuurdatum *
                </label>
                <input
                  type="date"
                  id="invoice_date"
                  name="invoice_date"
                  required
                  value={formData.invoice_date}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 mb-1">
                  Betalingstermijn
                </label>
                <select
                  id="payment_terms"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {paymentTermsOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Vervaldatum
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
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
                  placeholder="Algemene beschrijving van de factuur..."
                />
              </div>
            </div>
          </div>

          {/* Work Orders Selection (for combined invoices) */}
          {formData.invoice_type === 'combined' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Receipt className="h-5 w-5 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Werkbonnen selecteren</h2>
              </div>
              
              {filteredWorkOrders.length > 0 ? (
                <div className="space-y-3">
                  {filteredWorkOrders.map(workOrder => (
                    <div key={workOrder.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        id={`wo-${workOrder.id}`}
                        checked={selectedWorkOrders.includes(workOrder.id)}
                        onChange={() => handleWorkOrderSelection(workOrder.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`wo-${workOrder.id}`} className="ml-3 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {workOrder.work_order_number} - {workOrder.title || 'Werkbon'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {workOrder.description}
                            </div>
                            <div className="text-xs text-gray-400">
                              {workOrder.hours_worked} uur • {formatCurrency(workOrder.material_cost || 0)} materiaal
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency((workOrder.hours_worked || 0) * 75 + (workOrder.material_cost || 0))}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {formData.customer_id 
                    ? 'Geen voltooide werkbonnen gevonden voor deze klant'
                    : 'Selecteer eerst een klant om werkbonnen te zien'
                  }
                </div>
              )}
            </div>
          )}

          {/* Invoice Lines (for standard invoices) */}
          {formData.invoice_type === 'standard' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 text-green-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Factuurregels</h2>
                </div>
                <button
                  type="button"
                  onClick={addInvoiceLine}
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
                      <th className="text-left py-2 text-sm font-medium text-gray-700">Beschrijving</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700 w-20">Aantal</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Prijs</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700 w-20">BTW%</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Totaal</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((line) => (
                      <tr key={line.id} className="border-b border-gray-100">
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
                          {invoiceLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInvoiceLine(line.id)}
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
            </div>
          )}

          {/* Totals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-end">
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
                  Notities
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Aanvullende notities..."
                />
              </div>

              <div>
                <label htmlFor="terms_conditions" className="block text-sm font-medium text-gray-700 mb-1">
                  Betalingsvoorwaarden
                </label>
                <textarea
                  id="terms_conditions"
                  name="terms_conditions"
                  rows={4}
                  value={formData.terms_conditions}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Betalingsvoorwaarden en algemene voorwaarden..."
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

export default InvoiceForm

