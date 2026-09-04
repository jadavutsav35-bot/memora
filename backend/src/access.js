import { pool } from './db.js';

export async function requireAlbumMember(req,res,next){
  const albumId=req.params.id || req.params.albumId;
  const q=await pool.query(
    `SELECT am.role FROM album_members am WHERE am.album_id=$1 AND am.user_id=$2`,
    [albumId,req.user.id]
  );
  if(!q.rowCount) return res.status(403).json({error:'You are not a member of this private album'});
  req.albumRole=q.rows[0].role;
  next();
}
