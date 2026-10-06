"""Add the finished gallery link while preserving each repository's current README."""
import base64
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
GH = "/Users/efi/.local/share/github-cli/gh_2.100.0_macOS_amd64/bin/gh"
projects = json.loads((ROOT / "content/manifest.json").read_text())
LOG = ROOT / "audit/link-results.json"
results = json.loads(LOG.read_text()) if LOG.exists() else {}

def api(path, method="GET", payload=None):
    command = [GH, "api", path]
    if method != "GET":
        command += ["--method", method]
    if payload is not None:
        command += ["--input", "-"]
    result = subprocess.run(command, input=json.dumps(payload) if payload is not None else None,
        capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError(result.stderr[-500:])
    return json.loads(result.stdout) if result.stdout.strip() else {}

for project in projects:
    name = project["repo"]
    if results.get(name, {}).get("complete"):
        print("Already linked: " + name, flush=True)
        continue
    url = "https://eforus-overseer.github.io/demo-lab/projects/" + project["slug"] + "/"
    try:
        repo = api("repos/eforus-overseer/" + name)
        if repo["private"]:
            raise RuntimeError("Repository is now private; skipped publication")
        if not repo.get("homepage"):
            api("repos/eforus-overseer/" + name, "PATCH", {"homepage": "https://eforus-overseer.github.io/demo-lab/" if name == "eforus-overseer" else url})
        status = {"homepage": repo.get("homepage") or url}
        # Leave empty repositories empty; the homepage link provides their archive page.
        if repo["size"] == 0 and not repo.get("default_branch"):
            status["readme"] = "empty repository; homepage only"
        elif name == "clustering_user_queries":
            status["readme"] = "empty repository; homepage only"
        else:
            path = "README.md"
            try:
                current = api("repos/eforus-overseer/" + name + "/readme")
                path = current["path"]
                content = base64.b64decode(current["content"]).decode("utf8")
                sha = current["sha"]
            except RuntimeError as error:
                if "404" not in str(error):
                    raise
                content = "# " + name.replace("_", " ").replace("-", " ") + "\n"
                sha = None
            marker = "<!-- demo-lab:start -->"
            if marker not in content:
                label = "Project page & walkthrough"
                paragraph = "Explore the project, its method, and available demos or original artifacts."
                if project["mode"] == "Archive":
                    paragraph = "Read an archive walkthrough describing this repository's current state."
                elif project["mode"] == "Recorded agents":
                    paragraph = "Watch original agent recordings and explore the method and source artifacts."
                elif project["mode"] == "Interactive explainer":
                    paragraph = "Try an interactive explanation and inspect the original source and results. Browser teaching examples are distinguished from trained models."
                block = "\n\n---\n\n" + marker + "\n## Explore this project\n\n[" + label + "](" + url + ") — " + paragraph
                if name == "eforus-overseer":
                    block += "\n\n[Browse all 40 project pages in Efi's Demo Lab](https://eforus-overseer.github.io/demo-lab/)."
                block += "\n<!-- demo-lab:end -->\n"
                payload = {"message": "Link the project's Demo Lab page", "content": base64.b64encode((content.rstrip() + block).encode()).decode(),
                    "branch": repo["default_branch"], "author": {"name": "eforus-overseer", "email": "40206908+eforus-overseer@users.noreply.github.com"}}
                if sha:
                    payload["sha"] = sha
                response = api("repos/eforus-overseer/" + name + "/contents/" + path, "PUT", payload)
                status["commit"] = response["commit"]["sha"]
            status["readme"] = "linked"
        status["complete"] = True
        results[name] = status
        print("Linked: " + name, flush=True)
    except Exception as error:
        results[name] = {"complete": False, "error": str(error)}
        print("Failed: " + name + ": " + str(error), flush=True)
    LOG.write_text(json.dumps(results, indent=2))
    time.sleep(.5)
errors = [name for name, result in results.items() if not result["complete"]]
if errors:
    raise SystemExit("Unlinked repositories: " + ", ".join(errors))
print("All 40 public repositories linked.", flush=True)
