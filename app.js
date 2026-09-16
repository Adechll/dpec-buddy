const KEY='dpec_buddy_participants';
const $=id=>document.getElementById(id);
function show(id){['home','form','admin'].forEach(x=>$(x).classList.toggle('hidden',x!==id));if(id==='admin')refreshAdmin();}
function getPeople(){return JSON.parse(localStorage.getItem(KEY)||'[]')}
function savePeople(p){localStorage.setItem(KEY,JSON.stringify(p))}
$('participantForm').addEventListener('submit',e=>{
 e.preventDefault();const f=new FormData(e.target);
 const interests=[...document.querySelectorAll('input[name=interest]:checked')].map(x=>x.value);
 const p={id:crypto.randomUUID(),name:f.get('name').trim(),level:f.get('level'),interests,personality:f.get('personality'),sharing:f.get('sharing'),rhythm:f.get('rhythm'),topic:f.get('topic')};
 const people=getPeople();people.push(p);savePeople(people);e.target.reset();
 $('formMessage').textContent='Merci ! Ta participation est enregistrée. Le résultat sera visible après le lancement du matching.';
});
function refreshAdmin(){
 const p=getPeople(),m1=p.filter(x=>x.level==='M1'),m2=p.filter(x=>x.level==='M2');
 $('stats').innerHTML=`<p><b>${p.length}</b> participants — <b>${m1.length}</b> M1 — <b>${m2.length}</b> M2</p>`;
}
function score(a,b){
 let s=0;
 s+=a.interests.filter(x=>b.interests.includes(x)).length*12;
 if(a.personality===b.personality)s+=12;
 if(a.sharing===b.sharing)s+=20;
 if(a.rhythm===b.rhythm)s+=12;
 if(a.topic===b.topic)s+=20;
 return s;
}
// Greedy with global candidate ordering and capacity 2.
// For production, replace by a min-cost max-flow / integer optimization solver.
function runMatching(){
 const people=getPeople(),m1=people.filter(x=>x.level==='M1'),m2=people.filter(x=>x.level==='M2');
 if(!m1.length||!m2.length){$('results').innerHTML='<p>Il faut au moins un M1 et un M2.</p>';return}
 const edges=[];m1.forEach(a=>m2.forEach(b=>edges.push({a,b,s:score(a,b)})));
 edges.sort((x,y)=>y.s-x.s);
 const used=new Set(),count=new Map(),pairs=[];
 for(const e of edges){if(!used.has(e.a.id)&&(count.get(e.b.id)||0)<2){pairs.push(e);used.add(e.a.id);count.set(e.b.id,(count.get(e.b.id)||0)+1)}}
 const unmatched=m1.filter(x=>!used.has(x.id));
 let html='<h3>Binômes proposés</h3>';
 pairs.forEach(e=>html+=`<div class="pair"><b>${esc(e.a.name)}</b> → <b>${esc(e.b.name)}</b><div class="muted">Compatibilité indicative : ${e.s}</div></div>`);
 if(unmatched.length)html+='<h3>M1 sans binôme</h3>'+unmatched.map(x=>`<div class="person">${esc(x.name)}</div>`).join('');
 html+='<p class="muted">Les scores sont indicatifs. Vérifiez les résultats avant publication.</p>';
 $('results').innerHTML=html;
}
function clearAll(){if(confirm('Effacer toutes les réponses ?')){localStorage.removeItem(KEY);refreshAdmin();$('results').innerHTML='';}}
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
refreshAdmin();
