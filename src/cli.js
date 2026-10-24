#!/usr/bin/env node
import {readFile,writeFile,stat} from 'node:fs/promises';
import {parseCommits,createNotes,suggestVersion,MAX_INPUT_CHARS} from './core.js';
const usage=`LaunchNotes — clear release notes from real commits.

node src/cli.js --input commits.txt --current 1.2.3 --output RELEASE_NOTES.md

Options:
  --input FILE      One commit message per line (required)
  --output FILE     Markdown destination (required; never overwritten)
  --current X.Y.Z   Current version; default 1.0.0
  --version X.Y.Z   Set new version instead of suggesting one
  --title TEXT      Release title; default "Release notes"
  --all             Include maintenance messages
`;
async function main(args){
  if(args.length===0||args.includes('--help')){console.log(usage);return;}
  const options=new Map();
  for(let i=0;i<args.length;i++){
    const flag=args[i];if(options.has(flag))throw new Error('Duplicate option.');
    if(flag==='--all')options.set(flag,true);
    else if(['--input','--output','--current','--version','--title'].includes(flag)){
      const value=args[++i];if(!value||value.startsWith('--'))throw new Error(`${flag} requires a value.`);options.set(flag,value);
    }else throw new Error(`Unknown option: ${flag}`);
  }
  if(!options.has('--input')||!options.has('--output'))throw new Error('Both --input and --output are required. Use --help.');
  const filename=options.get('--input');
  if((await stat(filename)).size>MAX_INPUT_CHARS)throw new Error('Input is too large.');
  const input=await readFile(filename,'utf8');
  if(input.length>MAX_INPUT_CHARS)throw new Error('Input is too large.');
  const commits=parseCommits(input,{includeMaintenance:options.has('--all')});
  const version=options.get('--version')??suggestVersion(commits,options.get('--current')??'1.0.0');
  const notes=createNotes(commits,{version,title:options.get('--title')??'Release notes',includeMaintenance:options.has('--all')});
  await writeFile(options.get('--output'),notes,{encoding:'utf8',flag:'wx'});
  console.log(`Wrote ${commits.length} commit summaries for v${version} to ${options.get('--output')}`);
}
main(process.argv.slice(2)).catch(e=>{console.error(`LaunchNotes: ${e.code?`file operation failed (${e.code})`:e.message}`);process.exitCode=1;});
