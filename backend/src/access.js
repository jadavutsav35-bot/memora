const pool=require('./db');
async function requireAlbumMember(req,res,next){try{const id=req.params.id||req.params.albumId;const r=await pool.query(`select a.id,a.owner_id,am.role from albums a join album_members am on am.album_id=a.id where a.id=$1 and am.user_id=$2`,[id,req.user.id]);if(!r.rows.length)return res.status(403).json({error:'You are not a member of this private album'});req.album=r.rows[0];next()}catch(e){next(e)}}
module.exports={requireAlbumMember};
