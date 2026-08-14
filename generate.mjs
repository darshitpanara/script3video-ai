import OpenAI from "openai";

const jobs = new Map();

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  const {script}=req.body||{};
  if(!script?.trim()) return res.status(400).json({error:"Script is required."});
  if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:"OPENAI_API_KEY is not configured."});

  const id=crypto.randomUUID();
  jobs.set(id,{status:"starting",progress:5});
  res.status(200).json({jobId:id});

  // Serverless-safe version: create one real 12-second AI clip.
  // The frontend remains ready for a queue/worker that can assemble multiple clips
  // for a longer <=30s result.
  (async()=>{
    try{
      const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
      jobs.set(id,{status:"generating video",progress:20});
      const prompt=`Create a cinematic video that visually tells this script. Keep the visuals faithful to the script, realistic and engaging. Do not add subtitles or on-screen text. Script: ${script.slice(0,12000)}`;
      const v=await client.videos.create({model:"sora-2",prompt,seconds:"12",size:"1280x720"});
      jobs.set(id,{status:"processing",progress:45});
      let x=v;
      while(x.status==="queued"||x.status==="in_progress"){
        await new Promise(r=>setTimeout(r,5000));
        x=await client.videos.retrieve(v.id);
      }
      if(x.status!=="completed") throw new Error("Video generation failed: "+x.status);
      jobs.set(id,{status:"downloading",progress:80});
      const content=await client.videos.downloadContent(v.id);
      const bytes=Buffer.from(await content.arrayBuffer());
      // Data is kept in-memory for this demo deployment. For production,
      // upload bytes to Blob/S3 and return a permanent URL.
      jobs.set(id,{status:"completed",progress:100,video:"data:video/mp4;base64,"+bytes.toString("base64")});
    }catch(e){
      jobs.set(id,{status:"error",progress:100,error:e.message});
    }
  })();
}

export {jobs};