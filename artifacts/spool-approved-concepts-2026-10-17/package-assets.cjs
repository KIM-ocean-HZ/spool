const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('/Users/hzjin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const knote='/Users/hzjin/Desktop/Knote';
const portfolio='/Users/hzjin/Desktop/portfolio';
const knoteDest=path.join(knote,'docs/promo/2026-10-17');
const portfolioDest=path.join(portfolio,'docs/assets/spool/2026-10-17');
const webDest=path.join(portfolio,'public/img/spool');
const records=[
  {id:'daily-progress',title:'Every day, a little further.',file:'spool-concept-daily-progress.png',src:path.join(knote,'artifacts/spool-promo-2026-10-16/round-2-english/spool-v2-03-daily-progress.png'),created:'2026-10-16'},
  {id:'ai-workflow',title:'Think with AI. Keep the thread.',file:'spool-concept-ai-workflow.png',src:path.join(knote,'artifacts/spool-functional-2026-10-17/approved-detail-restoration/spool-typewriter-03-restored-official-logo.png'),created:'2026-10-17'}
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const writeNew=(file,data)=>{
  if(fs.existsSync(file)){
    if(!fs.readFileSync(file).equals(Buffer.isBuffer(data)?data:Buffer.from(data))) throw new Error('Destination exists with different content: '+file);
    return;
  }
  fs.writeFileSync(file,data);
};
(async()=>{
  for(const dir of [knoteDest,portfolioDest,webDest])fs.mkdirSync(dir,{recursive:true});
  const images=[];
  for(const item of records){
    const raw=fs.readFileSync(item.src);
    const meta=await sharp(raw).metadata();
    const digest=sha(raw);
    writeNew(path.join(knoteDest,item.file),raw);
    writeNew(path.join(portfolioDest,item.file),raw);
    for(const dir of [knoteDest,portfolioDest])if(sha(fs.readFileSync(path.join(dir,item.file)))!==digest)throw new Error('Master readback mismatch');
    const web=[];
    for(const width of [640,960,1440]){
      let encoded,quality;
      for(const q of [86,84,82,80,78,76]){
        encoded=await sharp(raw).resize({width,withoutEnlargement:true}).webp({quality:q,effort:6}).toBuffer();
        quality=q;
        if(encoded.length<=180000)break;
      }
      if(encoded.length>180000)throw new Error('Web image exceeds 180KB target: '+item.id+' '+width);
      const name='concept-'+item.id+'-2026-10-17-'+width+'.webp';
      writeNew(path.join(webDest,name),encoded);
      const actual=await sharp(path.join(webDest,name)).metadata();
      if(actual.width!==width||actual.format!=='webp')throw new Error('Web export verification failed');
      await sharp(path.join(webDest,name)).raw().toBuffer();
      web.push({file:name,url:'/img/spool/'+name,width:actual.width,height:actual.height,quality,bytes:encoded.length,sha256:sha(encoded)});
    }
    images.push({...item,src:item.src,width:meta.width,height:meta.height,bytes:raw.length,sha256:digest,web});
  }
  const manifest={
    date:'2026-10-17',project:'Spool',status:'user-accepted-concept-reserve-assets',
    authorization:'Store the accepted workflow concept and the previously selected daily-progress concept in Knote and portfolio as reserve concept images.',
    classification:'AI-generated promotional concept artwork; not application screenshots or release evidence.',
    page_integration:'Prepared assets and figure metadata only. The existing Spool page is unchanged.',
    masters_preserved_byte_for_byte:true,
    images
  };
  const json=JSON.stringify(manifest,null,2)+'\n';
  for(const dir of [knoteDest,portfolioDest]){
    writeNew(path.join(dir,'manifest.json'),json);
    writeNew(path.join(dir,'SHA256SUMS'),images.map(i=>i.sha256+'  '+i.file).join('\n')+'\n');
  }
  process.stdout.write(JSON.stringify({knote:knoteDest,portfolio:portfolioDest,images:images.map(i=>({id:i.id,master:[i.width,i.height],sha256:i.sha256,web:i.web.map(w=>({width:w.width,bytes:w.bytes,quality:w.quality}))}))},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

