"use client"

import type React from "react"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, FileImage, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadImagePageProps {
  onNavigate: (page: string) => void
}

export function UploadImagePage({ onNavigate }: UploadImagePageProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [patientId, setPatientId] = useState("")
  const [studyDescription, setStudyDescription] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Mock upload with progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return { success: true }
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: `${selectedFiles.length} file(s) uploaded successfully.`,
      })
      queryClient.invalidateQueries({ queryKey: ["images"] })
      setSelectedFiles([])
      setPatientId("")
      setStudyDescription("")
      setUploadProgress(0)
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      })
      setUploadProgress(0)
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const dicomFiles = files.filter(
      (file) => file.name.toLowerCase().endsWith(".dcm") || file.type === "application/dicom",
    )

    if (dicomFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please select only DICOM (.dcm) files.",
        variant: "destructive",
      })
    }

    setSelectedFiles(dicomFiles)
  }

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one DICOM file to upload.",
        variant: "destructive",
      })
      return
    }

    if (!patientId.trim()) {
      toast({
        title: "Patient ID required",
        description: "Please enter a patient ID.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    selectedFiles.forEach((file) => formData.append("files", file))
    formData.append("patientId", patientId)
    formData.append("studyDescription", studyDescription)

    uploadMutation.mutate(formData)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="upload" onNavigate={onNavigate} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload DICOM Images</h1>
          <p className="text-gray-600">Upload medical imaging files for annotation and analysis</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>File Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Selection */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">DICOM Files</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".dcm,application/dicom"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                    <FileImage className="h-12 w-12 text-gray-400" />
                    <div>
                      <span className="text-blue-600 hover:text-blue-500 font-medium">Click to upload</span>
                      <span className="text-gray-600"> or drag and drop</span>
                    </div>
                    <p className="text-sm text-gray-500">DICOM files (.dcm) up to 50MB each</p>
                  </label>
                </div>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({selectedFiles.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileImage className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-id">Patient ID *</Label>
                  <Input
                    id="patient-id"
                    placeholder="Enter patient ID"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="study-description">Study Description</Label>
                  <Input
                    id="study-description"
                    placeholder="e.g., Chest X-ray PA/Lateral"
                    value={studyDescription}
                    onChange={(e) => setStudyDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload Progress */}
              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Upload Progress</Label>
                    <span className="text-sm text-gray-600">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => onNavigate("dashboard")}>
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={uploadMutation.isPending || selectedFiles.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Upload Guidelines */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Upload Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Supported Formats</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• DICOM files (.dcm)</li>
                  <li>• Maximum file size: 50MB</li>
                  <li>• Multiple files supported</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Ensure patient privacy compliance</li>
                  <li>• Use descriptive study descriptions</li>
                  <li>• Verify image quality before upload</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
