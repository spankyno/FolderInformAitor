import JSZip from 'jszip';
import { FileSystemItem, getExtension } from './types';

export const loadFromZip = async (file: File): Promise<FileSystemItem> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  const root: FileSystemItem = {
    name: file.name.replace('.zip', ''),
    type: 'directory',
    size: file.size,
    path: '',
    extension: '',
    children: [],
  };

  const itemsMap: Record<string, FileSystemItem> = { '': root };

  for (const [path, zipEntry] of Object.entries(contents.files)) {
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!itemsMap[currentPath]) {
        const newItem: FileSystemItem = {
          name: part,
          type: zipEntry.dir || (!isLast) ? 'directory' : 'file',
          size: zipEntry.dir ? 0 : (await zipEntry.async('uint8array')).length,
          path: currentPath,
          extension: zipEntry.dir ? '' : getExtension(part),
          children: zipEntry.dir || (!isLast) ? [] : undefined,
        };
        itemsMap[currentPath] = newItem;
        itemsMap[parentPath].children?.push(newItem);
      }
    }
  }

  return root;
};

export const loadFromGitHub = async (repoUrl: string, branch = 'main'): Promise<FileSystemItem> => {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('URL de GitHub no válida');
  const [_, owner, repo] = match;

  // Use our server-side proxy to avoid CORS and connection resets
  const response = await fetch(`/api/github-proxy?owner=${owner}&repo=${repo}&branch=${branch}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 403) throw new Error('Límite de API de GitHub excedido o repositorio privado');
    if (response.status === 404) throw new Error(`No se encontró el repositorio o la rama "${branch}".`);
    throw new Error(errorData.message || 'No se pudo cargar el repositorio. Verifica la URL.');
  }

  const data = await response.json();
  const root: FileSystemItem = {
    name: repo,
    type: 'directory',
    size: 0,
    path: '',
    extension: '',
    children: [],
  };

  const itemsMap: Record<string, FileSystemItem> = { '': root };

  for (const item of data.tree) {
    const parts = item.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!itemsMap[currentPath]) {
        const newItem: FileSystemItem = {
          name: part,
          type: item.type === 'tree' || (!isLast) ? 'directory' : 'file',
          size: item.size || 0,
          path: currentPath,
          extension: item.type === 'tree' ? '' : getExtension(part),
          children: item.type === 'tree' || (!isLast) ? [] : undefined,
        };
        itemsMap[currentPath] = newItem;
        itemsMap[parentPath].children?.push(newItem);
      }
    }
  }

  return root;
};

export const loadFromDirectoryPicker = async (): Promise<FileSystemItem> => {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Tu navegador no soporta File System Access API');
  }

  const handle = await (window as any).showDirectoryPicker();
  
  const processHandle = async (handle: any, path = ''): Promise<FileSystemItem> => {
    const item: FileSystemItem = {
      name: handle.name,
      type: handle.kind === 'directory' ? 'directory' : 'file',
      size: 0,
      path: path ? `${path}/${handle.name}` : handle.name,
      extension: handle.kind === 'directory' ? '' : getExtension(handle.name),
    };

    if (handle.kind === 'directory') {
      item.children = [];
      for await (const entry of handle.values()) {
        item.children.push(await processHandle(entry, item.path));
      }
    } else {
      const file = await handle.getFile();
      item.size = file.size;
      item.lastModified = file.lastModified;
    }

    return item;
  };

  return await processHandle(handle);
};

export const loadFromFileInput = async (files: FileList): Promise<FileSystemItem> => {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) throw new Error('No se seleccionaron archivos');

  // Find common root
  const firstPath = (fileArray[0] as any).webkitRelativePath || fileArray[0].name;
  const rootName = firstPath.split('/')[0];

  const root: FileSystemItem = {
    name: rootName,
    type: 'directory',
    size: 0,
    path: rootName,
    extension: '',
    children: [],
  };

  const itemsMap: Record<string, FileSystemItem> = { [rootName]: root };

  for (const file of fileArray) {
    const relativePath = (file as any).webkitRelativePath || file.name;
    const parts = relativePath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!itemsMap[currentPath]) {
        const newItem: FileSystemItem = {
          name: part,
          type: !isLast ? 'directory' : 'file',
          size: isLast ? file.size : 0,
          path: currentPath,
          extension: isLast ? getExtension(part) : '',
          lastModified: isLast ? file.lastModified : undefined,
          children: !isLast ? [] : undefined,
        };
        itemsMap[currentPath] = newItem;
        if (parentPath) {
          itemsMap[parentPath].children?.push(newItem);
        }
      }
    }
  }

  return root;
};
