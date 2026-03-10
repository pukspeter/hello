import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, basename, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadDotEnv();

const args = parseArgs(process.argv.slice(2));
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pictograms';
const DEFAULT_IMPORT_DIR = resolve(homedir(), 'Documents', 'pictograms');
const DEFAULT_NEW_CATEGORY_NAME = 'Imporditud';
const importDirectory = resolve(
  args.importDirectory || process.env.PICTOGRAM_IMPORT_DIR || DEFAULT_IMPORT_DIR
);
const createMissing = args.createMissing;
const defaultCategoryName =
  args.defaultCategoryName || process.env.PICTOGRAM_IMPORT_DEFAULT_CATEGORY || DEFAULT_NEW_CATEGORY_NAME;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const summary = {
  failed: 0,
  matched: 0,
  skipped: 0,
  uploaded: 0,
};

try {
  const files = await getImportFiles(importDirectory);

  if (files.length === 0) {
    console.log(`No supported image files found in ${importDirectory}`);
    process.exit(0);
  }

  const pictograms = await loadPictograms();
  const categoryId = createMissing ? await ensureCategory(defaultCategoryName) : null;
  const matchesBySlug = buildMatchIndex(pictograms);
  let nextSortOrder = getNextSortOrder(pictograms);

  console.log(`Import directory: ${importDirectory}`);
  console.log(`Storage bucket: ${SUPABASE_STORAGE_BUCKET}`);
  if (createMissing) {
    console.log(`Create missing pictograms: yes (${defaultCategoryName})`);
  }
  console.log(`Found ${files.length} candidate files.\n`);

  for (const file of files) {
    const fileSlug = toSlug(basename(file.name, extname(file.name)));

    if (!fileSlug) {
      summary.skipped += 1;
      console.log(`[SKIP] ${file.name} -> file name did not produce a usable slug`);
      continue;
    }

    const matches = matchesBySlug.get(fileSlug) ?? [];
    const resolvedMatch = resolveMatch(matches);

    if (!resolvedMatch) {
      if (matches.length > 1) {
        summary.failed += 1;
        console.log(
          `[FAIL] ${file.name} -> ambiguous slug "${fileSlug}" matched ${matches.length} pictograms`
        );
        continue;
      }

      if (!createMissing || !categoryId) {
        summary.skipped += 1;
        console.log(`[SKIP] ${file.name} -> no pictogram match for slug "${fileSlug}"`);
        continue;
      }
    }

    const pictogram =
      resolvedMatch ??
      (await createMissingPictogram({
        categoryId,
        fileName: file.name,
        sortOrder: nextSortOrder++,
      }));

    if (!resolvedMatch) {
      const createdSlug = toSlug(pictogram.label_et);
      const existingMatches = matchesBySlug.get(createdSlug) ?? [];
      matchesBySlug.set(createdSlug, [...existingMatches, pictogram]);
      console.log(`[CREATE] ${file.name} -> created pictogram "${pictogram.label_et}"`);
    }

    summary.matched += 1;
    console.log(`[MATCH] ${file.name} -> ${pictogram.label_et} (${pictogram.id})`);

    try {
      const buffer = await readFile(resolve(importDirectory, file.name));
      const extension = extname(file.name).toLowerCase();
      const objectPath = `batch-import/${pictogram.id}/${fileSlug}${extension}`;
      const contentType = getContentType(extension);

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(objectPath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(objectPath);

      const imageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('pictograms')
        .update({ image_url: imageUrl })
        .eq('id', pictogram.id);

      if (updateError) {
        throw new Error(`database update failed: ${updateError.message}`);
      }

      summary.uploaded += 1;
      console.log(
        `[OK] ${file.name} -> ${pictogram.label_et} (${pictogram.id}) -> updated image_url`
      );
    } catch (error) {
      summary.failed += 1;
      console.log(
        `[FAIL] ${file.name} -> ${pictogram.label_et}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  console.log('\nSummary');
  console.log(`Matched: ${summary.matched}`);
  console.log(`Uploaded: ${summary.uploaded}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Import failed.');
  process.exit(1);
}

async function getImportFiles(directoryPath) {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Could not read import folder ${directoryPath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({ name: entry.name }))
    .filter((entry) => ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

async function loadPictograms() {
  const { data, error } = await supabase
    .from('pictograms')
    .select('id, label_et, image_url, is_custom, sort_order')
    .order('label_et');

  if (error) {
    throw new Error(`Could not load pictograms: ${error.message}`);
  }

  return data ?? [];
}

function buildMatchIndex(pictograms) {
  const index = new Map();

  for (const pictogram of pictograms) {
    const slug = toSlug(pictogram.label_et);
    const matches = index.get(slug) ?? [];
    matches.push(pictogram);
    index.set(slug, matches);
  }

  return index;
}

function getNextSortOrder(pictograms) {
  return (
    pictograms.reduce((max, pictogram) => Math.max(max, pictogram.sort_order ?? 0), 0) + 1
  );
}

function resolveMatch(matches) {
  if (matches.length === 1) {
    return matches[0];
  }

  const defaultMatches = matches.filter((match) => match.is_custom === false);

  if (defaultMatches.length === 1) {
    return defaultMatches[0];
  }

  return null;
}

async function ensureCategory(categoryName) {
  const normalizedCategoryName = categoryName.trim();

  if (!normalizedCategoryName) {
    throw new Error('Default category name for missing pictograms is empty.');
  }

  const { data: existingCategory, error: existingError } = await supabase
    .from('pictogram_categories')
    .select('id')
    .eq('name', normalizedCategoryName)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check pictogram category: ${existingError.message}`);
  }

  if (existingCategory?.id) {
    return existingCategory.id;
  }

  const { data: lastCategory, error: lastCategoryError } = await supabase
    .from('pictogram_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCategoryError) {
    throw new Error(`Could not read category sort order: ${lastCategoryError.message}`);
  }

  const nextSortOrder = (lastCategory?.sort_order ?? 0) + 1;
  const { data: createdCategory, error: createError } = await supabase
    .from('pictogram_categories')
    .insert({
      name: normalizedCategoryName,
      sort_order: nextSortOrder,
    })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Could not create pictogram category: ${createError.message}`);
  }

  return createdCategory.id;
}

async function createMissingPictogram({ categoryId, fileName, sortOrder }) {
  const label = toLabelFromFileName(fileName);

  if (!label) {
    throw new Error(`Could not derive pictogram label from file name "${fileName}"`);
  }

  const { data, error } = await supabase
    .from('pictograms')
    .insert({
      category_id: categoryId,
      is_custom: false,
      is_enabled: true,
      label_et: label,
      sort_order: sortOrder,
    })
    .select('id, label_et, image_url, is_custom, sort_order')
    .single();

  if (error) {
    throw new Error(`Could not create missing pictogram "${label}": ${error.message}`);
  }

  return data;
}

function toSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toLabelFromFileName(fileName) {
  return basename(fileName, extname(fileName))
    .normalize('NFC')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getContentType(extension) {
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function loadDotEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');

    for (const rawLine of envContent.split('\n')) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Missing .env is allowed; validation happens above.
  }
}

function parseArgs(argv) {
  const result = {
    createMissing: false,
    defaultCategoryName: '',
    importDirectory: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--create-missing') {
      result.createMissing = true;
      continue;
    }

    if (arg.startsWith('--default-category=')) {
      result.defaultCategoryName = arg.slice('--default-category='.length);
      continue;
    }

    if (arg === '--default-category') {
      result.defaultCategoryName = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (!arg.startsWith('--') && !result.importDirectory) {
      result.importDirectory = arg;
    }
  }

  return result;
}
