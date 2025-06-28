'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneTools from 'cornerstone-tools';
import Hammer from 'hammerjs';
import dicomParser from 'dicom-parser';

// Initialize Cornerstone
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.external.Hammer = Hammer;

// Register the custom image loader
cornerstone.registerImageLoader('custom', customImageLoader);

// Custom image loader for our backend DICOM URLs
function customImageLoader(imageId: string) {
  return {
    promise: new Promise((resolve, reject) => {
      // Extract the Orthanc ID from the custom:// URL scheme
      const orthancId = imageId.replace('custom://', '');
      console.log('Loading DICOM with Orthanc ID:', orthancId);
      
      // Use the backend WADO endpoint to get real DICOM data
      const wadoUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/wado/${orthancId}`;
      console.log('WADO URL:', wadoUrl);
      
      fetch(wadoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access-token')}`,
        },
      })
      .then(response => {
        console.log('WADO Response status:', response.status);
        console.log('WADO Response headers:', response.headers);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        console.log('Received array buffer size:', arrayBuffer.byteLength);
        // Convert ArrayBuffer to Uint8Array for dicomParser
        const uint8Array = new Uint8Array(arrayBuffer);
        console.log('Converted to Uint8Array size:', uint8Array.length);
        
        // Parse DICOM data using dicomParser
        const dataSet = dicomParser.parseDicom(uint8Array);
        console.log('DICOM parsed successfully, dataset:', dataSet);
        
        // Extract image data from DICOM
        const rows = dataSet.uint16('x00280010') || 256; // Rows
        const columns = dataSet.uint16('x00280011') || 256; // Columns
        const bitsAllocated = dataSet.uint16('x00280100') || 8; // Bits Allocated
        const samplesPerPixel = dataSet.uint16('x00280002') || 1; // Samples per Pixel
        const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2'; // Photometric Interpretation
        
        console.log('DICOM metadata:', { rows, columns, bitsAllocated, samplesPerPixel, photometricInterpretation });
        
        // Get pixel data
        const pixelDataElement = dataSet.elements.x7fe00010;
        if (!pixelDataElement) {
          throw new Error('No pixel data found in DICOM');
        }
        
        const pixelData = new Uint8Array(arrayBuffer, pixelDataElement.dataOffset, pixelDataElement.length);
        console.log('Pixel data extracted, size:', pixelData.length);
        
        // Create image data object for Cornerstone
        const imageData = {
          imageId: imageId,
          minPixelValue: 0,
          maxPixelValue: Math.pow(2, bitsAllocated) - 1,
          slope: dataSet.float('x00281053') || 1, // Rescale Slope
          intercept: dataSet.float('x00281052') || 0, // Rescale Intercept
          windowCenter: dataSet.float('x00281050') || 128, // Window Center
          windowWidth: dataSet.float('x00281051') || 256, // Window Width
          getPixelData: () => pixelData,
          rows: rows,
          columns: columns,
          height: rows,
          width: columns,
          color: samplesPerPixel > 1,
          columnPixelSpacing: dataSet.float('x00280030') || 1, // Pixel Spacing
          rowPixelSpacing: dataSet.float('x00280030') || 1, // Pixel Spacing
          sizeInBytes: pixelData.length,
        };
        
        console.log('Image data created for Cornerstone:', imageData);
        resolve(imageData);
      })
      .catch(error => {
        console.error('Error loading DICOM:', error);
        reject(error);
      });
    })
  };
}

interface DicomViewerProps {
  imageId: string;
  onAnnotationChange?: (annotations: any[]) => void;
  readOnly?: boolean;
}

interface Annotation {
  id: string;
  type: string;
  data: any;
  position?: { x: number; y: number };
}

const DicomViewer: React.FC<DicomViewerProps> = ({ 
  imageId, 
  onAnnotationChange, 
  readOnly = false 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<string>('Wwwc');
  const [windowCenter, setWindowCenter] = useState<number>(400);
  const [windowWidth, setWindowWidth] = useState<number>(800);

  // Initialize tools
  useEffect(() => {
    if (!canvasRef.current) return;

    const element = canvasRef.current;
    
    // Initialize cornerstone
    cornerstone.enable(element);

    // Initialize tools
    cornerstoneTools.init({
      mouseEnabled: true,
      touchEnabled: true,
    });

    // Add tools
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
    cornerstoneTools.addTool(cornerstoneTools.BidirectionalTool);
    cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
    cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);

    // Set initial tool
    cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });

    return () => {
      cornerstone.disable(element);
    };
  }, []);

  // Load DICOM image
  useEffect(() => {
    if (!canvasRef.current || !imageId) return;
    const element = canvasRef.current;
    setIsLoading(true);
    setError(null);
    console.log('Starting to load DICOM image with ID:', imageId);
    
    // Create custom URL for the image
    const customUrl = `custom://${imageId}`;
    console.log('Custom URL for Cornerstone:', customUrl);
    
    // Load the image
    const imageLoadObject = cornerstone.loadImage(customUrl);
    console.log('Image load object:', imageLoadObject);
    
    // Handle both Promise and { promise: Promise } formats
    const imagePromise = imageLoadObject.promise || imageLoadObject;
    
    if (imagePromise && typeof imagePromise.then === 'function') {
      imagePromise
        .then((image: any) => {
          console.log('Image loaded successfully:', image);
          cornerstone.displayImage(element, image);
          // Set initial window/level
          const viewport = cornerstone.getDefaultViewportForImage(element, image);
          viewport.voi.windowCenter = windowCenter;
          viewport.voi.windowWidth = windowWidth;
          cornerstone.setViewport(element, viewport);
          setIsLoading(false);
          console.log('Image displayed successfully');
        })
        .catch((err: any) => {
          console.error('Error in image loading promise:', err);
          setError('Failed to load DICOM image');
          setIsLoading(false);
        });
    } else {
      console.error('Invalid image load object:', imageLoadObject);
      setError('Failed to load DICOM image');
      setIsLoading(false);
    }
  }, [imageId, windowCenter, windowWidth]);

  // Handle tool changes
  const handleToolChange = (tool: string) => {
    if (readOnly) return;
    
    setActiveTool(tool);
    
    // Deactivate all tools first
    cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('Length', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('ArrowAnnotate', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('Bidirectional', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('EllipticalRoi', { mouseButtonMask: 0 });
    cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 0 });

    // Activate selected tool
    switch (tool) {
      case 'Wwwc':
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'Pan':
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
        break;
      case 'Zoom':
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
        break;
      case 'Length':
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'ArrowAnnotate':
        cornerstoneTools.setToolActive('ArrowAnnotate', { mouseButtonMask: 1 });
        break;
      case 'Bidirectional':
        cornerstoneTools.setToolActive('Bidirectional', { mouseButtonMask: 1 });
        break;
      case 'EllipticalRoi':
        cornerstoneTools.setToolActive('EllipticalRoi', { mouseButtonMask: 1 });
        break;
      case 'RectangleRoi':
        cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
        break;
    }
  };

  // Handle window/level changes
  const handleWindowCenterChange = (value: number) => {
    setWindowCenter(value);
  };

  const handleWindowWidthChange = (value: number) => {
    setWindowWidth(value);
  };

  // Reset view
  const resetView = () => {
    if (!canvasRef.current) return;
    cornerstone.reset(canvasRef.current);
  };

  // Clear annotations
  const clearAnnotations = () => {
    if (!canvasRef.current) return;
    cornerstoneTools.clearToolState(canvasRef.current, 'Length');
    cornerstoneTools.clearToolState(canvasRef.current, 'ArrowAnnotate');
    cornerstoneTools.clearToolState(canvasRef.current, 'Bidirectional');
    cornerstoneTools.clearToolState(canvasRef.current, 'EllipticalRoi');
    cornerstoneTools.clearToolState(canvasRef.current, 'RectangleRoi');
    cornerstone.updateImage(canvasRef.current);
  };

  // Download DICOM
  const downloadDicom = () => {
    const link = document.createElement('a');
    link.href = `${process.env.NEXT_PUBLIC_API_URL}/images/download/${imageId}`;
    link.download = `dicom_${imageId}.dcm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tools = [
    { id: 'Wwwc', name: 'Window/Level', icon: '🔍' },
    { id: 'Pan', name: 'Pan', icon: '✋' },
    { id: 'Zoom', name: 'Zoom', icon: '🔎' },
    { id: 'Length', name: 'Length', icon: '📏' },
    { id: 'ArrowAnnotate', name: 'Arrow', icon: '➡️' },
    { id: 'Bidirectional', name: 'Bidirectional', icon: '↔️' },
    { id: 'EllipticalRoi', name: 'Ellipse', icon: '⭕' },
    { id: 'RectangleRoi', name: 'Rectangle', icon: '⬜' },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-100 p-2 border-b flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolChange(tool.id)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              } ${readOnly && tool.id !== 'Wwwc' && tool.id !== 'Pan' && tool.id !== 'Zoom' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={readOnly && tool.id !== 'Wwwc' && tool.id !== 'Pan' && tool.id !== 'Zoom'}
            >
              <span className="mr-1">{tool.icon}</span>
              {tool.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Window Center:</label>
            <input
              type="range"
              min="0"
              max="2000"
              value={windowCenter}
              onChange={(e) => handleWindowCenterChange(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-12">{windowCenter}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Window Width:</label>
            <input
              type="range"
              min="1"
              max="4000"
              value={windowWidth}
              onChange={(e) => handleWindowWidthChange(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-12">{windowWidth}</span>
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={resetView}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Reset View
          </button>
          {!readOnly && (
            <button
              onClick={clearAnnotations}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Annotations
            </button>
          )}
          <button
            onClick={downloadDicom}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Download DICOM
          </button>
        </div>
      </div>

      {/* DICOM Viewer */}
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="text-white text-lg">Loading DICOM image...</div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="text-red-500 text-lg">{error}</div>
          </div>
        )}

        <div
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 p-2 text-xs text-gray-600 border-t">
        <strong>Instructions:</strong> Use mouse to interact. Left click and drag for current tool. 
        {!readOnly && ' Annotations are automatically saved.'}
      </div>
    </div>
  );
};

export default DicomViewer; 