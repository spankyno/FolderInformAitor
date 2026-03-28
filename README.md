# Folder InformAitor

Visualiza, analiza y exporta cualquier estructura de carpetas desde local, GitHub o archivos ZIP.

## Funcionalidades

- **Carga de Estructura**:
  - **Carpeta Local**: Usa la File System Access API para seleccionar carpetas directamente.
  - **GitHub**: Pega la URL de un repositorio y obtén su estructura completa.
  - **Archivo ZIP**: Descomprime y visualiza el contenido de archivos ZIP en el navegador.
- **Visualización**:
  - Árbol visual interactivo y colapsable con iconos.
  - Vista ASCII compatible con Markdown (├──, └──, │).
- **Configuración**:
  - Mostrar/ocultar tamaño de archivos.
  - Mostrar/ocultar fecha de modificación.
  - Filtrar por extensión de archivo.
  - Mostrar/ocultar archivos ocultos.
- **Exportación**:
  - **PNG**: Captura de pantalla del árbol visual.
  - **TXT**: Árbol en texto plano.
  - **ASCII**: Árbol con caracteres de caja para README.md.
  - **JSON**: Estructura completa en formato JSON.
  - **XML**: Estructura completa en formato XML.

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/spankyno/folder-informaitor.git
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Tecnologías Utilizadas

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **JSZip** (para archivos ZIP)
- **html2canvas-pro** (para exportar a PNG)
- **Lucide React** (iconos)
- **Motion** (animaciones)

---

Desarrollado por **Aitor Sánchez Gutiérrez** © 2026
