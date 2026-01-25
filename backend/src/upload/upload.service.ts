import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

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
    if (!folder) folder = 'default'; // fallback default

    const folderPath = join(this.uploadDir, folder);

    // Ensure directory exists
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    const filePath = join(folderPath, filename);

    // Save file
    await writeFile(filePath, file.buffer);

    // Return the URL path (relative to static serving)
    return `/uploads/${folder}/${filename}`;
  }
}
