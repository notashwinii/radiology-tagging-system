"use client"

import { useAuth } from '@/contexts/auth-context'
import { ProjectDashboard } from '@/components/project-dashboard'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-foreground">Please log in to access the dashboard.</div>
        </div>
      </div>
    )
  }

  return <ProjectDashboard />
} 