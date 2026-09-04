import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { requireAuth, signUser } from './auth.js';
import { requireAlbumMember } from './access.js';

const router=express.Router();

router.post('/auth/register',async(req,res)=>{
  try{
    const {name,email,password}=req.body;
    if(!name||!email||!password||password.length<6) return res.status(400).json({error:'Name, email and password (6+ chars) are required'});
    const hash=await bcrypt.hash(password,12);
    const r=await pool.query(`INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email`,[name,email.toLowerCase(),hash]);
    res.status(201).json({user:r.rows[0],token:signUser(r.rows[0])});
  }catch(e){res.status(400).json({error:e.code==='23505'?'Email already registered':'Registration failed'});}
});

router.post('/auth/login',async(req,res)=>{
  const {email,password}=req.body;
  const r=await pool.query(`SELECT * FROM users WHERE email=$1`,[email?.toLowerCase()]);
  if(!r.rowCount || !(await bcrypt.compare(password,r.rows[0].password_hash))) return res.status(401).json({error:'Invalid email or password'});
  const u=r.rows[0]; res.json({user:{id:u.id,name:u.name,email:u.email},token:signUser(u)});
});

router.get('/albums',requireAuth,async(req,res)=>{
  const r=await pool.query(`SELECT a.*, count(DISTINCT am2.user_id)::int members,
    count(DISTINCT m.id)::int memories
    FROM albums a JOIN album_members am ON am.album_id=a.id
    LEFT JOIN album_members am2 ON am2.album_id=a.id
    LEFT JOIN memories m ON m.album_id=a.id
    WHERE am.user_id=$1 GROUP BY a.id ORDER BY a.created_at DESC`,[req.user.id]);
  res.json(r.rows);
});

router.post('/albums',requireAuth,async(req,res)=>{
  const {name,description,location,startDate,endDate}=req.body;
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const a=await client.query(`INSERT INTO albums(name,description,location,start_date,end_date,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name,description||null,location||null,startDate||null,endDate||null,req.user.id]);
    await client.query(`INSERT INTO album_members(album_id,user_id,role) VALUES($1,$2,'owner')`,[a.rows[0].id,req.user.id]);
    await client.query('COMMIT'); res.status(201).json(a.rows[0]);
  }catch(e){await client.query('ROLLBACK');res.status(400).json({error:'Could not create album'});}finally{client.release();}
});

router.get('/albums/:id',requireAuth,requireAlbumMember,async(req,res)=>{
  const a=await pool.query(`SELECT a.*,u.name creator FROM albums a JOIN users u ON u.id=a.created_by WHERE a.id=$1`,[req.params.id]);
  if(!a.rowCount)return res.status(404).json({error:'Album not found'});
  const members=await pool.query(`SELECT u.id,u.name,u.email,am.role FROM album_members am JOIN users u ON u.id=am.user_id WHERE am.album_id=$1`,[req.params.id]);
  res.json({...a.rows[0],members:members.rows});
});

router.get('/albums/:id/memories',requireAuth,requireAlbumMember,async(req,res)=>{
  const r=await pool.query(`SELECT m.*,u.name author,
    COALESCE((SELECT json_agg(md ORDER BY md.created_at) FROM media md WHERE md.memory_id=m.id),'[]') media,
    COALESCE((SELECT json_agg(c ORDER BY c.created_at) FROM comments c WHERE c.memory_id=m.id),'[]') comments
    FROM memories m JOIN users u ON u.id=m.user_id WHERE m.album_id=$1 ORDER BY m.memory_date DESC`,[req.params.id]);
  res.json(r.rows);
});

router.post('/albums/:id/memories',requireAuth,requireAlbumMember,async(req,res)=>{
  const {title,story,location,memoryDate}=req.body;
  const r=await pool.query(`INSERT INTO memories(album_id,user_id,title,story,location,memory_date) VALUES($1,$2,$3,$4,$5,COALESCE($6,NOW())) RETURNING *`,
    [req.params.id,req.user.id,title||null,story||null,location||null,memoryDate||null]);
  res.status(201).json(r.rows[0]);
});

router.post('/memories/:id/comments',requireAuth,async(req,res)=>{
  const {commentText}=req.body;
  const check=await pool.query(`SELECT 1 FROM memories m JOIN album_members am ON am.album_id=m.album_id WHERE m.id=$1 AND am.user_id=$2`,[req.params.id,req.user.id]);
  if(!check.rowCount)return res.status(403).json({error:'Access denied'});
  const r=await pool.query(`INSERT INTO comments(memory_id,user_id,comment_text) VALUES($1,$2,$3) RETURNING *`,[req.params.id,req.user.id,commentText]);
  res.status(201).json(r.rows[0]);
});

router.post('/memories/:id/reactions',requireAuth,async(req,res)=>{
  const type=req.body.reactionType||'heart';
  const check=await pool.query(`SELECT 1 FROM memories m JOIN album_members am ON am.album_id=m.album_id WHERE m.id=$1 AND am.user_id=$2`,[req.params.id,req.user.id]);
  if(!check.rowCount)return res.status(403).json({error:'Access denied'});
  await pool.query(`INSERT INTO reactions(memory_id,user_id,reaction_type) VALUES($1,$2,$3) ON CONFLICT(memory_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type`,[req.params.id,req.user.id,type]);
  res.json({ok:true});
});

router.post('/albums/:id/invite',requireAuth,requireAlbumMember,async(req,res)=>{
  if(!['owner','admin'].includes(req.albumRole))return res.status(403).json({error:'Only owners/admins can invite'});
  const {email}=req.body;
  const r=await pool.query(`INSERT INTO invitations(album_id,invited_by,email,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '7 days') RETURNING token,email`,[req.params.id,req.user.id,email]);
  res.status(201).json({message:'Invitation created. Send this token through your email service.',...r.rows[0]});
});

export default router;
