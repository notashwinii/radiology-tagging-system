"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/layout'
import LoadingScreen from '@/components/loading-screen'
import { api, ApiError } from '@/lib/api'
import { ProjectDashboard } from '@/components/project-dashboard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'

interface Project {
  id: number
  name: string
  description?: string
  workspace_id: number
  owner_id: number
  created_at: string
  updated_at?: string
}

export default function ProjectPage() {
  const params = useParams()
  const projectId = parseInt(params.projectId as string)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to be determined before proceeding
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      
      // Simulate page loading for better UX
      const timer = setTimeout(() => {
        setIsPageLoading(false)
      }, 500)
      
      if (projectId) {
        loadProject()
      }
      
      return () => clearTimeout(timer)
    }
  }, [user, authLoading, projectId, router])

  const loadProject = async () => {
    try {
      setIsLoading(true)
      const projectData = await api.getProject(projectId)
      setProject(projectData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load project')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while auth is being determined
  if (authLoading) {
    return <LoadingScreen message="Loading..." />
  }

  // Show loading while auth is being determined
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />
  }

  if (isPageLoading) {
    return <LoadingScreen message="Loading project..." />
  }

  if (isLoading) {
    return (
      <Layout currentPage="home">
        <div className="flex-1 p-6">
          <LoadingScreen message="Loading project data..." />
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout currentPage="home">
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <div className="text-lg text-foreground mb-4">Project not found</div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/home')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="home">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/home')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Project Dashboard */}
        <div className="flex-1">
          <ProjectDashboard projectId={projectId} />
        </div>
      </div>
    </Layout>
  )
} 