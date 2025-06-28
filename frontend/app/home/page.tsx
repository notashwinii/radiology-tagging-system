"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import Layout from '@/components/layout'
import LoadingScreen from '@/components/loading-screen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FolderOpen, Users, Calendar } from 'lucide-react'
import CreateWorkspaceModal from '@/components/create-workspace-modal'

interface Workspace {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  owner_id: string
  members?: Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
  }>
}

export default function HomePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
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
      
      fetchWorkspaces()
      return () => clearTimeout(timer)
    }
  }, [user, authLoading, router])

  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem('access-token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data)
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkspaceClick = (workspaceId: string) => {
    setIsPageLoading(true)
    router.push(`/workspaces/${workspaceId}`)
  }

  const handleCreateWorkspace = async (workspaceData: { name: string; description: string }) => {
    try {
      const token = localStorage.getItem('access-token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workspaceData)
      })

      if (response.ok) {
        const newWorkspace = await response.json()
        setWorkspaces(prev => [...prev, newWorkspace])
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
    return <LoadingScreen message="Loading home..." />
  }

  return (
    <Layout currentPage="home">
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Workspaces</h1>
          <p className="text-muted-foreground">Manage your projects and collaborate with your team</p>
        </div>

        {/* Create Workspace Button */}
        <div className="mb-6">
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Workspace
          </Button>
        </div>

        {/* Workspaces Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingScreen message="Loading workspaces..." />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground mb-4">Create your first workspace to get started</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {workspaces.map((workspace) => (
              <Card 
                key={workspace.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
                onClick={() => handleWorkspaceClick(workspace.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <FolderOpen className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-200" />
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{workspace.members?.length || 0}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                    {workspace.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {workspace.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Updated {formatDate(workspace.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <CreateWorkspaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateWorkspace}
        />
      )}
    </Layout>
  )
} 