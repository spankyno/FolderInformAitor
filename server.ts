import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // GitHub Proxy to avoid CORS and connection resets in the browser
  app.get("/api/github-proxy", async (req, res) => {
    const { owner, repo, branch } = req.query;
    
    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo are required" });
    }

    const targetBranch = branch || "main";
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`;

    try {
      console.log(`Proxying request to: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Folder-Tree-Visualizer-App",
          "Accept": "application/vnd.github.v3+json",
        }
      });

      if (!response.ok) {
        // If main fails, try master as a fallback
        if (response.status === 404 && targetBranch === "main") {
          console.log("Main branch not found, trying master...");
          const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
          const masterResponse = await fetch(masterUrl, {
            headers: {
              "User-Agent": "Folder-Tree-Visualizer-App",
              "Accept": "application/vnd.github.v3+json",
            }
          });
          
          if (masterResponse.ok) {
            const data = await masterResponse.json();
            return res.json(data);
          }
        }
        
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
