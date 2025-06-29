'use client';

import React, { useEffect, useRef } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import dicomParser from 'dicom-parser';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import { useRouter } from 'next/navigation';

// Set up external dependencies
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// Initialize web workers for cornerstone-wado-image-loader
cornerstoneWADOImageLoader.webWorkerManager.initialize({
  maxWebWorkers: navigator.hardwareConcurrency || 1,
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      initializeCodecsOnStartup: false,
      usePDFJS: false,
    },
  },
});

// Add Authorization header to all DICOM requests
(cornerstoneWADOImageLoader as any).configure({
  beforeSend: function(xhr: any) {
    const token = localStorage.getItem('access-token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
  }
});

try {
  cornerstoneTools.init({ mouseEnabled: true, touchEnabled: true });
} catch (error) {
  // Already initialized
}

interface DicomViewerProps {
  imageId: string;
  imageDbId?: number;
  onAnnotationChange?: (annotations: any[]) => void;
  readOnly?: boolean;
}

const DicomViewer: React.FC<DicomViewerProps> = ({ imageId }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    cornerstone.enable(element);

    // Use the standard wadouri loader
    const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/wado/${imageId}`;
    const cornerstoneImageId = `wadouri:${imageUrl}`;

    (cornerstone.loadImage as unknown as (id: string) => Promise<any>)(cornerstoneImageId).then((image: any) => {
      cornerstone.displayImage(element, image);

      // Enable tools
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);

      cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 }); // right mouse
      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 }); // middle mouse
      cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 }); // left mouse
    }).catch((err: any) => {
      console.error('Failed to load DICOM image:', err);
    });

    return () => {
      cornerstone.disable(element);
    };
  }, [imageId]);

  return (
    <div
      ref={elementRef}
      style={{ width: 512, height: 512, background: 'black', border: '1px solid #ccc' }}
      tabIndex={0}
    />
  );
};

export default DicomViewer; 