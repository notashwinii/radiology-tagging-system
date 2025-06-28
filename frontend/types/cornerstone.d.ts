declare module 'cornerstone-core' {
  export function enable(element: HTMLElement): void;
  export function disable(element: HTMLElement): void;
  export function loadImage(imageId: string): { promise: Promise<any> };
  export function displayImage(element: HTMLElement, image: any): void;
  export function getDefaultViewportForImage(element: HTMLElement, image: any): any;
  export function setViewport(element: HTMLElement, viewport: any): void;
  export function reset(element: HTMLElement): void;
  export function updateImage(element: HTMLElement): void;
  export function registerImageLoader(scheme: string, imageLoader: any): void;
}

declare module 'cornerstone-math' {
  export const point: {
    distance: (p1: any, p2: any) => number;
  };
}

declare module 'cornerstone-tools' {
  export const external: {
    cornerstone: any;
    cornerstoneMath: any;
    Hammer: any;
  };
  
  export function init(options: { mouseEnabled: boolean; touchEnabled: boolean }): void;
  export function addTool(tool: any): void;
  export function setToolActive(toolName: string, options: { mouseButtonMask: number }): void;
  export function clearToolState(element: HTMLElement, toolName: string): void;
  
  export const WwwcTool: any;
  export const PanTool: any;
  export const ZoomTool: any;
  export const LengthTool: any;
  export const ArrowAnnotateTool: any;
  export const BidirectionalTool: any;
  export const EllipticalRoiTool: any;
  export const RectangleRoiTool: any;
}

declare module 'cornerstone-wado-image-loader' {
  export const external: {
    cornerstone: any;
    dicomParser: any;
  };
  
  export const webWorkerManager: {
    initialize: (options: any) => void;
  };
  
  export const wadouri: {
    loadImage: (imageId: string) => Promise<any>;
  };
}

declare module 'dicom-parser' {
  export function parseDicom(arrayBuffer: ArrayBuffer): any;
}

declare module 'hammerjs' {
  const Hammer: any;
  export default Hammer;
} 