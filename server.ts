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

    try {
      let targetBranch = branch as string;

      // If no branch is specified, fetch repo info to get the default branch
      if (!targetBranch || targetBranch === "main") {
        const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            "User-Agent": "Folder-Tree-Visualizer-App",
            "Accept": "application/vnd.github.v3+json",
          }
        });

        if (repoInfoRes.ok) {
          const repoData = await repoInfoRes.json();
          targetBranch = repoData.default_branch;
        } else if (!targetBranch) {
          targetBranch = "main";
        }
      }

      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`;
      
      const response = await fetch(githubUrl, {
        headers: {
          "User-Agent": "Folder-Tree-Visualizer-App",
          "Accept": "application/vnd.github.v3+json",
        }
      });

      if (!response.ok) {
        if (response.status === 404 && targetBranch === "main") {
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
        
        const errorData = await response.json().catch(() => ({ message: "No se pudo encontrar el contenido del repositorio." }));
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
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
