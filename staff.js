(()=>{
const $=id=>document.getElementById(id);
const SUPABASE_URL='https://mhadisnwaqycllaxnaum.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_vXG8Yjt7MB-JaxcaWngf-A_5s3iMedf';
const STAFF_USERNAME='staff';
const STAFF_PASSWORD='staff12345';
let db=null, issues=[], statusFilter='all';

function esc(value){
 return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function unpackIssue(row){
 let raw=String(row.issue||'');
 const embeddedUrl=raw.match(/https?:\/\/[^\s<>()]+/i)?.[0]?.replace(/[.,;]+$/,'')||null;
 const image=row.image_url||((embeddedUrl&&/supabase\.co\/storage\/v1\/object\/(?:public|sign)\/issue-images\//i.test(embeddedUrl))?embeddedUrl:null);
 if(image&&embeddedUrl===image)raw=raw.replace(embeddedUrl,'').trim();
 const marker=/\n\nCategory: ([^\n]*)\nLocation: ([^\n]*)\nPriority: ([^\n]*)$/.exec(raw);
 const titleMatch=/^Title: ([^\n]*)/.exec(raw);
 const description=marker
  ?raw.slice((titleMatch?titleMatch[0].length:0)+2,marker.index).trim()
  :raw.replace(/^Title: [^\n]*\n\n?/,'').slice(0,1200).trim();
 const resolved=/^(resolved|solved)$/i.test(String(row.status||''));
 const createdAt=row.created_at?Date.parse(row.created_at):NaN;
 return {
  ticketNumber:String(row.ticket_number),
  title:titleMatch?titleMatch[1]:raw.slice(0,90)||'Untitled report',
  description,
  category:marker?marker[1]:'Other',
  location:marker?marker[2]:'Not specified',
  priority:marker?marker[3]:'Normal',
  author:row.username||'anonymous',
  votes:Number(row.upvotes)||0,
  resolved,
  createdAt:Number.isFinite(createdAt)?createdAt:null,
  image:image&&/^https?:\/\//i.test(image)?image:null
 };
}

function formatDate(timestamp){
 return timestamp===null?'Time unavailable':new Date(timestamp).toLocaleString();
}

function renderIssue(issue){
 const status=issue.resolved?'Resolved':'Pending';
 const image=issue.image
  ?`<div class="photo-attachment"><a href="${esc(issue.image)}" target="_blank" rel="noopener" aria-label="Open photo attached to ${esc(issue.title)}"><img src="${esc(issue.image)}" alt="Photo attached to issue: ${esc(issue.title)}" loading="lazy" onerror="this.closest('.photo-attachment').classList.add('image-unavailable')"></a></div>`
  :'';
 const resolveButton=issue.resolved?'':`<button class="resolve-btn" type="button" data-resolve="${esc(issue.ticketNumber)}">Mark resolved</button>`;
 return `<article class="issue-card ${issue.resolved?'is-solved':''}">
  <div class="card-top"><span class="category">${esc(issue.category)}</span><span class="status ${issue.resolved?'solved':'pending'}"><i></i>${status}</span></div>
  <h3>${esc(issue.title)}</h3><p class="desc">${esc(issue.description)}</p>
  <div class="location">⌖ &nbsp;${esc(issue.location)}</div>${image}
  <div class="staff-card-foot"><div class="author"><span>${esc((issue.author||'?')[0].toUpperCase())}</span><div><b>@${esc(issue.author)}</b><small>${esc(formatDate(issue.createdAt))}</small></div></div>
   <div class="staff-card-actions"><span class="staff-votes">↑ ${issue.votes} votes</span>${resolveButton}</div>
  </div>
 </article>`;
}

function render(){
 const query=$('staffSearch').value.trim().toLowerCase();
 const filtered=issues.filter(issue=>{
  const matchesStatus=statusFilter==='all'||(statusFilter==='pending'?!issue.resolved:issue.resolved);
  const matchesQuery=[issue.title,issue.description,issue.location,issue.category,issue.author].some(value=>value.toLowerCase().includes(query));
  return matchesStatus&&matchesQuery;
 });
 const pending=issues.filter(issue=>!issue.resolved).length;
 const resolved=issues.length-pending;
 $('staffTotal').textContent=issues.length;
 $('staffPending').textContent=pending;
 $('staffResolved').textContent=resolved;
 $('staffPendingTab').textContent=pending;
 $('staffResolvedTab').textContent=resolved;
 $('staffIssues').innerHTML=filtered.map(renderIssue).join('');
 $('staffEmpty').classList.toggle('hidden',filtered.length!==0);
}

async function loadIssues(){
 $('staffMessage').textContent='Loading reports…';
 $('staffMessage').className='staff-message';
 const {data,error}=await db.from('issues')
  .select('ticket_number,username,issue,status,upvotes,image_url,created_at')
  .order('ticket_number',{ascending:false});
 if(error)throw error;
 issues=(data||[]).map(unpackIssue).sort((a,b)=>Number(a.resolved)-Number(b.resolved)||(b.createdAt||0)-(a.createdAt||0));
 $('staffMessage').textContent='';
 render();
}

if(!window.supabase||!window.supabase.createClient){
 $('staffLoginError').textContent='Supabase could not load. Check your connection and reload this page.';
}else{
 db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
}

document.querySelectorAll('[data-show]').forEach(button=>button.addEventListener('click',()=>{
 const input=$(button.dataset.show);
 input.type=input.type==='password'?'text':'password';
 button.textContent=input.type==='password'?'Show':'Hide';
}));

$('staffLoginForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const username=$('staffUsername').value.trim();
 const password=$('staffPassword').value;
 const error=$('staffLoginError');
 error.textContent='';
 if(username!==STAFF_USERNAME||password!==STAFF_PASSWORD){
  error.textContent='Incorrect staff username or password.';
  return;
 }
 if(!db){
  error.textContent='Supabase is unavailable. Reload the page and try again.';
  return;
 }
 $('staffLoginView').classList.add('hidden');
 $('staffDashboard').classList.remove('hidden');
 try{
  await loadIssues();
 }catch(err){
  console.error('Staff issue load failed:',err);
  $('staffMessage').textContent=`Could not load reports: ${err.message||'Check your Supabase connection and policies.'}`;
  $('staffMessage').className='staff-message error';
 }
});

$('staffLogout').addEventListener('click',()=>{
 $('staffDashboard').classList.add('hidden');
 $('staffLoginView').classList.remove('hidden');
 $('staffLoginForm').reset();
 $('staffMessage').textContent='';
 $('staffLoginError').textContent='';
});

document.querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',()=>{
 statusFilter=button.dataset.status;
 document.querySelectorAll('[data-status]').forEach(tab=>tab.classList.toggle('active',tab===button));
 render();
}));
$('staffSearch').addEventListener('input',render);

document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-resolve]');
 if(!button)return;
 const ticketNumber=button.dataset.resolve;
 if(!/^\d+$/.test(ticketNumber)){
  $('staffMessage').textContent='Could not update this issue: invalid ticket number.';
  $('staffMessage').className='staff-message error';
  return;
 }
 const numericTicketNumber=Number(ticketNumber);
 if(!Number.isSafeInteger(numericTicketNumber)){
  $('staffMessage').textContent='Could not update this issue: ticket number is outside the supported numeric range.';
  $('staffMessage').className='staff-message error';
  return;
 }
 button.disabled=true;
 $('staffMessage').textContent='Updating issue status…';
 $('staffMessage').className='staff-message';
 try{
  const {error:rpcError}=await db.rpc('set_issue_status',{p_ticket_number:numericTicketNumber,p_status:'Resolved'});
  if(rpcError){
   const missingRpc=/could not find the function public\.set_issue_status|schema cache/i.test(rpcError.message||'');
   if(!missingRpc)throw rpcError;
   const {data,error:updateError}=await db.from('issues')
    .update({status:'Resolved'})
    .eq('ticket_number',numericTicketNumber)
    .select('ticket_number')
    .single();
   if(updateError)throw new Error(`Status RPC is unavailable and the direct update was rejected: ${updateError.message}`);
   if(!data)throw new Error('Status RPC is unavailable and no issue row was updated.');
  }
  const issue=issues.find(item=>item.ticketNumber===ticketNumber);
  if(issue)issue.resolved=true;
  render();
  $('staffMessage').textContent='Issue marked as resolved.';
  $('staffMessage').className='staff-message success';
  try{
   await loadIssues();
  }catch(refreshError){
   console.error('Staff issue refresh failed:',refreshError);
   $('staffMessage').textContent=`Issue was resolved, but the report list could not refresh: ${refreshError.message||'Reload the page to see current data.'}`;
   $('staffMessage').className='staff-message error';
  }
 }catch(err){
  console.error('Staff status update failed:',err);
  const message=err.message||'Check the Supabase status-update function.';
  const missingRpc=/could not find the function public\.set_issue_status|schema cache/i.test(message);
  $('staffMessage').textContent=missingRpc
   ?'Could not find the status-update function. Run supabase-setup.sql in Supabase, or allow a direct issue status update through your existing table grants and RLS policies.'
   :`Could not update issue: ${message}. If the direct update was rejected, the current Supabase grants or RLS policies do not permit it; a database-side change is required.`;
  $('staffMessage').className='staff-message error';
  button.disabled=false;
 }
});
})();
