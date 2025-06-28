"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import Layout from '@/components/layout'
import LoadingScreen from '@/components/loading-screen'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FolderOpen, 
  Users, 
  User, 
  LogOut, 
  ChevronRight,
  Plus,
  Settings,
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  Calendar
} from 'lucide-react'

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

interface Project {
  id: number
  name: string
  description?: string
  workspace_id: number
  owner_id: number
  created_at: string
  updated_at?: string
  members_count?: number
  images_count?: number
}

interface WorkspaceMember {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: string
  joined_at: string
}

export default function WorkspaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const workspaceId = parseInt(params.workspaceId as string)

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Create project modal
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  
  // Manage workspace modal
  const [showManageWorkspace, setShowManageWorkspace] = useState(false)
  const [editWorkspaceName, setEditWorkspaceName] = useState('')
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  useEffect(() => {
    // Wait for auth to be determined before proceeding
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      
      
      const timer = setTimeout(() => {
        setIsPageLoading(false)
      }, 500)
      
      if (workspaceId) {
        loadWorkspace()
        loadProjects()
        loadMembers()
      }
      
      return () => clearTimeout(timer)
    }
  }, [user, authLoading, workspaceId, router])

  const loadWorkspace = async () => {
    try {
      const workspaceData = await api.getWorkspace(workspaceId)
      setWorkspace(workspaceData)
      setEditWorkspaceName(workspaceData.name)
      setEditWorkspaceDescription(workspaceData.description || '')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load workspace')
      }
    }
  }

  const loadProjects = async () => {
    try {
      const projectsData = await api.getProjects(workspaceId)
      setProjects(projectsData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load projects')
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  const loadMembers = async () => {
    try {
      const membersData = await api.getWorkspaceMembers(workspaceId)
      setMembers(membersData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load members')
      }
    }
  }

  const handleCreateProject = async () => {
    try {
      const project = await api.createProject({
        name: newProjectName,
        description: newProjectDescription,
        workspace_id: workspaceId
      })
      setProjects([...projects, project])
      setShowCreateProject(false)
      setNewProjectName('')
      setNewProjectDescription('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create project')
      }
    }
  }

  const handleUpdateWorkspace = async () => {
    try {
      const updatedWorkspace = await api.updateWorkspace(workspaceId, {
        name: editWorkspaceName,
        description: editWorkspaceDescription
      })
      setWorkspace(updatedWorkspace)
      setShowManageWorkspace(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to update workspace')
      }
    }
  }

  const handleInviteUser = async () => {
    try {
      await api.inviteUserToWorkspace(workspaceId, {
        email: inviteEmail,
        role: inviteRole
      })
      setInviteEmail('')
      setInviteRole('member')
      await loadMembers()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to invite user')
      }
    }
  }

  const handleRemoveMember = async (userId: number) => {
    try {
      await api.removeUserFromWorkspace(workspaceId, userId)
      await loadMembers()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to remove member')
      }
    }
  }

  const handleDeleteWorkspace = async () => {
    try {
      await api.deleteWorkspace(workspaceId)
      router.push('/home')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete workspace')
      }
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
    return <LoadingScreen message="Loading workspace..." />
  }

  if (isLoadingData) {
    return (
      <Layout currentPage="home">
        <div className="flex-1 p-6">
          <LoadingScreen message="Loading workspace data..." />
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="home">
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/home')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspaces
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{workspace?.name}</h1>
              {workspace?.description && (
                <p className="text-muted-foreground mt-2">{workspace.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowManageWorkspace(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Workspace
              </Button>
              <Button onClick={() => setShowCreateProject(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to start organizing your DICOM images and annotations.
              </p>
              <Button onClick={() => setShowCreateProject(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <FolderOpen className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-200" />
                    <Badge variant={project.owner_id === user?.id ? "default" : "secondary"}>
                      {project.owner_id === user?.id ? "Owner" : "Member"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{project.members_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4" />
                        <span>{project.images_count || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your DICOM images and annotations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="project-description">Description (Optional)</Label>
                <Input
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Workspace Modal */}
        <Dialog open={showManageWorkspace} onOpenChange={setShowManageWorkspace}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Workspace</DialogTitle>
              <DialogDescription>
                Update workspace details and manage team members.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={editWorkspaceName}
                    onChange={(e) => setEditWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">Description</Label>
                  <Input
                    id="workspace-description"
                    value={editWorkspaceDescription}
                    onChange={(e) => setEditWorkspaceDescription(e.target.value)}
                    placeholder="Enter workspace description"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowManageWorkspace(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateWorkspace}>
                    Save Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="px-3 py-2 border border-input rounded-md"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button onClick={handleInviteUser} disabled={!inviteEmail}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="danger" className="space-y-4">
                <div className="p-4 border border-destructive rounded-lg">
                  <h3 className="font-semibold text-destructive mb-2">Delete Workspace</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This action cannot be undone. This will permanently delete the workspace and all its projects.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteWorkspace}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Workspace
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
} 