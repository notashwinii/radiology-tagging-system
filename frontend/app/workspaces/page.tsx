"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, FolderOpen, Settings, Trash2 } from 'lucide-react'

interface Workspace {
  id: number
  name: string
  description?: string
  owner_id: number
  created_at: string
  updated_at?: string
  members_count?: number
  projects_count?: number
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true)
      const workspacesData = await api.getWorkspaces()
      setWorkspaces(workspacesData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load workspaces')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWorkspace = async () => {
    try {
      const workspace = await api.createWorkspace({
        name: newWorkspaceName,
        description: newWorkspaceDescription
      })
      setWorkspaces([...workspaces, workspace])
      setShowCreateWorkspace(false)
      setNewWorkspaceName('')
      setNewWorkspaceDescription('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create workspace')
      }
    }
  }

  const handleDeleteWorkspace = async (workspaceId: number) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteWorkspace(workspaceId)
      setWorkspaces(workspaces.filter(w => w.id !== workspaceId))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete workspace')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-primary">Loading workspaces...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Workspaces</h1>
            <p className="text-secondary mt-2">Manage your workspaces and projects</p>
          </div>
          <Dialog open={showCreateWorkspace} onOpenChange={setShowCreateWorkspace}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-elevated">
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace to organize your projects and collaborate with team members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                    className="input"
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">Description (Optional)</Label>
                  <Input
                    id="workspace-description"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="Enter workspace description"
                    className="input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateWorkspace(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName}>
                  Create Workspace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {workspaces.length === 0 ? (
          <Card className="bg-secondary">
            <CardContent className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary mb-2">No Workspaces Yet</h3>
              <p className="text-secondary mb-4">
                Create your first workspace to start organizing your projects and collaborating with team members.
              </p>
              <Button onClick={() => setShowCreateWorkspace(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <Card key={workspace.id} className="bg-secondary hover-bg cursor-pointer" onClick={() => router.push(`/workspaces/${workspace.id}`)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-primary">{workspace.name}</CardTitle>
                      {workspace.description && (
                        <CardDescription className="text-secondary mt-1">
                          {workspace.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/workspaces/${workspace.id}/settings`)
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {workspace.owner_id === user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteWorkspace(workspace.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-secondary">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{workspace.members_count || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-4 w-4" />
                        <span>{workspace.projects_count || 0} projects</span>
                      </div>
                    </div>
                    <Badge variant={workspace.owner_id === user?.id ? "default" : "secondary"}>
                      {workspace.owner_id === user?.id ? "Owner" : "Member"}
                    </Badge>
                  </div>
                  <div className="text-xs text-secondary mt-2">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 