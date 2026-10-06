"""Read public repository sources and save a bounded inventory for demo pages."""
import base64
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
GH = "/Users/efi/.local/share/github-cli/gh_2.100.0_macOS_amd64/bin/gh"
AUDIT = ROOT / "audit"
AUDIT.mkdir(parents=True, exist_ok=True)

def gh(*args):
    result = subprocess.run([GH, *args], capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr[-600:])
    return result.stdout

def api(path):
    return json.loads(gh("api", path))

repos = json.loads(gh("repo", "list", "eforus-overseer", "--limit", "100", "--json",
    "name,description,url,homepageUrl,isPrivate,isFork,defaultBranchRef,primaryLanguage"))
repos = [r for r in repos if not r["isPrivate"] and r["name"] != "demo-lab"]
(AUDIT / "repositories.json").write_text(json.dumps(repos, indent=2))

def inspect(repo):
    name = repo["name"]
    directory = AUDIT / name
    directory.mkdir(exist_ok=True)
    result = {**repo, "readme": "", "files": [], "notebooks": [], "errors": []}
    if not repo["defaultBranchRef"] or not repo["defaultBranchRef"]["name"]:
        (directory / "summary.json").write_text(json.dumps(result, indent=2))
        return name, "empty"
    branch = repo["defaultBranchRef"]["name"]
    try:
        tree = api(f"repos/eforus-overseer/{name}/git/trees/{branch}?recursive=1")
        result["files"] = [{"path": f["path"], "size": f.get("size", 0), "sha": f["sha"]}
            for f in tree.get("tree", []) if f["type"] == "blob"]
        readmes = [f for f in result["files"] if f["path"].lower() == "readme.md"]
        if readmes:
            blob = api(f"repos/eforus-overseer/{name}/git/blobs/{readmes[0]['sha']}")
            result["readme"] = base64.b64decode(blob["content"]).decode("utf8", "replace")
            (directory / "README.md").write_text(result["readme"])
        notebooks = [f for f in result["files"] if f["path"].endswith(".ipynb") and f["size"] < 16000000]
        notebooks.sort(key=lambda f: ("checkpoint" in f["path"], f["size"]))
        for index, file in enumerate(notebooks[:3]):
            blob = api(f"repos/eforus-overseer/{name}/git/blobs/{file['sha']}")
            notebook = json.loads(base64.b64decode(blob["content"]))
            snippets, plots, code = [], [], []
            for ci, cell in enumerate(notebook.get("cells", [])):
                source = "".join(cell.get("source", []))
                if cell["cell_type"] == "markdown":
                    snippets.append(source[:3500])
                elif cell["cell_type"] == "code":
                    code.append(source[:5000])
                    for oi, output in enumerate(cell.get("outputs", [])):
                        data = output.get("data", {})
                        png = data.get("image/png")
                        if png and len(plots) < 10:
                            filename = f"notebook-{index}-plot-{ci}-{oi}.png"
                            (directory / filename).write_bytes(base64.b64decode("".join(png)))
                            plots.append(filename)
            result["notebooks"].append({"path": file["path"], "markdown": snippets[:25],
                "code": code[:30], "plots": plots})
        # Small source files allow exact runnable examples for simple Python/R projects.
        for file in [f for f in result["files"] if f["path"].endswith((".py", ".R", ".r")) and f["size"] < 50000][:4]:
            blob = api(f"repos/eforus-overseer/{name}/git/blobs/{file['sha']}")
            source = base64.b64decode(blob["content"]).decode("utf8", "replace")
            (directory / (file["path"].replace("/", "__") + ".txt")).write_text(source)
    except Exception as error:
        result["errors"].append(str(error))
    (directory / "summary.json").write_text(json.dumps(result, indent=2))
    return name, f"{len(result['files'])} files, {len(result['notebooks'])} notebooks" + (" ERROR" if result["errors"] else "")

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for name, status in pool.map(inspect, repos):
        print(name + ": " + status, flush=True)
