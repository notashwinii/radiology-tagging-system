"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Image, ApiError } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Database, 
  Archive,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Square,
  Ruler,
  Circle,
  ArrowUpRight,
  Move3D,
  Eraser
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../../../components/ui/dropdown-menu';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';

const DicomViewer = dynamic(() => import('../../../components/dicom-viewer'), { ssr: false });

export default function DicomViewerPage() {
  const params = useParams();
  const router = useRouter();
  const imageId = parseInt(params.imageId as string);
  
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]); // Store current annotations
  const [activeTool, setActiveTool] = useState('RectangleRoi');

  // Define fetchImageDetails before useEffect
  const fetchImageDetails = async (imgId: number) => {
    try {
      const imageData = await api.getImage(imgId);
      setImage(imageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!imageId || isNaN(imageId)) return;

    // Always fetch image details so the DICOM can load
    fetchImageDetails(imageId);

    // Load annotation state from backend
    api.loadAnnotationState(imageId).then(({ annotations, dicom_metadata }) => {
      setAnnotations(annotations);
      // Optionally set dicom_metadata if you want to display/restore it
    });
  }, [imageId]);

  const handleAnnotationChange = (annotations: any[]) => {
    setAnnotations(annotations);
  };

  // Helper to convert annotations to CSV
  function convertAnnotationsToCSV(annotations: any[]): string {
    if (!annotations.length) return '';
    const keys = Object.keys(annotations[0]);
    const header = keys.join(',');
    const rows = annotations.map(a => keys.map(k => JSON.stringify(a[k] ?? '')).join(','));
    return [header, ...rows].join('\n');
  }

  const handleBack = () => {
    router.back();
  };

  const downloadFile = async (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadDicom = async () => {
    try {
      setDownloading('dicom');
      const blob = await api.downloadDicomFile(imageId);
      const filename = `dicom_${image?.orthanc_id}.dcm`;
      await downloadFile(blob, filename);
      setSuccess('DICOM file downloaded successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to download DICOM');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAnnotations = async (format: 'json' | 'csv') => {
    try {
      setDownloading(`annotations-${format}`);
      let blob;
      if (format === 'json') {
        blob = new Blob([
          JSON.stringify({
            annotations,
            dicom_metadata: image?.dicom_metadata ?? null,
          }, null, 2)
        ], { type: 'application/json' });
      } else {
        // Convert annotations to CSV
        const csv = convertAnnotationsToCSV(annotations);
        blob = new Blob([csv], { type: 'text/csv' });
      }
      const filename = `annotations_image_${imageId}.${format}`;
      await downloadFile(blob, filename);
      setSuccess(`Annotations downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      setError('Failed to download annotations');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportDicomSeg = async () => {
    try {
      setDownloading('dicom-seg');
      const blob = await api.exportDicomSeg(imageId);
      const filename = `segmentation_${image?.orthanc_id}.dcm`;
      await downloadFile(blob, filename);
      setSuccess('DICOM-SEG file exported successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to export DICOM-SEG');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadWithAnnotations = async () => {
    try {
      setDownloading('image-with-annotations');
      const blob = await api.downloadImageWithAnnotations(imageId);
      const filename = `image_${imageId}_with_annotations.zip`;
      await downloadFile(blob, filename);
      setSuccess('Image with annotations downloaded successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to download image with annotations');
      }
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading DICOM image...</div>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error || 'Image not found'}</div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">DICOM Image Viewer</h1>
            <div className="text-sm text-gray-600">
              Image ID: {image.id} | Orthanc ID: {image.orthanc_id}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Download DICOM Button */}
          <Button 
            onClick={handleDownloadDicom} 
            variant="outline" 
            size="sm"
            disabled={downloading === 'dicom'}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading === 'dicom' ? 'Downloading...' : 'Download DICOM'}
          </Button>

          {/* Manual Save Annotations Button */}
          <Button
            onClick={async () => {
              if (image) {
                await api.saveAnnotationState(image.id, annotations, image.dicom_metadata, null); // explicitly pass null for tags
                setSuccess('Annotations saved!');
              }
            }}
            variant="outline"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Annotations
          </Button>

          {/* Export Annotations Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export Annotations
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Annotation Formats</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => handleDownloadAnnotations('json')}
                disabled={downloading === 'annotations-json'}
              >
                <Database className="h-4 w-4 mr-2" />
                {downloading === 'annotations-json' ? 'Downloading...' : 'JSON Format'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDownloadAnnotations('csv')}
                disabled={downloading === 'annotations-csv'}
              >
                <FileText className="h-4 w-4 mr-2" />
                {downloading === 'annotations-csv' ? 'Downloading...' : 'CSV Format'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Advanced Export</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={handleExportDicomSeg}
                disabled={downloading === 'dicom-seg'}
              >
                <Archive className="h-4 w-4 mr-2" />
                {downloading === 'dicom-seg' ? 'Exporting...' : 'DICOM-SEG File'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDownloadWithAnnotations}
                disabled={downloading === 'image-with-annotations'}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading === 'image-with-annotations' ? 'Downloading...' : 'Image + Annotations'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mx-6 mt-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mx-6 mt-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* DICOM Viewer */}
        <div className="flex-1">
          {/* Annotation Tool Toolbar */}
          <div className="flex gap-2 mb-2">
            <Button
              variant={activeTool === 'RectangleRoi' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setActiveTool('RectangleRoi')}
              title="Rectangle ROI"
            >
              <Square className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTool === 'Length' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setActiveTool('Length')}
              title="Length"
            >
              <Ruler className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTool === 'EllipticalRoi' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setActiveTool('EllipticalRoi')}
              title="Elliptical ROI"
            >
              <Circle className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTool === 'ArrowAnnotate' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setActiveTool('ArrowAnnotate')}
              title="Arrow Annotate"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTool === 'Bidirectional' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setActiveTool('Bidirectional')}
              title="Bidirectional"
            >
              <Move3D className="h-5 w-5" />
            </Button>
            <Button
              variant={activeTool === 'Eraser' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setActiveTool('Eraser')}
              title="Eraser (Clear All)"
            >
              <Eraser className="h-5 w-5" />
            </Button>
          </div>
          <DicomViewer
            imageId={String(image.id)}
            onAnnotationChange={handleAnnotationChange}
            readOnly={false}
            imageDbId={image.id}
            activeTool={activeTool}
            onErase={() => setActiveTool('RectangleRoi')}
          />
        </div>

        {/* Sidebar - Image Details */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Image Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uploader
                </label>
                <div className="text-sm text-gray-900">
                  {image.uploader ? (
                    <>
                      {image.uploader.first_name} {image.uploader.last_name}
                      <br />
                      <span className="text-gray-500">{image.uploader.email}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Unknown uploader</span>
                  )}
                </div>
              </div>

              {image.assigned_user && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <div className="text-sm text-gray-900">
                    {image.assigned_user.first_name} {image.assigned_user.last_name}
                    <br />
                    <span className="text-gray-500">{image.assigned_user.email}</span>
                  </div>
                </div>
              )}

              {image.upload_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Time
                  </label>
                  <div className="text-sm text-gray-900">
                    {new Date(image.upload_time).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Export Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Options
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>DICOM File</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Annotations (JSON)</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Annotations (CSV)</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>DICOM-SEG</span>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Image + Annotations</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                </div>
              </div>

              {image.dicom_metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DICOM Metadata
                  </label>
                  <div className="bg-gray-50 border rounded p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(image.dicom_metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 