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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, ArrowLeft } from 'lucide-react'

export default function UploadImagePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [assignedUser, setAssignedUser] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const { user } = useAuth()
  const router = useRouter()
  const [fileError, setFileError] = useState('')
  const [projectError, setProjectError] = useState('')
  const [folderError, setFolderError] = useState('')

  // Load projects and users on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, usersData] = await Promise.all([
          api.getProjects(),
          api.getAllUsers()
        ])
        setProjects(projectsData)
        setUsers(usersData)
      } catch (err) {
        setError('Failed to load data')
      }
    }
    loadData()
  }, [])

  const handleProjectChange = async (projectId: string) => {
    setSelectedProject(projectId)
    setSelectedFolder('')
    setFolders([])
    
    if (projectId) {
      try {
        const projectFolders = await api.getProjectFolders(parseInt(projectId))
        setFolders(projectFolders)
      } catch (err) {
        setError('Failed to load folders')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let hasError = false
    setFileError('')
    setProjectError('')
    setFolderError('')

    if (!selectedFile) {
      setFileError('File is required')
      hasError = true
    }
    if (!selectedProject) {
      setProjectError('Project is required')
      hasError = true
    }
    if (!selectedFolder) {
      setFolderError('Folder is required')
      hasError = true
    }
    if (hasError) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!selectedFile) return; // type guard for TS
      await api.uploadImage(
        selectedFile,
        parseInt(selectedProject),
        parseInt(selectedFolder),
        assignedUser ? parseInt(assignedUser) : undefined
      )
      setSuccess('Image uploaded successfully!')
      setSelectedFile(null)
      setSelectedProject('')
      setSelectedFolder('')
      setAssignedUser('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to upload image')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-primary">Upload DICOM Image</h1>
        </div>

        <Card className="bg-secondary">
          <CardHeader>
            <CardTitle className="text-primary">Upload New Image</CardTitle>
            <CardDescription className="text-secondary">
              Upload a DICOM image to a project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="file">DICOM File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".dcm,.dicom"
                  onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setFileError(''); }}
                  required
                  className={`input${fileError ? ' ring-2 ring-red-500' : ''}`}
                />
                {fileError && <div className="text-red-500 text-xs mt-1">{fileError}</div>}
                <p className="text-sm text-secondary">
                  Only .dcm and .dicom files are supported
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={selectedProject} onValueChange={(v) => { handleProjectChange(v); setProjectError(''); }} required>
                  <SelectTrigger className={`input${projectError ? ' ring-2 ring-red-500' : ''}`}>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projectError && <div className="text-red-500 text-xs mt-1">{projectError}</div>}
              </div>
              
              {selectedProject && (
                <div className="space-y-2">
                  <Label htmlFor="folder">Folder <span className="text-red-500">*</span></Label>
                  <Select value={selectedFolder} onValueChange={(v) => { setSelectedFolder(v); setFolderError(''); }} required>
                    <SelectTrigger className={`input${folderError ? ' ring-2 ring-red-500' : ''}`}>
                      <SelectValue placeholder="Select a folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {folderError && <div className="text-red-500 text-xs mt-1">{folderError}</div>}
                </div>
              )}
              
              {selectedProject && (
                <div className="space-y-2">
                  <Label htmlFor="assigned-user">Assign to User (Optional)</Label>
                  <Select value={assignedUser} onValueChange={setAssignedUser}>
                    <SelectTrigger className="input">
                      <SelectValue placeholder="Select a user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No assignment</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isLoading || !selectedFile || !selectedProject || !selectedFolder}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Uploading...' : 'Upload Image'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 