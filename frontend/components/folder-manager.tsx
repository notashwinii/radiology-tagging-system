"use client"

import React, { useState, useEffect } from 'react'
import { api, Folder, ApiError } from '../lib/api'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Edit,
  Trash2,
  FileImage,
  FolderTree
} from 'lucide-react'

interface FolderManagerProps {
  projectId: number
  onFolderSelect?: (folderId: number | null) => void
  selectedFolderId?: number | null
}

export function FolderManager({ projectId, onFolderSelect, selectedFolderId }: FolderManagerProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showEditFolder, setShowEditFolder] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDescription, setNewFolderDescription] = useState('')
  const [parentFolderId, setParentFolderId] = useState<string>('')

  useEffect(() => {
    loadFolders()
  }, [projectId])

  const loadFolders = async () => {
    try {
      setLoading(true)
      const projectFolders = await api.getProjectFolders(projectId)
      setFolders(projectFolders)
      setError(null)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load folders')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const folder = await api.createFolder({
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || undefined,
        project_id: projectId,
        parent_folder_id: parentFolderId && parentFolderId !== "root" ? parseInt(parentFolderId) : undefined
      })
      
      setFolders([...folders, folder])
      setShowCreateFolder(false)
      setNewFolderName('')
      setNewFolderDescription('')
      setParentFolderId('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create folder')
      }
    }
  }

  const handleEditFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return

    try {
      const updatedFolder = await api.updateFolder(editingFolder.id, {
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || undefined,
        parent_folder_id: parentFolderId && parentFolderId !== "root" ? parseInt(parentFolderId) : undefined
      })
      
      setFolders(folders.map(f => f.id === updatedFolder.id ? updatedFolder : f))
      setShowEditFolder(false)
      setEditingFolder(null)
      setNewFolderName('')
      setNewFolderDescription('')
      setParentFolderId('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to update folder')
      }
    }
  }

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Are you sure you want to delete this folder? All images will be moved to the parent folder.')) {
      return
    }

    try {
      await api.deleteFolder(folderId)
      setFolders(folders.filter(f => f.id !== folderId))
      if (selectedFolderId === folderId) {
        onFolderSelect?.(null)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete folder')
      }
    }
  }

  const startEditFolder = (folder: Folder) => {
    setEditingFolder(folder)
    setNewFolderName(folder.name)
    setNewFolderDescription(folder.description || '')
    setParentFolderId(folder.parent_folder_id?.toString() || 'root')
    setShowEditFolder(true)
  }

  const getFolderPath = (folder: Folder): string => {
    const path: string[] = [folder.name]
    let currentFolder = folder
    
    while (currentFolder.parent_folder_id) {
      const parent = folders.find(f => f.id === currentFolder.parent_folder_id)
      if (parent) {
        path.unshift(parent.name)
        currentFolder = parent
      } else {
        break
      }
    }
    
    return path.join(' / ')
  }

  const getRootFolders = () => {
    return folders.filter(f => !f.parent_folder_id)
  }

  const getSubfolders = (parentId: number) => {
    return folders.filter(f => f.parent_folder_id === parentId)
  }

  const renderFolderTree = (parentId: number | null = null, level: number = 0) => {
    const folderList = parentId === null ? getRootFolders() : getSubfolders(parentId)
    
    return folderList.map(folder => (
      <div key={folder.id} style={{ marginLeft: `${level * 20}px` }}>
        <Card 
          className={`mb-2 cursor-pointer transition-colors ${
            selectedFolderId === folder.id ? 'border-primary bg-accent' : 'hover:bg-accent'
          }`}
          onClick={() => onFolderSelect?.(folder.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderIcon className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">{folder.name}</div>
                  <div className="text-xs text-muted-foreground">{getFolderPath(folder)}</div>
                  {folder.description && (
                    <div className="text-xs text-muted-foreground mt-1">{folder.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <FileImage className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{folder.image_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FolderTree className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{folder.subfolder_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditFolder(folder)
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFolder(folder.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {renderFolderTree(folder.id, level + 1)}
      </div>
    ))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center">Loading folders...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Folders</h3>
        </div>
        <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
          <DialogTrigger asChild>
            <Button size="sm">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Create a new folder to organize your images.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
              </div>
              <div>
                <Label htmlFor="folder-description">Description (Optional)</Label>
                <Input
                  id="folder-description"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                />
              </div>
              <div>
                <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
                <Select value={parentFolderId || "root"} onValueChange={setParentFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Root Level</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id.toString()}>
                        {getFolderPath(folder)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create Folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {folders.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              No folders created yet. Create your first folder to organize images.
            </CardContent>
          </Card>
        ) : (
          renderFolderTree()
        )}
      </div>

      {/* Edit Folder Dialog */}
      <Dialog open={showEditFolder} onOpenChange={setShowEditFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update folder details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="edit-folder-description">Description (Optional)</Label>
              <Input
                id="edit-folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Enter folder description"
              />
            </div>
            <div>
              <Label htmlFor="edit-parent-folder">Parent Folder (Optional)</Label>
              <Select value={parentFolderId || "root"} onValueChange={setParentFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root Level</SelectItem>
                  {folders.filter(f => f.id !== editingFolder?.id).map((folder) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {getFolderPath(folder)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditFolder} disabled={!newFolderName.trim()}>
              Update Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 