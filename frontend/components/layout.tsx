"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { 
  FolderOpen, 
  Users, 
  User, 
  LogOut, 
  ChevronRight,
  ChevronLeft,
  Home,
  Settings
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  currentPage?: string
}

export default function Layout({ children, currentPage = 'home' }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout(router)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Collapsible Sidebar */}
      <div className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && <h1 className="text-xl font-bold text-card-foreground">RTS</h1>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="font-medium text-card-foreground truncate">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-2">
          <nav className="space-y-1">
            <Button
              variant={currentPage === 'home' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
              onClick={() => router.push('/home')}
            >
              <Home className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-3">Home</span>}
            </Button>
            
            <Button
              variant={currentPage === 'settings' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
              onClick={() => router.push('/settings')}
            >
              <Settings className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-3">Settings</span>}
            </Button>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-border">
          <Button 
            variant="ghost" 
            className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
} 