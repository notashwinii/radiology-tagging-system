"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Navigation } from "@/components/navigation"
import { UploadImagePage } from "@/components/upload-image-page"
import { DicomViewerPage } from "@/components/dicom-viewer-page"
import { AddUserPage } from "@/components/add-user-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Search, FileImage, Eye, Filter, Grid3X3, List, Upload } from "lucide-react"
import { format } from "date-fns"

interface DicomImage {
  id: string
  filename: string
  uploadDate: string
  size: string
  modality: string
  patientId: string
  studyDate: string
  annotations: number
  thumbnail: string
}

// Mock data
const mockImages: DicomImage[] = [
  {
    id: "1",
    filename: "chest_xray_001.dcm",
    uploadDate: "2024-01-15T10:30:00Z",
    size: "2.4 MB",
    modality: "CR",
    patientId: "PAT001",
    studyDate: "2024-01-15",
    annotations: 3,
    thumbnail: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "2",
    filename: "chest_xray_002.dcm",
    uploadDate: "2024-01-14T14:20:00Z",
    size: "2.1 MB",
    modality: "CR",
    patientId: "PAT002",
    studyDate: "2024-01-14",
    annotations: 1,
    thumbnail: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "3",
    filename: "chest_xray_003.dcm",
    uploadDate: "2024-01-13T09:15:00Z",
    size: "2.8 MB",
    modality: "CR",
    patientId: "PAT003",
    studyDate: "2024-01-13",
    annotations: 0,
    thumbnail: "/placeholder.svg?height=120&width=120",
  },
]

export function DashboardPage() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: async () => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return mockImages
    },
  })

  const filteredImages = images.filter(
    (image) =>
      image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.patientId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleImageSelect = (imageId: string) => {
    setSelectedImageId(imageId)
    setCurrentPage("viewer")
  }

  if (currentPage === "upload") {
    return <UploadImagePage onNavigate={setCurrentPage} />
  }

  if (currentPage === "viewer" && selectedImageId) {
    return <DicomViewerPage imageId={selectedImageId} onNavigate={setCurrentPage} />
  }

  if (currentPage === "add-user") {
    return <AddUserPage onNavigate={setCurrentPage} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DICOM Image Dashboard</h1>
          <p className="text-gray-600">Manage and annotate your medical imaging studies</p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by filename or patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Images</p>
                  <p className="text-2xl font-bold">{images.length}</p>
                </div>
                <FileImage className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Annotated</p>
                  <p className="text-2xl font-bold">{images.filter((img) => img.annotations > 0).length}</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{images.filter((img) => img.annotations === 0).length}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold">{(images.length * 2.4).toFixed(1)} MB</p>
                </div>
                <FileImage className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Images Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"
            }
          >
            {filteredImages.map((image) => (
              <Card
                key={image.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleImageSelect(image.id)}
              >
                <CardContent className={viewMode === "grid" ? "p-4" : "p-4 flex items-center space-x-4"}>
                  <div className={viewMode === "grid" ? "mb-3" : "flex-shrink-0"}>
                    <img
                      src={image.thumbnail || "/placeholder.svg"}
                      alt={`DICOM thumbnail for ${image.filename}`}
                      className={
                        viewMode === "grid"
                          ? "w-full h-32 object-cover rounded-md bg-gray-100"
                          : "w-16 h-16 object-cover rounded-md bg-gray-100"
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate mb-1">{image.filename}</h3>

                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Patient: {image.patientId}</p>
                      <p>Study: {format(new Date(image.studyDate), "MMM dd, yyyy")}</p>
                      <p>Size: {image.size}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <Badge variant={image.modality === "CR" ? "default" : "secondary"}>{image.modality}</Badge>

                      <div className="flex items-center space-x-2">
                        {image.annotations > 0 && (
                          <Badge variant="outline" className="text-green-600">
                            {image.annotations} annotations
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View image</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredImages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Try adjusting your search terms." : "Upload your first DICOM image to get started."}
            </p>
            <Button onClick={() => setCurrentPage("upload")}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
