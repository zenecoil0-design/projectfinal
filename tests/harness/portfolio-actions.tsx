import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DeletePortfolioDialog, DuplicatePortfolioDialog, type PortfolioActionTarget } from '../../src/components/portfolio/PortfolioActionDialog';

type Mode = 'confirmed' | 'rejected' | 'uncertain' | 'throw' | 'undefined' | 'pending' | 'bad-id';
type Call = { kind: 'duplicate' | 'delete' | 'verify'; args: unknown };
export type HarnessAPI = {
  mode: (mode: Mode) => void;
  target: (target: PortfolioActionTarget) => void;
  owner: (owner: string) => void;
  mounted: (mounted: boolean) => void;
  open: (open: boolean) => void;
  autoClose: (value: boolean) => void;
  resolve: (index: number, result: unknown) => void;
  snapshot: () => { calls: Call[]; successes: { portfolioId: string }[]; closes: number };
};
declare global { interface Window { portfolioActions: HarnessAPI } }

function Harness() {
  const [target, setTarget] = useState<PortfolioActionTarget>({ id: 'portfolio-a', title: 'พอร์ตภาษาไทย A' });
  const [owner, setOwner] = useState('owner-a');
  const [action, setAction] = useState<'duplicate' | 'delete'>('duplicate');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const state = useRef({ mode: 'confirmed' as Mode, calls: [] as Call[], successes: [] as { portfolioId: string }[], closes: 0, resolvers: [] as ((result: unknown) => void)[], autoClose: true });
  useEffect(() => {
    window.portfolioActions = {
      mode: mode => { state.current.mode = mode; }, target: setTarget, owner: setOwner, mounted: setMounted, open: setOpen,
      autoClose: value => { state.current.autoClose = value; },
      resolve: (index, result) => { const done = state.current.resolvers[index]; if (!done) throw Error('No pending callback'); done(result); },
      snapshot: () => ({ calls: state.current.calls, successes: state.current.successes, closes: state.current.closes }),
    };
  }, []);
  const invoke = async (kind: Call['kind'], args: unknown): Promise<unknown> => {
    state.current.calls.push({ kind, args });
    if (state.current.mode === 'pending') return new Promise(resolve => { state.current.resolvers.push(resolve); });
    if (state.current.mode === 'throw') throw Error('INTERNAL_SQL_AUTH_CONSTRAINT');
    if (state.current.mode === 'undefined') return undefined;
    if (state.current.mode === 'bad-id') return { status: 'confirmed', portfolioId: ' ' };
    return state.current.mode === 'confirmed' ? { status: 'confirmed', portfolioId: action === 'duplicate' ? 'copy-id' : target.id } : { status: state.current.mode };
  };
  const shared = {
    open, ownerId: owner, portfolio: target, trigger,
    onClose: () => { state.current.closes++; setOpen(false); },
    onConfirmed: (result: { portfolioId: string }) => { state.current.successes.push(result); if (state.current.autoClose) setOpen(false); },
  };
  return <main className="p-6 text-slate-800">
    <h1>Isolated portfolio dialog harness</h1>
    <p>Test callbacks only. No backend connection.</p>
    <button className="m-3 rounded-xl bg-blue-600 p-3 text-white" onClick={event => { setAction('duplicate'); setTrigger(event.currentTarget); setOpen(true); }}>เปิดทำสำเนา</button>
    <button className="m-3 rounded-xl bg-red-600 p-3 text-white" onClick={event => { setAction('delete'); setTrigger(event.currentTarget); setOpen(true); }}>เปิดลบ</button>
    {mounted && (action === 'duplicate'
      ? <DuplicatePortfolioDialog {...shared} onSubmit={request => invoke('duplicate', request)} onVerify={request => invoke('verify', request)} />
      : <DeletePortfolioDialog {...shared} onSubmit={id => invoke('delete', id)} onVerify={id => invoke('verify', id)} />)}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
