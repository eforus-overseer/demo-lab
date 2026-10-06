const fs = require('fs');
const path = require('path');
const {chromium} = require('/Users/efi/.local/share/photo-studio-browser/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const projects=JSON.parse(fs.readFileSync(path.join(root,'content/manifest.json')));
const origin=process.env.DEMO_ORIGIN || 'http://127.0.0.1:5175/';
const assert=(value,message)=>{if(!value)throw new Error(message);};
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const failed=[];page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failed.push(r.status()+' '+r.url());});
  await page.goto(origin);
  assert(await page.locator('.card').count()===projects.length,'Missing gallery projects');
  await page.locator('#search').fill('Dorian');
  assert(await page.locator('.card:visible').count()===1,'Search is not filtering');
  await page.locator('#search').fill('');
  await page.locator('[data-category="Security"][aria-pressed]').click();
  assert(await page.locator('.card:visible').count()===projects.filter(p=>p.category==='Security').length,'Category filter mismatch');
  await page.locator('[data-category="All"]').click();
  await page.locator('#mode').selectOption('Archive');
  assert(await page.locator('.card:visible').count()===projects.filter(p=>p.mode==='Archive').length,'Mode filter mismatch');
  await page.locator('#mode').selectOption('All');
  await page.screenshot({path:path.join(root,'qa/gallery-desktop.png'),fullPage:false});
  for(const project of projects){
    const response=await page.goto(origin+'projects/'+project.slug+'/');
    assert(response.status()===200,'Page failed: '+project.repo);
    assert(await page.title()==project.title+" · Efi's Demo Lab",'Wrong page title');
    await page.locator('[data-step="1"]').click();
    assert((await page.locator('#step-panel h3').textContent())===project.steps[1][0],'Walkthrough failed: '+project.repo);
    await page.locator('[data-step="1"]').focus();
    await page.keyboard.press('ArrowRight');
    assert((await page.locator('#step-panel h3').textContent())===project.steps[2][0],'Keyboard tabs failed');
    // Force each local artifact to load, without relying on viewport/lazy-image timing.
    await page.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
    await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
    const missing=await page.evaluate(()=>[...document.images].filter(i=>i.getAttribute('src')&&!i.naturalWidth).map(i=>i.src));
    assert(missing.length===0,'Images failed '+project.repo+': '+missing.join(','));
    if(project.widget==='counter'){
      await page.locator('#text').fill('Dorian Dorian “Dorian”\nfox');
      assert((await page.locator('#counts .stat b').nth(1).textContent())==='3','Counter mismatch');
    }
    if(project.widget==='retrieval'){
      await page.locator('#query').fill('submarine ocean');
      assert((await page.locator('#ranked summary').first().textContent()).startsWith('Ocean navigation'),'BM25 ranking mismatch');
    }
    if(project.widget==='metrics'){
      await page.locator('#tp').fill('80');await page.locator('#fp').fill('20');await page.locator('#fn').fill('20');
      assert((await page.locator('#metric-stats').textContent()).includes('80.0%'),'Metric arithmetic mismatch');
      await page.locator('#tp').fill('0');await page.locator('#fp').fill('0');await page.locator('#fn').fill('0');
      assert((await page.locator('#metric-stats .stat b').first().textContent())==='—','Undefined precision should be explicit');
    }
    if(project.widget==='poetry'){
      const first=await page.locator('#poem').textContent();
      await page.locator('#generate').click();assert((await page.locator('#poem').textContent())===first,'Poem seed mismatch');
      await page.locator('#seed').fill('219');await page.locator('#generate').click();
      assert((await page.locator('#poem').textContent())!==first,'Poem seed has no effect');
    }
    if(project.widget==='sketch'){
      await page.locator('#stream').fill('fox fox lake');
      assert((await page.locator('#sketch-stats .stat b').first().textContent())==='3','Sketch stream count mismatch');
      const rows=await page.locator('#frequencies tbody tr').allTextContents();assert(rows.some(r=>r.includes('fox22')),'Sketch frequency mismatch');
      await page.locator('#add-token').click();assert((await page.locator('#sketch-stats .stat b').first().textContent())==='4','Sketch append failed');
    }
    if(project.widget==='kmeans'){
      await page.locator('#run').click();assert((await page.locator('#km-stats .stat b').first().textContent())==='10','K-means iterations failed');
    }
    if(project.widget==='regression'){
      const before=await page.locator('#reg-stats .stat b').nth(1).textContent();
      await page.locator('#fit').click();const after=await page.locator('#reg-stats .stat b').nth(1).textContent();
      assert(Number(after)<Number(before),'Least squares did not improve MSE');
    }
    if(project.widget==='language'){
      await page.locator('#text').fill('El pequeño perro corre por el jardín.');
      assert((await page.locator('#scores .score-row').first().textContent()).startsWith('Spanish'),'Language example mismatch');
    }
    if(project.widget==='portfolio'){
      await page.locator('#wa').fill('90');await page.locator('#wa').dispatchEvent('input');
      assert(Number(await page.locator('#wa').inputValue())+Number(await page.locator('#wb').inputValue())<=100,'Invalid portfolio weights');
    }
    if(project.widget==='vocabulary'){
      assert(await page.locator('.chart-item').count()===62,'Expected 62 charts');
      await page.locator('#family').selectOption('flow');
      assert(await page.locator('.chart-item:visible').count()===4,'Chart family filter mismatch');
    }
    if(project.widget==='mcp'){
      await page.waitForFunction(()=>document.querySelector('#tool-count').textContent.includes('37'));
      assert(await page.locator('.tool').count()===37,'MCP catalog incomplete');
      await page.locator('#tool-search').fill('profile');assert(await page.locator('.tool').count()>0,'MCP search failed');
    }
    if(project.mode==='Recorded agents'){
      await page.locator('[data-recording="1"]').click();
      assert((await page.locator('#recording-image').getAttribute('src')).endsWith(project.media[1].path),'Replay selection failed');
    }
    if(project.media.length && project.widget!=='vocabulary'){
      await page.locator('.zoom').last().click();assert(await page.locator('#image-modal').isVisible(),'Image zoom failed');
      await page.keyboard.press('Escape');assert(!await page.locator('#image-modal').isVisible(),'Modal dismissal failed');
    }
    console.log('PASS '+project.repo);
  }
  for(const slug of ['photo-studio','iron-tide-submarine','language-detection','visual-vocabulary-skill']){
    await page.goto(origin+'projects/'+slug+'/');
    await page.screenshot({path:path.join(root,'qa/'+slug+'-desktop.png'),fullPage:true});
  }
  // Mobile overflow and representative controls.
  await page.setViewportSize({width:390,height:844});
  for(const url of ['',...projects.map(p=>'projects/'+p.slug+'/')]){
    await page.goto(origin+url);
    await page.waitForTimeout(50);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert(width<=391,'Mobile body overflows: '+url+' width '+width);
  }
  await page.goto(origin);await page.screenshot({path:path.join(root,'qa/gallery-mobile.png'),fullPage:false});
  await page.goto(origin+'projects/llm-hallucination-sketches/');
  await page.screenshot({path:path.join(root,'qa/sketch-mobile.png'),fullPage:true});
  assert(!errors.length,'Browser errors: '+errors.join('; '));assert(!failed.length,'Failed local responses: '+failed.join('; '));
  await browser.close();console.log('PASS all 40 routes, interactions, images, and mobile widths.');
})().catch(e=>{console.error(e);process.exit(1)});
