const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let pollTimer = null;

function show(id) {
  ["home","form","result","admin"].forEach(x => $(x).classList.toggle("hidden", x !== id));
  if (id === "result") showCurrentResult();
  if (id === "admin") {
    $("adminArea").classList.add("hidden");
    $("adminLogin").classList.remove("hidden");
    $("adminMessage").textContent = "";
  }
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function parseAffinity(row) {
  let data = {};
  try { data = JSON.parse(row.preferred_activities || "{}"); } catch {}
  return {...data, personality: row.personality || "", topic: row.expectations || ""};
}
function score(a,b) {
  let s = 0;
  const ai = a.interests || [], bi = b.interests || [];
  s += ai.filter(x => bi.includes(x)).length * 12;
  if (a.personality === b.personality) s += 12;
  if (a.sharing === b.sharing) s += 20;
  if (a.rhythm === b.rhythm) s += 12;
  if (a.topic === b.topic) s += 20;
  return s;
}

// Exact maximum-weight assignment using the Hungarian algorithm.
// Each M2 is duplicated into two available "slots".
function hungarianMax(weights) {
  const rows = weights.length, cols = rows ? weights[0].length : 0;
  const n = Math.max(rows, cols);
  if (!n) return [];
  const maxW = Math.max(0, ...weights.flat());
  const a = Array.from({length:n}, (_,i) =>
    Array.from({length:n}, (_,j) => maxW - (weights[i]?.[j] ?? 0))
  );
  const u = Array(n+1).fill(0), v = Array(n+1).fill(0), p = Array(n+1).fill(0), way = Array(n+1).fill(0);
  for (let i=1;i<=n;i++) {
    p[0]=i; let j0=0; const minv=Array(n+1).fill(Infinity), used=Array(n+1).fill(false);
    do {
      used[j0]=true; const i0=p[j0]; let delta=Infinity, j1=0;
      for(let j=1;j<=n;j++) if(!used[j]) {
        const cur=a[i0-1][j-1]-u[i0]-v[j];
        if(cur<minv[j]){minv[j]=cur;way[j]=j0;}
        if(minv[j]<delta){delta=minv[j];j1=j;}
      }
      for(let j=0;j<=n;j++){if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else{minv[j]-=delta;}}
      j0=j1;
    } while(p[j0]!==0);
    do {const j1=way[j0];p[j0]=p[j1];j0=j1;} while(j0!==0);
  }
  const assignment = Array(rows).fill(-1);
  for(let j=1;j<=n;j++) if(p[j] && p[j]<=rows) assignment[p[j]-1]=j-1;
  return assignment;
}

async function loadPeople() {
  const {data, error} = await db.from("participants").select("id,name,level,created_at").order("created_at");
  if (error) throw error;
  return data || [];
}
async function loadResponses() {
  const {data, error} = await db.from("responses").select("participant_id,preferred_activities,personality,expectations");
  if (error) throw error;
  return data || [];
}
async function refreshStats() {
  const people = await loadPeople();
  const m1 = people.filter(p=>p.level==="M1"), m2 = people.filter(p=>p.level==="M2");
  $("stats").innerHTML = `<p><strong>${people.length}</strong> participants — <strong>${m1.length}</strong> M1 — <strong>${m2.length}</strong> M2</p>`;
  return {people,m1,m2};
}
async function publishMatching() {
  $("adminMessage").textContent = "Calcul des binômes…";
  const {people,m1,m2} = await refreshStats();
  const responses = await loadResponses();
  const byId = new Map(responses.map(r=>[r.participant_id,parseAffinity(r)]));
  if (!m1.length || !m2.length) throw new Error("Il faut au moins un M1 et un M2.");
  const slots = m2.flatMap(m => [m,m]);
  const weights = m1.map(a => slots.map(b => score(byId.get(a.id)||{}, byId.get(b.id)||{})));
  const assignment = hungarianMax(weights);
  const pairs = [];
  assignment.forEach((slotIndex, i) => {
    if (slotIndex >= 0 && slotIndex < slots.length && weights[i][slotIndex] > 0) {
      pairs.push({m1_id:m1[i].id,m2_id:slots[slotIndex].id});
    }
  });
  const del = await db.from("matches").delete().not("id","is",null);
  if (del.error) throw del.error;
  if (pairs.length) {
    const ins = await db.from("matches").insert(pairs);
    if (ins.error) throw ins.error;
  }
  await renderAdminResults();
  $("adminMessage").innerHTML = `<span class="success">Les ${pairs.length} associations ont été publiées.</span>`;
}
async function renderAdminResults() {
  const {data:matches,error} = await db.from("matches").select("m1_id,m2_id");
  if (error) throw error;
  const people = await loadPeople(), names = new Map(people.map(p=>[p.id,p.name]));
  $("results").innerHTML = "<h3>Binômes publiés</h3>" +
    (matches||[]).map(m=>`<div class="pair"><strong>${esc(names.get(m.m1_id)||"M1")}</strong> → <strong>${esc(names.get(m.m2_id)||"M2")}</strong></div>`).join("") ||
    "<p>Aucun binôme publié.</p>";
}
async function showCurrentResult() {
  const id = localStorage.getItem("dpec_participant_id");
  if (!id) {
    $("resultContent").innerHTML = '<p class="notice">Aucune participation enregistrée sur ce téléphone.</p>';
    return;
  }
  const {data:matches,error} = await db.from("matches").select("m1_id,m2_id").or(`m1_id.eq.${id},m2_id.eq.${id}`);
  if (error) {
    $("resultContent").innerHTML = `<p class="error">${esc(error.message)}</p>`; return;
  }
  if (!matches || !matches.length) {
    $("resultContent").innerHTML = '<p class="notice">Le matching n’est pas encore publié. Reviens un peu plus tard.</p>';
    return;
  }
  const people = await loadPeople(), names = new Map(people.map(p=>[p.id,p.name]));
  const html = matches.map(m => {
    const other = m.m1_id === id ? names.get(m.m2_id) : names.get(m.m1_id);
    return `<div class="success"><h3>Ton/ta partenaire</h3><p><strong>${esc(other || "Partenaire")}</strong></p></div>`;
  }).join("");
  $("resultContent").innerHTML = html;
}
async function submitParticipant(event) {
  event.preventDefault();
  $("formMessage").textContent = "Enregistrement…";
  const f = new FormData(event.target);
  const interests = [...document.querySelectorAll('input[name="interest"]:checked')].map(x=>x.value);
  const participant = {name:String(f.get("name")).trim(),level:f.get("level")};
  const {data:p, error:pe} = await db.from("participants").insert(participant).select("id").single();
  if (pe) { $("formMessage").innerHTML=`<span class="error">${esc(pe.message)}</span>`; return; }
  const affinity = {interests,sharing:f.get("sharing"),rhythm:f.get("rhythm"),topic:f.get("topic")};
  const response = {
    participant_id:p.id,
    preferred_activities:JSON.stringify(affinity),
    personality:f.get("personality"),
    expectations:f.get("topic")
  };
  const {error:re} = await db.from("responses").insert(response);
  if (re) { $("formMessage").innerHTML=`<span class="error">${esc(re.message)}</span>`; return; }
  localStorage.setItem("dpec_participant_id",p.id);
  event.target.reset();
  $("formMessage").innerHTML='<span class="success">Merci ! Ta participation est enregistrée. Tu peux consulter ton résultat depuis la page d’accueil.</span>';
  show("result");
}
$("startBtn").addEventListener("click",()=>show("form"));
$("adminBtn").addEventListener("click",()=>show("admin"));
$("backFromForm").addEventListener("click",()=>show("home"));
$("backFromResult").addEventListener("click",()=>show("home"));
$("backFromAdmin").addEventListener("click",()=>show("home"));
$("participantForm").addEventListener("submit",submitParticipant);
$("adminLogin").addEventListener("submit",async e=>{
  e.preventDefault();
  const pin = new FormData(e.target).get("pin");
  if (pin !== ORGANIZER_PIN) { $("adminMessage").innerHTML='<span class="error">Code incorrect.</span>'; return; }
  $("adminLogin").classList.add("hidden");
  $("adminArea").classList.remove("hidden");
  try { await refreshStats(); await renderAdminResults(); } catch(err) { $("adminMessage").innerHTML=`<span class="error">${esc(err.message)}</span>`; }
});
$("matchBtn").addEventListener("click",async()=>{try{await publishMatching();}catch(err){$("adminMessage").innerHTML=`<span class="error">${esc(err.message)}</span>`;}});
$("refreshBtn").addEventListener("click",async()=>{try{await refreshStats();await renderAdminResults();}catch(err){$("adminMessage").innerHTML=`<span class="error">${esc(err.message)}</span>`;}});

// Vérification automatique du résultat toutes les 8 secondes après une participation.
pollTimer = setInterval(()=>{ if(localStorage.getItem("dpec_participant_id") && !$("result").classList.contains("hidden")) showCurrentResult(); },8000);
