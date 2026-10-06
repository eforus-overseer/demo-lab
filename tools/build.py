"""Generate individual static project routes and a searchable gallery."""
from pathlib import Path
import html
import json
import shutil
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
projects = json.loads((ROOT / "content/manifest.json").read_text())
e = lambda x: html.escape(str(x), quote=True)
BRAND = '<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="1" y="1" width="34" height="34" rx="10" stroke="#b7dbba"/><path d="M10 23V13h6m-6 5h5m5-5v10h6" stroke="#b7dbba" stroke-width="2"/><circle cx="27" cy="9" r="2" fill="#dfad74"/></svg>'
categories = ["Play & create","Reinforcement learning","Language & retrieval","Security","Data science","Archive"]
for filename in ["style.css","gallery.js","project.js","labs.js"]:
    shutil.copyfile(ROOT / "web" / filename, DIST / filename)
(DIST / ".nojekyll").touch()
(DIST / "favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="10" fill="#101b21"/><path d="M10 24V12h7m-7 6h6m5-6v12h7" fill="none" stroke="#b7dbba" stroke-width="2.5"/><circle cx="28" cy="8" r="2" fill="#dfad74"/></svg>')

def page(title, description, body, base="./", scripts=""):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} · Efi's Demo Lab</title><meta name="description" content="{e(description)}">
<meta name="theme-color" content="#101b21"><link rel="icon" type="image/svg+xml" href="{base}favicon.svg">
<link rel="stylesheet" href="{base}style.css"></head><body><a class="skip" href="#main">Skip to content</a>
<header class="topbar"><div class="shell"><a class="brand" href="{base}">{BRAND}<span>Efi's Demo Lab</span></a>
<nav class="toplinks" aria-label="Main navigation"><a href="{base}">All projects</a><a class="optional" href="https://github.com/eforus-overseer">GitHub ↗</a></nav></div></header>
{body}
<footer><div class="shell"><span>Built by curiosity. Projects by Efi Pecani &amp; collaborators.</span><a href="https://github.com/eforus-overseer/demo-lab">Gallery source ↗</a></div></footer>
{scripts}</body></html>'''

def fallback(project, index):
    colors=["#b7dbba","#dfad74","#96bcd2","#bea9d0","#95c5b1","#9aaeb2"]
    color=colors[categories.index(project["category"])]
    return f'''<svg viewBox="0 0 380 200" aria-hidden="true"><rect width="380" height="200" fill="#14262c"/>
    <g stroke="{color}" fill="none" opacity=".7"><path d="M32 151 90 117 146 135 207 69 267 93 345 44" stroke-width="2"/><path d="M32 163h314M32 35v128" opacity=".25"/>
    <circle cx="207" cy="69" r="8"/><circle cx="90" cy="117" r="4"/><circle cx="267" cy="93" r="4"/><path d="m176 27 7 0m-3-3v6M307 144h18m-9-9v18" opacity=".5"/></g>
    <text x="33" y="58" fill="{color}" font-family="monospace" font-size="12" letter-spacing="2">EXPERIMENT {index+1:02d}</text></svg>'''

cards=[]
for i,p in enumerate(projects):
    media=p["media"]
    if media:
        cover=media[0].get("cover", media[0]["path"])
        visual=f'<img src="./{quote(cover)}" alt="{e(p["title"])} preview" loading="lazy" class="{"photo" if p["mode"]=="Live app" else ""}">'
    else:
        visual=fallback(p,i)
    cards.append(f'''<a class="card" href="./projects/{e(p["slug"])}/" data-title="{e((p["title"]+" "+p["repo"]+" "+p["summary"]).lower())}" data-category="{e(p["category"])}" data-mode="{e(p["mode"])}">
    <div class="card-media">{visual}</div><div class="card-body"><div class="card-meta"><span>{e(p["category"])}</span><span>{e(p["mode"])}</span></div>
    <h3>{e(p["title"])}</h3><p>{e(p["summary"])}</p><div class="card-bottom"><span>{e(p["language"])}</span><b>Explore project ↗</b></div></div></a>''')

features=[]
for name in ["iron-tide-submarine","photo-studio"]:
    p=next(p for p in projects if p["repo"]==name)
    features.append(f'<a class="feature" href="./projects/{p["slug"]}/"><img src="./{quote(p["media"][0]["path"])}" alt="{e(p["title"])}"><div class="feature-copy"><div><span class="tag">Live in your browser</span><h2>{e(p["title"])}</h2></div><span>↗</span></div></a>')
tabs='<button type="button" data-category="All" aria-pressed="true">All projects</button>'+"".join(f'<button type="button" data-category="{e(c)}" aria-pressed="false">{e(c)}</button>' for c in categories)
modes=sorted({p["mode"] for p in projects})
body=f'''<main id="main" class="shell"><section class="intro"><div><p class="eyebrow">Efi Pecani / the experiment collection</p>
<h1>Ideas you can<br>get your hands on.</h1><p>Fly a drone. Follow a learning agent. Look inside a language model experiment. A closer look at the things I build.</p></div>
<div class="aside"><strong>{len(projects):02d}</strong><div><span>public repositories, individually explored</span><p>Working browser apps, real research artifacts, and small experiments that make the methods tangible.</p></div></div></section>
<div class="feature-row">{"".join(features)}</div><section aria-labelledby="collection-heading"><div class="section-top"><h2 id="collection-heading">Pick an experiment.</h2><p id="result-count" aria-live="polite">{len(projects)} projects</p></div>
<div class="filters"><div class="search-row"><label class="sr-only" for="search">Search projects</label><input id="search" type="search" placeholder="Search by project, method, or idea…">
<label class="sr-only" for="mode">Demo type</label><select id="mode"><option value="All">Every demo type</option>{"".join(f'<option>{e(m)}</option>' for m in modes)}</select></div>
<div class="tabs" aria-label="Filter by category">{tabs}</div></div><div class="grid" id="project-grid">{"".join(cards)}</div>
<p class="empty" id="empty" hidden>No projects match. Try another word or category.</p></section></main>'''
(DIST / "index.html").write_text(page("Explore the experiments","A demo page for every public repository by Efi Pecani: browser apps, trained-agent recordings, research artifacts, and interactive explainers.",body,scripts='<script src="./gallery.js" defer></script>'))

for p in projects:
    base="../../"
    actions=f'<a class="button" href="{e(p["url"])}">Source repository ↗</a>'
    if p.get("live"):
        label="Try Photo Studio ↗" if p["repo"]=="Photo-Editor-GUI" else ("Open the profile ↗" if p["repo"]=="eforus-overseer" else "Open live app ↗")
        actions=f'<a class="button primary" href="{e(p["live"])}">{label}</a>'+actions
    elif p.get("embed"):
        actions=f'<a class="button primary" href="#demo">Launch the demo ↓</a>'+actions
    elif p.get("widget"):
        actions=f'<a class="button primary" href="#demo">Try the experiment ↓</a>'+actions
    elif p["media"]:
        actions=f'<a class="button primary" href="#demo">Explore the results ↓</a>'+actions
    head=f'<div class="breadcrumbs"><a href="{base}">All projects</a> / {e(p["category"])}</div><header class="project-head"><span class="tag">{e(p["mode"])}</span><h1>{e(p["title"])}</h1><p>{e(p["summary"])}</p><div class="actions">{actions}</div></header>'
    demo=''
    if p.get("embed"):
        image=f'<img src="{base}{quote(p["media"][0]["path"])}" alt="">' if p["media"] else ''
        app_url=base+"apps/"+p["embed"]+"/"
        demo=f'<div class="app-launch" id="app-launch">{image}<div class="launch-copy"><h3>{e(p["title"])}</h3><p>Launch the original app here, or open it in its own tab for more room.</p><button id="launch-app" data-url="{app_url}" type="button">Launch {e(p["title"])}</button></div></div><div id="app-mount"></div><div class="app-tools"><span>Keyboard / WebGL · Click inside the game to focus.</span><a class="inline-link" href="{app_url}" target="_blank" rel="noopener">Open full window ↗</a></div>'
    elif p.get("widget"):
        demo='<div id="lab" data-widget="'+p["widget"]+'"></div>'
    elif p["mode"]=="Recorded agents":
        buttons="".join(f'<button type="button" data-recording="{i}" aria-pressed="{str(i==0).lower()}">{e(m["caption"])}</button>' for i,m in enumerate(p["media"]))
        demo=f'<div class="recording"><div class="screen"><img id="recording-image" src="{base}{quote(p["media"][0]["path"])}" alt="{e(p["media"][0]["caption"])}"></div><div class="recording-menu">{buttons}<p>Original repository recordings. Choose an episode to compare behavior. These are recorded replays.</p></div></div><p class="replay-caption"><a id="recording-source" class="inline-link" href="{e(p["media"][0]["source"])}">Recording source ↗</a></p>'
    elif p["media"]:
        m=p["media"][0]
        demo=f'<figure class="figure"><button class="zoom" data-index="0" type="button" aria-label="Enlarge {e(m["caption"])}"><img src="{base}{quote(m["path"])}" alt="{e(m["caption"])}"></button><figcaption>{e(m["caption"])}<br><a href="{e(m["source"])}">Original artifact ↗</a></figcaption></figure>'
    else:
        demo=f'<div class="archive-message"><h3>{"Explore the method" if p["mode"]!="Archive" else "A place in the archive."}</h3><p>{e(p["limitation"])}</p><a class="button" href="{e(p["url"])}">Inspect the original ↗</a></div>'
    heading="The working app" if p.get("embed") else "Try the method" if p.get("widget") else "Agent replay" if p["mode"]=="Recorded agents" else "Inside the project"
    surface=f'<section id="demo" class="demo-surface" aria-labelledby="demo-heading"><div class="surface-head"><h2 id="demo-heading">{heading}</h2><span class="tag">{e(p["mode"])}</span></div>{demo}</section>'
    steps="".join(f'<button type="button" role="tab" id="step-{i}" data-step="{i}" aria-selected="{str(i==0).lower()}" aria-controls="step-panel" tabindex="{0 if i==0 else -1}"><b>0{i+1}</b>{e(s[0])}</button>' for i,s in enumerate(p["steps"]))
    walkthrough=f'<section aria-labelledby="walk-heading"><h2 id="walk-heading">How it works.</h2><div class="walkthrough"><div class="step-list" role="tablist" aria-label="Project walkthrough" aria-orientation="vertical">{steps}</div><div class="step-panel" id="step-panel" role="tabpanel" aria-labelledby="step-0"><h3>{e(p["steps"][0][0])}</h3><p>{e(p["steps"][0][1])}</p></div></div></section>'
    figures=[]
    if not p.get("all_charts"):
        for i,m in enumerate(p["media"]):
            figures.append(f'<figure class="figure"><button class="zoom" type="button" data-index="{i}" aria-label="Enlarge {e(m["caption"])}"><img src="{base}{quote(m["path"])}" alt="{e(m["caption"])}" loading="lazy"></button><figcaption>{e(m["caption"])}<br><a href="{e(m["source"])}">Original artifact ↗</a></figcaption></figure>')
    results=f'<section class="results"><div class="section-top"><h2>From the original project.</h2><p>Saved artifacts · click to inspect</p></div><div class="result-grid">{"".join(figures)}</div></section>' if figures else ''
    sources=p["notebooks"]+p["reports"]+p["files"]
    source_links="".join(f'<a href="{e(s["url"])}">{e(s["path"])} ↗</a>' for s in sources[:7])
    run_note="Open the source notebook in Jupyter, Colab, or the environment described in the README. Data and model downloads may be required." if p["notebooks"] else "Follow the source README for the original runtime, dependencies, data, and configuration."
    if p["mode"]=="Archive": run_note="The original repository preserves this project's current state. The archive page does not add an implementation to it."
    clone=f'git clone {p["url"]}.git'
    source=f'<section class="sources"><div class="source-block"><h2>Continue in the source.</h2><p>{run_note}</p><pre><code>{e(clone)}</code></pre><a class="readme-link" href="{e(p["url"])}#readme">Read the setup and requirements ↗</a></div><div class="source-block"><h2>Project artifacts.</h2><div class="source-links">{source_links or f"""<a href="{e(p["url"])}">Browse the repository ↗</a>"""}</div><p class="small-note">Source links point to the original public repository. Credit belongs to the project authors and the dependencies credited there.</p></div></section>'
    data=json.dumps(p).replace("<","\\u003c").replace("&","\\u0026")
    scripts=f'<script id="project-data" type="application/json">{data}</script><script src="{base}labs.js" defer></script><script src="{base}project.js" defer></script>'
    modal='<dialog class="modal" id="image-modal"><div class="modal-head"><span id="modal-caption"></span><button id="close-modal" type="button" aria-label="Close enlarged image">Close ✕</button></div><img id="modal-image" alt=""></dialog>'
    body='<main id="main" class="shell">'+head+surface+'<aside class="note">'+e(p["limitation"])+'</aside>'+walkthrough+results+source+'</main>'+modal
    directory=DIST/"projects"/p["slug"]
    directory.mkdir(parents=True,exist_ok=True)
    (directory/"index.html").write_text(page(p["title"],p["summary"],body,base,scripts))
(DIST/"projects.json").write_text(json.dumps([{k:p[k] for k in ["repo","slug","title","category","mode"]} for p in projects],indent=2))
print(f"Built gallery and {len(projects)} individual pages.")
