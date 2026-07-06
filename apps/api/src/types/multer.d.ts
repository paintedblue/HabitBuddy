declare module 'multer' {
  export interface File {
    originalname: string;
    mimetype: string;
    filename: string;
    size: number;
  }

  export function diskStorage(options: {
    destination: (request: unknown, file: File, callback: (error: Error | null, destination: string) => void) => void;
    filename: (request: unknown, file: File, callback: (error: Error | null, filename: string) => void) => void;
  }): unknown;
}
