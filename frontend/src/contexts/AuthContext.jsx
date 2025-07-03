import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token and get user info
      api
        .get('/auth/me')
        .then((response) => {
          setUser(response.data.user)
        })
        .catch(() => {
          // Token is invalid, remove it
          localStorage.removeItem('token')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user: userData } = response.data

      localStorage.setItem('token', token)
      setUser(userData)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { token, user: newUser } = response.data

      localStorage.setItem('token', token)
      setUser(newUser)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  const hasPermission = (requiredRole) => {
    if (!user) return false
    if (user.role === 'admin') return true

    const roleHierarchy = {
      admin: 5,
      manager: 4,
      sales: 3,
      technician: 2,
      financial: 2,
      user: 1,
    }

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
