import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || '';
    this.bucketName = this.configService.get<string>('SUPABASE_BUCKET') || 'uploads';
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables');
    }
  }

  async saveFile(
    file: Express.Multer.File,
    req?: Request,
    subfolder?: string,
  ): Promise<string> {
    // Determine subfolder from request path if not provided
    let folder = subfolder;
    if (!folder && req) {
      const url = req.originalUrl || req.url || '';
      if (url.includes('events')) folder = 'events';
      else if (url.includes('clubs')) folder = 'clubs';
      else if (url.includes('users')) folder = 'users';
      else folder = 'others';
    }
    if (!folder) folder = 'default';

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    const filePath = `${folder}/${filename}`;

    // Upload to Supabase Storage via REST API
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': file.mimetype,
      },
      body: file.buffer as any,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase Storage upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }

    // Return the public URL
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${filePath}`;
  }

  // Optional: Delete file from Supabase Storage
  async deleteFile(fileUrl: string): Promise<void> {
    // Extract file path from URL
    const publicPrefix = `/storage/v1/object/public/${this.bucketName}/`;
    const startIndex = fileUrl.indexOf(publicPrefix);
    if (startIndex === -1) return;

    const filePath = fileUrl.substring(startIndex + publicPrefix.length);
    const deleteUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${filePath}`;

    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.supabaseKey}`,
      },
    });
  }
}
