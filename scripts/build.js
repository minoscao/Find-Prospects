import {build} from 'vite';
import {cpSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stage=path.join(process.env.LOCALAPPDATA||os.tmpdir(),'TentGrowth','runtime-v1');
mkdirSync(stage,{recursive:true});
cpSync(path.join(root,'src'),path.join(stage,'src'),{recursive:true});
cpSync(path.join(root,'index.html'),path.join(stage,'index.html'));
cpSync(path.join(root,'package.json'),path.join(stage,'package.json'));
if(!existsSync(path.join(stage,'node_modules','react','package.json'))){
 const npm=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
 execFileSync(process.execPath,[npm,'install','--prefix',stage,'--no-audit','--no-fund'],{stdio:'inherit'});
}
await build({configFile:false,root:stage,resolve:{preserveSymlinks:true},build:{outDir:path.join(root,'dist'),emptyOutDir:false}});
