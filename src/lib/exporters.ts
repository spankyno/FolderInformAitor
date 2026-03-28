import { FileSystemItem } from './types';

export const generateAsciiTree = (item: FileSystemItem, prefix = '', isLast = true, isRoot = true): string => {
  let result = '';
  
  if (isRoot) {
    result += item.name + '\n';
  } else {
    result += prefix + (isLast ? '└── ' : '├── ') + item.name + '\n';
  }

  if (item.children && item.children.length > 0) {
    const newPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
    const sortedChildren = [...item.children].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });

    sortedChildren.forEach((child, index) => {
      result += generateAsciiTree(child, newPrefix, index === sortedChildren.length - 1, false);
    });
  }

  return result;
};

export const generateJsonTree = (item: FileSystemItem): string => {
  return JSON.stringify(item, null, 2);
};

export const generateXmlTree = (item: FileSystemItem, indent = ''): string => {
  let xml = `${indent}<${item.type} name="${item.name}" size="${item.size}" path="${item.path}" extension="${item.extension}">\n`;
  
  if (item.children) {
    item.children.forEach(child => {
      xml += generateXmlTree(child, indent + '  ');
    });
  }
  
  xml += `${indent}</${item.type}>\n`;
  return xml;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
