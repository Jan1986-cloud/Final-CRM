import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { documentService, downloadFile } from '../../services/api'
import { 
  Settings as SettingsIcon, 
  Building, 
  Users, 
  FileText, 
  Upload,
  Download,
  Save,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'

function Settings() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(false)
  
  // Company settings
  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'Nederland',
    phone: '',
    email: '',
    website: '',
    vat_number: '',
    chamber_of_commerce: '',
    bank_account: '',
    logo_url: ''
  })
  
  // User management
  const [users, setUsers] = useState([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'sales',
    password: '',
    active: true
  })
  
  // Document templates
  const [templates, setTemplates] = useState([])
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    type: 'quote',
    content: '',
    is_default: false
  })

  const tabs = [
    { id: 'company', label: 'Bedrijfsgegevens', icon: Building },
    { id: 'users', label: 'Gebruikers', icon: Users },
    { id: 'templates', label: 'Sjablonen', icon: FileText },
    { id: 'import-export', label: 'Import/Export', icon: Upload }
  ]

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'sales', label: 'Verkoop' },
    { value: 'technician', label: 'Technicus' },
    { value: 'financial', label: 'Financieel' }
  ]

  const templateTypes = [
    { value: 'quote', label: 'Offerte' },
    { value: 'work_order', label: 'Werkbon' },
    { value: 'invoice', label: 'Factuur' }
  ]

  useEffect(() => {
    loadCompanyData()
    loadUsers()
    loadTemplates()
  }, [])

  const loadCompanyData = async () => {
    try {
      // Mock company data - in real app this would come from API
      setCompanyData({
        name: 'Installatiebedrijf De Vakman',
        address: 'Hoofdstraat 123',
        postal_code: '1234 AB',
        city: 'Amsterdam',
        country: 'Nederland',
        phone: '+31 20 123 4567',
        email: 'info@devakman.nl',
        website: 'www.devakman.nl',
        vat_number: 'NL123456789B01',
        chamber_of_commerce: '12345678',
        bank_account: 'NL91 ABNA 0417 1643 00',
        logo_url: ''
      })
    } catch (error) {
      showError('Fout bij laden van bedrijfsgegevens')
    }
  }

  const loadUsers = async () => {
    try {
      // Mock users data - in real app this would come from API
      setUsers([
        {
          id: 1,
          name: 'Jan de Vries',
          email: 'jan@devakman.nl',
          role: 'admin',
          active: true,
          last_login: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          name: 'Marie Jansen',
          email: 'marie@devakman.nl',
          role: 'sales',
          active: true,
          last_login: '2024-01-14T14:20:00Z'
        },
        {
          id: 3,
          name: 'Piet Bakker',
          email: 'piet@devakman.nl',
          role: 'technician',
          active: true,
          last_login: '2024-01-13T09:15:00Z'
        }
      ])
    } catch (error) {
      showError('Fout bij laden van gebruikers')
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await documentService.getTemplates()
      setTemplates(response.data.templates)
    } catch (error) {
      showError('Fout bij laden van sjablonen')
    }
  }

  const handleCompanySubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // In real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      success('Bedrijfsgegevens succesvol opgeslagen')
    } catch (error) {
      showError('Fout bij opslaan van bedrijfsgegevens')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // In real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingUser) {
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...userFormData, id: editingUser.id }
            : user
        ))
        success('Gebruiker succesvol bijgewerkt')
      } else {
        const newUser = {
          id: Date.now(),
          ...userFormData,
          last_login: null
        }
        setUsers(prev => [...prev, newUser])
        success('Gebruiker succesvol aangemaakt')
      }
      
      setShowUserForm(false)
      setEditingUser(null)
      setUserFormData({
        name: '',
        email: '',
        role: 'sales',
        password: '',
        active: true
      })
    } catch (error) {
      showError('Fout bij opslaan van gebruiker')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) {
      return
    }
    
    try {
      setUsers(prev => prev.filter(user => user.id !== userId))
      success('Gebruiker succesvol verwijderd')
    } catch (error) {
      showError('Fout bij verwijderen van gebruiker')
    }
  }

  const handleExportData = async (type) => {
    try {
      setLoading(true)
      // In real app, this would call the API to generate export
      await new Promise(resolve => setTimeout(resolve, 2000))
      success(`${type} export succesvol gedownload`)
    } catch (error) {
      showError(`Fout bij exporteren van ${type}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImportData = async (type, file) => {
    try {
      setLoading(true)
      // In real app, this would upload and process the file
      await new Promise(resolve => setTimeout(resolve, 2000))
      success(`${type} import succesvol verwerkt`)
    } catch (error) {
      showError(`Fout bij importeren van ${type}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditTemplate = (templateId) => {
    navigate(`/settings/templates/edit/${templateId}`)
  }

  const handleDownloadTemplate = async (documentId, name) => {
    try {
      const response = await documentService.download(documentId)
      downloadFile(response.data, `${name || 'template'}_${documentId}.pdf`)
      success('Sjabloon succesvol gedownload')
    } catch (error) {
      showError('Fout bij downloaden van sjabloon')
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Weet je zeker dat je dit sjabloon wilt verwijderen?')) return

    try {
      await documentService.deleteTemplate(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      success('Sjabloon succesvol verwijderd')
    } catch (error) {
      showError('Fout bij verwijderen van sjabloon')
    }
  }

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-red-100 text-red-800', text: 'Administrator' },
      manager: { color: 'bg-purple-100 text-purple-800', text: 'Manager' },
      sales: { color: 'bg-blue-100 text-blue-800', text: 'Verkoop' },
      technician: { color: 'bg-green-100 text-green-800', text: 'Technicus' },
      financial: { color: 'bg-yellow-100 text-yellow-800', text: 'Financieel' }
    }
    
    const config = roleConfig[role] || roleConfig.sales
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-600">Beheer je bedrijfsgegevens, gebruikers en sjablonen</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Company Settings */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bedrijfsgegevens</h2>
          
          <form onSubmit={handleCompanySubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrijfsnaam *
                </label>
                <input
                  type="text"
                  required
                  value={companyData.name}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mailadres *
                </label>
                <input
                  type="email"
                  required
                  value={companyData.email}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <input
                  type="text"
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefoon
                </label>
                <input
                  type="tel"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode
                </label>
                <input
                  type="text"
                  value={companyData.postal_code}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, postal_code: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plaats
                </label>
                <input
                  type="text"
                  value={companyData.city}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={companyData.website}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BTW-nummer
                </label>
                <input
                  type="text"
                  value={companyData.vat_number}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, vat_number: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KvK-nummer
                </label>
                <input
                  type="text"
                  value={companyData.chamber_of_commerce}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, chamber_of_commerce: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bankrekeningnummer
                </label>
                <input
                  type="text"
                  value={companyData.bank_account}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, bank_account: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Opslaan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Gebruikers</h2>
                <button
                  onClick={() => setShowUserForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Gebruiker
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gebruiker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Laatste login
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Acties</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.active ? 'Actief' : 'Inactief'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString('nl-NL')
                          : 'Nooit'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(user)
                              setUserFormData({
                                name: user.name,
                                email: user.email,
                                role: user.role,
                                password: '',
                                active: user.active
                              })
                              setShowUserForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Form Modal */}
          {showUserForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingUser ? 'Gebruiker Bewerken' : 'Nieuwe Gebruiker'}
                  </h3>
                  
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Naam *
                      </label>
                      <input
                        type="text"
                        required
                        value={userFormData.name}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        required
                        value={userFormData.email}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol *
                      </label>
                      <select
                        required
                        value={userFormData.role}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {editingUser ? 'Nieuw wachtwoord (laat leeg om niet te wijzigen)' : 'Wachtwoord *'}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        value={userFormData.password}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="active"
                        checked={userFormData.active}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                        Actieve gebruiker
                      </label>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserForm(false)
                          setEditingUser(null)
                          setUserFormData({
                            name: '',
                            email: '',
                            role: 'sales',
                            password: '',
                            active: true
                          })
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Annuleren
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Opslaan...' : (editingUser ? 'Bijwerken' : 'Aanmaken')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sjablonen</h2>
              <button
                onClick={() => setShowTemplateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Sjabloon
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Naam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Standaard
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aangemaakt op
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tpl.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {templateTypes.find(t => t.value === tpl.type)?.label || tpl.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tpl.is_default ? 'Ja' : 'Nee'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tpl.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          title="Bewerken"
                          onClick={() => handleEditTemplate(tpl.id)}
                        >
                          <Edit className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                        </button>
                        <button
                          title="Download"
                          onClick={() => handleDownloadTemplate(tpl.documentId, tpl.name)}
                        >
                          <Download className="h-4 w-4 text-green-600 hover:text-green-800" />
                        </button>
                        <button
                          title="Verwijderen"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export */}
      {activeTab === 'import-export' && (
        <div className="space-y-6">
          {/* Export Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Exporteren</h2>
            <p className="text-gray-600 mb-6">
              Exporteer je gegevens naar Excel bestanden voor backup of analyse.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { type: 'klanten', label: 'Klanten', icon: Users },
                { type: 'artikelen', label: 'Artikelen', icon: Package },
                { type: 'offertes', label: 'Offertes', icon: FileText },
                { type: 'facturen', label: 'Facturen', icon: CreditCard }
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.type}
                    onClick={() => handleExportData(item.type)}
                    disabled={loading}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex flex-col items-center"
                  >
                    <Icon className="h-8 w-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                    <Download className="h-4 w-4 text-gray-400 mt-1" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Importeren</h2>
            <p className="text-gray-600 mb-6">
              Importeer gegevens vanuit Excel bestanden. Download eerst de sjablonen om de juiste format te gebruiken.
            </p>
            
            <div className="space-y-4">
              {[
                { type: 'klanten', label: 'Klanten' },
                { type: 'artikelen', label: 'Artikelen' }
              ].map((item) => (
                <div key={item.type} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
                    <button
                      onClick={() => handleExportData(`${item.type}-sjabloon`)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Download sjabloon
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          handleImportData(item.type, file)
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings

