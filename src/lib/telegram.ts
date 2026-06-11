/**
 * Telegram Bot API helper + initData verification
 * Works on Cloudflare Workers (Web Crypto API)
 */

import { env } from "cloudflare:workers"

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN ?? ""

async function telegramApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ ok: boolean; result?: unknown; error?: string }>
}

export async function sendChatJoinRequestWebApp(
  chatId: number,
  userId: number,
  url: string,
  queryId: string
) {
  return telegramApi("sendChatJoinRequestWebApp", {
    chat_id: chatId,
    user_id: userId,
    url: `${url}?q=${queryId}`,
  })
}

export async function answerChatJoinRequestQuery(
  queryId: string,
  approved: boolean,
  error?: string
) {
  const body: Record<string, unknown> = {
    query_id: queryId,
    approved,
  }
  if (!approved && error) {
    body.error = error
  }
  return telegramApi("answerChatJoinRequestQuery", body)
}

export async function sendMessage(chatId: number, text: string) {
  return telegramApi("sendMessage", { chat_id: chatId, text })
}

/* ─────────── initData verification (Web Crypto API) ─────────── */

/**
 * Validates Telegram WebApp initData using HMAC-SHA256
 * via the Web Crypto API (works on Cloudflare Workers, Node, Deno, Bun)
 */
export async function verifyInitData(initData: string): Promise<boolean> {
  if (!initData || !BOT_TOKEN) return false

  const urlParams = new URLSearchParams(initData)
  const hash = urlParams.get("hash")
  if (!hash) return false
  urlParams.delete("hash")

  // Sort keys and build data-check-string
  const keys = Array.from(urlParams.keys()).sort()
  const dataCheckString = keys
    .map((k) => {
      const v = urlParams.getAll(k)
      return v.length === 1 ? `${k}=${v[0]}` : `${k}=${v.join(",")}`
    })
    .join("\n")

  const encoder = new TextEncoder()

  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const secretKeySignature = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(BOT_TOKEN))

  // hash = HMAC-SHA256(secret_key, data_check_string)
  const hashKey = await crypto.subtle.importKey(
    "raw",
    secretKeySignature,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const hashSignature = await crypto.subtle.sign("HMAC", hashKey, encoder.encode(dataCheckString))

  const computedHash = Array.from(new Uint8Array(hashSignature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return computedHash === hash
}

export function parseInitData(initData: string): Record<string, string | string[]> {
  const urlParams = new URLSearchParams(initData)
  const result: Record<string, string | string[]> = {}
  for (const [key, value] of urlParams.entries()) {
    const existing = result[key]
    if (existing === undefined) {
      result[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      result[key] = [existing, value]
    }
  }
  return result
}

export function getUserFromInitData(initData: string): {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
} | null {
  const parsed = parseInitData(initData)
  const userStr = parsed.user
  if (!userStr || typeof userStr !== "string") return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}
