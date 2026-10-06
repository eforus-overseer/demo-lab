window.DemoLabs = (() => {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stat = (label, value) => '<div class="stat"><b>' + escape(value) + '</b><span>' + escape(label) + '</span></div>';
  const label = (text, content) => '<label>' + text + content + '</label>';
  const range = (id, title, min, max, value, step = 1) => label(title + ' <output id="' + id + '-value">' + value + '</output>', '<input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">');
  const teaching = text => '<p class="surface-intro">' + text + '</p>';
  const listen = (root, selector, event, fn) => root.querySelector(selector).addEventListener(event, fn);
  const number = (root, id) => Number(root.querySelector('#' + id).value);
  function canvas(root) {
    const element = root.querySelector('canvas');
    element.width = 600; element.height = 340;
    const ctx = element.getContext('2d');
    return {element, ctx, x:v=>45 + v*525, y:v=>295-v*250};
  }
  function axes(chart, xLabel, yLabel) {
    const {ctx} = chart;
    ctx.clearRect(0,0,600,340); ctx.fillStyle='#111e25'; ctx.fillRect(0,0,600,340);
    ctx.strokeStyle='#30444a'; ctx.lineWidth=1;
    for (let i=0;i<=5;i++) {
      ctx.beginPath(); ctx.moveTo(chart.x(0),chart.y(i/5)); ctx.lineTo(chart.x(1),chart.y(i/5)); ctx.stroke();
    }
    ctx.fillStyle='#a0b2b5'; ctx.font='12px system-ui';
    ctx.fillText(xLabel,240,326); ctx.fillText(yLabel,12,24);
  }
  function dot(chart,x,y,color,r=5) {
    chart.ctx.fillStyle=color; chart.ctx.beginPath(); chart.ctx.arc(chart.x(x),chart.y(y),r,0,Math.PI*2); chart.ctx.fill();
  }
  function line(chart,points,color='#b7dbba') {
    chart.ctx.strokeStyle=color; chart.ctx.lineWidth=2; chart.ctx.beginPath();
    points.forEach((p,i)=>i?chart.ctx.lineTo(chart.x(p[0]),chart.y(p[1])):chart.ctx.moveTo(chart.x(p[0]),chart.y(p[1])));
    chart.ctx.stroke();
  }
  function rng(seed) {
    let x = (seed >>> 0) || 1;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x>>>0)/4294967296; };
  }
  function counter(root) {
    root.innerHTML = teaching('A browser port of the original whitespace and prefix-counting logic. Change the target and text; nothing is uploaded.') +
      '<div class="lab-layout"><div class="controls">' +
      label('Target word', '<input id="target" value="Dorian" maxlength="60">') +
      label('Text to inspect', '<textarea id="text" maxlength="20000">Dorian watched the light fall across the room.\n“Dorian” appeared in the letter.\nThe room was still, and Dorian smiled.</textarea>') +
      '</div><div><div class="stats" id="counts" aria-live="polite"></div><div class="output" style="margin-top:16px"><h3>Words per line</h3><div id="line-counts"></div><div id="matching" class="token-list"></div></div></div></div>';
    function update() {
      const text=root.querySelector('#text').value;
      const target=root.querySelector('#target').value;
      const tokens=text.trim().split(/\s+/).filter(Boolean);
      const matches=tokens.filter(t=>target && (t.slice(0,target.length)===target || t.slice(1,target.length+1)===target));
      const rows=text.split('\n').map(l=>l.trim().split(/\s+/).filter(Boolean).length);
      root.querySelector('#counts').innerHTML=stat('words',tokens.length)+stat('target matches',matches.length)+stat('lines',rows.length);
      root.querySelector('#line-counts').textContent=rows.map((n,i)=>'Line '+(i+1)+': '+n).join(' · ');
      root.querySelector('#matching').innerHTML=matches.slice(0,30).map(m=>'<span>'+escape(m)+'</span>').join('');
    }
    root.addEventListener('input',update); update();
  }
  const corpora = {
    English:'The little dog runs through the garden. We watch the sun rise over the lake. This is a beautiful morning and the birds are singing. I like reading books and walking in nature.',
    Spanish:'El pequeño perro corre por el jardín. Miramos el sol sobre el lago. Esta es una mañana hermosa y los pájaros cantan. Me gusta leer libros y caminar por la naturaleza.',
    French:'Le petit chien court dans le jardin. Nous regardons le soleil sur le lac. Le matin est magnifique et les oiseaux chantent. Je préfère lire des livres et marcher dans la nature.',
    Indonesian:'Anjing kecil berlari di taman. Kami melihat matahari di atas danau. Pagi ini sangat indah dan burung bernyanyi. Saya suka membaca buku dan berjalan di alam.',
    Italian:'Il piccolo cane corre nel giardino. Guardiamo il sole sopra il lago. Questa è una bella mattina e gli uccelli cantano. Mi piace leggere libri e passeggiare nella natura.',
    Dutch:'De kleine hond rent door de tuin. We kijken naar de zon boven het meer. Het is een mooie ochtend en de vogels zingen. Ik lees graag boeken en wandel in de natuur.',
    Portuguese:'O pequeno cachorro corre pelo jardim. Observamos o sol sobre o lago. Esta é uma manhã bonita e os pássaros cantam. Eu gosto de ler livros e caminhar na natureza.',
    Tagalog:'Ang maliit na aso ay tumatakbo sa hardin. Nakikita namin ang araw sa ibabaw ng lawa. Maganda ang umaga at umaawit ang mga ibon. Gusto kong magbasa ng libro at maglakad sa kalikasan.'
  };
  function language(root) {
    root.innerHTML=teaching('Train tiny character models on eight original sample paragraphs. Lower perplexity means a better fit to this toy corpus; it is not the original trained detector.')+
      '<div class="lab-layout"><div class="controls">'+label('Text to compare','<textarea id="text" maxlength="2000">The little dog runs through the garden.</textarea>')+
      label('N-gram order','<select id="order"><option value="2">Bigrams (2)</option><option value="3">Trigrams (3)</option></select>')+
      '<details><summary>Inspect the teaching corpus</summary>'+Object.entries(corpora).map(([name,text])=>'<p class="small-note"><strong>'+name+'</strong>: '+text+'</p>').join('')+'</details></div><div class="output"><h3>Perplexity by language</h3><div id="scores" aria-live="polite"></div><p class="small-note">Add-one smoothing · shared character vocabulary · original sample corpus</p></div></div>';
    function update() {
      const n=number(root,'order'), text=root.querySelector('#text').value.toLowerCase().trim();
      if(!text) {root.querySelector('#scores').textContent='Enter text to compare.';return;}
      const vocab=new Set(Object.values(corpora).join('').toLowerCase().split('')); vocab.add('$');
      const size=vocab.size+1;
      const scores=Object.entries(corpora).map(([name,corpus])=>{
        const model=new Map(), train='^'.repeat(n-1)+corpus.toLowerCase()+'$';
        for(let i=n-1;i<train.length;i++){
          const context=train.slice(i-n+1,i), next=train[i];
          if(!model.has(context))model.set(context,{total:0,counts:new Map()});
          const row=model.get(context);row.total++;row.counts.set(next,(row.counts.get(next)||0)+1);
        }
        const sample='^'.repeat(n-1)+text+'$';let log=0;
        for(let i=n-1;i<sample.length;i++){
          const row=model.get(sample.slice(i-n+1,i));
          const probability=((row?.counts.get(sample[i])||0)+1)/((row?.total||0)+size);
          log+=Math.log(probability);
        }
        return {name,value:Math.exp(-log/(text.length+1))};
      }).sort((a,b)=>a.value-b.value);
      const max=Math.max(...scores.map(s=>s.value));
      root.querySelector('#scores').innerHTML=scores.map(s=>'<div class="score-row"><span>'+s.name+'</span><div class="bar"><span style="width:'+100*s.value/max+'%"></span></div><span class="value">'+s.value.toFixed(2)+'</span></div>').join('');
    }
    root.addEventListener('input',update);update();
  }
  const poemCorpus=[
    'the meadow holds the morning light','the meadow holds a little rain','the river carries the morning light',
    'the river carries a quiet song','a little rain rests on the leaves','a quiet song rests on the water',
    'the morning light warms the old stone','the morning light finds the sleeping fox',
    'the sleeping fox dreams of the meadow','the old stone waits beside the river',
    'beside the river grows a silver fern','a silver fern holds a little rain',
    'the garden wakes beneath the open sky','the garden wakes beneath the morning light',
    'beneath the open sky a bird is singing','a bird is singing beside the river',
    'the water remembers the open sky','the water remembers a quiet song'
  ];
  function poetry(root) {
    root.innerHTML=teaching('A working second-order Markov generator trained on a small, original nature corpus. Choose a seed and follow where the word pairs lead.')+
      '<div class="lab-layout"><div class="controls">'+label('Random seed','<input id="seed" type="number" min="1" max="999999" value="42">')+
      '<div class="control-row"><button id="generate" class="primary">Generate a poem</button><button id="new-seed">New seed</button></div>'+
      '<details><summary>Read the sample corpus</summary><p class="small-note">'+poemCorpus.join('<br>')+'</p></details>'+
      '<p class="small-note">The first word is sampled from line starts. Every later word follows transition counts. The same seed gives the same lines.</p></div>'+
      '<div class="output" aria-live="polite"><p class="poem" id="poem"></p></div></div>';
    const initial=[], first=new Map(), pairs=new Map();
    poemCorpus.forEach(text=>{
      const words=text.split(' ');initial.push(words[0]);
      if(!first.has(words[0]))first.set(words[0],[]);first.get(words[0]).push(words[1]);
      for(let i=2;i<=words.length;i++){
        const key=words[i-2]+'|'+words[i-1];if(!pairs.has(key))pairs.set(key,[]);
        pairs.get(key).push(words[i]||'END');
      }
    });
    function generate(){
      const random=rng(number(root,'seed'));const choose=a=>a[Math.floor(random()*a.length)];
      const lines=[];
      for(let l=0;l<5;l++){
        const start=choose(initial),words=[start,choose(first.get(start))];
        for(let i=0;i<22;i++){
          const next=choose(pairs.get(words.slice(-2).join('|'))||['END']);
          if(next==='END')break;words.push(next);
        }
        lines.push(words.join(' '));
      }
      root.querySelector('#poem').textContent=lines.join('\n');
    }
    listen(root,'#generate','click',generate);
    listen(root,'#new-seed','click',()=>{root.querySelector('#seed').value=Math.floor(Math.random()*999999)+1;generate();});
    generate();
  }
  const passages=[
    {title:'Ocean navigation',text:'A submarine travels below the ocean surface. A periscope helps its crew observe ships above the water. Navigation uses a chart, heading, speed, and depth.'},
    {title:'Drone flight',text:'A quadrotor drone uses four motors to generate thrust. The flight controller adjusts motor speed to stabilize roll, pitch, and yaw while the drone flies toward a waypoint.'},
    {title:'The garden',text:'A young Labrador puppy explores a green garden. Ferns grow beside a lake. The morning light makes the flowers bright and the water reflects the sky.'},
    {title:'Learning from rewards',text:'A reinforcement learning agent observes a state, chooses an action, and receives a reward. Training changes its policy. A good policy learns to navigate or land safely.'},
    {title:'Searching documents',text:'A search engine ranks documents for a query. BM25 scores matching words using term frequency, inverse document frequency, and document length. A reranker can reorder the retrieved passages.'}
  ];
  const tokenize=text=>(text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
  function retrieval(root) {
    root.innerHTML=teaching('Real BM25 scoring over five newly written sample passages. Adjust term-frequency saturation; the original projects add larger indexes and neural reranking.')+
      '<div class="lab-layout"><div class="controls">'+label('Search query','<input id="query" value="drone flight" maxlength="300">')+
      range('k1','Term saturation k₁',.1,3,1.2,.1)+range('b','Length normalization b',0,1,.75,.05)+
      '<p class="small-note">Token matching is lexical. A phrase with no shared words can score zero, even when it means something similar.</p></div><div class="output"><h3>Ranked sample passages</h3><div id="ranked" aria-live="polite"></div></div></div>';
    const docs=passages.map(p=>({...p,tokens:tokenize(p.text)})),avg=docs.reduce((s,d)=>s+d.tokens.length,0)/docs.length;
    function update(){
      root.querySelector('#k1-value').textContent=number(root,'k1').toFixed(1);
      root.querySelector('#b-value').textContent=number(root,'b').toFixed(2);
      const k1=number(root,'k1'),b=number(root,'b'),query=tokenize(root.querySelector('#query').value);
      const results=docs.map(doc=>{
        let score=0;
        for(const term of query){
          const tf=doc.tokens.filter(t=>t===term).length,df=docs.filter(d=>d.tokens.includes(term)).length;
          const idf=Math.log(1+(docs.length-df+.5)/(df+.5));
          score+=idf*tf*(k1+1)/(tf+k1*(1-b+b*doc.tokens.length/avg));
        }
        return {...doc,score};
      }).sort((a,b)=>b.score-a.score);
      root.querySelector('#ranked').innerHTML=(results[0].score===0?'<p>No lexical matches. Try “drone”, “reward”, or “ocean”.</p>':'')+results.map((d,i)=>'<details '+(i===0?'open':'')+'><summary>'+escape(d.title)+' · '+d.score.toFixed(3)+'</summary><p>'+escape(d.text)+'</p></details>').join('');
    }
    root.addEventListener('input',update);update();
  }
  function hash(text,row,width) {
    let h=(2166136261 ^ Math.imul(row+1,0x9e3779b9))>>>0;
    for(const ch of text){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}
    return h%width;
  }
  function sketch(root) {
    root.innerHTML=teaching('Feed tokens into a real Count-Min Sketch. Each token increments one bucket in each row; the estimate is the minimum of those buckets.')+
      '<div class="lab-layout"><div class="controls">'+label('Token stream','<textarea id="stream" maxlength="10000">fox fox lake fern fox lake puppy puppy fox garden fern</textarea>')+
      label('Buckets per row','<select id="width"><option>8</option><option selected>16</option><option>32</option><option>64</option></select>')+
      '<button id="add-token">Append another “fox”</button><div id="sketch-stats" class="stats"></div>'+
      '<p class="small-note">Three seeded hash rows · 32-bit counters. Collisions can overestimate counts; the sketch never underestimates this nonnegative stream.</p></div>'+
      '<div class="output"><h3>Exact count vs. estimate</h3><div id="frequencies" aria-live="polite"></div></div></div><h3 style="margin-top:24px">Inside the sketch</h3><div id="buckets" class="sketch-table"></div>';
    function update(){
      const tokens=tokenize(root.querySelector('#stream').value),w=number(root,'width'),rows=3;
      const counters=Array.from({length:rows},()=>Array(w).fill(0)),exact=new Map();
      for(const token of tokens){exact.set(token,(exact.get(token)||0)+1);for(let r=0;r<rows;r++)counters[r][hash(token,r,w)]++;}
      root.querySelector('#sketch-stats').innerHTML=stat('tokens',tokens.length)+stat('unique',exact.size)+stat('counter bytes',rows*w*4);
      root.querySelector('#frequencies').innerHTML='<table><thead><tr><th>Token</th><th>Exact</th><th>Sketch</th></tr></thead><tbody>'+[...exact].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([token,count])=>'<tr><td>'+escape(token)+'</td><td>'+count+'</td><td>'+Math.min(...counters.map((row,r)=>row[hash(token,r,w)]))+'</td></tr>').join('')+'</tbody></table>';
      root.querySelector('#buckets').innerHTML='<table><thead><tr><th>Row / bucket</th>'+Array.from({length:w},(_,i)=>'<th>'+i+'</th>').join('')+'</tr></thead><tbody>'+counters.map((row,r)=>'<tr><th>'+r+'</th>'+row.map(v=>'<td class="'+(v?'active':'')+'">'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
    }
    root.addEventListener('input',update);
    listen(root,'#add-token','click',()=>{root.querySelector('#stream').value+=' fox';update();});update();
  }
  function regression(root) {
    root.innerHTML=teaching('Invented teaching points, a movable regression line, and the actual least-squares solution. Watch how the residual error changes.')+
      '<div class="lab-layout"><div class="controls">'+range('slope','Slope',-.5,1.5,.4,.01)+range('intercept','Intercept',-.2,.8,.2,.01)+
      '<button id="fit">Fit least squares</button><div id="reg-stats" class="stats" aria-live="polite"></div></div><div><canvas class="lab-canvas" aria-label="Sample points and adjustable regression line"></canvas><p class="small-note">x: scaled behavior · y: scaled response · invented data</p></div></div>';
    const chart=canvas(root),points=Array.from({length:24},(_,i)=>{const x=.05+i*.038;return[x,.12+.72*x+Math.sin(i*2.13)*.07];});
    function update(){
      const slope=number(root,'slope'),intercept=number(root,'intercept');
      root.querySelector('#slope-value').textContent=slope.toFixed(2);root.querySelector('#intercept-value').textContent=intercept.toFixed(2);
      axes(chart,'scaled predictor','scaled response');
      points.forEach(([x,y])=>{line(chart,[[x,y],[x,intercept+slope*x]],'#4a5d60');dot(chart,x,y,'#dfad74',4);});
      line(chart,[[0,intercept],[1,intercept+slope]]);
      const mse=points.reduce((s,[x,y])=>s+(y-intercept-slope*x)**2,0)/points.length;
      root.querySelector('#reg-stats').innerHTML=stat('points',points.length)+stat('mean sq. error',mse.toFixed(4))+stat('slope',slope.toFixed(2));
    }
    root.addEventListener('input',update);
    listen(root,'#fit','click',()=>{const mx=points.reduce((s,p)=>s+p[0],0)/points.length,my=points.reduce((s,p)=>s+p[1],0)/points.length;
      const slope=points.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/points.reduce((s,p)=>s+(p[0]-mx)**2,0);
      root.querySelector('#slope').value=slope;root.querySelector('#intercept').value=my-slope*mx;update();});update();
  }
  function kmeans(root) {
    root.innerHTML=teaching('A real K-means update on invented points. Advance one iteration at a time, or click the plot to add another point.')+
      '<div class="lab-layout"><div class="controls">'+label('Number of clusters','<select id="clusters"><option>2</option><option selected>3</option><option>4</option><option>5</option></select>')+
      '<div class="control-row"><button id="step" class="primary">One iteration</button><button id="run">Run 10 steps</button></div><button id="reset">Reset sample</button>'+
      '<div class="stats" id="km-stats" aria-live="polite"></div><p class="small-note">Assign to nearest centroid, then replace each centroid with the mean of its assigned points. Large rings mark the centroids.</p></div><canvas class="lab-canvas" aria-label="Interactive sample clusters. Click to add a point."></canvas></div>';
    const chart=canvas(root),colors=['#b7dbba','#dfad74','#96bcd2','#bea9d0','#df9292'];
    let points=[],centers=[],iteration=0;
    function reset(){
      const random=rng(17);
      points=Array.from({length:60},(_,i)=>{const group=i%3;return{x:[.22,.72,.55][group]+(random()-.5)*.27,y:[.7,.68,.23][group]+(random()-.5)*.27,c:-1};});
      const k=number(root,'clusters');centers=Array.from({length:k},(_,i)=>({x:.12+i*.75/(k-1),y:i%2?.35:.75}));iteration=0;draw();
    }
    function step(){
      points.forEach(p=>{p.c=centers.reduce((best,c,i)=>((p.x-c.x)**2+(p.y-c.y)**2 < (p.x-centers[best].x)**2+(p.y-centers[best].y)**2)?i:best,0);});
      centers=centers.map((c,i)=>{const group=points.filter(p=>p.c===i);return group.length?{x:group.reduce((s,p)=>s+p.x,0)/group.length,y:group.reduce((s,p)=>s+p.y,0)/group.length}:c;});
      iteration++;draw();
    }
    function draw(){
      axes(chart,'sample x','sample y');points.forEach(p=>dot(chart,p.x,p.y,p.c<0?'#a0b2b5':colors[p.c],4));
      centers.forEach((c,i)=>{chart.ctx.strokeStyle=colors[i];chart.ctx.lineWidth=3;chart.ctx.beginPath();chart.ctx.arc(chart.x(c.x),chart.y(c.y),11,0,Math.PI*2);chart.ctx.stroke();});
      const inertia=points.reduce((s,p)=>s+Math.min(...centers.map(c=>(p.x-c.x)**2+(p.y-c.y)**2)),0);
      root.querySelector('#km-stats').innerHTML=stat('iteration',iteration)+stat('points',points.length)+stat('inertia',inertia.toFixed(3));
    }
    listen(root,'#step','click',step);listen(root,'#run','click',()=>{for(let i=0;i<10;i++)step();});
    listen(root,'#reset','click',reset);listen(root,'#clusters','change',reset);
    chart.element.addEventListener('click',event=>{const bounds=chart.element.getBoundingClientRect();const x=((event.clientX-bounds.left)*600/bounds.width-45)/525,y=(295-(event.clientY-bounds.top)*340/bounds.height)/250;
      if(x>=0&&x<=1&&y>=0&&y<=1){points.push({x,y,c:-1});draw();}});reset();
  }
  function margin(root) {
    root.innerHTML=teaching('An illustrative separating boundary. Move it and widen its margin to see how invented points fall on either side. This does not fit an SVM.')+
      '<div class="lab-layout"><div class="controls">'+range('boundary','Boundary position',.2,.8,.5,.01)+range('margin','Half-margin width',.02,.25,.1,.01)+
      '<div class="stats" id="margin-stats" aria-live="polite"></div><p class="small-note">Orange points belong to the lower class; mint points belong to the upper class. Points inside the dashed margin are counted separately from classification errors.</p></div><canvas class="lab-canvas" aria-label="Sample classification boundary and margin"></canvas></div>';
    const chart=canvas(root),random=rng(13),points=Array.from({length:36},(_,i)=>({x:.08+random()*.84,y:(i<18?.2:.63)+random()*.19,c:i<18?0:1}));
    function update(){
      const b=number(root,'boundary'),m=number(root,'margin');axes(chart,'sample x','sample y');
      root.querySelector('#boundary-value').textContent=b.toFixed(2);root.querySelector('#margin-value').textContent=m.toFixed(2);
      chart.ctx.fillStyle='#b7dbba0c';chart.ctx.fillRect(chart.x(0),chart.y(b+m),525,chart.y(b-m)-chart.y(b+m));
      line(chart,[[0,b],[1,b]]);chart.ctx.setLineDash([7,5]);line(chart,[[0,b+m],[1,b+m]],'#72877b');line(chart,[[0,b-m],[1,b-m]],'#72877b');chart.ctx.setLineDash([]);
      points.forEach(p=>dot(chart,p.x,p.y,p.c?'#b7dbba':'#dfad74',4));
      root.querySelector('#margin-stats').innerHTML=stat('points',points.length)+stat('misclassified',points.filter(p=>Number(p.y>b)!==p.c).length)+stat('inside margin',points.filter(p=>Math.abs(p.y-b)<m).length);
    }
    root.addEventListener('input',update);update();
  }
  function metrics(root) {
    root.innerHTML=teaching('Explore evaluation arithmetic without entering any patient data. These editable counts are invented and refer to no clinical model.')+
      '<div class="lab-layout"><div class="controls">'+
      label('True positives','<input id="tp" type="number" min="0" max="10000" value="70">')+
      label('False positives','<input id="fp" type="number" min="0" max="10000" value="20">')+
      label('False negatives','<input id="fn" type="number" min="0" max="10000" value="10">')+
      '</div><div><div class="stats" id="metric-stats" aria-live="polite"></div><div class="output" style="margin-top:18px"><h3>The arithmetic</h3><p>Precision = TP / (TP + FP)</p><p>Recall = TP / (TP + FN)</p><p>F1 = 2TP / (2TP + FP + FN)</p><p class="small-note">An undefined denominator is displayed as “—”, not a perfect score.</p></div></div></div>';
    function update(){
      const values=['tp','fp','fn'].map(id=>Math.max(0,Math.min(10000,number(root,id)||0)));const [tp,fp,fn]=values;
      const fmt=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
      root.querySelector('#metric-stats').innerHTML=stat('precision',fmt(tp,tp+fp))+stat('recall',fmt(tp,tp+fn))+stat('F1',fmt(2*tp,2*tp+fp+fn));
    }
    root.addEventListener('input',update);update();
  }
  function portfolio(root) {
    root.innerHTML=teaching('Explore the portfolio-variance formula with three invented assets. A and B use the sliders; C receives the remainder. The values are teaching inputs, not market forecasts.')+
      '<div class="lab-layout"><div class="controls">'+range('wa','Asset A weight (%)',0,100,40)+range('wb','Asset B weight (%)',0,100,30)+
      '<div class="stats" id="portfolio-stats" aria-live="polite"></div>'+
      '<p class="small-note">Invented returns: A 7%, B 3%, C 4%. Volatility: A 5%, B 2%, C 3%. Pair correlations: AB 0.1, AC 0.2, BC 0.15.</p></div><div><canvas class="lab-canvas" aria-label="Return and volatility for illustrative three-asset allocations"></canvas><p class="small-note">Orange point: selected allocation. Mint cloud: nonnegative combinations.</p></div></div>';
    const chart=canvas(root),returns=[.07,.03,.04],cov=[[.0025,.0001,.0003],[.0001,.0004,.00009],[.0003,.00009,.0009]];
    const evaluate=weights=>({ret:weights.reduce((s,w,i)=>s+w*returns[i],0),risk:Math.sqrt(weights.reduce((s,w,i)=>s+w*weights.reduce((v,other,j)=>v+other*cov[i][j],0),0))});
    function update(event){
      let a=number(root,'wa'),b=number(root,'wb');
      if(a+b>100){if(event?.target.id==='wa'){b=100-a;root.querySelector('#wb').value=b;}else{a=100-b;root.querySelector('#wa').value=a;}}
      root.querySelector('#wa-value').textContent=a;root.querySelector('#wb-value').textContent=b;
      const result=evaluate([a/100,b/100,1-(a+b)/100]);
      root.querySelector('#portfolio-stats').innerHTML=stat('C weight',(100-a-b)+'%')+stat('expected return',(100*result.ret).toFixed(2)+'%')+stat('volatility',(100*result.risk).toFixed(2)+'%');
      axes(chart,'volatility: 0% → 6%','expected return: 0% → 8%');
      for(let i=0;i<=25;i++)for(let j=0;j<=25-i;j++){const p=evaluate([i/25,j/25,1-(i+j)/25]);dot(chart,p.risk/.06,p.ret/.08,'#b7dbba55',2);}
      dot(chart,result.risk/.06,result.ret/.08,'#dfad74',8);
    }
    root.addEventListener('input',update);update();
  }
  function lorenz(root) {
    root.innerHTML=teaching('A mathematical teaching curve: L(p) = pᵃ. Change the exponent to explore how the curve bends away from equal distribution.')+
      '<div class="lab-layout"><div class="controls">'+range('power','Curve exponent a',1,6,2,.1)+
      '<div class="stats" id="lorenz-stats" aria-live="polite"></div>'+
      '<p class="small-note">Gini = 1 − 2∫L(p)dp = 1 − 2/(a+1). These are hypothetical distributions, not estimates for a real community.</p></div><canvas class="lab-canvas" aria-label="Lorenz teaching curve against the equality diagonal"></canvas></div>';
    const chart=canvas(root);
    function update(){
      const power=number(root,'power');root.querySelector('#power-value').textContent=power.toFixed(1);axes(chart,'cumulative population: 0 → 100%','cumulative income: 0 → 100%');
      line(chart,[[0,0],[1,1]],'#7d9296');line(chart,Array.from({length:101},(_,i)=>[i/100,(i/100)**power]));
      root.querySelector('#lorenz-stats').innerHTML=stat('Gini',(1-2/(power+1)).toFixed(3))+stat('bottom 50% share',(100*.5**power).toFixed(1)+'%')+stat('exponent',power.toFixed(1));
    }
    root.addEventListener('input',update);update();
  }
  function vocabulary(root,project,base) {
    const families=[...new Set(project.media.map(m=>m.family))];
    root.innerHTML=teaching('Original SVG examples from the repository. Filter by the relationship you want to communicate, then open a chart or its Python source.')+
      '<div class="chart-filter">'+label('Relationship family','<select id="family"><option value="all">All families ('+project.media.length+' charts)</option>'+families.map(f=>'<option value="'+escape(f)+'">'+escape(f.replaceAll('-',' '))+'</option>').join('')+'</select>')+'</div>'+
      '<div class="result-grid chart-gallery">'+project.media.map((m,i)=>'<figure class="figure chart-item" data-family="'+escape(m.family)+'"><button class="zoom" data-index="'+i+'" aria-label="Enlarge '+escape(m.caption)+'"><img src="'+base+encodeURI(m.path)+'" alt="'+escape(m.caption)+'" loading="lazy"></button><figcaption>'+escape(m.caption)+'<br><a href="'+escape(m.source.replace(/\.svg$/,'.py'))+'">Matplotlib source ↗</a></figcaption></figure>').join('')+'</div>';
    listen(root,'#family','change',()=>{const value=root.querySelector('#family').value;root.querySelectorAll('.chart-item').forEach(item=>item.hidden=value!=='all'&&item.dataset.family!==value);});
  }
  async function mcp(root,project,base) {
    root.innerHTML=teaching('Browse actual tool declarations from the original source. This is a local catalog; no profiles are created or controlled here.')+
      label('Find a tool','<input id="tool-search" type="search" placeholder="Search tool names or descriptions">')+
      '<p id="tool-count" class="small-note" aria-live="polite">Loading tool definitions…</p><div class="catalog-tools" id="tools"></div>';
    try{
      const response=await fetch(base+'mcp-tools.json');if(!response.ok)throw new Error('Tool catalog could not load');
      const tools=await response.json();
      function update(){
        const query=root.querySelector('#tool-search').value.toLowerCase();
        const filtered=tools.filter(t=>(t.name+' '+t.description).toLowerCase().includes(query));
        root.querySelector('#tool-count').textContent=filtered.length+' of '+tools.length+' source declarations';
        root.querySelector('#tools').innerHTML=filtered.map(t=>'<details class="tool"><summary>'+escape(t.name)+'</summary><p>'+escape(t.description)+'</p><code>'+escape(t.name+'('+t.signature+')')+'</code><a class="readme-link" href="'+escape(t.source)+'">Definition in source ↗</a></details>').join('')||'<p>No matching tools.</p>';
      }
      listen(root,'#tool-search','input',update);update();
    }catch(error){root.querySelector('#tool-count').textContent=error.message+'. Open the source repository to inspect the tool definitions.';}
  }
  const widgets={counter,language,poetry,retrieval,sketch,regression,kmeans,margin,metrics,portfolio,lorenz,vocabulary,mcp};
  return {mount:(root,project,base)=>{const widget=widgets[project.widget];if(widget)widget(root,project,base);}};
})();
