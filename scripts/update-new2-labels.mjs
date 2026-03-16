import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    for (const rawLine of envContent.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {}
}

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const updates = [
  ['koristamaasjad', 'korista asjad'],
  ['koristamänguasjad', 'korista mänguasjad'],
  ['lauatahaõppima', 'laua taha õppima'],
  ['loeraamatut', 'loe raamatut'],
  ['mänguasjadkokku', 'mänguasjad kokku'],
  ['õpimekoos', 'õpime koos'],
  ['õppimekoos', 'õppime koos'],
  ['õppimiseaeg', 'õppimise aeg'],
  ['raamatutlugema', 'raamatut lugema'],
  ['voodikorda', 'voodi korda'],
  ['voodikordapanema', 'voodi korda panema'],
];

for (const [from, to] of updates) {
  const { error } = await supabase.from('pictograms').update({ label_et: to }).eq('label_et', from);
  if (error) {
    console.error(`[FAIL] ${from} -> ${to}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] ${from} -> ${to}`);
  }
}
