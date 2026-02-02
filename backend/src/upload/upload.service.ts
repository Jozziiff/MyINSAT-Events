import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { extname } from 'path';

type FolderType = 'users' | 'events' | 'clubs' | 'others' | 'default';

const FOLDER_PATTERNS: Record<FolderType, RegExp> = {
  users: /\/(users?|profile)/i,
  events: /\/events?/i,
  clubs: /\/clubs?/i,
  others: /.*/,
  default: /.*/,
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;
  private readonly bucketName: string;
  private readonly baseStorageUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    this.supabaseKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_BUCKET', 'uploads');
    this.baseStorageUrl = `${this.supabaseUrl}/storage/v1/object`;
  }

  async saveFile(
    file: Express.Multer.File,
    req?: Request,
    subfolder?: string,
  ): Promise<string> {
    const folder = subfolder ?? this.detectFolder(req);
    const filePath = this.generateFilePath(folder, file.originalname);

    await this.uploadToSupabase(filePath, file.buffer, file.mimetype);

    return `${this.baseStorageUrl}/public/${this.bucketName}/${filePath}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const filePath = this.extractFilePath(fileUrl);
    if (!filePath) return;

    try {
      await fetch(`${this.baseStorageUrl}/${this.bucketName}/${filePath}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${filePath}`, error);
    }
  }

  private detectFolder(req?: Request): FolderType {
    if (!req) return 'default';

    const referer = req.get('referer') ?? '';
    const url = req.originalUrl ?? req.url ?? '';

    for (const [folder, pattern] of Object.entries(FOLDER_PATTERNS) as [FolderType, RegExp][]) {
      if (folder === 'others' || folder === 'default') continue;
      if (pattern.test(referer) || pattern.test(url)) return folder;
    }

    return 'others';
  }

  private generateFilePath(folder: string, originalName: string): string {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(originalName);
    return `${folder}/${uniqueSuffix}${ext}`;
  }

  private async uploadToSupabase(
    filePath: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<void> {
    const uploadUrl = `${this.baseStorageUrl}/${this.bucketName}/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': mimetype,
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Supabase Storage upload error', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  private extractFilePath(fileUrl: string): string | null {
    const publicPrefix = `/storage/v1/object/public/${this.bucketName}/`;
    const startIndex = fileUrl.indexOf(publicPrefix);
    return startIndex !== -1 ? fileUrl.substring(startIndex + publicPrefix.length) : null;
  }

  private getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.supabaseKey}` };
  }
}
