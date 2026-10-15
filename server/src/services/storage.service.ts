import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';

export interface UploadedFileResult {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  storagePath: string;
}

export interface IStorageService {
  saveFile(buffer: Buffer, originalName: string, mimetype: string, subfolder?: string): Promise<UploadedFileResult>;
  deleteFile(storagePath: string): Promise<boolean>;
  getFileUrl(filename: string, subfolder?: string): string;
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.upload.dir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    subfolder: string = ''
  ): Promise<UploadedFileResult> {
    const targetDir = subfolder ? path.join(this.baseDir, subfolder) : this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(originalName) || '.bin';
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(targetDir, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const relativeSub = subfolder ? `${subfolder}/` : '';
    const url = `/uploads/${relativeSub}${uniqueName}`;

    return {
      filename: uniqueName,
      originalName,
      mimetype,
      size: buffer.length,
      url,
      storagePath: filePath,
    };
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete file from storage:', err);
      return false;
    }
  }

  getFileUrl(filename: string, subfolder: string = ''): string {
    const relativeSub = subfolder ? `${subfolder}/` : '';
    return `/uploads/${relativeSub}${filename}`;
  }
}

export const storageService = new LocalStorageService();
