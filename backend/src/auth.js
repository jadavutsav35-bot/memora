import jwt from 'jsonwebtoken';
export function signUser(user){ return jwt.sign({id:user.id,email:user.email,name:user.name},process.env.JWT_SECRET,{expiresIn:'7d'}); }
export function requireAuth(req,res,next){
  const h=req.headers.authorization;
  if(!h?.startsWith('Bearer ')) return res.status(401).json({error:'Authentication required'});
  try { req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({error:'Invalid or expired token'}); }
}
