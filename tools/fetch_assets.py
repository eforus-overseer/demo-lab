"""Collect public, explicitly selected artifacts; never copy datasets."""
import base64
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("projects", ROOT / "content/projects.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
GH = "/Users/efi/.local/share/github-cli/gh_2.100.0_macOS_amd64/bin/gh"
DIST = ROOT / "dist"
(DIST / "assets").mkdir(parents=True, exist_ok=True)
summaries = {p.parent.name: json.loads(p.read_text()) for p in (ROOT / "audit").glob("*/summary.json")}
manifest = []
jobs = []
for project in module.PROJECTS:
    project = dict(project)
    name = project["repo"]
    summary = summaries[name]
    project["url"] = summary["url"]
    project["branch"] = (summary["defaultBranchRef"] or {}).get("name", "")
    project["language"] = (summary["primaryLanguage"] or {}).get("name", "Documentation")
    project["slug"] = name.lower().strip("-")
    project["media"] = []
    project["notebooks"] = [{"path": n["path"], "url": summary["url"] + "/blob/" + project["branch"] + "/" + urllib.parse.quote(n["path"])} for n in summary["notebooks"]]
    project["reports"] = [{"path": f["path"], "url": summary["url"] + "/blob/" + project["branch"] + "/" + urllib.parse.quote(f["path"])} for f in summary["files"] if f["path"].lower().endswith(".pdf")][:3]
    project["files"] = [{"path": f["path"], "url": summary["url"] + "/blob/" + project["branch"] + "/" + urllib.parse.quote(f["path"])} for f in summary["files"] if f["path"].lower().endswith((".py", ".r", ".html"))][:6]
    selected = project.pop("assets", [])
    if project.get("all_charts"):
        selected = [f["path"] for f in summary["files"] if f["path"].startswith("examples/") and f["path"].endswith(".svg")]
    for path in selected:
        owner = name
        if path.startswith("@"):
            owner, path = path[1:].split("/", 1)
        source = summaries[owner]
        file = next((f for f in source["files"] if f["path"] == path), None)
        if not file:
            print("Skipping absent artifact:", name, path, flush=True)
            continue
        if file["size"] > 12000000:
            print("Skipping oversized artifact:", name, path, flush=True)
            continue
        dest = Path("assets") / project["slug"] / path
        src_url = source["url"] + "/blob/" + source["defaultBranchRef"]["name"] + "/" + urllib.parse.quote(path)
        raw_url = "https://raw.githubusercontent.com/eforus-overseer/" + owner + "/" + source["defaultBranchRef"]["name"] + "/" + urllib.parse.quote(path)
        caption = Path(path).stem.replace("_", " ").replace("-", " ")
        if path.startswith("examples/"):
            caption = path.split("/")[1].replace("-", " ").title() + " / " + caption
        project["media"].append({"path": str(dest), "caption": caption, "source": src_url, "family": path.split("/")[1] if path.startswith("examples/") else ""})
        jobs.append((raw_url, DIST / dest))
    if not project["media"] and project["mode"] != "Archive" and not name.startswith("Harmfull-Content"):
        for notebook in summary["notebooks"]:
            for filename in notebook["plots"][:3]:
                src = ROOT / "audit" / name / filename
                dest = Path("assets") / project["slug"] / filename
                (DIST / dest).parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, DIST / dest)
                project["media"].append({"path": str(dest), "caption": "Saved notebook output · " + notebook["path"], "source": summary["url"] + "/blob/" + project["branch"] + "/" + urllib.parse.quote(notebook["path"]), "family": ""})
            if project["media"]:
                break
    manifest.append(project)

def fetch(job):
    url, destination = job
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        with urllib.request.urlopen(url, timeout=60) as response:
            destination.write_bytes(response.read())
    return destination.name

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(fetch, jobs):
        print("Artifact:", result, flush=True)

# Exact browser-app sources, mounted below the gallery.
game_source = Path("/Users/efi/projects/iron-tide-submarine-public/dist")
game_dest = DIST / "apps/iron-tide"
if game_source.exists():
    shutil.copytree(game_source, game_dest, dirs_exist_ok=True)
else:
    raise RuntimeError("Iron Tide's reviewed local build is missing")
fetch(("https://raw.githubusercontent.com/eforus-overseer/propwash/main/index.html", DIST / "apps/propwash/index.html"))

# Read MCP tool declarations without importing or executing the package.
tools = []
for file in summaries["octobrowser-mcp"]["files"]:
    if not file["path"].startswith("src/") or not file["path"].endswith(".py"):
        continue
    result = subprocess.run([GH, "api", "repos/eforus-overseer/octobrowser-mcp/git/blobs/" + file["sha"]], text=True, capture_output=True, timeout=60, check=True)
    source = base64.b64decode(json.loads(result.stdout)["content"]).decode("utf8")
    for match in re.finditer(r'@(\w+\.)?tool\([^)]*\)\s+(?:async )?def (\w+)\((.*?)\).*?:\s*"""(.*?)"""', source, re.S):
        tools.append({"name": match.group(2), "signature": " ".join(match.group(3).split()), "description": match.group(4).strip(), "source": "https://github.com/eforus-overseer/octobrowser-mcp/blob/main/" + file["path"]})
(DIST / "mcp-tools.json").write_text(json.dumps(tools, indent=2))
(ROOT / "content/manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"Collected {len(manifest)} project records, {len(jobs)} public assets, {len(tools)} MCP declarations.", flush=True)
