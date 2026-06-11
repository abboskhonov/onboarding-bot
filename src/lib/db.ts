import { env } from "cloudflare:workers"

export interface JoinRequest {
  id: string
  chat_id: number
  user_id: number
  user_name: string
  query_id: string
  status: "pending" | "approved" | "declined"
  answers: string
  agreed_to_terms: number
  created_at: string
  updated_at: string
}

export async function initDb() {
  const db = env.DB
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT,
      query_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      answers TEXT DEFAULT '{}',
      agreed_to_terms INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_chat_user ON join_requests(chat_id, user_id)`).run()
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_query ON join_requests(query_id)`).run()
  return db
}

export async function createJoinRequest(data: {
  id: string
  chat_id: number
  user_id: number
  user_name?: string
  query_id: string
}) {
  const db = env.DB
  await db
    .prepare(
      `INSERT INTO join_requests (id, chat_id, user_id, user_name, query_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    )
    .bind(data.id, data.chat_id, data.user_id, data.user_name ?? "", data.query_id)
    .run()
  return data.id
}

export async function getJoinRequestByQueryId(
  query_id: string
): Promise<JoinRequest | null> {
  const db = env.DB
  const row = await db
    .prepare("SELECT * FROM join_requests WHERE query_id = ?")
    .bind(query_id)
    .first<JoinRequest>()
  return row ?? null
}

export async function updateJoinRequestStatus(
  query_id: string,
  status: "approved" | "declined",
  answers?: Record<string, string>,
  agreed_to_terms?: boolean
) {
  const db = env.DB
  await db
    .prepare(
      `UPDATE join_requests
       SET status = ?,
           answers = ?,
           agreed_to_terms = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE query_id = ?`
    )
    .bind(
      status,
      answers ? JSON.stringify(answers) : "{}",
      agreed_to_terms ? 1 : 0,
      query_id
    )
    .run()
}

export async function getJoinRequestStats(chat_id: number) {
  const db = env.DB
  const total = await db
    .prepare("SELECT COUNT(*) as count FROM join_requests WHERE chat_id = ?")
    .bind(chat_id)
    .first<{ count: number }>()
  const pending = await db
    .prepare(
      "SELECT COUNT(*) as count FROM join_requests WHERE chat_id = ? AND status = 'pending'"
    )
    .bind(chat_id)
    .first<{ count: number }>()
  return { total: total?.count ?? 0, pending: pending?.count ?? 0 }
}
