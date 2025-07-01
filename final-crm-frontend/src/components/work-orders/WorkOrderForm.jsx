import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { workOrderService, customerService, quoteService } from '../../services/api'
import { 
  ArrowLeft, 
  Save, 
  Receipt, 
  Plus, 
  Trash2, 
  Clock,
  Camera,
  MapPin,
  User,
  AlertTriangle
} from 'lucide-react'

function WorkOrderForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer_id') || '',
    quote_id: searchParams.get('quote_id') || '',
    title: 'Onderhoud Kantoorgebouw',
    description: 'Inspectie en onderhoudswerkzaamheden binnen en buiten',
    work_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00',
    location: 'Kantoorstraat 12, Amsterdam',
    status: 'draft',
    priority: 'normal',
    notes: 'Klant aanwezig voor toegang tot alle ruimtes',
    internal_notes: 'Neem ladder, verf en veiligheidshelm mee'
  })

  const [timeEntries, setTimeEntries] = useState([
    {
      id: Date.now(),
      start_time: '09:00',
      end_time: '12:30',
      break_minutes: 30,
      description: 'Inspectie en schilderwerk',
      hours_worked: 3
    }
  ])

  const [materials, setMaterials] = useState([
    {
      id: Date.now() + 1,
      description: 'Verfblikken wit',
      quantity: 5,
      unit: 'liter',
      unit_price: 20,
      total: 5 * 20
    }
  ])

  const [customers, setCustomers] = useState([])
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)

  const statusOptions = [
    { value: 'draft', label: 'Concept' },
    { value: 'scheduled', label: 'Ingepland' },
    { value: 'in_progress', label: 'In uitvoering' },
    { value: 'completed', label: 'Voltooid' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Laag' },
    { value: 'normal', label: 'Normaal' },
    { value: 'high', label: 'Hoog' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const units = ['stuks', 'meter', 'kilogram', 'liter', 'uur', 'vierkante meter', 'kubieke meter']

  useEffect(() => {
    loadCustomers()
    loadQuotes()
    if (isEdit) {
      loadWorkOrder()
    }
  }, [id, isEdit])

  useEffect(() => {
    calculateTimeEntries()
  }, [timeEntries])

  useEffect(() => {
    calculateMaterials()
  }, [materials])

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll({ per_page: 100 })
      setCustomers(response.data.customers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadQuotes = async () => {
    try {
      const response = await quoteService.getAll({ per_page: 100, status: 'accepted' })
      setQuotes(response.data.quotes)
    } catch (error) {
      console.error('Error loading quotes:', error)
    }
  }

  const loadWorkOrder = async () => {
    try {
      setInitialLoading(true)
      const response = await workOrderService.getById(id)
      const workOrder = response.data
      
      setFormData({
        customer_id: workOrder.customer_id,
        quote_id: workOrder.quote_id || '',
        title: workOrder.title || '',
        description: workOrder.description || '',
        work_date: workOrder.work_date.split('T')[0],
        scheduled_time: workOrder.scheduled_time || '',
        location: workOrder.location || '',
        status: workOrder.status,
        priority: workOrder.priority || 'normal',
        notes: workOrder.notes || '',
        internal_notes: workOrder.internal_notes || ''
      })
      
      if (workOrder.time_entries && workOrder.time_entries.length > 0) {
        setTimeEntries(workOrder.time_entries.map(entry => ({
          id: entry.id,
          start_time: entry.start_time || '',
          end_time: entry.end_time || '',
          break_minutes: entry.break_minutes || 0,
          description: entry.description || '',
          hours_worked: entry.hours_worked || 0
        })))
      }
      
      if (workOrder.materials && workOrder.materials.length > 0) {
        setMaterials(workOrder.materials.map(material => ({
          id: material.id,
          description: material.description,
          quantity: material.quantity,
          unit: material.unit,
          unit_price: material.unit_price,
          total: material.total
        })))
      }
    } catch (error) {
      showError('Fout bij laden van werkbon')
      navigate('/work-orders')
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

  const handleTimeEntryChange = (entryId, field, value) => {
    setTimeEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const updatedEntry = { ...entry, [field]: value }
        
        // Calculate hours worked if start and end time are set
        if (updatedEntry.start_time && updatedEntry.end_time) {
          const start = new Date(`2000-01-01T${updatedEntry.start_time}`)
          const end = new Date(`2000-01-01T${updatedEntry.end_time}`)
          const diffMs = end - start
          const diffHours = diffMs / (1000 * 60 * 60)
          const breakHours = (updatedEntry.break_minutes || 0) / 60
          updatedEntry.hours_worked = Math.max(0, diffHours - breakHours)
        }
        
        return updatedEntry
      }
      return entry
    }))
  }

  const handleMaterialChange = (materialId, field, value) => {
    setMaterials(prev => prev.map(material => {
      if (material.id === materialId) {
        const updatedMaterial = { ...material, [field]: value }
        updatedMaterial.total = updatedMaterial.quantity * updatedMaterial.unit_price
        return updatedMaterial
      }
      return material
    }))
  }

  const addTimeEntry = () => {
    const newEntry = {
      id: Date.now(),
      start_time: '',
      end_time: '',
      break_minutes: 0,
      description: '',
      hours_worked: 0
    }
    setTimeEntries(prev => [...prev, newEntry])
  }

  const removeTimeEntry = (entryId) => {
    if (timeEntries.length > 1) {
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId))
    }
  }

  const addMaterial = () => {
    const newMaterial = {
      id: Date.now(),
      description: '',
      quantity: 1,
      unit: 'stuks',
      unit_price: 0,
      total: 0
    }
    setMaterials(prev => [...prev, newMaterial])
  }

  const removeMaterial = (materialId) => {
    if (materials.length > 1) {
      setMaterials(prev => prev.filter(material => material.id !== materialId))
    }
  }

  const calculateTimeEntries = () => {
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0)
    return totalHours
  }

  const calculateMaterials = () => {
    const totalMaterials = materials.reduce((sum, material) => sum + (material.total || 0), 0)
    return totalMaterials
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const totalHours = calculateTimeEntries()
      const totalMaterialCost = calculateMaterials()
      
      const submitData = {
        ...formData,
        hours_worked: totalHours,
        material_cost: totalMaterialCost,
        time_entries: timeEntries.map(entry => ({
          start_time: entry.start_time || null,
          end_time: entry.end_time || null,
          break_minutes: parseInt(entry.break_minutes) || 0,
          description: entry.description,
          hours_worked: parseFloat(entry.hours_worked) || 0
        })),
        materials: materials.map(material => ({
          description: material.description,
          quantity: parseFloat(material.quantity),
          unit: material.unit,
          unit_price: parseFloat(material.unit_price),
          total: parseFloat(material.total)
        }))
      }

      if (isEdit) {
        await workOrderService.update(id, submitData)
        success('Werkbon succesvol bijgewerkt')
      } else {
        await workOrderService.create(submitData)
        success('Werkbon succesvol aangemaakt')
      }
      navigate('/work-orders')
    } catch (error) {
      showError(error.response?.data?.error || 'Fout bij opslaan van werkbon')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/work-orders')
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

  const totalHours = calculateTimeEntries()
  const totalMaterialCost = calculateMaterials()

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
            {isEdit ? 'Werkbon Bewerken' : 'Nieuwe Werkbon'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Wijzig de werkbongegevens' : 'Maak een nieuwe werkbon aan'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Receipt className="h-5 w-5 text-orange-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Werkbongegevens</h2>
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
                <label htmlFor="quote_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Gerelateerde Offerte
                </label>
                <select
                  id="quote_id"
                  name="quote_id"
                  value={formData.quote_id}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Geen offerte</option>
                  {quotes.map(quote => (
                    <option key={quote.id} value={quote.id}>
                      {quote.quote_number} - {quote.customer?.name}
                    </option>
                  ))}
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
                  placeholder="Werkbon voor..."
                />
              </div>

              <div>
                <label htmlFor="work_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Werkdatum *
                </label>
                <input
                  type="date"
                  id="work_date"
                  name="work_date"
                  required
                  value={formData.work_date}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="scheduled_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Geplande tijd
                </label>
                <input
                  type="time"
                  id="scheduled_time"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Locatie
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Werklocatie adres"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Prioriteit
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Werkbeschrijving *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beschrijving van het uitgevoerde werk..."
                />
              </div>
            </div>
          </div>

          {/* Time Entries */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Urenregistratie</h2>
              </div>
              <button
                type="button"
                onClick={addTimeEntry}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tijd toevoegen
              </button>
            </div>

            <div className="space-y-4">
              {timeEntries.map((entry, index) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Starttijd
                      </label>
                      <input
                        type="time"
                        value={entry.start_time}
                        onChange={(e) => handleTimeEntryChange(entry.id, 'start_time', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eindtijd
                      </label>
                      <input
                        type="time"
                        value={entry.end_time}
                        onChange={(e) => handleTimeEntryChange(entry.id, 'end_time', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pauze (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={entry.break_minutes}
                        onChange={(e) => handleTimeEntryChange(entry.id, 'break_minutes', parseInt(e.target.value) || 0)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Uren
                      </label>
                      <input
                        type="text"
                        value={entry.hours_worked.toFixed(2)}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div className="flex items-end">
                      {timeEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeEntry(entry.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beschrijving
                    </label>
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) => handleTimeEntryChange(entry.id, 'description', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Wat is er gedaan in deze periode..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900">
                Totaal gewerkte uren: {totalHours.toFixed(2)} uur
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Gebruikte materialen</h2>
              <button
                type="button"
                onClick={addMaterial}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Materiaal toevoegen
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-medium text-gray-700">Beschrijving</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-20">Aantal</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Eenheid</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Prijs</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-700 w-24">Totaal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => (
                    <tr key={material.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <input
                          type="text"
                          value={material.description}
                          onChange={(e) => handleMaterialChange(material.id, 'description', e.target.value)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Materiaal beschrijving..."
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={material.quantity}
                          onChange={(e) => handleMaterialChange(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3">
                        <select
                          value={material.unit}
                          onChange={(e) => handleMaterialChange(material.id, 'unit', e.target.value)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {units.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={material.unit_price}
                          onChange={(e) => handleMaterialChange(material.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3 text-sm font-medium">
                        €{material.total.toFixed(2)}
                      </td>
                      <td className="py-3">
                        {materials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMaterial(material.id)}
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

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-900">
                Totale materiaalkosten: €{totalMaterialCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notities</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Klantnotities (zichtbaar voor klant)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notities die de klant kan zien..."
                />
              </div>

              <div>
                <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Interne notities (alleen voor intern gebruik)
                </label>
                <textarea
                  id="internal_notes"
                  name="internal_notes"
                  rows={3}
                  value={formData.internal_notes}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Interne notities (niet zichtbaar voor klant)..."
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

export default WorkOrderForm

