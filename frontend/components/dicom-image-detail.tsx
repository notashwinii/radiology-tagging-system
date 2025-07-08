'use client';

import React, { useState } from 'react';
import DicomViewer from './dicom-viewer';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Download, 
  FileText, 
  Database, 
  Archive,
  ChevronDown,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';

interface Image {
  id: number;
  orthanc_id: string;
  uploader?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  upload_time?: string;
  dicom_metadata?: any;
}

interface DicomImageDetailProps {
  image: Image;
  onClose: () => void;
}

export default function DicomImageDetail({ image, onClose }: DicomImageDetailProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const blob = await api.downloadDicomFile(image.id);
      const filename = `dicom_${image.orthanc_id}.dcm`;
      await downloadFile(blob, filename);
      setSuccess('DICOM file downloaded successfully');
    } catch (err) {
      setError('Failed to download DICOM');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAnnotations = async (format: 'json' | 'csv') => {
    try {
      setDownloading(`annotations-${format}`);
      const blob = await api.downloadImageAnnotations(image.id, format);
      const filename = `annotations_image_${image.id}.${format}`;
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
      const blob = await api.exportDicomSeg(image.id);
      const filename = `segmentation_${image.orthanc_id}.dcm`;
      await downloadFile(blob, filename);
      setSuccess('DICOM-SEG file exported successfully');
    } catch (err) {
      setError('Failed to export DICOM-SEG');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadWithAnnotations = async () => {
    try {
      setDownloading('image-with-annotations');
      const blob = await api.downloadImageWithAnnotations(image.id);
      const filename = `image_${image.id}_with_annotations.zip`;
      await downloadFile(blob, filename);
      setSuccess('Image with annotations downloaded successfully');
    } catch (err) {
      setError('Failed to download image with annotations');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">DICOM Image Details</h2>
            <div className="text-sm text-muted-foreground mt-1">
              Image ID: {image.id} | Orthanc ID: {image.orthanc_id}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleDownloadDicom} 
              variant="outline" 
              size="sm"
              disabled={downloading === 'dicom'}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading === 'dicom' ? 'Downloading...' : 'Download DICOM'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Export
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

            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image Information */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Image Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">DICOM File</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Annotations (JSON)</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Annotations (CSV)</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">DICOM-SEG</span>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Image + Annotations</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* DICOM Metadata */}
            {image.dicom_metadata && (
              <Card className="bg-card mt-6">
                <CardHeader>
                  <CardTitle className="text-card-foreground">DICOM Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted border border-border rounded p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(image.dicom_metadata, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-muted border-l border-border overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 text-card-foreground">Quick Actions</h3>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleDownloadDicom} 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled={downloading === 'dicom'}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading === 'dicom' ? 'Downloading...' : 'Download DICOM'}
                </Button>

                <Button 
                  onClick={() => handleDownloadAnnotations('json')} 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled={downloading === 'annotations-json'}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {downloading === 'annotations-json' ? 'Downloading...' : 'Export JSON'}
                </Button>

                <Button 
                  onClick={() => handleDownloadAnnotations('csv')} 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled={downloading === 'annotations-csv'}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {downloading === 'annotations-csv' ? 'Downloading...' : 'Export CSV'}
                </Button>

                <Button 
                  onClick={handleExportDicomSeg} 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled={downloading === 'dicom-seg'}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {downloading === 'dicom-seg' ? 'Exporting...' : 'Export DICOM-SEG'}
                </Button>
              </div>

              {/* Status Messages */}
              {success && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-600">
                  {success}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 