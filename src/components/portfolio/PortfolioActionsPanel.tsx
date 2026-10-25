'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { actionStorageKey, clearPending, parseActionReceipt, readPending, savePending, type ActionRequest, type ActionResult } from '@/lib/portfolio-actions';
import { DuplicatePortfolioDialog, DeletePortfolioDialog } from './PortfolioActionDialog';

type Portfolio = { id: string; title: string | null };
export default function PortfolioActionsPanel({ownerId, portfolios, onConfirmed}: {
  ownerId: string; portfolios: Portfolio[];
  onConfirmed: (action: 'duplicate'|'delete', id: string) => void;
}) {
  const [selected,setSelected]=useState('');
  const [target,setTarget]=useState<{portfolio:Portfolio;action:'duplicate'|'delete';trigger:HTMLButtonElement}|null>(null);
  const [pending,setPending]=useState<ActionRequest|null>(null);
  const [message,setMessage]=useState('');
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const alive=useRef(false), lock=useRef(false), epoch=useRef(0);
  useEffect(()=>{
    alive.current=true;
    ++epoch.current;
    const client=createClient();
    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'||(session&&session.user.id!==ownerId)){alive.current=false;++epoch.current;setTarget(null);setReady(false);setPending(null);}
    });
    const sync=()=>{try{setPending(readPending(localStorage,ownerId));setReady(true);}catch{setReady(false);setMessage('อ่านสถานะคำขอค้างไม่สำเร็จ กรุณาเก็บข้อมูลเบราว์เซอร์ไว้และติดต่อผู้ดูแล');}};
    sync();
    const listener=(event:StorageEvent)=>{if(event.key===actionStorageKey(ownerId))sync();};
    window.addEventListener('storage',listener);
    return()=>{alive.current=false;++epoch.current;subscription.unsubscribe();window.removeEventListener('storage',listener);};
  },[ownerId]);

  // Web Locks coordinate same-origin tabs; server receipts provide idempotency.
  async function execute(mode:'new'|'verify'|'resume', action:'duplicate'|'delete', sourceId:string, title:string):Promise<ActionResult> {
    if(lock.current||!alive.current) return {status:'uncertain'};
    lock.current=true;setBusy(true);
    const generation=epoch.current;
    const current=()=>alive.current&&generation===epoch.current;
    try {
      if(!navigator.locks) {setMessage('เบราว์เซอร์นี้ยังไม่รองรับการทำรายการอย่างปลอดภัย กรุณาใช้ Chrome หรือ Edge');return {status:'uncertain'};}
      return await navigator.locks.request(actionStorageKey(ownerId),{ifAvailable:true},async lease=>{
        if(!lease||!current()) return {status:'uncertain'} as ActionResult;
        const client=createClient();
        const {data,error}=await client.auth.getUser();
        if(error||data.user?.id!==ownerId||!current()) return {status:'uncertain'} as ActionResult;
        let request=readPending(localStorage,ownerId);
        if(mode==='new') {
          if(request){setPending(request);return {status:'uncertain'} as ActionResult;}
          request={owner:ownerId,requestId:crypto.randomUUID(),action,sourceId,title:action==='delete'?'':title.trim()};
          savePending(localStorage,request);
          if(current())setPending(request);
        }
        if(!request) return {status:'uncertain'} as ActionResult;
        let result:ActionResult;
        if(mode==='verify') {
          const response=await client.from('portfolio_action_receipts')
            .select('request_id,action,source_id,title,status,portfolio_id').eq('user_id',ownerId).eq('request_id',request.requestId).maybeSingle();
          result=response.error?{status:'uncertain'}:parseActionReceipt(response.data,request);
        } else {
          const response=await client.rpc('perform_portfolio_action',{
            p_request_id:request.requestId,p_action:request.action,p_source_id:request.sourceId,p_title:request.title
          });
          result=response.error?{status:'uncertain'}:parseActionReceipt(response.data,request);
        }
        if(!current()) return {status:'uncertain'} as ActionResult;
        if(result.status!=='uncertain') {
          clearPending(localStorage,request);setPending(null);
          if(result.status==='confirmed') {setTarget(null);onConfirmed(request.action,result.portfolioId);}
          else setMessage('ระบบยืนยันว่าไม่ได้ทำรายการ กรุณาตรวจพอร์ตแล้วลองใหม่');
        } else setMessage('ยังยืนยันผลไม่ได้ ตรวจสอบผลก่อน หรือส่งคำขอเดิมซ้ำอย่างปลอดภัย');
        return result;
      });
    } catch {if(current())setMessage('ยังยืนยันผลไม่ได้ คำขอที่ส่งแล้วอาจสำเร็จ กรุณาตรวจสอบผล');return {status:'uncertain'};}
    finally{lock.current=false;if(current())setBusy(false);}
  }
  const portfolio=portfolios.find(p=>p.id===selected);
  const button='min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50';
  return <section aria-label="ทำสำเนาหรือลบพอร์ต" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
    {message&&<p role="status" className="mb-3 text-sm">{message}</p>}
    {pending ? <div>
      <p className="mb-3 text-sm wrap-anywhere">มีคำขอ{pending.action==='duplicate'?'ทำสำเนา':'ลบพอร์ต'}ที่ยังต้องยืนยัน{pending.title?`: ${pending.title}`:''} การปิดหน้านี้ไม่ได้ยกเลิกคำขอ</p>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={busy} onClick={()=>void execute('verify',pending.action,pending.sourceId,pending.title)}>ตรวจสอบผลคำขอค้าง</button>
        <button className={button} disabled={busy} onClick={()=>void execute('resume',pending.action,pending.sourceId,pending.title)}>ส่งคำขอเดิมซ้ำ</button>
      </div>
    </div> : <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">เลือกพอร์ตที่จะจัดการ
        <select className="min-h-11 w-full rounded-xl border border-slate-300 px-3" value={selected} onChange={e=>setSelected(e.target.value)} disabled={!ready||busy}>
          <option value="">เลือกพอร์ต</option>{portfolios.map(p=><option key={p.id} value={p.id}>{p.title||'พอร์ตไม่มีชื่อ'}</option>)}
        </select>
      </label>
      {(['duplicate','delete'] as const).map(action=><button key={action} className={button} disabled={!ready||busy||!portfolio} onClick={e=>{if(portfolio&&!lock.current){setMessage('');setTarget({portfolio,action,trigger:e.currentTarget});}}}>{action==='duplicate'?'ทำสำเนาพอร์ต':'ลบพอร์ต'}</button>)}
    </div>}
    {target?.action==='duplicate'&&<DuplicatePortfolioDialog open ownerId={ownerId} portfolio={target.portfolio} trigger={target.trigger} onClose={()=>setTarget(null)} onConfirmed={()=>{}} onSubmit={r=>execute('new','duplicate',r.sourceId,r.title)} onVerify={r=>execute('verify','duplicate',r.sourceId,r.title)}/>}
    {target?.action==='delete'&&<DeletePortfolioDialog open ownerId={ownerId} portfolio={target.portfolio} trigger={target.trigger} onClose={()=>setTarget(null)} onConfirmed={()=>{}} onSubmit={id=>execute('new','delete',id,'')} onVerify={id=>execute('verify','delete',id,'')}/>}
  </section>;
}
