let user=null,projects=[],current=null,currentChapter=null,stopAll=false;
const $=id=>document.getElementById(id);

async function api(path,options={}){
  const opts={...options,headers:{...(options.headers||{})}};
  if(opts.body&&typeof opts.body!=="string"){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(opts.body)}
  const r=await fetch(path,opts);
  const ct=r.headers.get("content-type")||"";
  const d=ct.includes("application/json")?await r.json():null;
  if(!r.ok) throw new Error(d?.error||("Errore "+r.status));
  return d;
}
function hide(id){$(id).classList.add("hidden")}
function show(id){$(id).classList.remove("hidden")}
function showAuth(){show("authModal")}
function start(){user?openApp():showAuth()}
function tab(id,btn){document.querySelectorAll(".pane").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active")}
function status(t){$("status").textContent=t;$("status").classList.remove("hidden")}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function boot(){
  try{
    const [m,h]=await Promise.all([api("/api/me"),api("/api/health")]);
    user=m.user;
    $("aiState").textContent=h.ai_configured?"AI pronta":"AI da configurare";
    if(user){$("loginBtn").classList.add("hidden");$("logoutBtn").classList.remove("hidden");await loadProjects()}
  }catch(e){console.error(e)}
}
async function auth(mode){
  $("authError").textContent="";
  try{
    const d=await api("/api/"+mode,{method:"POST",body:{email:$("email").value,password:$("password").value}});
    user=d.user;hide("authModal");$("loginBtn").classList.add("hidden");$("logoutBtn").classList.remove("hidden");await loadProjects();openApp();
  }catch(e){$("authError").textContent=e.message}
}
async function logout(){await api("/api/logout",{method:"POST"});user=null;current=null;projects=[];$("logoutBtn").classList.add("hidden");$("loginBtn").classList.remove("hidden");$("app").classList.add("hidden");$("landing").classList.remove("hidden")}
async function openApp(){$("landing").classList.add("hidden");$("app").classList.remove("hidden");await loadProjects();renderList();render()}
async function loadProjects(){const d=await api("/api/projects");projects=d.projects;renderList()}
function renderList(){$("projectList").innerHTML=projects.map(p=>`<div class="project-item ${current?.id===p.id?"active":""}" onclick="openProject(${p.id})"><strong>${esc(p.title)}</strong><small>${p.project_type==="trilogy"?"Trilogia":"Libro singolo"} • ${esc(p.genre)}</small></div>`).join("")}
async function openProject(id){const d=await api("/api/projects/"+id);current=d.project;renderList();render()}
function render(){
  if(!current){$("empty").classList.remove("hidden");$("project").classList.add("hidden");return}
  $("empty").classList.add("hidden");$("project").classList.remove("hidden");
  $("badge").textContent=current.project_type==="trilogy"?"TRILOGIA • 3 VOLUMI":"ROMANZO SINGOLO";
  $("title").textContent=current.title;
  $("meta").textContent=current.genre+" • "+current.language+" • "+current.chapter_count+" capitoli per volume";
  $("exportLink").href="/api/projects/"+current.id+"/export";
  $("pTitle").value=current.title;$("pGenre").value=current.genre;$("pTone").value=current.tone;$("pAudience").value=current.audience;
  $("pLanguage").value=current.language;$("pChapters").value=current.chapter_count;$("pWords").value=current.words_per_chapter;
  $("pPremise").value=current.premise;$("pStyle").value=current.style_notes;
  renderCharacters();renderVolumes()
}
function newProject(){if(!user)return showAuth();show("projectModal")}
async function createProject(){
  const type=document.querySelector('input[name="ptype"]:checked').value;
  const d=await api("/api/projects",{method:"POST",body:{title:$("nTitle").value,project_type:type,genre:$("nGenre").value,premise:$("nPremise").value}});
  current=d.project;hide("projectModal");await loadProjects();render()
}
async function saveProject(){
  const d=await api("/api/projects/"+current.id,{method:"PUT",body:{
    title:$("pTitle").value,genre:$("pGenre").value,tone:$("pTone").value,audience:$("pAudience").value,
    language:$("pLanguage").value,chapter_count:Number($("pChapters").value),words_per_chapter:Number($("pWords").value),
    premise:$("pPremise").value,style_notes:$("pStyle").value
  }});
  current=d.project;await loadProjects();render()
}
function showCharacter(){show("characterModal")}
async function addCharacter(){
  await api("/api/projects/"+current.id+"/characters",{method:"POST",body:{
    name:$("cName").value,role:$("cRole").value,age:$("cAge").value,appearance:$("cAppearance").value,
    personality:$("cPersonality").value,goal:$("cGoal").value,fear:$("cFear").value,powers:$("cPowers").value,
    backstory:$("cBackstory").value,relationships:$("cRelationships").value
  }});
  hide("characterModal");await refresh()
}
async function removeCharacter(id){if(!confirm("Eliminare il personaggio?"))return;await api("/api/projects/"+current.id+"/characters/"+id,{method:"DELETE"});await refresh()}
function renderCharacters(){
  $("characterGrid").innerHTML=current.characters.length?current.characters.map(c=>`<article class="card"><div class="eyebrow">${esc(c.role||"PERSONAGGIO")}</div><h3>${esc(c.name)}</h3><p>${esc(c.personality||c.appearance||"Scheda da completare")}</p><button class="btn" onclick="removeCharacter(${c.id})">Elimina</button></article>`).join(""):"<p>Nessun personaggio. Aggiungi almeno protagonista e antagonista.</p>"
}
async function generatePlan(){
  if(current.volumes.length&&!confirm("Rigenerare la scaletta cancellerà i capitoli esistenti. Continuare?"))return;
  status("Generazione della struttura narrativa…");
  try{const d=await api("/api/projects/"+current.id+"/generate-plan",{method:"POST"});current=d.project;renderVolumes();status("Scaletta pronta.")}catch(e){status(e.message)}
}
async function writeNext(){
  status("Scrittura del prossimo capitolo…");
  try{const d=await api("/api/projects/"+current.id+"/generate-next-chapter",{method:"POST"});current=d.project;renderVolumes();status(d.done?"Manoscritto completo.":"Capitolo completato.");return d}catch(e){status(e.message);throw e}
}
async function writeAll(){
  if(stopAll){stopAll=false;return}
  stopAll=true;
  try{while(stopAll){const d=await writeNext();if(d.done)break}}finally{stopAll=false}
}
function renderVolumes(){
  if(!current.volumes.length){$("volumes").innerHTML="<p>Genera la scaletta per creare volumi e capitoli.</p>";return}
  $("volumes").innerHTML=current.volumes.map(v=>`<article class="volume"><div class="eyebrow">VOLUME ${v.position}</div><h3>${esc(v.title)}</h3><p>${esc(v.synopsis)}</p>${v.chapters.map(c=>`<div class="chapter"><span>${String(c.position).padStart(2,"0")}</span><div><strong>${esc(c.title)}</strong><p>${esc(c.synopsis)}</p></div><button class="btn" onclick="editChapter(${c.id})">${c.content?"Modifica":"Apri"}</button></div>`).join("")}</article>`).join("")
}
function editChapter(id){
  for(const v of current.volumes){const c=v.chapters.find(x=>x.id===id);if(c){currentChapter=c;break}}
  if(!currentChapter)return;$("editChapterTitle").value=currentChapter.title;$("editChapterContent").value=currentChapter.content||"";show("chapterModal")
}
async function saveChapter(){
  const d=await api("/api/projects/"+current.id+"/chapters/"+currentChapter.id,{method:"PUT",body:{title:$("editChapterTitle").value,content:$("editChapterContent").value,synopsis:currentChapter.synopsis}});
  current=d.project;hide("chapterModal");renderVolumes()
}
async function refresh(){const d=await api("/api/projects/"+current.id);current=d.project;render()}
boot();