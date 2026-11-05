import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

// Deterministic UUIDs for fixtures. Keep in sync with tests/e2e/helpers/fixtures.ts.
// The app validates snapshot payloads as UUIDs, so fixture ids must be UUIDs too.
export const fixtureId = label => {
  const h = createHash('md5').update(`fixture:${label}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const userId = '00000000-0000-0000-0000-000000000001';
const A = fixtureId('portfolio-a'), B = fixtureId('portfolio-b');
const EDUCATION = fixtureId('education-a'), ACTIVITY = fixtureId('activity-a'), CERTIFICATE = fixtureId('certificate-a');
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

// Mirrors supabase/migrations/20261104123719_portfolio_snapshot_release.sql closely enough for browser tests.
// It is not evidence for PostgreSQL/PostgREST behaviour; the isolated API suites cover that.
const sections = {
  education: { library: 'user_library_educations', relation: 'portfolio_educations', column: 'education_id', images: null, tags: 'user_library_education_tags',
    columns: ['level', 'school_name', 'study_plan', 'gpa', 'logo_url', 'start_year', 'end_year'], allowed: ['level', 'school_name', 'study_plan', 'gpa', 'start_year', 'end_year', 'logo_url'] },
  activity: { library: 'user_library_activities', relation: 'portfolio_activities', column: 'activity_id', images: 'user_library_activity_images', limit: 4, tags: 'user_library_activity_tags',
    columns: ['title', 'description', 'activity_date', 'organization'], allowed: ['title', 'description', 'activity_date', 'organization'] },
  certificate: { library: 'user_library_certificates', relation: 'portfolio_certificates', column: 'certificate_id', images: 'user_library_certificate_images', limit: 2, tags: 'user_library_certificate_tags',
    columns: ['title', 'description', 'issued_by', 'issued_date', 'image_url'], allowed: ['title', 'description', 'issued_by', 'issued_date'] },
};
const relationSection = Object.fromEntries(Object.entries(sections).map(([name, config]) => [config.relation, name]));

class RpcError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status; }
}
// PostgREST status mapping for the SQLSTATEs raised by the real functions.
const fail = (code, message) => {
  const status = code === '42501' ? 403 : code === '23505' || code === '23503' ? 409 : code === 'PT409' ? 409 : code.startsWith('55') ? 500 : 400;
  throw new RpcError(code, message, status);
};
// jsonb has no key order; sort keys so equal content always yields the same revision.
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  : JSON.stringify(value ?? null);
const md5 = value => createHash('md5').update(stable(value)).digest('hex');
const clone = value => structuredClone(value);
const numeric = value => typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value;

let database;
const receipts = { library: new Map(), actions: new Map() };
const reset = () => {
  receipts.library.clear(); receipts.actions.clear();
  database = {
    portfolios: [{ id: A, user_id: userId, title: 'Portfolio A', template_key: 'classic', theme_color: null, created_at: '2026-01-01T00:00:00Z', updated_at: null },
      { id: B, user_id: userId, title: 'Portfolio B', template_key: 'classic', theme_color: null, created_at: '2026-01-01T00:00:00Z', updated_at: null }],
    portfolio_section_visibility: [],
    covers: [{ id: fixtureId('cover-a'), portfolio_id: A, title: 'ALPHA', first_name: 'Alpha', last_name: 'Student', school_name: 'School A', cover_image_url: 'http://127.0.0.1:54321/sample.png' }],
    prefaces: [{ id: fixtureId('preface-a'), portfolio_id: A, content: 'คำนำที่บันทึกไว้ของพอร์ต A', signature_name: 'Alpha Author' }],
    profiles: [{ id: fixtureId('profile-a'), portfolio_id: A, age_mode: 'auto', manual_age: null, first_name: 'Alpha', last_name: 'Student', social_links: [], custom_fields: [], gpax: null }],
    user_tags: [],
    user_library_educations: [{ id: EDUCATION, user_id: userId, level: 'มัธยมศึกษา', school_name: 'Saved School', study_plan: 'วิทย์คณิต', gpa: 3.5, logo_url: '', start_year: '2023', end_year: '2026' }],
    user_library_activities: [{ id: ACTIVITY, user_id: userId, title: 'Saved Activity', description: 'รายละเอียดกิจกรรมภาษาไทย', activity_date: '2026-01-01', organization: 'School A' }],
    user_library_certificates: [{ id: CERTIFICATE, user_id: userId, title: 'Saved Certificate', description: 'รายละเอียดเกียรติบัตร', issued_by: 'School A', issued_date: '2026-01-01' }],
    user_library_activity_images: [],
    user_library_certificate_images: [],
    portfolio_educations: [relationRow(A, 'education', EDUCATION, 0)],
    portfolio_activities: [relationRow(A, 'activity', ACTIVITY, 0)],
    portfolio_certificates: [relationRow(A, 'certificate', CERTIFICATE, 0)],
    portfolio_action_receipts: [],
  };
  // The seeded portfolio represents one that was already prepared after the Snapshot release.
  prepare(userId, A);
};
function relationRow(portfolioId, section, itemId, sortOrder) {
  return { portfolio_id: portfolioId, [sections[section].column]: itemId, sort_order: sortOrder, snapshot_data: null, snapshot_revision: null, snapshot_version: 0 };
}

const table = name => (database[name] ??= []);
function ownedPortfolio(uid, portfolioId) {
  if (!table('portfolios').some(row => row.id === portfolioId && row.user_id === uid)) fail('42501', 'Portfolio access denied');
}
function sectionConfig(section) {
  const config = sections[section];
  if (!config) fail('22023', 'Invalid section');
  return config;
}
// Same canonical content as SQL capture/read: every column (missing -> null), no updated_at, images by sort_order,id.
function sourcePayload(uid, section, itemId) {
  const config = sections[section];
  const row = table(config.library).find(item => item.id === itemId && item.user_id === uid);
  if (!row) return null;
  const item = { id: row.id, user_id: row.user_id, created_at: row.created_at ?? null };
  for (const column of config.columns) item[column] = column === 'gpa' ? numeric(row[column] ?? null) : row[column] ?? null;
  const images = config.images ? table(config.images).filter(image => image[config.column] === itemId)
    .map(image => ({ id: image.id, [config.column]: itemId, image_url: image.image_url, sort_order: image.sort_order ?? 0, created_at: image.created_at ?? null }))
    .sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) : [];
  return { item, images };
}
function capture(uid, portfolioId, section, itemId, refresh = false, expected = null) {
  ownedPortfolio(uid, portfolioId);
  const config = sectionConfig(section);
  const row = table(config.relation).find(relation => relation.portfolio_id === portfolioId && relation[config.column] === itemId);
  if (!row) fail('22023', 'Item is not selected');
  const payload = sourcePayload(uid, section, itemId);
  if (!payload) fail('42501', 'Library access denied');
  const revision = md5(payload);
  const version = row.snapshot_version ?? 0;
  if (row.snapshot_data && !refresh) return { data: clone(row.snapshot_data), revision: row.snapshot_revision, version, latest_revision: revision };
  if (refresh && expected !== revision) fail('PT409', 'Source changed; inspect again');
  if (!row.snapshot_data || stable(row.snapshot_data) !== stable(payload)) {
    Object.assign(row, { snapshot_data: clone(payload), snapshot_revision: revision, snapshot_version: version + 1 });
  }
  return { data: clone(payload), revision, version: row.snapshot_version, latest_revision: revision };
}
const unprepared = row => !row.snapshot_data && !row.snapshot_revision && !row.snapshot_version;
const ordered = (rows, column) => [...rows].sort((a, b) => a.sort_order - b.sort_order || (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0));
function prepare(uid, portfolioId) {
  ownedPortfolio(uid, portfolioId);
  let prepared = 0;
  for (const [section, config] of Object.entries(sections)) {
    for (const row of ordered(table(config.relation).filter(relation => relation.portfolio_id === portfolioId), config.column)) {
      if (unprepared(row)) { capture(uid, portfolioId, section, row[config.column]); prepared++; }
      else if (!row.snapshot_data || row.snapshot_version < 1 || row.snapshot_revision !== md5(row.snapshot_data)) fail('22023', 'Invalid stored snapshot');
    }
  }
  return { portfolio_id: portfolioId, prepared_count: prepared };
}
function read(uid, portfolioId, section) {
  ownedPortfolio(uid, portfolioId);
  const config = sectionConfig(section);
  const rows = ordered(table(config.relation).filter(relation => relation.portfolio_id === portfolioId), config.column);
  const items = rows.map(row => {
    const latest = sourcePayload(uid, section, row[config.column]);
    return { item_id: row[config.column], sort_order: row.sort_order, data: clone(row.snapshot_data ?? null), revision: row.snapshot_revision ?? null,
      version: row.snapshot_version ?? 0, latest_revision: latest ? md5(latest) : null };
  });
  if (items.some(entry => entry.data === null && entry.revision === null && entry.version === 0)) fail('55000', 'Snapshot preparation required');
  for (const entry of items) {
    if (!entry.data?.item || !Array.isArray(entry.data.images) || entry.data.item.id !== entry.item_id || entry.data.item.user_id !== uid ||
      entry.version < 1 || entry.revision !== md5(entry.data) || !entry.latest_revision) fail('22023', 'Invalid stored snapshot or inaccessible source');
  }
  return { format_version: 1, portfolio_id: portfolioId, section, items };
}
function replaceSelection(uid, { p_portfolio_id: portfolioId, p_section: section, p_item_ids: ids }) {
  ownedPortfolio(uid, portfolioId);
  const config = sectionConfig(section);
  if (!Array.isArray(ids) || ids.some(id => id === null)) fail('22023', 'Item IDs must be a non-null array');
  if (new Set(ids).size !== ids.length) fail('22023', 'Duplicate item IDs');
  if (ids.some(id => !table(config.library).some(row => row.id === id && row.user_id === uid))) fail('42501', 'Library item not found or access denied');
  const kept = table(config.relation).filter(row => row.portfolio_id !== portfolioId || ids.includes(row[config.column]));
  ids.forEach((id, index) => {
    const existing = kept.find(row => row.portfolio_id === portfolioId && row[config.column] === id);
    if (existing) existing.sort_order = index; else kept.push(relationRow(portfolioId, section, id, index));
  });
  database[config.relation] = kept;
  for (const id of ids) capture(uid, portfolioId, section, id);
  return null;
}
function libraryItemFields(config, fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) fail('22023', 'Invalid save payload');
  for (const [key, value] of Object.entries(fields)) {
    if (!config.allowed.includes(key)) fail('22023', 'Unsupported field');
    if (value !== null && typeof value !== 'string' && !(key === 'gpa' && typeof value === 'number')) fail('22023', 'Invalid field type');
  }
}
function updateLibraryItem(uid, { p_section: section, p_item_id: itemId, p_fields: fields, p_images: images, p_tag_ids: tagIds }) {
  const config = sectionConfig(section);
  libraryItemFields(config, fields);
  if (!Array.isArray(images) || !Array.isArray(tagIds) || tagIds.some(id => id === null)) fail('22023', 'Invalid save payload');
  if (new Set(tagIds).size !== tagIds.length) fail('22023', 'Duplicate tags');
  const row = table(config.library).find(item => item.id === itemId && item.user_id === uid);
  if (!row) fail('42501', 'Source unavailable');
  const updated = { ...row, ...fields };
  if (section === 'education') {
    if (!String(updated.school_name ?? '').trim() || !String(updated.level ?? '').trim()) fail('22023', 'Required education fields missing');
    if (updated.gpa !== null && updated.gpa !== undefined && !(Number(updated.gpa) >= 0 && Number(updated.gpa) <= 4)) fail('22023', 'Invalid GPA');
    if (images.length) fail('22023', 'Education uses a logo field');
  } else if (!String(updated.title ?? '').trim()) fail('22023', 'Title required');
  if (tagIds.some(id => !table('user_tags').some(tag => tag.id === id && tag.user_id === uid))) fail('42501', 'Tag access denied');
  const retained = [];
  let added = 0;
  if (config.images) {
    for (const image of images) {
      if (!image || typeof image !== 'object' || Object.keys(image).some(key => key !== 'id' && key !== 'image_url') ||
        typeof image.image_url !== 'string' || !image.image_url.trim()) fail('22023', 'Invalid image fields');
      if (image.id === undefined || image.id === null) { added++; continue; }
      if (retained.includes(image.id)) fail('22023', 'Duplicate image');
      const stored = table(config.images).find(item => item.id === image.id && item[config.column] === itemId);
      if (!stored || stored.image_url !== image.image_url) fail('42501', 'Image access denied or changed');
      retained.push(image.id);
    }
    if (added > 0 && images.length > config.limit) fail('23514', 'Image limit exceeded');
  }
  Object.assign(row, fields);
  if (config.images) {
    database[config.images] = table(config.images).filter(item => item[config.column] !== itemId || retained.includes(item.id));
    images.forEach((image, position) => {
      if (image.id) table(config.images).find(item => item.id === image.id).sort_order = position;
      else table(config.images).push({ id: randomUUID(), [config.column]: itemId, image_url: image.image_url, sort_order: position, created_at: new Date().toISOString() });
    });
  }
  database[config.tags] = table(config.tags).filter(link => link[config.column] !== itemId);
  table(config.tags).push(...tagIds.map(tag_id => ({ [config.column]: itemId, tag_id })));
  return { id: itemId, item: clone(row) };
}
function createLibraryItem(uid, args) {
  const { p_section: section, p_item_id: itemId, p_fields: fields, p_images: images, p_tag_ids: tagIds } = args;
  const config = sectionConfig(section);
  if (!itemId || !Array.isArray(images) || !Array.isArray(tagIds)) fail('22023', 'Invalid create payload');
  libraryItemFields(config, fields);
  if (section === 'education' ? !String(fields.level ?? '').trim() || !String(fields.school_name ?? '').trim() : !String(fields.title ?? '').trim()) {
    fail('22023', section === 'education' ? 'Required education fields missing' : 'Title required');
  }
  const key = `${uid}:${itemId}`, fingerprint = stable({ section, fields, images, tags: tagIds });
  const receipt = receipts.library.get(key);
  if (receipt) {
    if (receipt.section !== section || receipt.fingerprint !== fingerprint) fail('22023', 'Create key reused with different arguments');
    return { id: itemId, status: 'confirmed' };
  }
  if (table(config.library).some(item => item.id === itemId)) fail('23505', 'duplicate key value violates unique constraint');
  // One transaction: a failing update rolls back the inserted source and leaves no receipt.
  const before = clone(database);
  try {
    table(config.library).push({ id: itemId, user_id: uid, created_at: new Date().toISOString(), ...fields });
    updateLibraryItem(uid, args);
  } catch (error) { database = before; throw error; }
  receipts.library.set(key, { section, fingerprint });
  return { id: itemId, status: 'confirmed' };
}
function portfolioAction(uid, { p_request_id: requestId, p_action: action, p_source_id: sourceId, p_title: title }) {
  if (!requestId || !sourceId || !['duplicate', 'delete'].includes(action) || typeof title !== 'string' ||
    (action === 'duplicate' && !title.trim()) || (action === 'delete' && title !== '')) fail('22023', 'Invalid request');
  const key = `${uid}:${requestId}`, existing = receipts.actions.get(key);
  if (existing) {
    if (existing.action !== action || existing.source_id !== sourceId || existing.title !== title) fail('22023', 'Request key reused with different arguments');
    return clone(existing);
  }
  const source = table('portfolios').find(row => row.id === sourceId && row.user_id === uid);
  let portfolioId = null;
  if (source && action === 'delete') {
    database.portfolios = table('portfolios').filter(row => row.id !== sourceId);
    for (const name of ['covers', 'prefaces', 'profiles', 'portfolio_section_visibility', ...Object.values(sections).map(config => config.relation)]) {
      database[name] = table(name).filter(row => row.portfolio_id !== sourceId);
    }
    portfolioId = sourceId;
  } else if (source) {
    const relations = Object.values(sections).flatMap(config => table(config.relation).filter(row => row.portfolio_id === sourceId));
    if (relations.some(row => !row.snapshot_data || !row.snapshot_revision || row.snapshot_version < 1)) fail('55000', 'Snapshot transition required before duplicate');
    portfolioId = randomUUID();
    table('portfolios').push({ ...clone(source), id: portfolioId, title, created_at: new Date().toISOString(), updated_at: null });
    for (const name of ['covers', 'prefaces', 'profiles']) {
      table(name).push(...table(name).filter(row => row.portfolio_id === sourceId).map(row => ({ ...clone(row), id: randomUUID(), portfolio_id: portfolioId })));
    }
    for (const name of ['portfolio_section_visibility', ...Object.values(sections).map(config => config.relation)]) {
      table(name).push(...table(name).filter(row => row.portfolio_id === sourceId).map(row => ({ ...clone(row), portfolio_id: portfolioId })));
    }
  }
  const receipt = { request_id: requestId, action, source_id: sourceId, title, status: source ? 'confirmed' : 'rejected', portfolio_id: portfolioId };
  receipts.actions.set(key, receipt);
  table('portfolio_action_receipts').push({ ...receipt, user_id: uid, created_at: new Date().toISOString() });
  return clone(receipt);
}
const rpc = {
  replace_portfolio_selection: replaceSelection,
  capture_portfolio_item_snapshot: (uid, a) => capture(uid, a.p_portfolio_id, a.p_section, a.p_item_id, a.p_refresh ?? false, a.p_expected_revision ?? null),
  prepare_portfolio_item_snapshots: (uid, a) => prepare(uid, a.p_portfolio_id),
  read_portfolio_item_snapshots: (uid, a) => read(uid, a.p_portfolio_id, a.p_section),
  create_library_item_atomic: createLibraryItem,
  update_library_item_atomic: updateLibraryItem,
  perform_portfolio_action: portfolioAction,
};
// auth.uid() comes from the bearer token's sub claim, as in Supabase; fall back to the default test user.
function requestUser(req) {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')?.[1];
  try {
    const sub = token && JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).sub;
    if (typeof sub === 'string' && /^[0-9a-f-]{36}$/.test(sub)) return sub;
  } catch { /* anon key or malformed token */ }
  return userId;
}
reset();

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.end();
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/sample.png') { res.setHeader('Content-Type', 'image/png'); return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAABJdyC1AAACrUlEQVR4nO3UMQ0AIQDAwOf9C0MENtixwEaa3Cno1DHX/gAK/tcBALcMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwgw7CADMMCMgwLyDAsIMOwgAzDAjIMC8gwLCDDsIAMwwIyDAvIMCwg4wC8KwQpPjnllwAAAABJRU5ErkJggg==', 'base64')); }
  if (url.pathname === '/__reset') { reset(); return res.end('{}'); }
  // Test-only shortcut: re-capture every selected item from the current library, as if the owner
  // accepted all updates. Use after fixture library edits that the test wants the editor to show.
  if (url.pathname === '/__recapture') {
    for (const [section, config] of Object.entries(sections)) {
      for (const row of table(config.relation)) {
        const owner = table('portfolios').find(portfolio => portfolio.id === row.portfolio_id)?.user_id;
        const payload = owner && sourcePayload(owner, section, row[config.column]);
        if (payload) capture(owner, row.portfolio_id, section, row[config.column], true, md5(payload));
      }
    }
    return res.end('{}');
  }
  if (url.pathname === '/auth/v1/user') return res.end(JSON.stringify({ ...user, id: requestUser(req) }));
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const rpcName = url.pathname.startsWith('/rest/v1/rpc/') ? url.pathname.slice('/rest/v1/rpc/'.length) : null;
  if (rpcName) {
    const handler = rpc[rpcName];
    if (!handler) { res.statusCode = 404; return res.end(JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' })); }
    try {
      return res.end(JSON.stringify(handler(requestUser(req), body) ?? null));
    } catch (error) {
      if (!(error instanceof RpcError)) throw error;
      res.statusCode = error.status;
      return res.end(JSON.stringify({ code: error.code, message: error.message, details: null, hint: null }));
    }
  }
  const name = url.pathname.split('/').at(-1);
  const matches = row => [...url.searchParams].every(([key, value]) => !value.startsWith('eq.') || String(key === 'portfolios.user_id' ? database.portfolios.find(p => p.id === row.portfolio_id)?.user_id : row[key]) === value.slice(3));
  const rows = table(name).filter(matches);
  if (req.method === 'DELETE') {
    database[name] = table(name).filter(row => !rows.includes(row));
    const kind = { user_library_educations: 'education', user_library_activities: 'activity', user_library_certificates: 'certificate' }[name];
    if (kind) {
      const config = sections[kind];
      for (const dependent of [config.relation, config.images, config.tags].filter(Boolean)) database[dependent] = table(dependent).filter(row => !rows.some(source => source.id === row[config.column]));
    }
    return res.end(req.headers.prefer?.includes('return=representation') ? JSON.stringify(rows.map(row => ({ id: row.id }))) : 'null');
  }
  if (req.method === 'GET' && url.searchParams.get('select')?.includes('portfolios!inner')) return res.end(JSON.stringify(rows.map(row => ({ ...row, portfolios: database.portfolios.find(p => p.id === row.portfolio_id) }))));
  if (req.method === 'PATCH') {
    if (req.headers.accept?.includes('vnd.pgrst.object+json') && rows.length !== 1) {
      res.statusCode = 406; return res.end(JSON.stringify({ code: 'PGRST116', message: 'Expected one returned row' }));
    }
    rows.forEach(row => Object.assign(row, body, name === 'portfolios' ? { updated_at: '2026-10-21T00:00:00Z' } : {}));
    return res.end(req.headers.prefer?.includes('return=representation') ? JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object+json') ? rows[0] : rows) : 'null');
  }
  if (req.method === 'POST' && req.headers.prefer?.includes('resolution=merge-duplicates')) {
    const keys = (url.searchParams.get('on_conflict') ?? 'id').split(',');
    const existing = table(name).find(row => keys.every(key => row[key] === body[key]));
    if (existing) Object.assign(existing, body);
    else table(name).push({ id: randomUUID(), ...body });
    if (req.headers.prefer?.includes('return=representation')) {
      const row = table(name).find(row => keys.every(key => row[key] === body[key]));
      return res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object+json') ? row : [row]));
    }
    return res.end('null');
  }
  if (req.method === 'POST') {
    const section = relationSection[name];
    if (section) {
      // Fixture shortcut for test setup only (clients cannot insert relations on hosted): rows are
      // linked and captured like replace_portfolio_selection unless snapshot columns are supplied.
      const added = (Array.isArray(body) ? body : [body]).map(row => ({ ...relationRow(row.portfolio_id, section, row[sections[section].column], row.sort_order ?? 0), ...row }));
      const missing = added.find(row => !table(sections[section].library).some(item => item.id === row[sections[section].column]));
      if (missing) { res.statusCode = 409; return res.end(JSON.stringify({ code: '23503', message: 'Library item does not exist' })); }
      table(name).push(...added);
      for (const row of added) {
        const owner = table('portfolios').find(portfolio => portfolio.id === row.portfolio_id)?.user_id;
        if (owner && unprepared(row) && !(Array.isArray(body) ? body : [body]).some(input => 'snapshot_version' in input)) capture(owner, row.portfolio_id, section, row[sections[section].column]);
      }
      return res.end(req.headers.prefer?.includes('return=representation') ? JSON.stringify(added) : 'null');
    }
    const added = Array.isArray(body) ? body : [{ id: randomUUID(), ...(name === 'portfolios' ? { created_at: '2026-01-01T00:00:00Z', updated_at: null } : {}), ...body }];
    table(name).push(...added);
    return res.end(req.headers.prefer?.includes('return=representation') ? JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object+json') ? added[0] : added) : 'null');
  }
  if (req.headers.accept?.includes('vnd.pgrst.object+json')) return res.end(JSON.stringify(rows[0] ?? null));
  res.end(JSON.stringify(rows));
}).listen(Number(process.env.MOCK_SUPABASE_PORT ?? 54321), '127.0.0.1', () => console.log('Mock Supabase ready'));
