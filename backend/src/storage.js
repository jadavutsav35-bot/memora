const {createClient}=require('@supabase/supabase-js');
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const BUCKET='memora-media';
async function uploadBuffer(buffer,path,contentType){const {error}=await supabase.storage.from(BUCKET).upload(path,buffer,{contentType,upsert:false});if(error)throw error;return path}
async function signedUrl(path,seconds=3600){const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,seconds);if(error)throw error;return data.signedUrl}
module.exports={uploadBuffer,signedUrl};
