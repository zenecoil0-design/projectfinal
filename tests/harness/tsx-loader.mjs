import swc from 'next/dist/build/swc/index.js';
export default function load(source) {
  const done = this.async();
  try { done(null, swc.transformSync(source, { filename: this.resourcePath, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2020' }, module: { type: 'es6' } }).code); }
  catch (error) { done(error); }
}
