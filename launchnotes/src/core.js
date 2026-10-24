export const MAX_INPUT_CHARS = 250_000;
const CATEGORIES = [
  {key:'features', title:'Features', types:['feat','feature','add']},
  {key:'fixes', title:'Fixes', types:['fix','bugfix','hotfix']},
  {key:'performance', title:'Performance', types:['perf','performance']},
  {key:'security', title:'Security', types:['security','sec']},
  {key:'documentation', title:'Documentation', types:['docs','doc']},
  {key:'maintenance', title:'Maintenance', types:['refactor','style','test','build','ci','chore','revert']},
];
const CATEGORY_BY_TYPE = new Map(CATEGORIES.flatMap(c=>c.types.map(t=>[t,c.key])));
export function parseCommits(input, {includeMaintenance=true}={}) {
  if(typeof input!=='string') throw new Error('Paste commit messages as text.');
  if(input.length>MAX_INPUT_CHARS) throw new Error('Input is too long. Limit: 250,000 characters.');
  const seen=new Set(), commits=[];
  for(const raw of input.split(/\r?\n/)) {
    const line=raw.trim().replace(/^(?:[*•-]|\d+[.)])\s*/, '').trim();
    if(!line) continue;
    const match=line.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
    let type='other', scope='', breaking=false, message=line;
    if(match) {type=match[1].toLowerCase();scope=(match[2]??'').trim();breaking=Boolean(match[3]);message=match[4].trim();}
    if(/^BREAKING CHANGE:\s*/i.test(line)) {type='breaking';breaking=true;message=line.replace(/^BREAKING CHANGE:\s*/i,'').trim();}
    // Include trailer-based breaking markers in pasted git log output.
    if(/\bBREAKING CHANGE:\s*.+/i.test(message)){breaking=true;message=message.replace(/\s*BREAKING CHANGE:\s*.+$/i,'').trim();}
    if(!message) continue;
    const category=CATEGORY_BY_TYPE.get(type)??'other';
    if(!includeMaintenance && category==='maintenance' && !breaking) continue;
    const identity=`${type}\0${scope}\0${message}`.toLowerCase();
    if(seen.has(identity)) continue;
    seen.add(identity);commits.push({type,scope,breaking,message,category});
  }
  return commits;
}
export function suggestVersion(commits, current='1.0.0') {
  const match=String(current).trim().replace(/^v/i,'').match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if(!match) throw new Error('Enter a version like 1.2.3.');
  let [major,minor,patch]=match.slice(1).map(Number);
  if(commits.some(c=>c.breaking)){major++;minor=0;patch=0;}
  else if(commits.some(c=>['features'].includes(c.category))){minor++;patch=0;}
  else if(commits.some(c=>commits.length && c.category!=='other')){patch++;}
  return `${major}.${minor}.${patch}`;
}
function escapeMarkdown(value){return value.replace(/[<>]/g,'');}
export function createNotes(commits, {version='Unreleased', title='Release notes', includeMaintenance=true}={}) {
  if(!Array.isArray(commits)) throw new Error('Commits must be a list.');
  const sections=[];
  for(const category of CATEGORIES) {
    if(category.key==='maintenance'&&!includeMaintenance)continue;
    const items=commits.filter(c=>c.category===category.key);
    if(!items.length)continue;
    sections.push(`### ${category.title}\n\n${items.map(c=>`- ${c.breaking?'**BREAKING:** ':''}${c.scope?`**${escapeMarkdown(c.scope)}:** `:''}${escapeMarkdown(c.message)}`).join('\n')}`);
  }
  const other=commits.filter(c=>c.category==='other');
  if(other.length)sections.push(`### Other changes\n\n${other.map(c=>`- ${escapeMarkdown(c.message)}`).join('\n')}`);
  return `# ${escapeMarkdown(title)} — ${escapeMarkdown(version)}\n\n${sections.length?sections.join('\n\n'):'No commit messages were provided.'}\n`;
}
export function createAnnouncement(commits,version) {
  const features=commits.filter(c=>c.category==='features').map(c=>c.message);
  const fixes=commits.filter(c=>c.category==='fixes').map(c=>c.message);
  const lines=[`🚀 Version ${version} is here!`];
  if(features.length)lines.push('',`✨ New: ${features.slice(0,3).join('; ')}${features.length>3?' — and more':''}`);
  if(fixes.length)lines.push('',`🛠 Fixed: ${fixes.slice(0,2).join('; ')}${fixes.length>2?' — and more':''}`);
  if(!features.length&&!fixes.length)lines.push('',`${commits.length} update${commits.length===1?'':'s'} in this release.`);
  return lines.join('\n');
}
