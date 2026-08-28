import type { AttachmentUpload } from '../types/document';

export const fileToAttachmentUpload = (file: File): Promise<AttachmentUpload> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Не удалось прочитать файл ${file.name}`));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const contentBase64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result;
      resolve({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        contentBase64,
      });
    };
    reader.readAsDataURL(file);
  });
