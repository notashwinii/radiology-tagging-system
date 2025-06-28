'use client';

import React, { useState, useEffect } from 'react';
import DicomViewer from './dicom-viewer';
import { api, Image } from '../lib/api';

interface DicomImageDetailProps {
  imageId: number;
  onClose: () => void;
}

const DicomImageDetail: React.FC<DicomImageDetailProps> = ({ imageId, onClose }) => {
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="text-lg">Loading image...</div>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="text-red-500 text-lg">{error || 'Image not found'}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">DICOM Image Viewer</h2>
            <div className="text-sm text-gray-600 mt-1">
              Image ID: {image.id} | Orthanc ID: {image.orthanc_id}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
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
          <div className="w-80 bg-gray-50 border-l overflow-y-auto">
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
                    <div className="bg-white border rounded p-3 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(image.dicom_metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `${process.env.NEXT_PUBLIC_API_URL}/images/download/${image.id}`;
                    link.download = `dicom_${image.id}.dcm`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Download DICOM
                </button>
                
                <button
                  onClick={() => {
                    // TODO: Implement annotation export
                    console.log('Export annotations');
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Export Annotations
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DicomImageDetail; 