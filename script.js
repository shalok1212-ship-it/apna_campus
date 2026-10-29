
(()=> {
const $=id=>document.getElementById(id), UK='apna_users_v2', IK='apna_issues_v2', SK='apna_session_v2', TK='apna_theme_v2', VK='apna_issue_votes_v1';
const SUPABASE_URL='https://mhadisnwaqycllaxnaum.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_vXG8Yjt7MB-JaxcaWngf-A_5s3iMedf';
if(!window.supabase || !window.supabase.createClient){alert('Supabase library did not load. Add the Supabase CDN script before script.js.');return;}
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let users=load(UK,[]), issues=load(IK,[]), user=null, mineFilter='all', allFilter='all', timer, staffLoggedIn=false;
// Prototype credentials only. Frontend credentials are visible in browser source; use server-side auth before production.
const STAFF_USERNAME='staff';
const STAFF_PASSWORD='staff12345';
function load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function save(){localStorage.setItem(UK,JSON.stringify(users));localStorage.setItem(IK,JSON.stringify(issues))}
function packIssue(i){return `Title: ${i.title}\n\n${i.description}\n\nCategory: ${i.category}\nLocation: ${i.location}\nPriority: ${i.priority}`}
function unpackIssue(row){
 let raw=String(row.issue||'');
 // Older reports sometimes have a Storage URL embedded in the issue text. Promote it to the image field and keep it out of the description.
 const embeddedUrl=raw.match(/https?:\/\/[^\s<>()]+/i)?.[0]?.replace(/[.,;]+$/,'')||null;
 const photo=row.image_url||((embeddedUrl&&/supabase\.co\/storage\/v1\/object\/(?:public|sign)\/issue-images\//i.test(embeddedUrl))?embeddedUrl:null);
 if(photo&&embeddedUrl===photo)raw=raw.replace(embeddedUrl,'').trim();
 const marker=/\n\nCategory: ([^\n]*)\nLocation: ([^\n]*)\nPriority: ([^\n]*)$/.exec(raw);
 const first=raw.match(/^Title: ([^\n]*)/);
 const body=raw.replace(/^Title: [^\n]*\n\n?/,'');
 const description=marker?raw.slice((first?first[0].length:0)+2,marker.index):body;
 const voters=load(VK,{}),status=String(row.status||'Pending');
 const created=row.created_at?Date.parse(row.created_at):Date.now();
 return {id:String(row.ticket_number),ticketNumber:row.ticket_number,title:first?first[1]:raw.slice(0,90),description:(marker?description:raw.slice(0,1200)).trim(),category:marker?marker[1]:'Other',location:marker?marker[2]:'Not specified',priority:marker?marker[3]:'Normal',status:/^(resolved|solved)$/i.test(status)?'Solved':status,votes:Number(row.upvotes)||0,voters:voters[String(row.ticket_number)]||[],authorId:null,author:row.username||'anonymous',created:Number.isFinite(created)?created:Date.now(),photo:photo&&/^https?:\/\//i.test(photo)?photo:null};
}
async function refreshIssues(){const {data,error}=await db.from('issues').select('ticket_number,username,issue,status,upvotes,image_url,created_at').order('ticket_number',{ascending:false});if(error)throw error;issues=(data||[]).map(unpackIssue);save();if(user)render()}
let issueRefreshInProgress=false,lastIssueRefresh=0;
document.addEventListener('visibilitychange',async()=>{
 if(document.visibilityState!=='visible'||!user||issueRefreshInProgress||Date.now()-lastIssueRefresh<1500)return;
 issueRefreshInProgress=true;
 lastIssueRefresh=Date.now();
 try{await refreshIssues()}
 catch(err){console.error('Issue refresh failed:',err);toast('Could not refresh shared issues. Check your Supabase connection.')}
 finally{issueRefreshInProgress=false}
});
function updateLocalVoters(issueId,voters){const all=load(VK,{});all[String(issueId)]=voters;localStorage.setItem(VK,JSON.stringify(all))}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function authMode(mode){document.querySelectorAll('[data-auth]').forEach(b=>{if(b.classList.contains('tab'))b.classList.toggle('active',b.dataset.auth===mode)});$('loginForm').classList.toggle('hidden',mode!=='login');$('signupForm').classList.toggle('hidden',mode!=='signup');$('loginError').textContent='';$('signError').textContent='';if(typeof updateChatContextLabel==='function')updateChatContextLabel()}
document.querySelectorAll('[data-auth]').forEach(b=>b.addEventListener('click',()=>authMode(b.dataset.auth)));
document.querySelectorAll('[data-show]').forEach(b=>b.addEventListener('click',()=>{let x=$(b.dataset.show);x.type=x.type==='password'?'text':'password';b.textContent=x.type==='password'?'Show':'Hide'}));
$('signUsername').addEventListener('input',()=>{let v=$('signUsername').value.trim().toLowerCase(),taken=users.some(u=>u.username.toLowerCase()===v);$('usernameHint').textContent=!v?'3–20 characters: letters, numbers, . _ -':taken?'Username already taken.':'Username looks available.';$('usernameHint').className='hint '+(taken?'bad':v.length>=3?'good':'')});
// Fast local search over a curated list of popular Indian institutions (no network/API wait).
const COLLEGES=[
{Name:'K.R. Mangalam University',City:'Sohna, Gurugram',State:'Haryana'},
{Name:'University of Delhi',City:'New Delhi',State:'Delhi'},
{Name:'Jawaharlal Nehru University (JNU)',City:'New Delhi',State:'Delhi'},
{Name:'Indian Institute of Technology Delhi (IIT Delhi)',City:'New Delhi',State:'Delhi'},
{Name:'Indian Institute of Technology Bombay (IIT Bombay)',City:'Mumbai',State:'Maharashtra'},
{Name:'Indian Institute of Technology Madras (IIT Madras)',City:'Chennai',State:'Tamil Nadu'},
{Name:'Indian Institute of Technology Kanpur (IIT Kanpur)',City:'Kanpur',State:'Uttar Pradesh'},
{Name:'Indian Institute of Technology Kharagpur (IIT Kharagpur)',City:'Kharagpur',State:'West Bengal'},
{Name:'Indian Institute of Technology Roorkee (IIT Roorkee)',City:'Roorkee',State:'Uttarakhand'},
{Name:'Indian Institute of Science (IISc)',City:'Bengaluru',State:'Karnataka'},
{Name:'BITS Pilani',City:'Pilani',State:'Rajasthan'},
{Name:'Vellore Institute of Technology (VIT)',City:'Vellore',State:'Tamil Nadu'},
{Name:'Manipal Academy of Higher Education (MAHE)',City:'Manipal',State:'Karnataka'},
{Name:'Amity University, Noida',City:'Noida',State:'Uttar Pradesh'},
{Name:'Sharda University',City:'Greater Noida',State:'Uttar Pradesh'},
{Name:'Jamia Millia Islamia',City:'New Delhi',State:'Delhi'},
{Name:'Banaras Hindu University (BHU)',City:'Varanasi',State:'Uttar Pradesh'},
{Name:'Aligarh Muslim University (AMU)',City:'Aligarh',State:'Uttar Pradesh'},
{Name:'Chandigarh University',City:'Mohali',State:'Punjab'},
{Name:'Lovely Professional University (LPU)',City:'Phagwara',State:'Punjab'},
{Name:'Thapar Institute of Engineering and Technology',City:'Patiala',State:'Punjab'},
{Name:'SRM Institute of Science and Technology',City:'Chennai',State:'Tamil Nadu'},
{Name:'Symbiosis International University',City:'Pune',State:'Maharashtra'},
{Name:'Christ University',City:'Bengaluru',State:'Karnataka'},
{Name:'Jain University',City:'Bengaluru',State:'Karnataka'},
{Name:'Guru Gobind Singh Indraprastha University (GGSIPU)',City:'New Delhi',State:'Delhi'},
{Name:'Gurugram University',City:'Gurugram',State:'Haryana'},
{Name:'The NorthCap University',City:'Gurugram',State:'Haryana'},
{Name:'Delhi Technological University (DTU)',City:'New Delhi',State:'Delhi'},
{Name:'Netaji Subhas University of Technology (NSUT)',City:'New Delhi',State:'Delhi'},
{Name:'National Institute of Technology Kurukshetra (NIT Kurukshetra)',City:'Kurukshetra',State:'Haryana'},
{Name:'National Institute of Technology Trichy (NIT Trichy)',City:'Tiruchirappalli',State:'Tamil Nadu'},
{Name:'National Institute of Technology Karnataka (NITK)',City:'Surathkal',State:'Karnataka'},
{Name:'National Institute of Fashion Technology (NIFT) Delhi',City:'New Delhi',State:'Delhi'},
{Name:'National Law University Delhi (NLUD)',City:'New Delhi',State:'Delhi'},
{Name:'Indian Institute of Management Ahmedabad (IIMA)',City:'Ahmedabad',State:'Gujarat'},
{Name:'Indian Institute of Management Bangalore (IIMB)',City:'Bengaluru',State:'Karnataka'},
{Name:'Indian Institute of Management Calcutta (IIM Calcutta)',City:'Kolkata',State:'West Bengal'}
];
let selectedCollege=null;
function clearCollegeSelection(){selectedCollege=null;$('signCollege').value='';$('signCollegeCity').value='';$('signCollegeState').value=''}
function chooseCollege(c){selectedCollege=c;$('collegeSearch').value=c.Name||c.name||'';$('signCollege').value=c.Name||c.name||'';$('signCollegeCity').value=c.City||c.city||c.District||c.district||'';$('signCollegeState').value=c.State||c.state||'';$('collegeResults').classList.add('hidden');$('collegeHint').textContent=[$('signCollegeCity').value,$('signCollegeState').value].filter(Boolean).join(', ')||'College selected';$('collegeHint').className='hint good'}
function showCollegeMessage(msg){$('collegeResults').innerHTML='<div class="college-empty">'+esc(msg)+'</div><button type="button" class="college-manual" id="manualCollege">Use this college name manually</button>';$('collegeResults').classList.remove('hidden');$('manualCollege').addEventListener('click',()=>{let val=$('collegeSearch').value.trim();if(!val)return;chooseCollege({Name:val,City:'',State:''});$('collegeHint').textContent='Custom college name saved. Please verify spelling.';$('collegeHint').className='hint'})}
$('collegeSearch').addEventListener('input',()=>{
 clearCollegeSelection();
 const q=$('collegeSearch').value.trim().toLowerCase();
 if(q.length<1){$('collegeResults').classList.add('hidden');$('collegeHint').textContent='Choose a popular institution or type your college name.';$('collegeHint').className='hint';return}
 const normalize=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const nq=normalize(q);
 const list=COLLEGES.map(c=>({...c,_n:normalize(c.Name),_loc:normalize(c.City+' '+c.State)}))
  .filter(c=>c._n.includes(nq)||c._loc.includes(nq))
  .sort((a,b)=>(a._n.startsWith(nq)?0:1)-(b._n.startsWith(nq)?0:1)).slice(0,10);
 if(!list.length){showCollegeMessage('No popular match. You can still enter your college name manually.');$('collegeHint').textContent='No match in the quick list';$('collegeHint').className='hint';return}
 $('collegeResults').innerHTML=list.map((c,i)=>'<button type="button" class="college-option" role="option" data-college-index="'+i+'"><strong>'+esc(c.Name)+'</strong><span>'+esc([c.City,c.State].filter(Boolean).join(', '))+'</span></button>').join('')+'<button type="button" class="college-manual" id="manualCollege">Use a different college name</button>';
 $('collegeResults').classList.remove('hidden');$('collegeHint').textContent='Quick results · select your college';$('collegeHint').className='hint';
 [...$('collegeResults').querySelectorAll('[data-college-index]')].forEach((b,i)=>b.addEventListener('click',()=>chooseCollege(list[i])));
 $('manualCollege').addEventListener('click',()=>{let val=$('collegeSearch').value.trim();if(!val)return;chooseCollege({Name:val,City:'',State:''});$('collegeHint').textContent='Custom college name saved. Please verify spelling.';$('collegeHint').className='hint'});
});
document.addEventListener('click',e=>{if(!e.target.closest('.college-picker'))$('collegeResults').classList.add('hidden')});
$('signupForm').addEventListener('submit',e=>{e.preventDefault();let name=$('signName').value.trim(),username=$('signUsername').value.trim(),email=$('signEmail').value.trim().toLowerCase(),password=$('signPassword').value,confirm=$('signConfirm').value,err=$('signError');err.textContent='';if(!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)){err.textContent='Username must be 3–20 letters, numbers, . _ or -.';return}if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){err.textContent='Username already taken. Choose another.';return}if(users.some(u=>u.email===email)){err.textContent='This email already has an account. Please log in.';return}if(!$('signCollege').value.trim()){$('collegeHint').textContent='Please select or enter your college name.';$('collegeHint').className='hint bad';err.textContent='Please enter your college or university.';return}if(password.length<8){err.textContent='Password must be at least 8 characters.';return}if(password!==confirm){err.textContent='Passwords do not match.';return}user={id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,username,email,password,college:$('signCollege').value.trim(),collegeCity:$('signCollegeCity').value.trim(),collegeState:$('signCollegeState').value.trim()};users.push(user);save();enter();toast('Account created. Welcome to Apna Campus!')});
$('loginForm').addEventListener('submit',e=>{e.preventDefault();let id=$('loginIdentity').value.trim().toLowerCase(),pw=$('loginPassword').value;user=users.find(u=>u.username.toLowerCase()===id||u.email.toLowerCase()===id);if(!user||user.password!==pw){user=null;$('loginError').textContent='Account not found or password is incorrect.';return}enter();toast('Welcome back, '+user.name.split(' ')[0]+'!')});
async function enter(){sessionStorage.setItem(SK,user.id);$('auth').classList.add('hidden');$('app').classList.remove('hidden');$('profileName').textContent=user.name;$('profileUser').textContent='@'+user.username;$('avatar').textContent=user.name[0].toUpperCase();$('welcome').textContent='Hey '+user.name.split(' ')[0]+', let’s make a difference.';try{await refreshIssues()}catch(err){console.error('Supabase load failed:',err);toast('Could not load shared issues. Check Supabase RLS and connection.')}render();go('home')}
$('staffBack').addEventListener('click',()=>{$('staffPortal').classList.add('hidden');$('app').classList.remove('hidden');});
$('staffLoginForm').addEventListener('submit',e=>{e.preventDefault();const name=$('staffUsername').value.trim(),password=$('staffPassword').value;if(name===STAFF_USERNAME&&password===STAFF_PASSWORD){staffLoggedIn=true;$('staffPortal').classList.add('hidden');$('app').classList.remove('hidden');$('staffToggle').textContent='Exit staff mode';document.body.classList.add('staff-active');render();toast('Staff mode enabled.');}else{$('staffLoginError').textContent='Incorrect staff username or password.';}});
$('logout').addEventListener('click',()=>{staffLoggedIn=false;document.body.classList.remove('staff-active');$('staffToggle').textContent='Staff mode ↗';sessionStorage.removeItem(SK);user=null;$('app').classList.add('hidden');$('auth').classList.remove('hidden');$('loginForm').reset();authMode('login');toast('You’re logged out.')});
function go(page){if(!['home','create','mine','all'].includes(page))return;document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$('page-'+page).classList.remove('hidden');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('crumb').textContent=({home:'Overview',create:'Report an issue',mine:'My issues',all:'All issues'})[page];if(page==='create'){$('issueForm').reset();$('photoPreviewWrap').classList.add('hidden');$('photoPreview').removeAttribute('src');$('photoFileName').textContent='Selected photo';$('photoFileSize').textContent='Ready to attach';$('photoStatus').textContent='';$('photoStatus').className='ai-status';}if(page==='mine')renderMine();if(page==='all')renderAll();if(typeof updateChatContextLabel==='function')updateChatContextLabel();window.scrollTo({top:0,behavior:'smooth'})}
document.addEventListener('click',e=>{let b=e.target.closest('[data-page]');if(b){e.preventDefault();go(b.dataset.page)}});
async function compressIssuePhoto(file){
 if(!file) return null;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
 if(file.size>8*1024*1024) throw new Error('Photo must be 8 MB or smaller.');
 const objectUrl=URL.createObjectURL(file);
 try { const img=new Image(); await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Could not read this image. Please try another.'));img.src=objectUrl;});
  const max=1200,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not process the image.')),'image/jpeg',0.82));
 } finally { URL.revokeObjectURL(objectUrl); }
}
async function uploadIssuePhoto(file){
 const blob=await compressIssuePhoto(file);
 const path=`issues/${Date.now()}-${crypto.randomUUID()}.jpg`;
 const {error}=await db.storage.from('issue-images').upload(path,blob,{contentType:'image/jpeg',upsert:false});
 if(error)throw error;
 const {data}=db.storage.from('issue-images').getPublicUrl(path);
 return data.publicUrl;
}
$('issueForm').addEventListener('submit',async e=>{e.preventDefault();const submitBtn=$('issueForm').querySelector('button[type="submit"],.form-foot button');const photoFile=$('issuePhoto').files[0];const photoStatus=$('photoStatus');if(submitBtn){submitBtn.disabled=true;submitBtn.style.opacity='.65'}if(photoStatus)photoStatus.textContent=photoFile?'Uploading photo…':'Publishing issue…';
 try{let imageUrl=null;if(photoFile)imageUrl=await uploadIssuePhoto(photoFile);const issue={title:$('title').value.trim(),description:$('description').value.trim(),category:$('category').value,location:$('location').value.trim(),priority:$('priority').value};const {error}=await db.from('issues').insert({username:user.username,issue:packIssue(issue),status:'Pending',upvotes:0,image_url:imageUrl});if(error)throw error;await refreshIssues();toast('Issue published to the shared community board!');go('mine');$('issueForm').reset();$('photoPreviewWrap').classList.add('hidden');$('photoPreview').removeAttribute('src');}
 catch(err){console.error('Supabase insert failed:',err);const msg=err?.message||'Could not publish issue.';if(photoStatus){photoStatus.textContent=msg;photoStatus.className='ai-status error'}else toast(msg)}
 finally{if(submitBtn){submitBtn.disabled=false;submitBtn.style.opacity=''} }
});
const photoInput=$('issuePhoto'),photoDropzone=$('photoDropzone');
function openPhotoPicker(){photoInput.click()}
$('browsePhoto').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPhotoPicker()});
photoDropzone.addEventListener('click',e=>{if(e.target.closest('button'))return;openPhotoPicker()});
photoDropzone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPhotoPicker()}});
['dragenter','dragover'].forEach(type=>photoDropzone.addEventListener(type,e=>{e.preventDefault();photoDropzone.classList.add('is-dragover')}));
['dragleave','drop'].forEach(type=>photoDropzone.addEventListener(type,e=>{e.preventDefault();photoDropzone.classList.remove('is-dragover')}));
photoDropzone.addEventListener('drop',e=>{const file=e.dataTransfer.files&&e.dataTransfer.files[0];if(!file)return;try{const dt=new DataTransfer();dt.items.add(file);photoInput.files=dt.files;photoInput.dispatchEvent(new Event('change',{bubbles:true}))}catch{const status=$('photoStatus');status.textContent='Please use Choose photo to attach this file.';status.className='ai-status error'}});
photoInput.addEventListener('change',()=>{const file=photoInput.files[0],wrap=$('photoPreviewWrap'),img=$('photoPreview'),status=$('photoStatus');status.textContent='';status.className='ai-status';if(!file){wrap.classList.add('hidden');img.removeAttribute('src');return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status.textContent='Choose a JPG, PNG or WebP image.';status.className='ai-status error';photoInput.value='';wrap.classList.add('hidden');return}if(file.size>8*1024*1024){status.textContent='Photo must be 8 MB or smaller.';status.className='ai-status error';photoInput.value='';wrap.classList.add('hidden');return}img.src=URL.createObjectURL(file);$('photoFileName').textContent=file.name;$('photoFileSize').textContent=(file.size/1024/1024).toFixed(2)+' MB · Ready to attach';wrap.classList.remove('hidden')});
$('removePhoto').addEventListener('click',()=>{photoInput.value='';$('photoPreview').removeAttribute('src');$('photoPreviewWrap').classList.add('hidden');$('photoStatus').textContent='Photo removed.'});
function ago(t){let d=Date.now()-t;if(d<60000)return'just now';if(d<3600000)return Math.floor(d/60000)+'m ago';if(d<86400000)return Math.floor(d/3600000)+'h ago';if(d<604800000)return Math.floor(d/86400000)+'d ago';return new Date(t).toLocaleDateString()}
function ordered(arr,sort){return [...arr].sort((a,b)=>Number(a.status==='Solved')-Number(b.status==='Solved')||(sort==='newest'?(b.created-a.created):(b.votes-a.votes||b.created-a.created)))}
function card(i){let solved=i.status==='Solved',voted=(i.voters||[]).includes(user.id),mine=i.author===user.username,canVote=!solved&&!voted;const photo=i.photo&&/^https?:\/\//i.test(i.photo)?`<div class="photo-attachment"><a href="${esc(i.photo)}" target="_blank" rel="noopener" aria-label="Open attached issue photo"><img src="${esc(i.photo)}" alt="Photo attached to issue: ${esc(i.title)}" loading="lazy" onerror="this.closest('.photo-attachment').classList.add('image-unavailable')"></a></div>`:'';const staffAction=staffLoggedIn&&!solved?`<button class="resolve-btn" data-resolve="${esc(i.id)}" title="Mark issue resolved">Mark resolved</button>`:'';return `<article class="issue-card ${solved?'is-solved':''}"><div class="card-top"><span class="category ${slug(i.category)}">${esc(i.category)}</span><span class="status ${solved?'solved':'pending'}"><i></i>${solved?'Solved':'Pending'}</span></div><h3>${esc(i.title)}</h3><p class="desc">${esc(i.description)}</p><div class="location">⌖ &nbsp;${esc(i.location)}</div>${photo}<div class="card-foot"><div class="author"><span>${esc((i.author||'?')[0].toUpperCase())}</span><div><b>@${esc(i.author)}</b><small>${ago(i.created)}${mine?' · You reported this':''}</small></div></div><div class="card-actions">${staffAction}${mine?`<button class="delete-btn" data-delete="${esc(i.id)}" title="Delete your issue" aria-label="Delete issue">Delete</button>`:''}<button class="vote ${voted?'voted':''}" data-vote="${esc(i.id)}" ${canVote?'':'disabled'} title="${solved?'This issue is solved':voted?'You already supported this issue':'Support this issue'}"><b>${voted?'♥':'↑'} ${i.votes}</b><small>${voted?'Supported':'Support +1'}</small></button></div></div>${i.priority==='Urgent'&&!solved?'<div class="ribbon">URGENT ATTENTION</div>':i.priority==='High'&&!solved?'<div class="ribbon high">HIGH PRIORITY</div>':''}</article>`}
function render(){save();let mine=issues.filter(i=>i.author===user.username);$('myCount').textContent=mine.length;$('total').textContent=issues.length;$('pending').textContent=issues.filter(i=>i.status==='Pending').length;$('solved').textContent=issues.filter(i=>i.status==='Solved').length;$('myVotes').textContent=issues.filter(i=>(i.voters||[]).includes(user.id)).length;renderHome();renderMine();renderAll()}
function renderHome(){let arr=ordered(issues.filter(i=>i.status==='Pending'),'votes').slice(0,3);$('homeIssues').innerHTML=arr.map(card).join('');$('homeEmpty').classList.toggle('hidden',issues.length!==0);if(!arr.length&&issues.length)$('homeIssues').innerHTML='<div class="empty">No pending issues right now — lovely work, campus.</div>'}
function renderMine(){if(!user)return;let arr=issues.filter(i=>i.author===user.username);$('mineAll').textContent=arr.length;$('minePending').textContent=arr.filter(i=>i.status==='Pending').length;$('mineSolved').textContent=arr.filter(i=>i.status==='Solved').length;arr=arr.filter(i=>mineFilter==='all'||(mineFilter==='pending'?i.status==='Pending':i.status==='Solved'));arr=ordered(arr,$('mineSort').value);$('mineIssues').innerHTML=arr.map(card).join('');$('mineEmpty').classList.toggle('hidden',arr.length!==0)}
function renderAll(){if(!user)return;let q=$('search').value.trim().toLowerCase(),cat=$('categoryFilter').value;let arr=issues.filter(i=>(allFilter==='all'||(allFilter==='pending'?i.status==='Pending':i.status==='Solved'))&&(cat==='all'||i.category===cat)&&[i.title,i.description,i.location,i.category,i.author].some(v=>v.toLowerCase().includes(q)));arr=ordered(arr,$('allSort').value);let p=arr.filter(i=>i.status==='Pending'),s=arr.filter(i=>i.status==='Solved');$('pendingList').innerHTML=p.map(card).join('');$('solvedList').innerHTML=s.map(card).join('');$('allPendingNum').textContent=issues.filter(i=>i.status==='Pending').length;$('allSolvedNum').textContent=issues.filter(i=>i.status==='Solved').length;$('allPendingCount').textContent=issues.filter(i=>i.status==='Pending').length;$('allSolvedCount').textContent=issues.filter(i=>i.status==='Solved').length;$('pendingColumn').textContent=p.length;$('solvedColumn').textContent=s.length;$('allEmpty').classList.toggle('hidden',arr.length!==0)}
document.addEventListener('click',async e=>{
 const resolveBtn=e.target.closest('[data-resolve]');
 if(resolveBtn){if(!staffLoggedIn){toast('Staff login required.');return}const issue=issues.find(x=>x.id===resolveBtn.dataset.resolve);if(!issue||issue.status==='Solved')return;resolveBtn.disabled=true;const previous=issue.status;issue.status='Solved';render();try{const {error}=await db.rpc('set_issue_status',{p_ticket_number:issue.ticketNumber,p_status:'Resolved'});if(error)throw error;await refreshIssues();toast('Issue marked as resolved.')}catch(err){console.error('Resolve failed:',err);issue.status=previous;render();toast(err.message||'Could not update status. Run the Supabase setup SQL.')}finally{const btn=document.querySelector(`[data-resolve="${CSS.escape(issue.id)}"]`);if(btn)btn.disabled=false}return}
 const del=e.target.closest('[data-delete]');
 if(del&&user){const issue=issues.find(x=>x.id===del.dataset.delete);if(!issue||issue.author!==user.username){toast('You can only delete issues you reported.');return}if(!confirm('Delete this issue permanently?'))return;del.disabled=true;try{const {error}=await db.from('issues').delete().eq('ticket_number',issue.ticketNumber).select().single();if(error)throw error;issues=issues.filter(x=>x.id!==issue.id);save();render();toast('Issue deleted.')}catch(err){console.error('Delete failed:',err);toast(err.message||'Could not delete issue. Check your Supabase DELETE policy.')}finally{del.disabled=false}return}
 const b=e.target.closest('[data-vote]');if(!b||!user)return;const i=issues.find(x=>x.id===b.dataset.vote);if(!i||i.status==='Solved')return;
 if((i.voters||[]).includes(user.id)){toast('You have already supported this issue.');return}
 const oldVotes=i.votes,oldVoters=[...(i.voters||[])];i.votes=oldVotes+1;i.voters=[...oldVoters,user.id];updateLocalVoters(i.ticketNumber,i.voters);render();const liveButton=document.querySelector(`[data-vote="${CSS.escape(i.id)}"]`);if(liveButton)liveButton.disabled=true;
 try{const {data,error}=await db.rpc('increment_issue_upvotes',{p_ticket_number:i.ticketNumber});if(error)throw error;if(typeof data==='number')i.votes=data;await refreshIssues();toast('Upvote added!')}catch(err){console.error('Upvote update failed:',err);i.votes=oldVotes;i.voters=oldVoters;updateLocalVoters(i.ticketNumber,oldVoters);render();toast(err.message||'Could not update upvotes. Run the Supabase setup SQL.')}
});
document.querySelectorAll('[data-mine]').forEach(b=>b.addEventListener('click',()=>{mineFilter=b.dataset.mine;document.querySelectorAll('[data-mine]').forEach(x=>x.classList.toggle('active',x===b));renderMine()}));
document.querySelectorAll('[data-all]').forEach(b=>b.addEventListener('click',()=>{allFilter=b.dataset.all;document.querySelectorAll('[data-all]').forEach(x=>x.classList.toggle('active',x===b));renderAll()}));
$('mineSort').addEventListener('change',renderMine);['search','categoryFilter','allSort'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',renderAll));
$('theme').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem(TK,document.body.classList.contains('dark')?'dark':'light')});if(localStorage.getItem(TK)==='dark')document.body.classList.add('dark');
// HACKATHON DEMO ONLY: the key is visible in browser source, as requested.
// Get a Gemini API key at https://aistudio.google.com/apikey
const GEMINI_API_KEY = 'AQ.Ab8RN6JZdnjjTx7MagKOVvy5ZLrykkdbObTZq3C1e1Ef9c7v7A';
const GEMINI_MODEL = 'gemini-3.8-flash';
const CAMPUS_AI_SYSTEM = `You are Campus AI, the friendly assistant inside ApnaCampus, a student-focused campus issue reporting and community support app. Help students write clear, respectful, factual campus reports and explain how issue voting, priorities, and statuses work. Keep answers concise, practical, and warm. Do not claim to have access to live campus records or to have submitted/resolved a report. Never ask for passwords, OTPs, API keys, or sensitive personal data. If someone reports immediate danger, advise them to contact campus security or local emergency services directly. The app supports these issue categories: Cleanliness, Electricity, Internet, Plumbing & Water, Classroom, Safety, Hostel, Other. Priorities are Normal, High, Urgent.`;
const chatHistory=[];
const chatPanel=$('chatPanel'), chatMessages=$('chatMessages'), chatInput=$('chatInput');
const PAGE_NAMES={home:'Overview',create:'Report an issue',mine:'My issues',all:'All issues'};
function getCurrentPageName(){const active=document.querySelector('.page:not(.hidden)');if(active)return PAGE_NAMES[active.id.replace('page-','')]||'Campus page';if(!$('auth').classList.contains('hidden'))return $('signupForm').classList.contains('hidden')?'Login':'Create account';return 'Campus page'}
function updateChatContextLabel(){const label=$('chatContextLabel');if(label)label.textContent='Seeing: '+getCurrentPageName()}
function getLivePageContext(){
 const active=document.querySelector('.page:not(.hidden)');
 const authVisible=!$('auth').classList.contains('hidden');
 const section=active||(authVisible?($('signupForm').classList.contains('hidden')?$('loginForm'):$('signupForm')):null);
 const visibleText=section?(section.innerText||section.textContent||'').replace(/\s+/g,' ').trim().slice(0,2600):'';
 const fields={};
 // Only send relevant page controls; never collect passwords, login identities, email addresses, or arbitrary input values.
 ['title','description','category','location','priority','search','categoryFilter','allSort','mineSort'].forEach(id=>{const el=$(id);if(el&&(!el.closest('.hidden'))){fields[id]=String(el.value||'').slice(0,1200)}});
 const cards=active?[...active.querySelectorAll('.issue-card')].slice(0,8).map(el=>(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,420)):[];
 return {page:getCurrentPageName(),visiblePageText:visibleText,visibleIssueCards:cards,fieldValues:fields,notes:'Use this live page context to explain what is visible, what the student should do next, and how to use the current screen. Do not claim to see pixels or controls not included here. Never perform actions or claim a report was submitted.'};
}
function addChatMessage(text,who='bot'){
 const wrap=document.createElement('div');wrap.className='chat-message '+who;
 if(who==='bot'){const avatar=document.createElement('span');avatar.className='message-avatar';avatar.textContent='✦';wrap.appendChild(avatar)}
 const bubble=document.createElement('div');bubble.className='message-bubble';const p=document.createElement('p');p.textContent=text;bubble.appendChild(p);wrap.appendChild(bubble);chatMessages.appendChild(wrap);chatMessages.scrollTop=chatMessages.scrollHeight;return wrap;
}
function setChatBusy(busy){$('chatSend').disabled=busy;chatInput.disabled=busy;$('chatSend').textContent=busy?'…':'↑'}
async function askCampusAI(message,mode='chat',context={}){
 if(!GEMINI_API_KEY || GEMINI_API_KEY==='PASTE_YOUR_NEW_GEMINI_API_KEY_HERE') throw new Error('Add your NEW Gemini API key in the Campus AI script first. Create it at https://aistudio.google.com/apikey.');
 let system=CAMPUS_AI_SYSTEM;
 if(mode==='improve-report') system+=' You are also a careful issue-report editor. Return ONLY valid JSON with keys title, description, category, priority. Use allowed categories and priorities exactly. Improve clarity and grammar without inventing facts. If details are missing, do not fabricate them. Keep the description concise.';
 const userContent=mode==='chat'?`Current app context: ${JSON.stringify(context).slice(0,800)}\nStudent message: ${message.trim()}`:`Report details: ${JSON.stringify(context).slice(0,1800)}\nRequest: ${message.trim()}`;
 const contents=[];
 if(mode==='chat'){
  for(const m of chatHistory.slice(-9, -1)){
   if(!m || !['user','assistant'].includes(m.role) || typeof m.content!=='string') continue;
   contents.push({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,1200)}]});
  }
 }
 contents.push({role:'user',parts:[{text:userContent}]});
 const body={systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.4,maxOutputTokens:mode==='improve-report'?600:700}};
 if(mode==='improve-report') body.generationConfig.responseMimeType='application/json';
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
 let res;
 try { res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY},body:JSON.stringify(body)}); }
 catch(fetchError) { throw new Error('Could not connect to Gemini. Check your internet connection. If this page was opened as a local file and the browser blocks the request, host the HTML on a simple static host such as GitHub Pages or Netlify and try again.'); }
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const providerError=data?.error?.message;throw new Error(providerError||`Gemini request failed (HTTP ${res.status}). Check the new API key, model availability, and API quota/billing.`)}
 const reply=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim();
 if(!reply) throw new Error(data?.promptFeedback?.blockReason?`Gemini blocked the prompt: ${data.promptFeedback.blockReason}. Try rephrasing it.`:'Gemini returned an empty response. Try again.');
 return reply;
}
$('chatLauncher').addEventListener('click',()=>{updateChatContextLabel();chatPanel.classList.remove('hidden');$('chatLauncher').classList.add('is-open');setTimeout(()=>chatInput.focus(),60)});
$('chatClose').addEventListener('click',()=>{chatPanel.classList.add('hidden');$('chatLauncher').classList.remove('is-open')});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{chatInput.value=b.dataset.prompt;$('chatForm').requestSubmit()}));
$('chatForm').addEventListener('submit',async e=>{
 e.preventDefault();const message=chatInput.value.trim();if(!message)return;addChatMessage(message,'user');chatInput.value='';chatHistory.push({role:'user',content:message});setChatBusy(true);
 const loading=addChatMessage('Thinking…','bot');loading.classList.add('is-loading');
 try{const pageContext=getLivePageContext();const contextPrompt='The student is currently viewing the following live page context. Use it as the source of truth for page-specific guidance. If they ask what to do, give ordered steps for this exact screen. If the context is incomplete, say what you can infer and ask one focused question.\n'+JSON.stringify(pageContext);const reply=await askCampusAI(message,'chat',{pageContext,contextInstruction:contextPrompt});loading.remove();addChatMessage(reply,'bot');chatHistory.push({role:'assistant',content:reply})}
 catch(err){loading.remove();addChatMessage(err.message.includes('Failed to fetch')?'Could not reach Gemini. Check your internet connection, API key, and browser console.':err.message,'bot')}
 finally{setChatBusy(false);chatInput.focus()}
});
chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit()}});
$('aiImprove').addEventListener('click',async()=>{
 const title=$('title').value.trim(),description=$('description').value.trim(),location=$('location').value.trim(),category=$('category').value,priority=$('priority').value,status=$('aiImproveStatus');
 if(!title&&!description){status.textContent='Add a title or a few details first, then I can help.';status.className='ai-status error';return}
 const btn=$('aiImprove');btn.disabled=true;btn.textContent='✦ Improving…';status.textContent='Making your report clearer…';status.className='ai-status';
 try{
  const reply=await askCampusAI('Improve this campus issue report. Return ONLY valid JSON with keys title, description, category, priority. category must be one of Cleanliness, Electricity, Internet, Plumbing & Water, Classroom, Safety, Hostel, Other. priority must be Normal, High, or Urgent. Keep facts unchanged; do not invent details. Current title: '+title+'\nCurrent description: '+description+'\nLocation: '+location+'\nCurrent category: '+category+'\nCurrent priority: '+priority,'improve-report',{title,description,location,category,priority});
  let data;try{data=JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g,''))}catch{throw new Error('Could not read the AI suggestion. Please try again.')}
  if(data.title)$('title').value=String(data.title).slice(0,90);if(data.description)$('description').value=String(data.description).slice(0,1200);
  const categories=['Cleanliness','Electricity','Internet','Plumbing & Water','Classroom','Safety','Hostel','Other'];if(categories.includes(data.category))$('category').value=data.category;if(['Normal','High','Urgent'].includes(data.priority))$('priority').value=data.priority;
  status.textContent='Done — review the suggestions before publishing.';status.className='ai-status success';
 }catch(err){status.textContent=err.message.includes('Failed to fetch')?'Could not reach Gemini. Check your internet connection, API key, and browser console.':err.message;status.className='ai-status error'}
 finally{btn.disabled=false;btn.textContent='✦ Improve with AI'}
});
updateChatContextLabel();
let oldId=sessionStorage.getItem(SK);if(oldId){let found=users.find(u=>u.id===oldId);if(found){user=found;enter()}}
})();
