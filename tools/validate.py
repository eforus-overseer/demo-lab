"""Check complete repository coverage and local links in the deployable artifact."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
projects = json.loads((ROOT / "content/manifest.json").read_text())
assert len({p["repo"] for p in projects}) == len(projects), "Duplicate repositories"
assert len({p["slug"] for p in projects}) == len(projects), "Duplicate routes"
errors = []
class Parser(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attribute in ("href", "src"):
            url = attrs.get(attribute)
            if not url or url.startswith(("#", "data:")):
                continue
            parsed = urlparse(url)
            if parsed.scheme or parsed.netloc:
                continue
            target = (self.page.parent / unquote(parsed.path)).resolve()
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                errors.append(str(self.page.relative_to(DIST)) + ": " + url)

for page in [DIST / "index.html"] + [DIST / "projects" / p["slug"] / "index.html" for p in projects]:
    assert page.is_file(), "Missing page " + str(page)
    Parser(page).feed(page.read_text())
for project in projects:
    for media in project["media"]:
        assert (DIST / media["path"]).is_file(), "Missing media " + media["path"]
    if project.get("embed"):
        assert (DIST / "apps" / project["embed"] / "index.html").is_file()
    assert project["steps"] and project["summary"] and project["limitation"]
assert not errors, "\n".join(errors)
assert len(json.loads((DIST / "mcp-tools.json").read_text())) == 37
vocabulary = next(p for p in projects if p["repo"] == "visual-vocabulary-skill")
assert len(vocabulary["media"]) == 62
print(f"Validated {len(projects)} project routes, local links, 62 charts, and 37 MCP definitions.")
