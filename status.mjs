import {jobs} from "./generate.mjs";
export default function handler(req,res){
  const id=req.query.id;
  const job=jobs.get(id);
  if(!job) return res.status(404).json({error:"Job not found. Serverless memory may have reset; use a persistent job store for production."});
  res.json(job);
}