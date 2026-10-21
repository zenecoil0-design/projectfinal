import { createServer } from 'node:http';
export const userId = '00000000-0000-0000-0000-000000000001';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
let database;
const reset = () => database = {
  portfolios: [ {id:'a', user_id:userId, title:'Portfolio A', template_key:'classic',created_at:'2026-01-01T00:00:00Z',updated_at:null}, {id:'b', user_id:userId, title:'Portfolio B', template_key:'classic',created_at:'2026-01-01T00:00:00Z',updated_at:null} ],
  portfolio_section_visibility: [],
  covers: [{id:'cover-a',portfolio_id:'a', title:'ALPHA',first_name:'Alpha',last_name:'Student',school_name:'School A', cover_image_url:'http://127.0.0.1:54321/sample.png'}],
  prefaces:[{id:'preface-a',portfolio_id:'a',content:'คำนำที่บันทึกไว้ของพอร์ต A',signature_name:'Alpha Author'}],
  profiles:[{id:'profile-a',portfolio_id:'a',first_name:'Alpha',last_name:'Student',social_links:[],custom_fields:[],gpax:null}],
  user_library_educations:[{id:'education-a',user_id:userId,level:'มัธยมศึกษา',school_name:'Saved School',study_plan:'วิทย์คณิต',gpa:3.5,logo_url:'',start_year:'2023',end_year:'2026'}],
  user_library_activities:[{id:'activity-a',user_id:userId,title:'Saved Activity',description:'รายละเอียดกิจกรรมภาษาไทย',activity_date:'2026-01-01',organization:'School A'}],
  user_library_certificates:[{id:'certificate-a',user_id:userId,title:'Saved Certificate',description:'รายละเอียดเกียรติบัตร',issued_by:'School A',issued_date:'2026-01-01'}],
  portfolio_educations:[{portfolio_id:'a',education_id:'education-a',sort_order:0}],
  portfolio_activities:[{portfolio_id:'a',activity_id:'activity-a',sort_order:0}],
  portfolio_certificates:[{portfolio_id:'a',certificate_id:'certificate-a',sort_order:0}],
};
reset();
createServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS') return res.end();
  const url = new URL(req.url,'http://localhost');
  if(url.pathname==='/sample.png') { res.setHeader('Content-Type','image/png'); return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAABJdyC1AAACrUlEQVR4nO3UMQ0AIQDAwOf9C0MENtixwEaa3Cno1DHX/gAK/tcBALcMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwg4wC8KwQpPjnllwAAAABJRU5ErkJggg==','base64')); }
  if(url.pathname==='/__reset') { reset(); return res.end('{}'); }
  if(url.pathname==='/auth/v1/user') return res.end(JSON.stringify(user));
  let raw='';for await(const chunk of req) raw+=chunk;
  const body=raw?JSON.parse(raw):{};
  if(url.pathname==='/rest/v1/rpc/replace_portfolio_selection') {
    const {p_portfolio_id,p_section,p_item_ids}=body;
    const plural={activity:'activities',education:'educations',certificate:'certificates'}[p_section];
    const table=`portfolio_${plural}`;
    database[table]=[...(database[table]??[]).filter(row=>row.portfolio_id!==p_portfolio_id),...p_item_ids.map((id,index)=>({portfolio_id:p_portfolio_id,[`${p_section}_id`]:id,sort_order:index}))];
    return res.end('null');
  }
  const table=url.pathname.split('/').at(-1);
  const matches = row => [...url.searchParams].every(([key,value])=> !value.startsWith('eq.') || String(row[key])===value.slice(3));
  const rows=(database[table]??[]).filter(matches);
  if(req.method==='PATCH') { rows.forEach(row=>Object.assign(row,body,table==='portfolios'?{updated_at:'2026-10-21T00:00:00Z'}:{})); return res.end(req.headers.prefer?.includes('return=representation') ? JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object+json') ? rows[0] ?? null : rows) : 'null'); }
  if(req.method==='POST' && req.headers.prefer?.includes('resolution=merge-duplicates')) {
    const keys=(url.searchParams.get('on_conflict')??'id').split(',');
    const existing=(database[table]??[]).find(row=>keys.every(key=>row[key]===body[key]));
    if(existing) Object.assign(existing,body);
    else (database[table]??=[]).push({id:crypto.randomUUID(),...body});
    if(req.headers.prefer?.includes('return=representation')) {
      const row=(database[table]??[]).find(row=>keys.every(key=>row[key]===body[key]));
      return res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object+json')?row:[row]));
    }
    return res.end('null');
  }
  if(req.method==='POST') {
    const added=Array.isArray(body)?body:[{id:crypto.randomUUID(),...(table==='portfolios'?{created_at:'2026-01-01T00:00:00Z',updated_at:null}:{}),...body}];
    (database[table]??=[]).push(...added);
    return res.end(req.headers.prefer?.includes('return=representation') ? JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object+json')?added[0]:added) : 'null');
  }
  if(req.headers.accept?.includes('vnd.pgrst.object+json')) return res.end(JSON.stringify(rows[0]??null));
  res.end(JSON.stringify(rows));
}).listen(54321,'127.0.0.1',()=>console.log('Mock Supabase ready'));
