import type { Attempt } from '../types'

const KEY = 'gimal-gongchaek-v1'
const SESSION_KEY = 'gimal-gongchaek-session'
const DB_NAME = 'gimal-gongchaek'
const STORE = 'photos'

type Store = { attempts: Attempt[] }

export function loadAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Store
    return Array.isArray(parsed.attempts) ? parsed.attempts : []
  } catch {
    return []
  }
}

export function saveAttempt(attempt: Attempt): Attempt[] {
  const attempts = [attempt, ...loadAttempts()].slice(0, 80)
  localStorage.setItem(KEY, JSON.stringify({ attempts } satisfies Store))
  return attempts
}

export function clearAttempts(): void {
  localStorage.removeItem(KEY)
}

export function loadSessionRaw(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSessionRaw(value: string | null): void {
  try {
    if (!value) sessionStorage.removeItem(SESSION_KEY)
    else sessionStorage.setItem(SESSION_KEY, value)
  } catch {
    // 사진이 크면 세션 저장만 건너뜁니다.
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePhotos(attemptId: string, photos: string[]): Promise<void> {
  if (photos.length === 0) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(photos, attemptId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadPhotos(attemptId: string): Promise<string[]> {
  const db = await openDb()
  const photos = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(attemptId)
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return photos
}
