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

interface ProjectDashboardProps {
  projectId?: number
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [images, setImages] = useState<Image[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Dialog states
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [showUploadImage, setShowUploadImage] = useState(false)
  
  // Form states
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
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    if (!projectId) return
    
    try {
      setIsLoading(true)
      const [projectData, usersData, foldersData] = await Promise.all([
        api.getProject(projectId),
        api.getAllUsers(),
        api.getProjectFolders(projectId)
      ])
      setProject(projectData)
      setAllUsers(usersData)
      setFolders(foldersData)
      
      // Load images for the project
      const imagesData = await api.getImages(projectId)
      setImages(imagesData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to load project")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteUser = async () => {
    if (!project) return
    
    try {
      await api.inviteUserToProject(project.id, {
        email: inviteEmail,
        role: inviteRole
      })
      setShowInviteUser(false)
      setInviteEmail("")
      setInviteRole("member")
      // Reload project to get updated members
      const updatedProject = await api.getProject(project.id)
      setProject(updatedProject)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to invite user")
      }
    }
  }

  const handleRemoveUser = async (userId: number) => {
    if (!project) return
    
    try {
      await api.removeUserFromProject(project.id, userId)
      // Reload project to get updated members
      const updatedProject = await api.getProject(project.id)
      setProject(updatedProject)
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
      if (!selectedFile || !project) return
      
      try {
        const image = await api.uploadImage(
          selectedFile, 
          project.id,
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
      if (selectedFiles.length === 0 || !project) return
      
      try {
        const uploadedImages = await api.bulkUploadImages(
          selectedFiles,
          project.id,
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

    // Filter by folder
    if (filterByFolder !== null) {
      if (filterByFolder === -1) {
        // Unknown folder (no folder assigned)
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
        // Assigned to me
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
    if (!project) return
    try {
      const foldersData = await api.getProjectFolders(project.id)
      setFolders(foldersData)
    } catch (err) {
      console.error('Failed to refresh folders:', err)
    }
  }

  const handleFolderSelect = async (folderId: number | null) => {
    setSelectedFolderId(folderId)
    if (!project) return
    
    try {
      const imagesData = await api.getImages(project.id, folderId || undefined)
      setImages(imagesData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to load images")
      }
    }
  }

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteProject(projectId)
      router.push('/home')
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
    router.push(`/images/${imageId}`)
  }

  const handleAssignFolder = async () => {
    if (!selectedFolderForAssignment || !folderAssignmentUserId || !project) return

    try {
      if (selectedFolderForAssignment.id === -1) {
        // Assign unknown images
        await api.assignUnknownImages(project.id, parseInt(folderAssignmentUserId))
      } else {
        // Assign folder images
        await api.assignFolderImages(selectedFolderForAssignment.id, parseInt(folderAssignmentUserId))
      }
      
      setShowFolderAssignment(false)
      setSelectedFolderForAssignment(null)
      setFolderAssignmentUserId("")
      
      // Reload images
      const imagesData = await api.getImages(project.id, selectedFolderId || undefined)
      setImages(imagesData)
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
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `annotations_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setShowBulkExport(false)
      setSelectedImagesForExport([])
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-foreground">Loading project...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-foreground">Project not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isProjectOwner(project) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteProject(project.id)}
              >
                Delete Project
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Images</CardTitle>
                  <div className="flex gap-2">
                    {selectedImagesForExport.length > 0 && (
                      <Button
                        onClick={() => setShowBulkExport(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Export {selectedImagesForExport.length} Images
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowUploadImage(true)}
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Images
                    </Button>
                    <Button
                      onClick={() => setShowFolderManager(true)}
                      variant="outline"
                      size="sm"
                    >
                      <FolderIcon className="h-4 w-4 mr-2" />
                      Manage Folders
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedFolderId ? (
                  // Show folders view
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4">Folders</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Unknown Folder */}
                        <div 
                          className="card hover:bg-accent cursor-pointer"
                          onClick={() => handleFolderSelect(-1)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-5 w-5 text-blue-400" />
                              <span className="font-medium">Unknown</span>
                            </div>
                            {isProjectAdmin(project) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedFolderForAssignment({ id: -1, name: 'Unknown', project_id: project.id } as Folder)
                                  setShowFolderAssignment(true)
                                }}
                              >
                                <UserPlus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Images without folder assignment
                          </div>
                        </div>

                        {/* Assigned to Me Folder */}
                        <div 
                          className="card hover:bg-accent cursor-pointer"
                          onClick={() => setFilterByAssignment(-2)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-5 w-5 text-green-400" />
                              <span className="font-medium">Assigned to Me</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Images assigned to you
                          </div>
                        </div>

                        {/* Regular folders */}
                        {folders.map((folder) => (
                          <div 
                            key={folder.id}
                            className="card hover:bg-accent cursor-pointer"
                            onClick={() => handleFolderSelect(folder.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <FolderIcon className="h-5 w-5 text-orange-400" />
                                <span className="font-medium">{folder.name}</span>
                              </div>
                              {isProjectAdmin(project) && (
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
                            <div className="text-sm text-muted-foreground">
                              {folder.image_count || 0} images
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show images in selected folder
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFolderSelect(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Back to Folders
                        </Button>
                        <h3 className="text-lg font-semibold">
                          {selectedFolderId === -1 ? 'Unknown' : folders.find(f => f.id === selectedFolderId)?.name}
                        </h3>
                      </div>
                      
                      {/* Filters */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFilters(!showFilters)}
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                        </Button>
                        {(filterByFolder !== null || filterByAssignment !== null) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {showFilters && (
                      <div className="mb-4 p-4 border rounded-lg bg-muted">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Filter by Assignment</Label>
                            <Select value={filterByAssignment?.toString() || "all"} onValueChange={(value) => setFilterByAssignment(value === "all" ? null : parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue placeholder="All assignments" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All assignments</SelectItem>
                                <SelectItem value="-1">Unassigned</SelectItem>
                                <SelectItem value="-2">Assigned to me</SelectItem>
                                {allUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.first_name} {user.last_name} ({user.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active filters display */}
                    {(filterByFolder !== null || filterByAssignment !== null) && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {filterByAssignment !== null && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            Assignment: {filterByAssignment === -1 ? 'Unassigned' : filterByAssignment === -2 ? 'Assigned to me' : allUsers.find(u => u.id === filterByAssignment)?.email}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-1"
                              onClick={() => setFilterByAssignment(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Images grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {getFilteredImages().map((image) => (
                        <div key={image.id} className="relative">
                          <Card 
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleImageClick(image.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedImagesForExport.includes(image.id)}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      toggleImageSelection(image.id)
                                    }}
                                    className="rounded"
                                  />
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <ImageEditor 
                                  image={image} 
                                  onUpdate={handleImageUpdate}
                                  onDelete={handleImageDelete}
                                  allUsers={allUsers}
                                />
                              </div>
                              <div className="text-sm font-medium mb-1">{image.filename}</div>
                              <div className="text-xs text-muted-foreground">
                                Uploaded by: {image.uploader.first_name} {image.uploader.last_name}
                              </div>
                              {image.assigned_user && (
                                <div className="text-xs text-muted-foreground">
                                  Assigned to: {image.assigned_user.first_name} {image.assigned_user.last_name}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {new Date(image.created_at).toLocaleDateString()}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>

                    {getFilteredImages().length === 0 && (
                      <div className="text-center py-8">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No images found</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Project Members</CardTitle>
                  {isProjectAdmin(project) && (
                    <Button
                      onClick={() => setShowInviteUser(true)}
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.members.map((member) => (
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
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                      {isProjectAdmin(project) && member.role !== 'owner' && (
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
      </div>

      {/* Upload Image Dialog */}
      <Dialog open={showUploadImage} onOpenChange={setShowUploadImage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
            <DialogDescription>
              Upload DICOM images to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={uploadMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('single')}
              >
                Single Upload
              </Button>
              <Button
                variant={uploadMode === 'bulk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('bulk')}
              >
                Bulk Upload
              </Button>
            </div>
            
            {uploadMode === 'single' ? (
              <div>
                <Label htmlFor="file">Select DICOM File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".dcm,.dicom"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="files">Select DICOM Files</Label>
                <Input
                  id="files"
                  type="file"
                  accept=".dcm,.dicom"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Selected {selectedFiles.length} files
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="folder">Folder (Optional)</Label>
              <Select value={selectedFolderId?.toString() || "none"} onValueChange={(value) => setSelectedFolderId(value === "none" ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned-user">Assign to User (Optional)</Label>
              <Select value={assignedUserId || "none"} onValueChange={(value) => setAssignedUserId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.first_name} {user.last_name} ({user.email})
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
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
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

      {/* Folder Manager Dialog */}
      <Dialog open={showFolderManager} onOpenChange={setShowFolderManager}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Folders</DialogTitle>
            <DialogDescription>
              Create, edit, and organize folders for this project.
            </DialogDescription>
          </DialogHeader>
          <FolderManager 
            projectId={project.id}
            onFoldersChange={refreshFolders}
          />
        </DialogContent>
      </Dialog>

      {/* Folder Assignment Dialog */}
      <Dialog open={showFolderAssignment} onOpenChange={setShowFolderAssignment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Folder to User</DialogTitle>
            <DialogDescription>
              Assign all images in this folder to a user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder</Label>
              <div className="p-3 border rounded-lg bg-muted">
                {selectedFolderForAssignment?.name}
              </div>
            </div>
            <div>
              <Label htmlFor="folder-assignment-user">Assign to User</Label>
              <Select value={folderAssignmentUserId} onValueChange={setFolderAssignmentUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.first_name} {user.last_name} ({user.email})
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
            <Button onClick={handleAssignFolder} disabled={!folderAssignmentUserId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Export Dialog */}
      <Dialog open={showBulkExport} onOpenChange={setShowBulkExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Annotations</DialogTitle>
            <DialogDescription>
              Export annotations for {selectedImagesForExport.length} selected images.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create a ZIP file containing all annotations for the selected images.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkExport(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 