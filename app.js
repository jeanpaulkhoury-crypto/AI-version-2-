const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let mode="text";

function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

function setMode(next){
  mode=next;
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $$(".mode-card").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));
  $("#prompt").placeholder={
    text:"Type your prompt here...",
    image:"Describe the image you want to create...",
    video:"Describe the video you want to create...",
    code:"Describe the application or code you need...",
    dialogue:"Ask two AI models the same question..."
  }[mode];
}

$$(".mode-card").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$$(".nav-item").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$("#newChat").onclick=()=>{ $("#prompt").value=""; $("#result").innerHTML=""; window.scrollTo({top:0,behavior:"smooth"}); };

$("#file").onchange=e=>$("#fileName").textContent=e.target.files[0]?.name||"";

async function loadHistory(){
  const r=await fetch("/api/history");
  const h=await r.json();
  $("#history").innerHTML=h.slice(0,6).map(x=>`
    <div class="hist"><span class="hist-icon">${x.mode==="image"?"▧":x.mode==="video"?"▶":x.mode==="code"?"{}":x.mode==="dialogue"?"◉":"✦"}</span>
    <span>${esc(x.prompt).slice(0,42)}${String(x.prompt||"").length>42?"…":""}</span></div>`).join("") ||
    `<div class="hist">No creations yet</div>`;

  $("#recent").innerHTML=h.slice(0,4).map(x=>`
    <div class="recent">
      <div class="recent-thumb">${x.mode==="image"?"▧":x.mode==="video"?"▶":x.mode==="code"?"</>":x.mode==="dialogue"?"◉":"✦"}</div>
      <div class="recent-info"><b>${esc(x.prompt).slice(0,32)}</b><small>${esc(x.mode)} · recent</small></div>
    </div>`).join("") ||
    `<div class="recent"><div class="recent-thumb">✦</div><div class="recent-info"><b>Your creations appear here</b><small>Start by sending a prompt</small></div></div>`;
}

function show(html){$("#result").innerHTML=html; if(html) $("#result").scrollIntoView({behavior:"smooth",block:"center"});}

$("#composer").onsubmit=async e=>{
  e.preventDefault();
  const prompt=$("#prompt").value.trim();
  if(!prompt)return;
  $("#send").disabled=true;
  show(`<div class="result-card loading">Creating with the real ${esc(mode)} API…</div>`);

  try{
    let r,data;
    const options={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})};
    if(mode==="text") r=await fetch("/api/text",options);
    if(mode==="dialogue") r=await fetch("/api/dialogue",options);
    if(mode==="image") r=await fetch("/api/image",options);
    if(mode==="code") r=await fetch("/api/code",options);
    if(mode==="video") r=await fetch("/api/video",options);
    data=await r.json();
    if(!r.ok)throw Error(data.error||"Request failed.");

    if(mode==="text") show(`<div class="result-card">${esc(data.result)}</div>`);
    if(mode==="dialogue") show(`<div class="result-card"><h3>Model A</h3>${esc(data.modelA)}<hr><h3>Model B</h3>${esc(data.modelB)}</div>`);
    if(mode==="image") show(`<div class="result-card"><img src="${data.image}" alt="Generated image"></div>`);
    if(mode==="code") show(`<div class="result-card"><h3>Generated project</h3>${data.files.map(f=>`<div class="file-card"><div class="file-head">${esc(f.path)}</div><pre class="file-code">${esc(f.content)}</pre></div>`).join("")}</div>`);
    if(mode==="video"){
      show(`<div class="result-card"><div id="videoStatus" class="loading">Video job ${esc(data.status)}…</div><div id="videoBox"></div></div>`);
      pollVideo(data.id);
    }
    $("#prompt").value="";
    await loadHistory();
  }catch(err){
    show(`<div class="result-card error">${esc(err.message)}</div>`);
  }finally{$("#send").disabled=false;}
};

async function pollVideo(id){
  for(let i=0;i<100;i++){
    await new Promise(r=>setTimeout(r,3000));
    const r=await fetch("/api/video/"+id);
    const v=await r.json();
    if(v.status==="completed"){
      $("#videoStatus").textContent="Video ready";
      $("#videoBox").innerHTML=`<video controls autoplay src="/api/video/${id}/content"></video>`;
      return;
    }
    if(v.status==="failed"){
      $("#videoStatus").textContent="Video generation failed.";
      return;
    }
    if($("#videoStatus")) $("#videoStatus").textContent=`Video generation: ${v.status} · ${v.progress||0}%`;
  }
}
loadHistory();
