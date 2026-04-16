import { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  const repo = url.searchParams.get("repo");
  const branch = url.searchParams.get("branch");

  if (!owner || !repo) {
    return new Response(JSON.stringify({ error: "Owner and repo are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let targetBranch = branch;

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
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      
      const errorData = await response.json().catch(() => ({ message: "No se pudo encontrar el contenido del repositorio." }));
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
