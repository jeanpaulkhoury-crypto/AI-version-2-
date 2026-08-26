import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.resolve("server/data");
fs.mkdirSync(dataDir, { recursive: true });
const historyFile = path.join(dataDir, "history.json");
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, "[]");

const upload = multer({ dest: "public/uploads/" });
app.use(express.json({limit:"20mb"}));
app.use(express.static("public"));

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
function saveHistory(item) {
  const all = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  all.unshift({id:crypto.randomUUID(), createdAt:new Date().toISOString(), ...item});
  fs.writeFileSync(historyFile, JSON.stringify(all.slice(0,100), null, 2));
}

app.get("/api/history", (_,res)=>res.json(JSON.parse(fs.readFileSync(historyFile,"utf8"))));

app.post("/api/text", async (req,res)=>{
  try {
    const ai=client();
    const r=await ai.responses.create({model:"gpt-5.6-luna", input:req.body.prompt});
    const result=r.output_text;
    saveHistory({mode:"text",prompt:req.body.prompt,result});
    res.json({result});
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/dialogue", async (req,res)=>{
  try {
    const ai=client(), prompt=req.body.prompt;
    const [a,b]=await Promise.all([
      ai.responses.create({model:"gpt-5.6-luna", input:"Answer independently and critically. User: "+prompt}),
      ai.responses.create({model:"gpt-5.6-terra", input:"Answer independently from a different perspective. User: "+prompt})
    ]);
    const result={modelA:a.output_text,modelB:b.output_text};
    saveHistory({mode:"dialogue",prompt,result});
    res.json(result);
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/image", async (req,res)=>{
  try {
    const ai=client();
    const r=await ai.images.generate({model:"gpt-image-2", prompt:req.body.prompt, size:"1024x1024"});
    const result=r.data?.[0]?.b64_json;
    if(!result) throw new Error("Image API returned no image.");
    saveHistory({mode:"image",prompt:req.body.prompt,result:"data:image/png;base64,"+result});
    res.json({image:"data:image/png;base64,"+result});
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/code", async (req,res)=>{
  try {
    const ai=client();
    const instruction=`Create a complete runnable project for this request: ${req.body.prompt}
Return ONLY valid JSON: {"files":[{"path":"...","content":"..."}]}
Include all required source/config files. Do not use placeholders or fake APIs.`;
    const r=await ai.responses.create({model:"gpt-5.6-terra",input:instruction});
    const parsed=JSON.parse(r.output_text);
    saveHistory({mode:"code",prompt:req.body.prompt,result:parsed});
    res.json(parsed);
  } catch(e){res.status(500).json({error:"Code generation failed: "+e.message});}
});

app.post("/api/video", async (req,res)=>{
  try {
    const ai=client();
    const video=await ai.videos.create({model:"sora-2",prompt:req.body.prompt,size:"1280x720",seconds:"8"});
    saveHistory({mode:"video",prompt:req.body.prompt,result:{id:video.id,status:video.status}});
    res.json({id:video.id,status:video.status});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get("/api/video/:id", async (req,res)=>{
  try {
    const ai=client();
    const v=await ai.videos.retrieve(req.params.id);
    res.json({id:v.id,status:v.status,progress:v.progress});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get("/api/video/:id/content", async (req,res)=>{
  try {
    const ai=client();
    const response=await ai.videos.downloadContent(req.params.id);
    res.setHeader("Content-Type","video/mp4");
    response.body.pipe(res);
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/upload", upload.single("file"), (req,res)=>{
  if(!req.file) return res.status(400).json({error:"No file uploaded"});
  res.json({name:req.file.originalname,path:"/uploads/"+req.file.filename,mime:req.file.mimetype});
});

app.listen(port,()=>console.log(`My AI running at http://localhost:${port}`));
