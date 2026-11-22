import fs from 'fs';
import path from 'path';

const migrationsDir = 'migrations';
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log(`Found ${files.length} migration files in ${migrationsDir}\n`);

const results = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  
  const hasAuth = /auth\./i.test(content);
  const authMatches = content.match(/auth\.[a-zA-Z0-9_]+/gi) || [];
  
  const hasStorage = /storage\./i.test(content);
  const storageMatches = content.match(/storage\.[a-zA-Z0-9_]+/gi) || [];

  const hasRLS = /ENABLE\s+ROW\s+LEVEL\s+SECURITY|CREATE\s+POLICY/i.test(content);
  
  const hasInsert = /\bINSERT\s+INTO\b/i.test(content);
  const hasUpdate = /\bUPDATE\b/i.test(content);
  const hasDelete = /\bDELETE\s+FROM\b/i.test(content);
  
  // Extract created tables, types, views, functions
  const createdTypes = [...content.matchAll(/CREATE\s+TYPE\s+([a-zA-Z0-9_"]+)/gi)].map(m => m[1]);
  const createdTables = [...content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."]+)/gi)].map(m => m[1]);
  const createdViews = [...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+([a-zA-Z0-9_."]+)/gi)].map(m => m[1]);
  const createdFunctions = [...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_."]+)/gi)].map(m => m[1]);

  results.push({
    file,
    hasAuth,
    authMatches: [...new Set(authMatches)],
    hasStorage,
    storageMatches: [...new Set(storageMatches)],
    hasRLS,
    hasInsert,
    hasUpdate,
    hasDelete,
    createdTypes,
    createdTables,
    createdViews,
    createdFunctions
  });
}

for (const r of results) {
  const flags = [];
  if (r.hasAuth) flags.push(`AUTH(${r.authMatches.join(',')})`);
  if (r.hasStorage) flags.push(`STORAGE(${r.storageMatches.join(',')})`);
  if (r.hasRLS) flags.push('RLS');
  if (r.hasInsert) flags.push('INSERT');
  if (r.hasUpdate) flags.push('UPDATE');
  if (r.hasDelete) flags.push('DELETE');

  const created = [];
  if (r.createdTypes.length) created.push(`Types: ${r.createdTypes.join(', ')}`);
  if (r.createdTables.length) created.push(`Tables: ${r.createdTables.join(', ')}`);
  if (r.createdViews.length) created.push(`Views: ${r.createdViews.join(', ')}`);
  if (r.createdFunctions.length) created.push(`Funcs: ${r.createdFunctions.join(', ')}`);

  console.log(`[${r.file}]`);
  if (flags.length) console.log(`  Flags: ${flags.join(' | ')}`);
  if (created.length) console.log(`  Created: ${created.join(' | ')}`);
  if (!flags.length && !created.length) console.log(`  (Alters/Indexes/Triggers)`);
}
