"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/auth-context'
import { api, Image, ApiError, Folder } from '../lib/api'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Plus, 
  UserPlus, 
  UserMinus, 
  Upload, 
  ImageIcon, 
  FolderOpen,
  Eye,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import DicomImageDetail from "./dicom-image-detail"
import { FolderManager } from './folder-manager'
import { ImageEditor } from './image-editor'

interface Project {
  id: number
  name: string
  description?: string
  owner_id: number
  owner: {
    id: number
    email: string
    first_name?: string
    last_name?: string
  }
  members: Array<{
    user_id: number
    email: string
    first_name?: string
    last_name?: string
    role: string
    joined_at: string
  }>
  created_at: string
  updated_at: string
}

interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: string
}

export function ProjectDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [images, setImages] = useState<Image[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Dialog states
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [showUploadImage, setShowUploadImage] = useState(false)
  
  // Form states
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single')
  const [assignedUserId, setAssignedUserId] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      const [projectsData, usersData] = await Promise.all([
        api.getProjects(),
        api.getAllUsers()
      ])
      setProjects(projectsData)
      setAllUsers(usersData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to load dashboard")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    try {
      const project = await api.createProject({ name: newProjectName, description: newProjectDescription })
      setProjects([...projects, project])
      setShowCreateProject(false)
      setNewProjectName('')
      setNewProjectDescription('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to create project")
      }
    }
  }

  const handleInviteUser = async () => {
    if (!selectedProject) return
    
    try {
      await api.inviteUserToProject(selectedProject.id, {
        email: inviteEmail,
        role: inviteRole
      })
      setShowInviteUser(false)
      setInviteEmail("")
      setInviteRole("member")
      // Reload project to get updated members
      const updatedProject = await api.getProject(selectedProject.id)
      setSelectedProject(updatedProject)
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to invite user")
      }
    }
  }

  const handleRemoveUser = async (userId: number) => {
    if (!selectedProject) return
    
    try {
      await api.removeUserFromProject(selectedProject.id, userId)
      // Reload project to get updated members
      const updatedProject = await api.getProject(selectedProject.id)
      setSelectedProject(updatedProject)
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to remove user")
      }
    }
  }

  const handleUploadImage = async () => {
    if (uploadMode === 'single') {
      if (!selectedFile || !selectedProject) return
      
      try {
        const image = await api.uploadImage(
          selectedFile, 
          selectedProject.id,
          selectedFolderId || undefined,
          assignedUserId ? parseInt(assignedUserId) : undefined
        )
        setImages([...images, image])
        setShowUploadImage(false)
        setSelectedFile(null)
        setSelectedFolderId(null)
        setAssignedUserId("")
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to upload image")
        }
      }
    } else {
      // Bulk upload
      if (selectedFiles.length === 0 || !selectedProject) return
      
      try {
        const uploadedImages = await api.bulkUploadImages(
          selectedFiles,
          selectedProject.id,
          selectedFolderId || undefined,
          assignedUserId ? parseInt(assignedUserId) : undefined
        )
        setImages([...images, ...uploadedImages])
        setShowUploadImage(false)
        setSelectedFiles([])
        setSelectedFolderId(null)
        setAssignedUserId("")
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to upload images")
        }
      }
    }
  }

  const handleImageUpdate = (updatedImage: Image) => {
    setImages(images.map(img => img.id === updatedImage.id ? updatedImage : img))
  }

  const handleImageDelete = (imageId: number) => {
    setImages(images.filter(img => img.id !== imageId))
  }

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project)
    setSelectedFolderId(null) // Reset folder selection when project changes
    try {
      const projectImages = await api.getImages(project.id)
      setImages(projectImages)
      
      // Load folders for the project
      const projectFolders = await api.getProjectFolders(project.id)
      setFolders(projectFolders)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to load project images")
      }
    }
  }

  const handleFolderSelect = async (folderId: number | null) => {
    setSelectedFolderId(folderId)
    if (!selectedProject) return
    
    try {
      const folderImages = await api.getImages(selectedProject.id, folderId || undefined)
      setImages(folderImages)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to load folder images")
      }
    }
  }

  const handleDeleteProject = async (projectId: number) => {
    try {
      await api.deleteProject(projectId)
      setProjects(projects.filter(p => p.id !== projectId))
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
        setImages([])
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to delete project")
      }
    }
  }

  const isProjectOwner = (project: Project) => project.owner_id === user?.id
  const isProjectAdmin = (project: Project) => {
    const member = project.members.find(m => m.user_id === user?.id)
    return member?.role === 'owner' || member?.role === 'admin'
  }

  const handleImageClick = (imageId: number) => {
    router.push(`/dicom-viewer/${imageId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Radiology Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.first_name || user?.email}</p>
          </div>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Projects
                  </CardTitle>
                  <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                          Create a new project to organize your DICOM images and collaborate with team members.
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No projects yet. Create your first project!</p>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProject?.id === project.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{project.name}</h3>
                            {project.description && (
                              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={isProjectOwner(project) ? "default" : "secondary"}>
                                {isProjectOwner(project) ? "Owner" : "Member"}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {project.members.length} members
                              </span>
                            </div>
                          </div>
                          {isProjectOwner(project) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProject(project.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />                      
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="folders">Folders</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedProject.name}</CardTitle>
                      <CardDescription>{selectedProject.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{images.length}</div>
                          <div className="text-sm text-gray-600">Total Images</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{selectedProject.members.length}</div>
                          <div className="text-sm text-gray-600">Team Members</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="images" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Project Images</CardTitle>
                          {selectedFolderId && (
                            <div className="text-sm text-gray-600 mt-1">
                              Current folder: {folders.find(f => f.id === selectedFolderId)?.name || 'Unknown'}
                            </div>
                          )}
                        </div>
                        <Dialog open={showUploadImage} onOpenChange={setShowUploadImage}>
                          <DialogTrigger asChild>
                            <Button>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload DICOM Image{uploadMode === 'bulk' ? 's' : ''}</DialogTitle>
                              <DialogDescription>
                                Upload DICOM image{uploadMode === 'bulk' ? 's' : ''} to this project. You can optionally assign {uploadMode === 'bulk' ? 'them' : 'it'} to a team member.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Upload Mode Toggle */}
                              <div className="flex items-center space-x-4">
                                <Label className="text-sm font-medium">Upload Mode:</Label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="single-mode"
                                    name="upload-mode"
                                    value="single"
                                    checked={uploadMode === 'single'}
                                    onChange={(e) => {
                                      setUploadMode(e.target.value as 'single' | 'bulk')
                                      setSelectedFile(null)
                                      setSelectedFiles([])
                                    }}
                                    className="mr-1"
                                  />
                                  <Label htmlFor="single-mode" className="text-sm">Single File</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="bulk-mode"
                                    name="upload-mode"
                                    value="bulk"
                                    checked={uploadMode === 'bulk'}
                                    onChange={(e) => {
                                      setUploadMode(e.target.value as 'single' | 'bulk')
                                      setSelectedFile(null)
                                      setSelectedFiles([])
                                    }}
                                    className="mr-1"
                                  />
                                  <Label htmlFor="bulk-mode" className="text-sm">Multiple Files</Label>
                                </div>
                              </div>

                              {/* File Input */}
                              <div>
                                <Label htmlFor="image-file">DICOM File{uploadMode === 'bulk' ? 's' : ''}</Label>
                                {uploadMode === 'single' ? (
                                  <Input
                                    id="image-file"
                                    type="file"
                                    accept=".dcm,.dicom"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                  />
                                ) : (
                                  <Input
                                    id="image-files"
                                    type="file"
                                    accept=".dcm,.dicom"
                                    multiple
                                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                                  />
                                )}
                                {uploadMode === 'bulk' && selectedFiles.length > 0 && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    Selected {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="assigned-user">Assign to (Optional)</Label>
                                <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a team member" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedProject.members.map((member) => (
                                      <SelectItem key={member.user_id} value={member.user_id.toString()}>
                                        {member.first_name} {member.last_name} ({member.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="folder-select">Folder (Optional)</Label>
                                <Select 
                                  value={selectedFolderId?.toString() || "root"} 
                                  onValueChange={(value) => setSelectedFolderId(value === "root" ? null : parseInt(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a folder" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="root">Root Level</SelectItem>
                                    {folders.map((folder) => (
                                      <SelectItem key={folder.id} value={folder.id.toString()}>
                                        {folder.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowUploadImage(false)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleUploadImage} 
                                disabled={
                                  (uploadMode === 'single' && !selectedFile) || 
                                  (uploadMode === 'bulk' && selectedFiles.length === 0)
                                }
                              >
                                Upload {uploadMode === 'bulk' ? 'Images' : 'Image'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {images.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No images uploaded yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {images.map((image) => (
                            <div key={image.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleImageClick(image.id)}>
                                  <ImageIcon className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm font-medium">Image #{image.id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-blue-500 cursor-pointer" onClick={() => handleImageClick(image.id)} />
                                  {isProjectAdmin(selectedProject) && (
                                    <ImageEditor
                                      image={image}
                                      projectMembers={selectedProject.members}
                                      folders={folders}
                                      onImageUpdate={handleImageUpdate}
                                      onImageDelete={handleImageDelete}
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>Orthanc ID: {image.orthanc_id}</div>
                                <div>Uploaded: {new Date(image.created_at).toLocaleDateString()}</div>
                                {image.assigned_user_id && (
                                  <div className="text-blue-600">
                                    Assigned to: {allUsers.find(u => u.id === image.assigned_user_id)?.email}
                                  </div>
                                )}
                                {image.folder_id && (
                                  <div className="text-green-600">
                                    Folder: {folders.find(f => f.id === image.folder_id)?.name || 'Unknown'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="folders" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Folders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FolderManager
                        projectId={selectedProject.id}
                        onFolderSelect={handleFolderSelect}
                        selectedFolderId={selectedFolderId}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Project Members</CardTitle>
                        {isProjectAdmin(selectedProject) && (
                          <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
                            <DialogTrigger asChild>
                              <Button>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite User
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Invite User to Project</DialogTitle>
                                <DialogDescription>
                                  Invite a user to join this project by their email address.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="invite-email">Email Address</Label>
                                  <Input
                                    id="invite-email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="user@example.com"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="invite-role">Role</Label>
                                  <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowInviteUser(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleInviteUser} disabled={!inviteEmail}>
                                  Send Invitation
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedProject.members.map((member) => (
                          <div key={member.user_id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {member.first_name} {member.last_name}
                                </span>
                                <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'}>
                                  {member.role}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                              <div className="text-xs text-gray-400">
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </div>
                            </div>
                            {isProjectAdmin(selectedProject) && member.role !== 'owner' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveUser(member.user_id)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
                  <p className="text-gray-600">Select a project from the sidebar to view its details and manage its content.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 