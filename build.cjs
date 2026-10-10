const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=__dirname,esbuild=require('esbuild');
(async()=>{
 const out=await esbuild.build({entryPoints:[path.join(root,'src','main.js')],bundle:true,write:false,format:'esm',external:['three','three/*'],target:'es2022',minify:true,logLevel:'warning'});
 const html=fs.readFileSync(path.join(root,'index.template.html'),'utf8').replace('/*STYLE*/',()=>fs.readFileSync(path.join(root,'src','style.css'),'utf8')).replace('/*SCRIPTS*/',()=>out.outputFiles[0].text);
 fs.writeFileSync(path.join(root,'index.html'),html);const report={version:'V16',bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex'),cargo:'procedural 3D crate and canopy',handAssets:false};fs.writeFileSync(path.join(root,'release.json'),JSON.stringify(report,null,2));console.log(report);
})();
