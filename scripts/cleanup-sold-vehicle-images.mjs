#!/usr/bin/env node
import 'dotenv/config'
import { config as loadEnvFile } from 'dotenv'

// Root .env is loaded by dotenv/config. This project also keeps the server-only
// credentials in migrations/.env.local; use it only as a fallback and never log
// any secret value. Existing process environment variables take precedence.
loadEnvFile({ path: 'migrations/.env.local', override: false })

/**
 * Safely inventory, and optionally remove, Storage files belonging only to sold vehicles.
 *
 * Default: dry-run (no Storage mutation).
 * Dry run:  node scripts/cleanup-sold-vehicle-images.mjs --dry-run
 * Execute:  node scripts/cleanup-sold-vehicle-images.mjs --execute
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The service-role key is intentionally read only from the environment and is never
 * printed. This script never deletes database rows or writes vehicle_images metadata.
 */

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'vehicle-images'
const ROOT = 'vehicles/'
const MAX_BATCH_SIZE = 100
const args = process.argv.slice(2)
const mode = args.includes('--execute') ? 'execute' : 'dry-run'
const hasDryRunFlag = args.includes('--dry-run')

if (args.some((arg) => !['--execute', '--dry-run'].includes(arg))) {
  console.error('Usage: node scripts/cleanup-sold-vehicle-images.mjs [--dry-run|--execute]')
  process.exit(2)
}
if (mode === 'execute' && hasDryRunFlag) {
  console.error('Choose exactly one mode: --dry-run or --execute.')
  process.exit(2)
}

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.')
  process.exit(2)
}

// The server .env may use the REST endpoint. supabase-js needs the project URL.
const projectUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '')
const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isSafeSoldPath(path, soldId) {
  return typeof path === 'string'
    && path.startsWith(`${ROOT}${soldId}/`)
    && !path.includes('temp/')
    && !path.includes('\\')
    && !path.includes('//')
    && path.length > `${ROOT}${soldId}/`.length
}

function bytesToMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2)
}

function chunk(items, size) {
  const result = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

async function fetchSoldVehicles() {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('vehicles').select('id, status')
      .eq('status', 'sold').order('id').range(offset, offset + 499)
    if (error) throw new Error(`Fetching sold vehicles failed: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < 500) break
  }
  const invalid = rows.find((row) => !isUuid(row.id) || row.status !== 'sold')
  if (invalid) throw new Error(`Unexpected sold vehicle row: ${JSON.stringify(invalid)}`)
  return rows
}

async function fetchImageMetadata(soldIds) {
  if (soldIds.length === 0) return []

  const rows = []
  // The query is intentionally scoped by vehicle_id chunks. No database writes occur.
  for (const ids of chunk(soldIds, 100)) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from('vehicle_images')
        .select('id, vehicle_id, path, bucket, size_bytes, thumbnail')
        .eq('bucket', BUCKET).in('vehicle_id', ids)
        .order('id').range(offset, offset + 499)
      if (error) throw new Error(`Fetching image metadata failed: ${error.message}`)
      rows.push(...(data ?? []))
      if ((data?.length ?? 0) < 500) break
    }
  }
  return rows
}

function buildDeletionPlan(soldVehicles, metadataRows) {
  const soldIds = new Set(soldVehicles.map((vehicle) => vehicle.id))
  const files = new Map()
  const rejected = []

  for (const row of metadataRows) {
    if (!soldIds.has(row.vehicle_id)) {
      rejected.push(`vehicle_id is not in sold set: ${row.vehicle_id}`)
      continue
    }
    if (row.bucket !== BUCKET) {
      rejected.push(`unexpected bucket for ${row.path || '(empty path)'}: ${row.bucket}`)
      continue
    }

    const path = row.path
    if (!isSafeSoldPath(path, row.vehicle_id)) {
      rejected.push(`unsafe path rejected: ${path || '(empty path)'}`)
      continue
    }

    if (!files.has(path)) {
      files.set(path, {
        path,
        vehicleId: row.vehicle_id,
        sizeBytes: Number.isFinite(row.size_bytes) ? Number(row.size_bytes) : 0,
      })
    }

    // A thumbnail may be a separate physical Storage object. Include it only when
    // the metadata value is a relative path or a URL whose path is under the same
    // exact sold-vehicle prefix. Metadata itself is never modified.
    if (typeof row.thumbnail === 'string' && row.thumbnail.trim()) {
      const thumbnailPath = extractStoragePath(row.thumbnail)
      if (thumbnailPath && thumbnailPath !== path) {
        if (!isSafeSoldPath(thumbnailPath, row.vehicle_id)) {
          rejected.push(`unsafe thumbnail path rejected: ${thumbnailPath}`)
        } else if (!files.has(thumbnailPath)) {
          files.set(thumbnailPath, { path: thumbnailPath, vehicleId: row.vehicle_id, sizeBytes: 0 })
        }
      }
    }
  }

  if (rejected.length > 0) {
    throw new Error(`Safety validation rejected ${rejected.length} metadata path(s):\n${rejected.join('\n')}`)
  }
  return [...files.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function extractStoragePath(value) {
  const trimmed = value.trim()
  if (trimmed.startsWith(`${ROOT}`)) return trimmed
  try {
    const pathname = new URL(trimmed).pathname
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const index = pathname.indexOf(marker)
    return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null
  } catch {
    return null
  }
}

function printPlan(soldVehicles, files) {
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0)
  console.log(`Mode: ${mode === 'execute' ? 'EXECUTE' : 'DRY-RUN'}`)
  console.log(`Sold vehicles: ${soldVehicles.length}`)
  console.log(`Storage files planned: ${files.length}`)
  console.log(`Estimated size: ${bytesToMb(totalBytes)} MB`)
  console.log('Files:')
  for (const file of files) {
    const size = file.sizeBytes > 0 ? ` (${bytesToMb(file.sizeBytes)} MB)` : ''
    console.log(`- ${file.path}${size}`)
  }
}

function isStorageNotFound(error) {
  const status = Number(error?.statusCode ?? error?.status ?? 0)
  return status === 404 || /not found|does not exist/i.test(String(error?.message ?? ''))
}

async function verifyDeleted(paths) {
  const failures = []
  for (const path of paths) {
    const { error } = await supabase.storage.from(BUCKET).download(path)
    if (!error) {
      failures.push(`${path}: still downloadable`)
    } else if (isStorageNotFound(error)) {
      console.log(`Verified absent: ${path}`)
    } else {
      failures.push(`${path}: verification error: ${error.message}`)
    }
  }
  if (failures.length > 0) {
    throw new Error(`Post-delete verification failed:\n${failures.join('\n')}`)
  }
}

async function executeDeletion(files) {
  const paths = files.map((file) => file.path)
  let deleted = 0

  for (const batch of chunk(paths, MAX_BATCH_SIZE)) {
    console.log(`Deleting batch of ${batch.length} file(s)...`)
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      console.error(`Deletion stopped after ${deleted} file(s): ${error.message}`)
      throw error
    }
    const removed = data?.length ?? batch.length
    deleted += removed
    console.log(`Batch succeeded: ${removed} file(s)`)
  }

  await verifyDeleted(paths)
  console.log(`Deletion complete and verified: ${deleted} file(s)`)
}

async function main() {
  const soldVehicles = await fetchSoldVehicles()
  const metadataRows = await fetchImageMetadata(soldVehicles.map((vehicle) => vehicle.id))
  const files = buildDeletionPlan(soldVehicles, metadataRows)
  printPlan(soldVehicles, files)

  if (mode === 'dry-run') {
    console.log('\nDry-run only: no Storage files or database records were changed.')
    return
  }

  if (files.length === 0) {
    console.log('Nothing to delete.')
    return
  }
  await executeDeletion(files)
  console.log('Database records were not modified.')
}

main().catch((error) => {
  console.error(`\nABORTED: ${error.message}`)
  process.exitCode = 1
})
