import {parseCommits,createNotes,createAnnouncement,suggestVersion} from '/src/core.js';
const $=id=>document.getElementById(id);
const demo=`feat: add keyboard shortcuts\nfeat(editor): remember last selected theme\nfix: keep the preview in sync after edits\nfix(export): include headings in downloaded markdown\nperf: load the workspace faster\ndocs: explain the offline workflow\ntest: cover empty release notes\nchore: tidy development scripts`;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function el(tag,text,cls){const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;}
let markdown='',announcement='';
function render(){
 try{
  const commits=parseCommits($('commits').value,{includeMaintenance:$('maintenance').checked});
  const suggested=suggestVersion(commits,$('current-version').value);
  const version=$('release-version').value.trim().replace(/^v/i,'')||suggested;
  if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Release version must look like 1.2.3.');
  markdown=createNotes(commits,{version,includeMaintenance:$('maintenance').checked});
  announcement=createAnnouncement(commits,version);
  $('release-badge').textContent=`v${version}`;
  $('hero-release-version').textContent = `v${version}`; 
  $('release-label').textContent=`${commits.length} COMMIT${commits.length===1?'':'S'} · RELEASE NOTES`;
  const container=$('notes');container.replaceChildren();
  const heading=el('h1',`Release notes — ${version}`);container.append(heading);
  const groups=[['features','Features'],['fixes','Fixes'],['performance','Performance'],['security','Security'],['documentation','Documentation'],['maintenance','Maintenance'],['other','Other changes']];
  let visible=0;
  for(const [key,title] of groups){const subset=commits.filter(c=>c.category===key);if(!subset.length)continue;
   const h=el('h2',title);container.append(h);const ul=document.createElement('ul');
   for(const commit of subset){const li=document.createElement('li');if(commit.breaking)li.append(el('strong','BREAKING: '));if(commit.scope)li.append(el('strong',`${commit.scope}: `));li.append(document.createTextNode(commit.message));ul.append(li);visible++;}
   container.append(ul);
  }
  if(!visible)container.append(el('p','Your release notes will appear here when you add commits.','empty'));
  $('post').textContent=announcement;status(`${commits.length} commit${commits.length===1?'':'s'} organized. Check the wording before you publish.`);
 }catch(error){markdown='';announcement='';$('notes').replaceChildren(el('p',error.message,'error-text'));$('post').textContent='';status(error.message,true);}
}
for(const id of ['commits','current-version','release-version','maintenance'])$(id).addEventListener('input',render);
$('load-sample').onclick=()=>{$('commits').value=demo;$('current-version').value='1.7.2';$('release-version').value='';render();};
async function copy(value,label){if(!value){status('Add at least one commit first.',true);return;}try{await navigator.clipboard.writeText(value);status(`${label} copied to clipboard.`);}catch{status('Clipboard access failed. Select and copy the preview text instead.',true);}}
$('copy-notes').onclick=()=>copy(markdown,'Release notes');$('copy-post').onclick=()=>copy(announcement,'Launch post');
$('download-notes').onclick=()=>{if(!markdown){status('Add at least one commit first.',true);return;}const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='RELEASE_NOTES.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Release notes downloaded as RELEASE_NOTES.md.');};
render();
