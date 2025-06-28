"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { api, ApiError } from "@/lib/api"

interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: "user" | "admin" | "reviewer"
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: { email: string; password: string; first_name?: string; last_name?: string }) => Promise<void>
  logout: (router?: any) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth token and validate it
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access-token')
      const refreshToken = localStorage.getItem('refresh-token')
      
      if (accessToken && refreshToken) {
        try {
          // Try to get current user with access token
          const currentUser = await api.getCurrentUser()
          setUser(currentUser)
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            // Access token expired, try to refresh
            try {
              const newTokens = await api.refreshToken(refreshToken)
              localStorage.setItem('access-token', newTokens.access_token)
              localStorage.setItem('refresh-token', newTokens.refresh_token)
              
              // Get current user with new token
              const currentUser = await api.getCurrentUser()
              setUser(currentUser)
            } catch (refreshError) {
              // Refresh failed, clear tokens
              localStorage.removeItem('access-token')
              localStorage.removeItem('refresh-token')
              setUser(null)
            }
          } else {
            // Other error, clear tokens
            localStorage.removeItem('access-token')
            localStorage.removeItem('refresh-token')
            setUser(null)
          }
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const tokens = await api.login({ email, password })
      
      // Store tokens
      localStorage.setItem('access-token', tokens.access_token)
      localStorage.setItem('refresh-token', tokens.refresh_token)
      
      // Get user info
      const currentUser = await api.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message)
      }
      throw new Error('Login failed')
    }
  }

  const register = async (userData: { email: string; password: string; first_name?: string; last_name?: string }) => {
    try {
      const newUser = await api.register(userData)
      // After successful registration, automatically log in
      await login(userData.email, userData.password)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message)
      }
      throw new Error('Registration failed')
    }
  }

  const logout = (router?: any) => {
    setUser(null)
    localStorage.removeItem('access-token')
    localStorage.removeItem('refresh-token')
    
    // Redirect to login page if router is provided
    if (router) {
      router.push('/login')
    }
  }

  return <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
