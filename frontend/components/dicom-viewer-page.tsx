"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Square, Save, RotateCw, ZoomIn, ZoomOut, Move, Trash2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DicomViewerPageProps {
  imageId: string
  onNavigate: (page: string) => void
}

interface Annotation {
  id: string
  type: "rectangle"
  x: number
  y: number
  width: number
  height: number
  area: number
  meanValue: number
  maxValue: number
  stdDev: number
}

export function DicomViewerPage({ imageId, onNavigate }: DicomViewerPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<"pan" | "rectangle">("rectangle")
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const { toast } = useToast()

  // Mock image data
  const imageData = {
    id: imageId,
    filename: "chest_xray_001.dcm",
    patientId: "PAT001",
    studyDate: "2024-01-15",
    modality: "CR",
    dimensions: "2048x2048",
    pixelSpacing: "0.143mm",
  }

  useEffect(() => {
    // Initialize canvas and mock DICOM viewer
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 512
    canvas.height = 512

    // Draw mock DICOM image (chest X-ray simulation)
    drawMockDicomImage(ctx)
    drawAnnotations(ctx)
  }, [annotations, zoom, pan])

  const drawMockDicomImage = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Apply zoom and pan
    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(pan.x, pan.y)

    // Draw mock chest X-ray pattern
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 200)
    gradient.addColorStop(0, "#666666")
    gradient.addColorStop(0.5, "#333333")
    gradient.addColorStop(1, "#111111")

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    // Add some anatomical structures (simplified)
    ctx.fillStyle = "#444444"
    ctx.beginPath()
    ctx.ellipse(256, 200, 80, 120, 0, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = "#555555"
    ctx.beginPath()
    ctx.ellipse(200, 180, 30, 40, 0, 0, 2 * Math.PI)
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(312, 180, 30, 40, 0, 0, 2 * Math.PI)
    ctx.fill()

    ctx.restore()
  }

  const drawAnnotations = (ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(pan.x, pan.y)

    annotations.forEach((annotation, index) => {
      ctx.strokeStyle = "#ff0000"
      ctx.lineWidth = 2
      ctx.setLineDash([])

      ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)

      // Draw annotation label
      ctx.fillStyle = "#ff0000"
      ctx.font = "12px Arial"
      ctx.fillText(`ROI ${index + 1}`, annotation.x, annotation.y - 5)
    })

    ctx.restore()
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool !== "rectangle") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom - pan.x
    const y = (e.clientY - rect.top) / zoom - pan.y

    setIsDrawing(true)
    setStartPoint({ x, y })
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || currentTool !== "rectangle") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const endX = (e.clientX - rect.left) / zoom - pan.x
    const endY = (e.clientY - rect.top) / zoom - pan.y

    const width = Math.abs(endX - startPoint.x)
    const height = Math.abs(endY - startPoint.y)

    if (width > 10 && height > 10) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "rectangle",
        x: Math.min(startPoint.x, endX),
        y: Math.min(startPoint.y, endY),
        width,
        height,
        area: Math.round(width * height),
        meanValue: Math.round(Math.random() * 100 + 50),
        maxValue: Math.round(Math.random() * 50 + 150),
        stdDev: Math.round(Math.random() * 20 + 10),
      }

      setAnnotations((prev) => [...prev, newAnnotation])
      toast({
        title: "Annotation created",
        description: `ROI ${annotations.length + 1} added successfully.`,
      })
    }

    setIsDrawing(false)
    setStartPoint(null)
  }

  const handleSaveAnnotations = () => {
    // Mock save operation
    toast({
      title: "Annotations saved",
      description: `${annotations.length} annotation(s) saved successfully.`,
    })
  }

  const handleDeleteAnnotation = (annotationId: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId))
    toast({
      title: "Annotation deleted",
      description: "ROI annotation removed.",
    })
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.1))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="viewer" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => onNavigate("dashboard")} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">{imageData.filename}</h1>
              <p className="text-gray-600">
                Patient: {imageData.patientId} • Study: {imageData.studyDate}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline">{imageData.modality}</Badge>
            <Badge variant="outline">{imageData.dimensions}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Viewer */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <span>DICOM Viewer</span>
                  </CardTitle>

                  {/* Toolbar */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={currentTool === "pan" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentTool("pan")}
                    >
                      <Move className="h-4 w-4" />
                    </Button>

                    <Button
                      variant={currentTool === "rectangle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentTool("rectangle")}
                    >
                      <Square className="h-4 w-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-6" />

                    <Button variant="outline" size="sm" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" size="sm">
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="cursor-crosshair"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseUp={handleCanvasMouseUp}
                    style={{ width: "100%", height: "auto" }}
                  />

                  {/* Zoom indicator */}
                  <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                    Zoom: {Math.round(zoom * 100)}%
                  </div>

                  {/* Tool indicator */}
                  <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                    Tool: {currentTool === "rectangle" ? "Rectangle ROI" : "Pan"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Image Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>Image Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modality:</span>
                  <span>{imageData.modality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dimensions:</span>
                  <span>{imageData.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pixel Spacing:</span>
                  <span>{imageData.pixelSpacing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Study Date:</span>
                  <span>{imageData.studyDate}</span>
                </div>
              </CardContent>
            </Card>

            {/* Annotations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Annotations ({annotations.length})</CardTitle>
                  <Button onClick={handleSaveAnnotations} size="sm" disabled={annotations.length === 0}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {annotations.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No annotations yet. Use the Rectangle ROI tool to create annotations.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {annotations.map((annotation, index) => (
                      <div key={annotation.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">ROI {index + 1}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAnnotation(annotation.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Area:</span>
                            <span className="ml-1">{annotation.area} px²</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Mean:</span>
                            <span className="ml-1">{annotation.meanValue}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Max:</span>
                            <span className="ml-1">{annotation.maxValue}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Std Dev:</span>
                            <span className="ml-1">{annotation.stdDev}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>• Select Rectangle ROI tool</p>
                <p>• Click and drag to create annotations</p>
                <p>• View statistics in the sidebar</p>
                <p>• Save annotations when complete</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
