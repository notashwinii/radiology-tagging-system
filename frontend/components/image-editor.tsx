"use client"

import React, { useState, useEffect } from 'react'
import { api, Image, Folder, User } from '../lib/api'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Edit, Trash2, FolderOpen, User as UserIcon } from 'lucide-react'

interface ImageEditorProps {
  image: Image
  projectMembers: Array<{
    user_id: number
    email: string
    first_name?: string
    last_name?: string
    role: string
    joined_at: string
  }>
  folders: Folder[]
  onImageUpdate: (updatedImage: Image) => void
  onImageDelete: (imageId: number) => void
}

export function ImageEditor({ image, projectMembers, folders, onImageUpdate, onImageDelete }: ImageEditorProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignedUserId, setAssignedUserId] = useState<string>(image.assigned_user_id?.toString() || "unassigned")
  const [selectedFolderId, setSelectedFolderId] = useState<string>(image.folder_id?.toString() || "root")

  const handleUpdateImage = async () => {
    setLoading(true)
    setError(null)

    try {
      const updatedImage = await api.updateImage(image.id, {
        assigned_user_id: assignedUserId && assignedUserId !== "unassigned" ? parseInt(assignedUserId) : undefined,
        folder_id: selectedFolderId !== "root" ? parseInt(selectedFolderId) : undefined
      })
      
      onImageUpdate(updatedImage)
      setShowEditDialog(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update image')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteImage = async () => {
    setLoading(true)
    setError(null)

    try {
      await api.deleteImage(image.id)
      onImageDelete(image.id)
      setShowDeleteDialog(false)
    } catch (err: any) {
      setError(err.message || 'Failed to delete image')
    } finally {
      setLoading(false)
    }
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

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowEditDialog(true)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit Image Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
            <DialogDescription>
              Update image assignment and folder location.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Image ID</Label>
              <Input value={image.id} disabled />
            </div>
            
            <div>
              <Label>Orthanc ID</Label>
              <Input value={image.orthanc_id} disabled />
            </div>

            <div>
              <Label htmlFor="assigned-user">Assign to (Optional)</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {projectMembers.map((member) => (
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
                value={selectedFolderId} 
                onValueChange={setSelectedFolderId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
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

            <div>
              <Label>Uploaded by</Label>
              <Input value={`${image.uploader.first_name} ${image.uploader.last_name} (${image.uploader.email})`} disabled />
            </div>

            <div>
              <Label>Upload Date</Label>
              <Input value={new Date(image.created_at).toLocaleString()} disabled />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateImage} disabled={loading}>
              {loading ? 'Updating...' : 'Update Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Image Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Image ID</Label>
              <Input value={image.id} disabled />
            </div>
            
            <div>
              <Label>Orthanc ID</Label>
              <Input value={image.orthanc_id} disabled />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 