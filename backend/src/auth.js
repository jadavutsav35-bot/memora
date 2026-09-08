const jwt=require('jsonwebtoken');
function signUser(u){return jwt.sign({id:u.id,email:u.email,name:u.name},process.env.JWT_SECRET,{expiresIn:'7d'});}
function authRequired(req,res,next){const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({error:'Login required'});try{req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{return res.status(401).json({error:'Invalid or expired session'})}}
module.exports={signUser,authRequired};
