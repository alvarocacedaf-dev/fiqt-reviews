export type FileDescriptor = {
  file_name: string;
  mime_type: string | null;
};

export function formatFileType(file: FileDescriptor) {
  const mimeType = file.mime_type?.toLowerCase() ?? '';
  const extension = file.file_name.split('.').pop()?.toLowerCase() ?? '';

  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF';
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword' || ['doc', 'docx'].includes(extension)) return 'WORD';
  if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel') || ['xls', 'xlsx', 'xlsm', 'csv'].includes(extension)) return 'EXCEL';
  if (mimeType.includes('presentationml') || mimeType.includes('ms-powerpoint') || ['ppt', 'pptx'].includes(extension)) return 'POWERPOINT';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension)) return 'IMAGEN';
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'm4v'].includes(extension)) return 'VIDEO';
  if (mimeType === 'application/zip' || extension === 'zip') return 'ZIP';
  return 'ARCHIVO';
}
