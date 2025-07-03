import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  FileText,
  Receipt,
  CreditCard,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

function DocumentWizard() {
  const [selectedType, setSelectedType] = useState('')
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const { success } = useToast()
  const { user, hasPermission } = useAuth()

  const documentTypes = [
    {
      id: 'quote',
      title: 'Offerte',
      description: 'Offerte voor potentiële klanten',
      icon: FileText,
      color: 'bg-green-500',
      roles: ['admin', 'manager', 'sales'],
      route: '/quotes/new'
    },
    {
      id: 'work_order',
      title: 'Werkbon',
      description: 'Uitgevoerd werk gekoppeld aan klant + urenregistratie',
      icon: Receipt,
      color: 'bg-orange-500',
      roles: ['admin', 'manager', 'technician'],
      route: '/work-orders/new'
    },
    {
      id: 'invoice',
      title: 'Factuur',
      description: 'Factuur voor losse artikelen en/of abonnementen',
      icon: CreditCard,
      color: 'bg-red-500',
      roles: ['admin', 'manager', 'financial', 'sales'],
      route: '/invoices/new'
    }
  ]

  const availableTypes = documentTypes.filter(type =>
    type.roles.some(role => hasPermission(role))
  )

  const handleTypeSelection = (type) => {
    setSelectedType(type.id)
    setStep(2)
  }

  const handleContinue = () => {
    const selectedDoc = documentTypes.find(doc => doc.id === selectedType)
    if (selectedDoc) {
      success(`${selectedDoc.title} wordt aangemaakt...`)
      navigate(selectedDoc.route)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Wat wil je maken?
          </h1>
          <p className="text-lg text-gray-600">
            Kies het type document dat je wilt aanmaken
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step 1: Document Type Selection */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentTypes.map((type) => {
              const permitted = type.roles.some((role) => {
                const allowed = hasPermission(role)
                if (!allowed) {
                  console.warn(`Geen toestemming voor documenttype ${type.title}`)
                }
                return allowed
              })

              const IconComponent = type.icon

              return (
                <div
                  key={type.id}
                  onClick={() => permitted && handleTypeSelection(type)}
                  className={`bg-white rounded-xl shadow-lg transition-all duration-300 p-6 ${
                    permitted
                      ? 'cursor-pointer hover:shadow-xl transform hover:scale-105'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`${type.color} p-4 rounded-full mb-4`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {type.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                </div>
              )
            })}
            {availableTypes.length === 0 && (
              <div className="col-span-full text-center text-gray-500">
                Je hebt geen toestemming om documenten te maken.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Document Type Geselecteerd
                </h2>
                <p className="text-gray-600">
                  Je hebt gekozen voor: <strong>
                    {documentTypes.find(doc => doc.id === selectedType)?.title}
                  </strong>
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Wat gebeurt er nu?</h3>
                <p className="text-gray-600 mb-4">
                  {documentTypes.find(doc => doc.id === selectedType)?.description}
                </p>
                
                {selectedType === 'quote' && (
                  <div className="text-sm text-blue-600">
                    <p>• Klantgegevens invullen</p>
                    <p>• Artikelen en diensten toevoegen</p>
                    <p>• Prijzen en BTW berekenen</p>
                    <p>• PDF genereren via Google Docs</p>
                  </div>
                )}
                
                {selectedType === 'work_order' && (
                  <div className="text-sm text-orange-600">
                    <p>• Klant en locatie selecteren</p>
                    <p>• Uitgevoerd werk documenteren</p>
                    <p>• Uren en materialen registreren</p>
                    <p>• Foto's toevoegen (optioneel)</p>
                  </div>
                )}
                {selectedType === 'invoice' && (
                  <div className="text-sm text-red-600">
                    <p>• Klant selecteren</p>
                    <p>• Artikelen en diensten toevoegen</p>
                    <p>• Betalingsvoorwaarden instellen</p>
                    <p>• Factuur versturen</p>
                  </div>
                )}
                
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Terug
                </button>
                <button
                  onClick={handleContinue}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  Doorgaan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-blue-600">1,234</div>
            <div className="text-sm text-gray-600">Documenten dit jaar</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-green-600">89</div>
            <div className="text-sm text-gray-600">Actieve klanten</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-orange-600">156</div>
            <div className="text-sm text-gray-600">Deze maand</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-purple-600">€45,678</div>
            <div className="text-sm text-gray-600">Omzet dit jaar</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recente Activiteit</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-gray-700">Offerte O2024-0156 aangemaakt</span>
              </div>
              <span className="text-sm text-gray-500">2 uur geleden</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <Receipt className="h-5 w-5 text-orange-500 mr-3" />
                <span className="text-gray-700">Werkbon W2024-0234 voltooid</span>
              </div>
              <span className="text-sm text-gray-500">4 uur geleden</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-red-500 mr-3" />
                <span className="text-gray-700">Factuur F2024-0123 verzonden</span>
              </div>
              <span className="text-sm text-gray-500">1 dag geleden</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentWizard

