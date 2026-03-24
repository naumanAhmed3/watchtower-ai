declare module '@mediapipe/tasks-vision' {
  export class FaceDetector {
    static createFromOptions(vision: any, options: any): Promise<FaceDetector>;
    detect(image: any): { detections: Array<{ boundingBox: { originX: number; originY: number; width: number; height: number }; categories: Array<{ score: number }> }> };
  }
  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<any>;
  }
}
declare module 'onnxruntime-web' {
  export const env: { wasm: { wasmPaths: string } };
  export class InferenceSession {
    static create(path: string | ArrayBuffer, options?: any): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  }
  export class Tensor {
    constructor(type: string, data: Float32Array, dims: number[]);
    data: Float32Array;
  }
}
