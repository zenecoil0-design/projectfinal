export type ActionRequest = {
  owner: string; requestId: string; action: 'duplicate' | 'delete'; sourceId: string; title: string;
};
export type ActionResult = { status: 'confirmed'; portfolioId: string } | { status: 'rejected' | 'uncertain' };
export const actionStorageKey = (owner: string) => `portfolio-action:v1:${owner}`;

export function parseActionRequest(value: unknown, owner: string): ActionRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid pending request');
  const r = value as Record<string, unknown>;
  if (r.owner !== owner || typeof r.requestId !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(r.requestId) ||
      typeof r.sourceId !== 'string' || !r.sourceId || typeof r.title !== 'string' ||
      !['duplicate','delete'].includes(String(r.action)) ||
      (r.action === 'delete' ? r.title !== '' : !r.title.trim())) throw new Error('Invalid pending request');
  return r as ActionRequest;
}

export function parseActionReceipt(value: unknown, request: ActionRequest): ActionResult {
  if (!value || typeof value !== 'object') return { status: 'uncertain' };
  const r = value as Record<string, unknown>;
  if (r.request_id !== request.requestId || r.source_id !== request.sourceId || r.action !== request.action || r.title !== request.title)
    return { status: 'uncertain' };
  if (r.status === 'rejected' && r.portfolio_id === null) return { status: 'rejected' };
  if (r.status === 'confirmed' && typeof r.portfolio_id === 'string' && r.portfolio_id.trim() &&
      (request.action === 'delete' ? r.portfolio_id === request.sourceId : r.portfolio_id !== request.sourceId))
    return { status: 'confirmed', portfolioId: r.portfolio_id };
  return { status: 'uncertain' };
}

// Persist BEFORE sending a mutation. An absent receipt does not prove rollback.
export function readPending(storage: Pick<Storage,'getItem'>, owner: string): ActionRequest | null {
  const text = storage.getItem(actionStorageKey(owner));
  return text === null ? null : parseActionRequest(JSON.parse(text), owner);
}
export function savePending(storage: Pick<Storage,'setItem'|'getItem'>, request: ActionRequest) {
  const key=actionStorageKey(request.owner), text=JSON.stringify(request);
  storage.setItem(key,text);
  if(storage.getItem(key)!==text) throw new Error('Pending request was not persisted');
}
export function clearPending(storage: Pick<Storage,'getItem'|'removeItem'>, request: ActionRequest) {
  const current=readPending(storage,request.owner);
  if(current?.requestId===request.requestId) storage.removeItem(actionStorageKey(request.owner));
}
