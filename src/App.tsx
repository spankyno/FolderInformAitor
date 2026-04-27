import React, { useState, useMemo, useEffect } from 'react';
import { 
  Folder, File, ChevronRight, ChevronDown, 
  Search, Download, Github, FileArchive, 
  Upload, Settings2, Info, LayoutGrid, 
  FileText, Code, Camera, GithubIcon,
  Mail, Globe, ExternalLink, Trash2,
  Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { FileSystemItem, AppConfig, formatBytes, formatDate } from './lib/types';
import { loadFromZip, loadFromGitHub, loadFromDirectoryPicker, loadFromFileInput } from './lib/loaders';
import { generateAsciiTree, generateJsonTree, generateXmlTree, downloadFile } from './lib/exporters';
import { Button } from './components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card.tsx';
import { Input } from './components/ui/input.tsx';
import { Switch } from './components/ui/switch.tsx';
import { Label } from './components/ui/label.tsx';
import { ScrollArea } from './components/ui/scroll-area.tsx';
import { Separator } from './components/ui/separator.tsx';
import { Badge } from './components/ui/badge.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import { toast } from 'sonner';
import html2canvas from 'html2canvas-pro';
import { motion, AnimatePresence } from 'motion/react';

interface TreeItemProps {
  item: FileSystemItem;
  config: AppConfig;
  depth?: number;
}

const TreeItem: React.FC<TreeItemProps> = ({ 
  item, 
  config, 
  depth = 0 
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  
  if (!config.showHidden && item.name.startsWith('.')) return null;
  if (config.extensionFilter && item.type === 'file' && !item.extension.includes(config.extensionFilter.toLowerCase())) return null;

  const hasChildren = item.children && item.children.length > 0;
  const isDirectory = item.type === 'directory';

  return (
    <div className="select-none">
      <div 
        className="flex items-center py-1 px-2 hover:bg-blue-500/10 rounded-md cursor-pointer transition-colors group"
        onClick={() => isDirectory && setIsOpen(!isOpen)}
        style={{ paddingLeft: `${depth * 1.5}rem` }}
      >
        <span className="w-5 flex items-center justify-center text-muted-foreground">
          {isDirectory && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        
        <span className="mr-2">
          {isDirectory ? (
            <Folder size={18} className="text-blue-500 fill-blue-500/10" />
          ) : (
            <File size={18} className="text-muted-foreground" />
          )}
        </span>
        
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {item.name}
        </span>

        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {config.showSize && item.size > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {formatBytes(item.size)}
            </span>
          )}
          {config.showModified && item.lastModified && (
            <span className="text-[10px] text-muted-foreground">
              {formatDate(item.lastModified)}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && isDirectory && item.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
              })
              .map((child, i) => (
                <TreeItem key={`${child.path}-${i}`} item={child} config={config} depth={depth + 1} />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [rootItem, setRootItem] = useState<FileSystemItem | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [config, setConfig] = useState<AppConfig>({
    showSize: true,
    showCreated: false,
    showModified: true,
    showHidden: false,
    includeSubfolders: true,
    extensionFilter: '',
  });

  const stats = useMemo(() => {
    if (!rootItem) return { folders: 0, files: 0, size: 0 };
    
    let folders = 0;
    let files = 0;
    let size = 0;

    const traverse = (item: FileSystemItem) => {
      if (item.type === 'directory') {
        folders++;
        item.children?.forEach(traverse);
      } else {
        files++;
        size += item.size;
      }
    };

    traverse(rootItem);
    return { folders, files, size };
  }, [rootItem]);

  const handleLocalFolder = async () => {
    try {
      setIsLoading(true);
      const root = await loadFromDirectoryPicker();
      setRootItem(root);
      toast.success('Carpeta cargada correctamente');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error(error.message || 'Error al cargar la carpeta');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithub = async () => {
    if (!githubUrl) return toast.error('Ingresa una URL de GitHub');
    try {
      setIsLoading(true);
      const root = await loadFromGitHub(githubUrl);
      setRootItem(root);
      toast.success('Repositorio cargado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar el repositorio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsLoading(true);
      const root = await loadFromZip(file);
      setRootItem(root);
      toast.success('Archivo ZIP cargado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el ZIP');
    } finally {
      setIsLoading(false);
    }
  };

  const exportAsPng = async () => {
    const element = document.getElementById('folder-tree-container');
    if (!element) return;
    try {
      setIsLoading(true);
      
      // Temporary style adjustments for capture if needed
      const canvas = await html2canvas(element, {
        backgroundColor: theme === 'dark' ? '#020617' : '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('folder-tree-container');
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            
            // Reemplazar colores oklch por equivalentes compatibles (rgb/hsl)
            // ya que html2canvas-pro puede tener problemas con oklch
            const tempCanvas = clonedDoc.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
              const allElements = clonedElement.querySelectorAll('*');
              allElements.forEach((el: any) => {
                const style = clonedDoc.defaultView?.getComputedStyle(el);
                if (!style) return;
                
                const props = [
                  'color', 'background-color', 'border-color', 
                  'border-top-color', 'border-bottom-color', 
                  'border-left-color', 'border-right-color', 
                  'fill', 'stroke'
                ];
                
                props.forEach(prop => {
                  const value = style.getPropertyValue(prop);
                  if (value && value.includes('oklch')) {
                    try {
                      ctx.fillStyle = value;
                      el.style.setProperty(prop, ctx.fillStyle, 'important');
                    } catch (e) {
                      // Ignorar si el color no es válido
                    }
                  }
                });
              });
            }
          }
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `folder-structure-${rootItem?.name || 'export'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Imagen exportada correctamente');
    } catch (error: any) {
      console.error('Error exporting PNG:', error);
      toast.error(`Error al exportar imagen: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items) as DataTransferItem[];
    if (items.length === 0) return;

    const item = items[0];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        if (file.name.endsWith('.zip')) {
          try {
            setIsLoading(true);
            const root = await loadFromZip(file);
            setRootItem(root);
            toast.success('Archivo ZIP cargado correctamente');
          } catch (error: any) {
            toast.error(error.message || 'Error al procesar el ZIP');
          } finally {
            setIsLoading(false);
          }
        } else {
          // Fallback for files if needed, but we want folders
          toast.info('Arrastra una carpeta o un archivo ZIP');
        }
      }
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col font-sans text-foreground"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Folder className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Folder InformAitor</h1>
              <p className="text-xs text-muted-foreground font-medium">Visualiza, analiza y exporta cualquier estructura de carpetas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {rootItem && (
              <div className="hidden md:flex items-center gap-2 mr-4">
                <Button variant="outline" size="sm" onClick={exportAsPng} className="gap-2 border-border">
                  <Camera size={16} /> PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile(generateAsciiTree(rootItem), 'tree.txt', 'text/plain')} className="gap-2 border-border">
                  <FileText size={16} /> TXT
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile(generateJsonTree(rootItem), 'tree.json', 'application/json')} className="gap-2 border-border">
                  <LayoutGrid size={16} /> JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile(generateXmlTree(rootItem), 'tree.xml', 'application/xml')} className="gap-2 border-border">
                  <Code size={16} /> XML
                </Button>
              </div>
            )}
            
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
            )}

            <Button variant="ghost" size="icon" className="text-muted-foreground" asChild>
              <a href="https://github.com/spankyno" target="_blank" rel="noreferrer">
                <GithubIcon size={20} />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Controls */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/50 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload size={18} className="text-blue-600" /> Cargar Estructura
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Carpeta Local</Label>
                  <Button 
                    onClick={handleLocalFolder} 
                    className="w-full justify-start gap-3 bg-card hover:bg-muted text-foreground border-border shadow-none border"
                    variant="outline"
                    disabled={isLoading}
                  >
                    <Folder size={18} className="text-blue-500" /> Seleccionar Carpeta
                  </Button>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Repositorio GitHub</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://github.com/..." 
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="border-border focus-visible:ring-blue-500"
                    />
                    <Button onClick={handleGithub} size="icon" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Archivo ZIP</Label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".zip" 
                      onChange={handleZip}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isLoading}
                    />
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center group-hover:border-blue-400 group-hover:bg-blue-500/10 transition-all">
                      <FileArchive size={24} className="mx-auto text-muted-foreground group-hover:text-blue-500 mb-2" />
                      <p className="text-xs text-muted-foreground">Arrastra o selecciona un ZIP</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/50 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 size={18} className="text-blue-600" /> Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-size" className="text-sm font-medium text-foreground">Mostrar tamaño</Label>
                  <Switch 
                    id="show-size" 
                    checked={config.showSize} 
                    onCheckedChange={(v) => setConfig({...config, showSize: v})} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-modified" className="text-sm font-medium text-foreground">Mostrar modificación</Label>
                  <Switch 
                    id="show-modified" 
                    checked={config.showModified} 
                    onCheckedChange={(v) => setConfig({...config, showModified: v})} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-hidden" className="text-sm font-medium text-foreground">Archivos ocultos</Label>
                  <Switch 
                    id="show-hidden" 
                    checked={config.showHidden} 
                    onCheckedChange={(v) => setConfig({...config, showHidden: v})} 
                  />
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtrar por extensión</Label>
                  <Input 
                    placeholder="ej: .ts, .json" 
                    value={config.extensionFilter}
                    onChange={(e) => setConfig({...config, extensionFilter: e.target.value})}
                    className="border-border h-8 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {rootItem && (
              <Button 
                variant="ghost" 
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                onClick={() => setRootItem(null)}
              >
                <Trash2 size={16} /> Limpiar Todo
              </Button>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {!rootItem ? (
              <div className="h-[600px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-white/50">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                  <Search size={48} className="text-blue-500 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No hay estructura cargada</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Selecciona una carpeta local, un repositorio de GitHub o un archivo ZIP para comenzar a visualizar su contenido.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Bar */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-border shadow-sm bg-card">
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">{stats.folders}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Carpetas</span>
                    </CardContent>
                  </Card>
                  <Card className="border-border shadow-sm bg-card">
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">{stats.files}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Archivos</span>
                    </CardContent>
                  </Card>
                  <Card className="border-border shadow-sm bg-card">
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">{formatBytes(stats.size)}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tamaño Total</span>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} className="text-blue-600" />
                      <h3 className="font-bold text-lg">Vista Visual</h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono">
                        {rootItem.name}
                      </Badge>
                    </div>
                  </div>

                  <Card className="border-border shadow-sm overflow-hidden bg-card">
                    <ScrollArea className="h-[600px] w-full p-6">
                      <div id="folder-tree-container" className="bg-card p-8 border border-border rounded-xl">
                        <div id="visual-tree">
                          <TreeItem item={rootItem} config={config} />
                        </div>
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-md">
                  <Folder className="text-white" size={18} />
                </div>
                <span className="font-bold text-lg">Folder InformAitor</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Herramienta profesional para el análisis y exportación de estructuras de archivos. 
                Optimiza tus README.md y documentación técnica con un solo clic.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Contacto</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={16} className="text-blue-500" /> blog.cottage627@passinbox.com
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe size={16} className="text-blue-500" /> <a href="https://aitorsanchez.pages.dev/" target="_blank" rel="noreferrer" className="hover:text-blue-600 underline decoration-blue-200">aitorsanchez.pages.dev</a>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink size={16} className="text-blue-500" /> <a href="https://aitorhub.vercel.app/" className="hover:text-blue-600 underline decoration-blue-200">Más apps</a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Autor</h4>
              <p className="text-sm text-muted-foreground">Aitor Sánchez Gutiérrez</p>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Aitor Sánchez Gutiérrez © 2026 - Reservados todos los derechos
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
