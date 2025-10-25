// services/storageService.js
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class StorageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async downloadAndSaveImage(url, filename) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });

      const filePath = path.join(this.uploadDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  // SỬA LẠI: Xử lý multer buffer trực tiếp
  async saveMulterImage(multerFile, filename) {
    try {
      if (!multerFile || !multerFile.buffer) {
        throw new Error('Invalid multer file data');
      }

      const filePath = path.join(this.uploadDir, filename);
      await fs.writeFile(filePath, multerFile.buffer);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save multer image: ${error.message}`);
    }
  }

  // GIỮ LẠI cho base64 (nếu cần)
  async saveBase64Image(base64Data, filename) {
    try {
      const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 image data');
      }

      const imageBuffer = Buffer.from(matches[2], 'base64');
      const filePath = path.join(this.uploadDir, filename);
      
      await fs.writeFile(filePath, imageBuffer);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save base64 image: ${error.message}`);
    }
  }

  generateFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalName) || '.png';
    return `${timestamp}_${random}${ext}`;
  }

  getImageUrl(filename) {
    return `${this.baseUrl}/uploads/${filename}`;
  }

  validateImageUrl(url) {
    if (!url) return false;
    
    if (url.startsWith(this.baseUrl)) return true;
    
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  ensureFullUrl(url) {
    if (!url) return null;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `${this.baseUrl}${url}`;
    }
    
    return `${this.baseUrl}/${url}`;
  }
}

module.exports = new StorageService();