import { format } from 'date-fns';

export type FileSystemItem = {
  name: string;
  type: 'file' | 'directory';
  size: number;
  lastModified?: number;
  created?: number;
  path: string;
  extension: string;
  children?: FileSystemItem[];
};

export type AppConfig = {
  showSize: boolean;
  showCreated: boolean;
  showModified: boolean;
  showHidden: boolean;
  includeSubfolders: boolean;
  extensionFilter: string;
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (timestamp?: number) => {
  if (!timestamp) return 'N/A';
  return format(new Date(timestamp), 'dd/MM/yyyy HH:mm');
};

export const getExtension = (filename: string) => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};
