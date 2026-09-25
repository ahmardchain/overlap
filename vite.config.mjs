import { defineConfig } from "vite";
import {handleApi} from "./worker/index.js";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), {name:'overlap-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(!req.url?.startsWith('/api/'))return next();try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5000){res.statusCode=413;res.end();return}chunks.push(chunk)}const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const result=await handleApi(request,process.env);res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await result.text())}catch{res.statusCode=500;res.end(JSON.stringify({error:'Local API unavailable'}))}})}}],
});
