#!/usr/bin/env node
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'pictograms';
const DEFAULT_IMPORT_DIR = process.env.PICTOGRAM_IMPORT_DIR || path.join(os.homedir(), 'Documents', 'pictograms');
const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const raw = fsSync.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index === -1) continue;
      const key = line.slice(0, index).trim();
      if (!key || process.env[key] !== undefined) continue;
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // .env is optional
  }
}

function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const result = {
    importDir: DEFAULT_IMPORT_DIR,
    csvPath: null,
    bucket: DEFAULT_BUCKET,
  };

  for (const arg of argv) {
    if (arg.startsWith('--csv=')) {
      result.csvPath = arg.slice('--csv='.length);
      continue;
    }

    if (arg.startsWith('--bucket=')) {
      result.bucket = arg.slice('--bucket='.length) || DEFAULT_BUCKET;
      continue;
    }

    if (!arg.startsWith('--') && result.importDir === DEFAULT_IMPORT_DIR) {
      result.importDir = arg;
    }
  }

  if (!result.csvPath) {
    result.csvPath = path.join(result.importDir, 'pictograms.csv');
  }

  return result;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .filter((values) => values.some((value) => value.trim() !== ''))
    .map((values, index) => {
      const record = { __row: index + 2 };
      headers.forEach((header, headerIndex) => {
        record[header] = (values[headerIndex] || '').trim();
      });
      return record;
    });
}

async function ensureImportDir(importDir) {
  const stats = await fs.stat(importDir).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Import directory not found: ${importDir}`);
  }
}

async function ensureCsv(csvPath) {
  const stats = await fs.stat(csvPath).catch(() => null);
  if (!stats || !stats.isFile()) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
}

async function findImageFile(importDir, slug) {
  const normalizedSlug = slugify(slug);

  for (const extension of SUPPORTED_IMAGE_EXTENSIONS) {
    const candidate = path.join(importDir, `${slug}${extension}`);
    const stats = await fs.stat(candidate).catch(() => null);
    if (stats?.isFile()) {
      return candidate;
    }
  }

  const entries = await fs.readdir(importDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
      continue;
    }

    const basename = path.basename(entry.name, extension);
    if (slugify(basename) === normalizedSlug) {
      return path.join(importDir, entry.name);
    }
  }

  return null;
}

async function ensureCategory(supabase, cache, categoryName) {
  if (cache.has(categoryName)) {
    return cache.get(categoryName);
  }

  const { data: existing, error: selectError } = await supabase
    .from('pictogram_categories')
    .select('id, name')
    .eq('name', categoryName)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing?.id) {
    cache.set(categoryName, existing.id);
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from('pictogram_categories')
    .insert({ name: categoryName })
    .select('id')
    .single();

  if (insertError) throw insertError;
  cache.set(categoryName, created.id);
  return created.id;
}

async function listPictograms(supabase) {
  const { data, error } = await supabase
    .from('pictograms')
    .select('id, label_et, image_url, category_id, is_custom, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

function buildPictogramIndex(pictograms) {
  const index = new Map();
  for (const pictogram of pictograms) {
    index.set(slugify(pictogram.label_et), pictogram);
  }
  return index;
}

async function uploadImage(supabase, bucket, filePath, slug) {
  const fileBuffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const storagePath = `imports/${slug}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg',
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return publicUrlData.publicUrl;
}

async function main() {
  loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const args = parseArgs(process.argv.slice(2));
  await ensureImportDir(args.importDir);
  await ensureCsv(args.csvPath);

  const csvText = await fs.readFile(args.csvPath, 'utf8');
  const rows = parseCsv(csvText);
  const requiredColumns = ['slug', 'label_et', 'category', 'uploaded'];
  const missingColumns = requiredColumns.filter((column) => !rows[0] ? true : !(column in rows[0]));
  if (missingColumns.length > 0) {
    throw new Error(`CSV missing required columns: ${missingColumns.join(', ')}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const categoriesCache = new Map();
  const pictograms = await listPictograms(supabase);
  const pictogramIndex = buildPictogramIndex(pictograms);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Import directory: ${args.importDir}`);
  console.log(`CSV file: ${args.csvPath}`);
  console.log(`Storage bucket: ${args.bucket}`);
  console.log(`Found ${rows.length} CSV rows.`);

  for (const row of rows) {
    const sourceSlug = slugify(row.slug);
    const labelEt = row.label_et.trim();
    const categoryName = row.category.trim();

    if (!sourceSlug || !labelEt || !categoryName) {
      skipped += 1;
      console.log(`[SKIP] row ${row.__row} -> missing slug, label_et or category`);
      continue;
    }

    try {
      const categoryId = await ensureCategory(supabase, categoriesCache, categoryName);
      const existing = pictogramIndex.get(sourceSlug) || null;
      const imageFile = await findImageFile(args.importDir, sourceSlug);

      let pictogram = existing;
      let didCreate = false;
      let didUpdate = false;

      if (!pictogram) {
        const { data: createdPictogram, error: createError } = await supabase
          .from('pictograms')
          .insert({
            label_et: labelEt,
            category_id: categoryId,
            is_custom: false,
          })
          .select('id, label_et, image_url, category_id, is_custom, created_at')
          .single();

        if (createError) throw createError;
        pictogram = createdPictogram;
        pictogramIndex.set(sourceSlug, pictogram);
        created += 1;
        didCreate = true;
        console.log(`[CREATE] ${sourceSlug} -> ${labelEt} (${pictogram.id})`);
      }

      if (!didCreate && (pictogram.label_et !== labelEt || pictogram.category_id !== categoryId)) {
        const { data: updatedPictogram, error: updateError } = await supabase
          .from('pictograms')
          .update({
            label_et: labelEt,
            category_id: categoryId,
          })
          .eq('id', pictogram.id)
          .select('id, label_et, image_url, category_id, is_custom, created_at')
          .single();

        if (updateError) throw updateError;
        pictogram = updatedPictogram;
        pictogramIndex.set(sourceSlug, pictogram);
        updated += 1;
        didUpdate = true;
        console.log(`[UPDATE] ${sourceSlug} -> label/category updated`);
      }

      if (imageFile) {
        const publicUrl = await uploadImage(supabase, args.bucket, imageFile, sourceSlug);
        if (pictogram.image_url !== publicUrl) {
          const { data: updatedWithImage, error: imageUpdateError } = await supabase
            .from('pictograms')
            .update({ image_url: publicUrl })
            .eq('id', pictogram.id)
            .select('id, label_et, image_url, category_id, is_custom, created_at')
            .single();

          if (imageUpdateError) throw imageUpdateError;
          pictogram = updatedWithImage;
          pictogramIndex.set(sourceSlug, pictogram);
          if (!didCreate && !didUpdate) {
            updated += 1;
            didUpdate = true;
          }
        }
        console.log(`[UPLOAD] ${sourceSlug} -> ${path.basename(imageFile)}`);
      } else {
        skipped += 1;
        console.log(`[SKIP] ${sourceSlug} -> no image file found in import folder`);
      }

      if (!didCreate && !didUpdate && imageFile) {
        console.log(`[OK] ${sourceSlug} -> no data changes needed`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[FAIL] ${sourceSlug} -> ${message}`);
    }
  }

  console.log('\nSummary');
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
