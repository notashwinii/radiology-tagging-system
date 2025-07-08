'use client';

import React, { useEffect, useRef } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import dicomParser from 'dicom-parser';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import { useRouter } from 'next/navigation';
import cornerstoneMath from 'cornerstone-math';
import Hammer from 'hammerjs';

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

interface DicomViewerProps {
  imageId: string;
  imageDbId?: number;
  onAnnotationChange?: (annotations: any[]) => void;
  readOnly?: boolean;
  activeTool?: string; // NEW: tool name to activate
  onErase?: () => void; // NEW: callback for eraser
}

const DicomViewer: React.FC<DicomViewerProps> = ({ imageId, activeTool, onErase, onAnnotationChange }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  // Ensure cornerstone and tools are initialized only once on mount
  useEffect(() => {
    console.log('[DicomViewer] Initializing cornerstone and tools externals');
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneTools.external.Hammer = Hammer;

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

    (cornerstoneWADOImageLoader as any).configure({
      beforeSend: function(xhr: any) {
        const token = localStorage.getItem('access-token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      }
    });

    try {
      console.log('[DicomViewer] Initializing tools');
      cornerstoneTools.init({ mouseEnabled: true, touchEnabled: true });
    } catch (error) {
      // Already initialized
      console.log('[DicomViewer] Tools already initialized');
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    console.log('[DicomViewer] Enabling element', element);
    cornerstone.enable(element);

    // Use the standard wadouri loader
    const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/wado/${imageId}`;
    const cornerstoneImageId = `wadouri:${imageUrl}`;
    console.log('[DicomViewer] Loading image', cornerstoneImageId);

    (cornerstone.loadImage as unknown as (id: string) => Promise<any>)(cornerstoneImageId).then((image: any) => {
      console.log('[DicomViewer] Image loaded', image);
      cornerstone.displayImage(element, image);

      // Enable tools
      console.log('[DicomViewer] Adding tools...');
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
      cornerstoneTools.addTool(cornerstoneTools.LengthTool);
      cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
      cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
      cornerstoneTools.addTool(cornerstoneTools.BidirectionalTool);

      // Set tool active
      cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 }); // right mouse
      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 }); // middle mouse
      // Always set RectangleRoi as default annotation tool on left mouse
      console.log('[DicomViewer] Setting RectangleRoi as default tool');
      cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 }); // left mouse
    }).catch((err: any) => {
      console.error('[DicomViewer] Failed to load DICOM image:', err);
    });

    return () => {
      cornerstone.disable(element);
    };
  }, [imageId]);

  // Listen for activeTool changes
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (!activeTool) {
      // Always set RectangleRoi as default if no tool is selected
      cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
      return;
    }
    if (activeTool === 'Eraser') {
      // Eraser mode: do not set RectangleRoi as default, just set up eraser logic in separate effect
      return;
    }
    console.log('[DicomViewer] Setting active tool:', activeTool);
    cornerstoneTools.setToolActive(activeTool, { mouseButtonMask: 1 });
  }, [activeTool, onErase]);

  // Listen for annotation changes and call onAnnotationChange
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !onAnnotationChange) return;

    // List of all annotation tool names
    const toolNames = ['RectangleRoi', 'Length', 'EllipticalRoi', 'ArrowAnnotate', 'Bidirectional'];

    function collectAllAnnotations(): any[] {
      let all: any[] = [];
      for (const toolName of toolNames) {
        const toolState = cornerstoneTools.getToolState(element as HTMLElement, toolName);
        if (toolState && Array.isArray(toolState.data)) {
          all = all.concat(toolState.data.map((a: any) => ({ ...a, toolName })));
        }
      }
      return all;
    }

    function handleAnnotationChange() {
      const allAnnotations = collectAllAnnotations();
      if (onAnnotationChange) {
        onAnnotationChange(allAnnotations);
      }
    }

    // Listen to all relevant events
    (element as HTMLElement).addEventListener('cornerstonetoolsmeasurementadded', handleAnnotationChange);
    (element as HTMLElement).addEventListener('cornerstonetoolsmeasurementmodified', handleAnnotationChange);
    (element as HTMLElement).addEventListener('cornerstonetoolsmeasurementremoved', handleAnnotationChange);

    return () => {
      (element as HTMLElement).removeEventListener('cornerstonetoolsmeasurementadded', handleAnnotationChange);
      (element as HTMLElement).removeEventListener('cornerstonetoolsmeasurementmodified', handleAnnotationChange);
      (element as HTMLElement).removeEventListener('cornerstonetoolsmeasurementremoved', handleAnnotationChange);
    };
  }, [onAnnotationChange, imageId]);

  // Eraser mode: delete single annotation on click
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Set cursor to delete icon in eraser mode
    if (activeTool === 'Eraser') {
      (element as HTMLElement).style.cursor = 'not-allowed';
    } else {
      (element as HTMLElement).style.cursor = 'default';
    }

    if (activeTool !== 'Eraser') return;

    function handleClick(evt: MouseEvent) {
      if (!element) return;
      const rect = (element as HTMLElement).getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;
      const coords = { x, y };
      // List of all annotation tool names
      const toolNames = ['RectangleRoi', 'Length', 'EllipticalRoi', 'ArrowAnnotate', 'Bidirectional'];
      let deleted = false;
      for (const toolName of toolNames) {
        const toolState = cornerstoneTools.getToolState(element as HTMLElement, toolName);
        if (toolState && toolState.data && toolState.data.length > 0) {
          // Find the annotation under the mouse
          for (let i = 0; i < toolState.data.length; i++) {
            const annotation = toolState.data[i];
            const toolClass = (cornerstoneTools as any)[toolName + 'Tool'];
            if (toolClass && toolClass.prototype && toolClass.prototype.pointNearTool) {
              // pointNearTool expects (element, data, coords)
              // Use {x, y} object for coords
              const isNear = toolClass.prototype.pointNearTool(element as HTMLElement, annotation, coords);
              if (isNear) {
                console.log(`[Eraser] Deleting annotation from ${toolName} at index ${i}`, annotation);
                toolState.data.splice(i, 1); // Remove only this annotation
                cornerstone.updateImage(element as HTMLElement);
                deleted = true;
                break; // Only delete one annotation
              }
            }
          }
        }
        if (deleted) break; // Stop after deleting one annotation
      }
      if (!deleted) {
        console.log('[Eraser] No annotation found under cursor');
      }
    }
    (element as HTMLElement).addEventListener('mousedown', handleClick);
    return () => {
      (element as HTMLElement).removeEventListener('mousedown', handleClick);
      (element as HTMLElement).style.cursor = 'default';
    };
  }, [activeTool]);

  return (
    <div
      ref={elementRef}
      className="w-full h-full"
      style={{  background: 'black', border: '1px solid #ccc' }}
      tabIndex={0}
    />
  );
};

export default DicomViewer; 