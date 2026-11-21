import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

// Defense in depth: even direct table reads cannot disclose profile or plan data.
// The server-only key is never included in the client bundle. Scope every sealed
// value to its workspace and field so it cannot be copied between accounts.
const fields = ['profile', 'months', 'rules', 'scenarios']
function keyFor(id) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Private storage key unavailable')
  return hkdfSync('sha256', Buffer.from(secret), Buffer.from('LeanMonth-v1'), Buffer.from(id), 32)
}
export function sealFields(input, id) {
  const out = { ...input }, key = keyFor(id)
  for (const field of fields) {
    if (!(field in input)) continue
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from(`${id}:${field}:v1`))
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(input[field]), 'utf8'), cipher.final()])
    out[field] = { v: 1, sealed: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64') }
  }
  return out
}
export function openFields(input, id) {
  const out = { ...input }, key = keyFor(id)
  for (const field of fields) {
    const record = input[field]
    if (!record || record.v !== 1 || typeof record.sealed !== 'string') throw new Error('Invalid private record')
    const packed = Buffer.from(record.sealed, 'base64')
    const decipher = createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12))
    decipher.setAAD(Buffer.from(`${id}:${field}:v1`))
    decipher.setAuthTag(packed.subarray(12, 28))
    out[field] = JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8'))
  }
  return out
}
