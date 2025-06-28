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
  Trash2,
  Filter,
  Folder as FolderIcon,
  X,
  Archive
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
  
  // Filter states
  const [filterByFolder, setFilterByFolder] = useState<number | null>(null)
  const [filterByAssignment, setFilterByAssignment] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showFolderManager, setShowFolderManager] = useState(false)
  const [showFolderAssignment, setShowFolderAssignment] = useState(false)
  const [selectedFolderForAssignment, setSelectedFolderForAssignment] = useState<Folder | null>(null)
  const [folderAssignmentUserId, setFolderAssignmentUserId] = useState("")
  const [selectedImagesForExport, setSelectedImagesForExport] = useState<number[]>([])
  const [showBulkExport, setShowBulkExport] = useState(false)
  const [exporting, setExporting] = useState(false)

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

  const getFilteredImages = () => {
    let filtered = images

    // First filter by selected folder (if any)
    if (selectedFolderId !== null) {
      if (selectedFolderId === -1) {
        // Unknown (no folder)
        filtered = filtered.filter(img => !img.folder_id)
      } else if (selectedFolderId === -2) {
        // Assigned to Me
        filtered = filtered.filter(img => img.assigned_user_id === user?.id)
      } else {
        filtered = filtered.filter(img => img.folder_id === selectedFolderId)
      }
    }

    // Then apply additional filters
    if (filterByFolder !== null) {
      if (filterByFolder === -1) {
        // Unknown (no folder)
        filtered = filtered.filter(img => !img.folder_id)
      } else {
        filtered = filtered.filter(img => img.folder_id === filterByFolder)
      }
    }

    // Filter by assignment
    if (filterByAssignment !== null) {
      if (filterByAssignment === -1) {
        // Unassigned
        filtered = filtered.filter(img => !img.assigned_user_id)
      } else if (filterByAssignment === -2) {
        // Assigned to Me
        filtered = filtered.filter(img => img.assigned_user_id === user?.id)
      } else {
        filtered = filtered.filter(img => img.assigned_user_id === filterByAssignment)
      }
    }

    return filtered
  }

  const clearFilters = () => {
    setFilterByFolder(null)
    setFilterByAssignment(null)
  }

  const refreshFolders = async () => {
    if (!selectedProject) return
    try {
      const projectFolders = await api.getProjectFolders(selectedProject.id)
      setFolders(projectFolders)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to refresh folders")
      }
    }
  }

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project)
    setSelectedFolderId(null) // Reset folder selection when project changes
    // Reset filters when project changes
    setFilterByFolder(null)
    setFilterByAssignment(null)
    setShowFilters(false)
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

  const handleAssignFolder = async () => {
    if (!selectedFolderForAssignment || !folderAssignmentUserId) return
    
    try {
      let result
      if (selectedFolderForAssignment.id === -1) {
        // Unknown assignment
        result = await api.assignUnknownImages(selectedProject!.id, parseInt(folderAssignmentUserId))
      } else {
        // Specific folder assignment
        result = await api.assignFolderImages(selectedFolderForAssignment.id, parseInt(folderAssignmentUserId))
      }
      
      // Refresh images to show updated assignments
      const projectImages = await api.getImages(selectedProject!.id)
      setImages(projectImages)
      
      setShowFolderAssignment(false)
      setSelectedFolderForAssignment(null)
      setFolderAssignmentUserId("")
      
      // Show success message
      setError("")
      // You could add a success toast here
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to assign folder")
      }
    }
  }

  const handleBulkExport = async () => {
    if (selectedImagesForExport.length === 0) return
    
    try {
      setExporting(true)
      const blob = await api.bulkExportAnnotations(selectedImagesForExport)
      
      // Download the ZIP file
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `annotations_export_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setShowBulkExport(false)
      setSelectedImagesForExport([])
      setError("")
      // You could add a success toast here
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to export annotations")
      }
    } finally {
      setExporting(false)
    }
  }

  const toggleImageSelection = (imageId: number) => {
    setSelectedImagesForExport(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
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
              <Tabs defaultValue="images" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          {selectedFolderId ? 
                            `Images in "${folders.find(f => f.id === selectedFolderId)?.name || 'Unknown'}"` : 
                            'Project Images'
                          }
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {selectedFolderId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedFolderId(null)}
                            >
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Back to All
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFolderManager(true)}
                          >
                            <FolderIcon className="h-4 w-4 mr-2" />
                            Manage Folders
                          </Button>
                          <Dialog open={showUploadImage} onOpenChange={setShowUploadImage}>
                            <DialogTrigger asChild>
                              <Button>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Image
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Upload DICOM Image</DialogTitle>
                                <DialogDescription>
                                  Upload a DICOM image to this project. Only .dcm and .dicom files are supported.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Upload Mode</Label>
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      type="button"
                                      variant={uploadMode === 'single' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setUploadMode('single')}
                                    >
                                      Single File
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={uploadMode === 'bulk' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setUploadMode('bulk')}
                                    >
                                      Multiple Files
                                    </Button>
                                  </div>
                                </div>

                                {uploadMode === 'single' ? (
                                  <div>
                                    <Label htmlFor="file-upload">Select DICOM File</Label>
                                    <Input
                                      id="file-upload"
                                      type="file"
                                      accept=".dcm,.dicom"
                                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <Label htmlFor="files-upload">Select DICOM Files</Label>
                                    <Input
                                      id="files-upload"
                                      type="file"
                                      accept=".dcm,.dicom"
                                      multiple
                                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      </div>
                    </CardHeader>
                    
                    {/* Filter Section */}
                    <div className="px-6 py-4 border-b">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                          >
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                            {(filterByFolder !== null || filterByAssignment !== null) && (
                              <Badge variant="secondary" className="ml-2">
                                {(filterByFolder !== null ? 1 : 0) + (filterByAssignment !== null ? 1 : 0)}
                              </Badge>
                            )}
                          </Button>
                          {(filterByFolder !== null || filterByAssignment !== null) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearFilters}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getFilteredImages().length} of {images.length} images
                        </div>
                      </div>
                      
                      {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Filter by Folder</Label>
                            <Select value={filterByFolder?.toString() || "all"} onValueChange={(value) => setFilterByFolder(value === "all" ? null : value === "unknown" ? -1 : parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Folders</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                                {folders.map((folder) => (
                                  <SelectItem key={folder.id} value={folder.id.toString()}>
                                    {folder.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="filter-assignment">Filter by Assignment</Label>
                            <Select 
                              value={filterByAssignment === null ? "all" : filterByAssignment === -1 ? "unassigned" : filterByAssignment === -2 ? "assigned-to-me" : filterByAssignment.toString()} 
                              onValueChange={(value) => setFilterByAssignment(value === "all" ? null : value === "unassigned" ? -1 : value === "assigned-to-me" ? -2 : parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All assignments" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All assignments</SelectItem>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                <SelectItem value="assigned-to-me">Assigned to Me</SelectItem>
                                {selectedProject.members.map((member) => (
                                  <SelectItem key={member.user_id} value={member.user_id.toString()}>
                                    {member.first_name} {member.last_name} ({member.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <CardContent>
                      {!selectedFolderId ? (
                        // Show folders view
                        <div>
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-4">Folders</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Unknown Folder */}
                              <div 
                                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedFolderId(-1)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="h-5 w-5 text-blue-600" />
                                    <span className="font-medium">Unknown</span>
                                  </div>
                                  {isProjectAdmin(selectedProject) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedFolderForAssignment({ id: -1, name: "Unknown", project_id: selectedProject.id } as Folder)
                                        setShowFolderAssignment(true)
                                      }}
                                    >
                                      <UserPlus className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {images.filter(img => !img.folder_id).length} images
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Images not in any folder
                                </div>
                              </div>
                              
                              {/* Assigned to Me Folder */}
                              <div 
                                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-blue-50 border-blue-200"
                                onClick={() => setSelectedFolderId(-2)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-green-700">Assigned to Me</span>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {images.filter(img => img.assigned_user_id === user?.id).length} images
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Images assigned to you
                                </div>
                              </div>
                              
                              {/* Project Folders */}
                              {folders.map((folder) => (
                                <div 
                                  key={folder.id} 
                                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                  onClick={() => setSelectedFolderId(folder.id)}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <FolderIcon className="h-5 w-5 text-blue-600" />
                                      <span className="font-medium">{folder.name}</span>
                                    </div>
                                    {isProjectAdmin(selectedProject) && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedFolderForAssignment(folder)
                                          setShowFolderAssignment(true)
                                        }}
                                      >
                                        <UserPlus className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {images.filter(img => img.folder_id === folder.id).length} images
                                  </div>
                                  {folder.description && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {folder.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* All Images Summary */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">All Images</h3>
                            {getFilteredImages().length === 0 ? (
                              <p className="text-gray-500 text-center py-8">
                                {images.length === 0 ? "No images uploaded yet." : "No images match the current filters."}
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getFilteredImages().map((image) => (
                                  <div key={image.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleImageClick(image.id)}>
                                        <ImageIcon className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium">Image #{image.id}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={selectedImagesForExport.includes(image.id)}
                                          onChange={() => toggleImageSelection(image.id)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
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
                          </div>
                        </div>
                      ) : (
                        // Show images in selected folder
                        <div>
                          {selectedFolderId !== null && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                              <span 
                                className="cursor-pointer hover:text-blue-600"
                                onClick={() => setSelectedFolderId(null)}
                              >
                                {selectedProject.name}
                              </span>
                              <span>/</span>
                              <span>
                                {selectedFolderId === -1 ? "Unknown" : 
                                 selectedFolderId === -2 ? "Assigned to Me" :
                                 folders.find(f => f.id === selectedFolderId)?.name || "Unknown"}
                              </span>
                            </div>
                          )}
                          {getFilteredImages().length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                              {selectedFolderId === -2 
                                ? (images.filter(img => img.assigned_user_id === user?.id).length === 0 
                                    ? "No images assigned to you." 
                                    : "No images match the current filters.")
                                : (images.filter(img => selectedFolderId === -1 ? !img.folder_id : img.folder_id === selectedFolderId).length === 0 
                                    ? "No images in this folder." 
                                    : "No images match the current filters.")
                              }
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {getFilteredImages().map((image) => (
                                <div key={image.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleImageClick(image.id)}>
                                      <ImageIcon className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm font-medium">Image #{image.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedImagesForExport.includes(image.id)}
                                        onChange={() => toggleImageSelection(image.id)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Folder Management Dialog */}
                  <Dialog open={showFolderManager} onOpenChange={(open) => {
                    setShowFolderManager(open)
                    if (!open) {
                      refreshFolders()
                    }
                  }}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Manage Project Folders</DialogTitle>
                        <DialogDescription>
                          Create, edit, and organize folders for this project.
                        </DialogDescription>
                      </DialogHeader>
                      <FolderManager
                        projectId={selectedProject.id}
                        onFolderSelect={(folderId) => {
                          setSelectedFolderId(folderId)
                          setShowFolderManager(false)
                          refreshFolders()
                        }}
                        selectedFolderId={selectedFolderId}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  {/* Folder Assignment Dialog */}
                  <Dialog open={showFolderAssignment} onOpenChange={setShowFolderAssignment}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Folder to User</DialogTitle>
                        <DialogDescription>
                          Assign all images in "{selectedFolderForAssignment?.name}" to a team member.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Folder</Label>
                          <Input 
                            value={selectedFolderForAssignment?.name || ""} 
                            disabled 
                          />
                        </div>
                        
                        <div>
                          <Label>Number of Images</Label>
                          <Input 
                            value={
                              selectedFolderForAssignment?.id === -1 
                                ? images.filter(img => !img.folder_id).length.toString()
                                : images.filter(img => img.folder_id === selectedFolderForAssignment?.id).length.toString()
                            } 
                            disabled 
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="folder-assign-user">Assign to</Label>
                          <Select value={folderAssignmentUserId} onValueChange={setFolderAssignmentUserId}>
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
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFolderAssignment(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAssignFolder} 
                          disabled={!folderAssignmentUserId}
                        >
                          Assign Folder
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Bulk Export Dialog */}
                  <Dialog open={showBulkExport} onOpenChange={setShowBulkExport}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Bulk Export Annotations</DialogTitle>
                        <DialogDescription>
                          Export annotations for {selectedImagesForExport.length} selected images as a ZIP file.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Selected Images</Label>
                          <div className="bg-gray-50 border rounded p-3 max-h-40 overflow-y-auto">
                            {selectedImagesForExport.map(imageId => {
                              const image = images.find(img => img.id === imageId)
                              return (
                                <div key={imageId} className="text-sm text-gray-700">
                                  • Image #{imageId} {image?.orthanc_id && `(Orthanc: ${image.orthanc_id})`}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        
                        <div>
                          <Label>Export Format</Label>
                          <div className="text-sm text-gray-600 mt-1">
                            ZIP file containing individual JSON files for each image's annotations
                          </div>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkExport(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleBulkExport} 
                          disabled={exporting || selectedImagesForExport.length === 0}
                        >
                          {exporting ? 'Exporting...' : 'Export Annotations'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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