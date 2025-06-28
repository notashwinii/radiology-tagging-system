"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Image } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Download, FileText } from 'lucide-react';

const DicomViewer = dynamic(() => import('../../../components/dicom-viewer'), { ssr: false });

export default function DicomViewerPage() {
  const params = useParams();
  const router = useRouter();
  const imageId = parseInt(params.imageId as string);
  
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAnnotationChange = (annotations: any[]) => {
    // TODO: Save annotations to backend
    console.log('Annotations changed:', annotations);
  };

  const handleBack = () => {
    router.back();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${process.env.NEXT_PUBLIC_API_URL}/images/download/${imageId}`;
    link.download = `dicom_${imageId}.dcm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download DICOM
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export Annotations
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* DICOM Viewer */}
        <div className="flex-1">
          <DicomViewer
            imageId={String(image.orthanc_id)}
            onAnnotationChange={handleAnnotationChange}
            readOnly={false}
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