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
  AlertCircle
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

  useEffect(() => {
    if (!imageId || isNaN(imageId)) {
      setError('Invalid image ID');
      setLoading(false);
      return;
    }

    fetchImageDetails();
  }, [imageId]);

  const fetchImageDetails = async () => {
    try {
      const imageData = await api.getImage(imageId);
      setImage(imageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotationChange = async (annotations: any[]) => {
    try {
      console.log('Annotations changed:', annotations);
      // Annotations are now automatically saved by the DicomViewer component
      // This function can be used for additional processing if needed
    } catch (error) {
      console.error('Error handling annotation change:', error);
    }
  };

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
      const blob = await api.downloadImageAnnotations(imageId, format);
      const filename = `annotations_image_${imageId}.${format}`;
      await downloadFile(blob, filename);
      setSuccess(`Annotations downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to download annotations');
      }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-foreground">Loading DICOM image...</div>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-lg mb-4">{error || 'Image not found'}</div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-card-foreground">DICOM Image Viewer</h1>
            <div className="text-sm text-muted-foreground">
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
          <DicomViewer
            imageId={String(image.id)}
            onAnnotationChange={handleAnnotationChange}
            readOnly={false}
            imageDbId={image.id}
          />
        </div>

        {/* Sidebar - Image Details */}
        <div className="w-80 bg-card border-l border-border overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Image Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Uploader
                </label>
                <div className="text-sm text-card-foreground">
                  {image.uploader ? (
                    <>
                      {image.uploader.first_name} {image.uploader.last_name}
                      <br />
                      <span className="text-muted-foreground">{image.uploader.email}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unknown uploader</span>
                  )}
                </div>
              </div>

              {image.assigned_user && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Assigned To
                  </label>
                  <div className="text-sm text-card-foreground">
                    {image.assigned_user.first_name} {image.assigned_user.last_name}
                    <br />
                    <span className="text-muted-foreground">{image.assigned_user.email}</span>
                  </div>
                </div>
              )}

              {image.upload_time && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Upload Time
                  </label>
                  <div className="text-sm text-card-foreground">
                    {new Date(image.upload_time).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Export Information */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
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
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    DICOM Metadata
                  </label>
                  <div className="bg-muted border border-border rounded p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
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