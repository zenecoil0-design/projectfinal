'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { actionStorageKey, clearPending, parseActionReceipt, readPending, savePending, type ActionRequest, type ActionResult } from '@/lib/portfolio-actions';
import { FaCopy, FaTrashAlt } from 'react-icons/fa';
import { DuplicatePortfolioDialog, DeletePortfolioDialog } from './PortfolioActionDialog';

type Portfolio = { id: string; title: string | null };
export default function PortfolioActionsPanel({ownerId, enabled, children, onConfirmed}: {
  ownerId: string; enabled: boolean; children: (actions: (portfolio: Portfolio) => ReactNode) => ReactNode;
  onConfirmed: (action: 'duplicate'|'delete', id: string) => void;
}) {
  const [target,setTarget]=useState<{portfolio:Portfolio;action:'duplicate'|'delete';trigger:HTMLButtonElement}|null>(null);
  const [pending,setPending]=useState<ActionRequest|null>(null);
  const [message,setMessage]=useState('');
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const alive=useRef(false), lock=useRef(false), epoch=useRef(0);
  useEffect(()=>{
    if (!enabled || !ownerId) return;
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
  },[ownerId,enabled]);

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
  const button='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-40 disabled:cursor-not-allowed';
  const actions = (portfolio: Portfolio) => enabled ? <>
    {(['duplicate','delete'] as const).map(action => <button key={action} type="button"
      aria-label={action === 'duplicate' ? 'ทำสำเนาพอร์ต' : 'ลบพอร์ต'} title={action === 'duplicate' ? 'ทำสำเนาพอร์ต' : 'ลบพอร์ต'}
      className={`${button} ${action === 'delete' ? 'hover:border-red-200 hover:bg-red-50 hover:text-red-600' : ''}`}
      disabled={!ready || busy || !!pending}
      onClick={event => { if (!lock.current && !target) { setMessage(''); setTarget({portfolio,action,trigger:event.currentTarget}); } }}>
      {action === 'duplicate' ? <FaCopy aria-hidden="true" /> : <FaTrashAlt aria-hidden="true" />}
    </button>)}
  </> : null;
  return <>
    {(message || pending) && <section aria-label="ทำสำเนาหรือลบพอร์ต" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      {message && <p role="status" className="mb-3 text-sm">{message}</p>}
      {pending && <div>
        <p className="mb-3 text-sm wrap-anywhere">มีคำขอ{pending.action==='duplicate'?'ทำสำเนา':'ลบพอร์ต'}ที่ยังต้องยืนยัน{pending.title?`: ${pending.title}`:''} การปิดหน้านี้ไม่ได้ยกเลิกคำขอ</p>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 rounded-xl border px-4 py-2" disabled={busy} onClick={()=>void execute('verify',pending.action,pending.sourceId,pending.title)}>ตรวจสอบผลคำขอค้าง</button>
          <button className="min-h-11 rounded-xl border px-4 py-2" disabled={busy} onClick={()=>void execute('resume',pending.action,pending.sourceId,pending.title)}>ส่งคำขอเดิมซ้ำ</button>
        </div>
      </div>}
    </section>}
    {children(actions)}
    {target?.action==='duplicate'&&<DuplicatePortfolioDialog open ownerId={ownerId} portfolio={target.portfolio} trigger={target.trigger} onClose={()=>setTarget(null)} onConfirmed={()=>{}} onSubmit={r=>execute('new','duplicate',r.sourceId,r.title)} onVerify={r=>execute('verify','duplicate',r.sourceId,r.title)}/>}
    {target?.action==='delete'&&<DeletePortfolioDialog open ownerId={ownerId} portfolio={target.portfolio} trigger={target.trigger} onClose={()=>setTarget(null)} onConfirmed={()=>{}} onSubmit={id=>execute('new','delete',id,'')} onVerify={id=>execute('verify','delete',id,'')}/>}
  </>;
}
