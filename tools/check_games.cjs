const {chromium}=require('/Users/efi/.local/share/photo-studio-browser/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const slug of ['iron-tide-submarine','propwash']){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5175/projects/'+slug+'/');
    await page.locator('#launch-app').click();
    const frame=page.frameLocator('.app-frame');
    await frame.locator('canvas').first().waitFor({timeout:45000});
    const width=await frame.locator('canvas').first().evaluate(c=>c.width);
    if(!width||errors.length)throw new Error(slug+': '+errors.join('; '));
    console.log('PASS playable '+slug+', canvas width '+width);
    await page.screenshot({path:'qa/'+slug+'-running.png'});
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
