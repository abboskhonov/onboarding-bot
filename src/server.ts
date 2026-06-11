import { createStartHandler } from "@tanstack/start-server-core"
import { defaultStreamHandler } from "@tanstack/react-start/server"
import { env } from "cloudflare:workers"

import { initDb, createJoinRequest, getJoinRequestByQueryId, updateJoinRequestStatus } from "./lib/db"
import { sendChatJoinRequestWebApp, verifyInitData, answerChatJoinRequestQuery } from "./lib/telegram"

const startHandler = createStartHandler(defaultStreamHandler)

async function handleWebhook(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const update = body as {
    chat_join_request?: {
      chat: { id: number; title?: string }
      from: { id: number; first_name?: string; last_name?: string; username?: string }
      query_id?: string
      date: number
    }
  }

  if (update.chat_join_request) {
    const req = update.chat_join_request
    const chatId = req.chat.id
    const userId = req.from.id
    const queryId = req.query_id
    const userName = req.from.username || `${req.from.first_name || ""} ${req.from.last_name || ""}`.trim()

    if (!queryId) {
      return Response.json({ ok: false, error: "Missing query_id" }, { status: 400 })
    }

    await initDb()

    const id = `${chatId}_${userId}_${Date.now()}`
    await createJoinRequest({
      id,
      chat_id: chatId,
      user_id: userId,
      user_name: userName,
      query_id: queryId,
    })

    const webAppUrl = env.WEB_APP_URL ?? "https://onboarding-bot.telecraft.workers.dev/verify"

    await sendChatJoinRequestWebApp(chatId, userId, webAppUrl, queryId)

    return Response.json({ ok: true, action: "webapp_opened", query_id: queryId })
  }

  return Response.json({ ok: true })
}

async function handleVerify(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { query_id, answers, agreed_to_terms, initData } = body as {
    query_id?: string
    answers?: Record<string, string>
    agreed_to_terms?: boolean
    initData?: string
  }

  if (!query_id) {
    return Response.json({ ok: false, error: "Missing query_id" }, { status: 400 })
  }

  const isValid = await verifyInitData(initData || "")
  if (!isValid) {
    return Response.json({ ok: false, error: "Invalid initData" }, { status: 403 })
  }

  const requestRecord = await getJoinRequestByQueryId(query_id)
  if (!requestRecord) {
    return Response.json({ ok: false, error: "Join request not found" }, { status: 404 })
  }

  if (requestRecord.status !== "pending") {
    return Response.json({ ok: false, error: "Already processed" }, { status: 409 })
  }

  if (!agreed_to_terms) {
    await updateJoinRequestStatus(query_id, "declined", answers, false)
    await answerChatJoinRequestQuery(query_id, false, "User did not agree to Terms of Service")
    return Response.json({
      ok: true,
      result: "declined",
      message: "You must agree to the Terms of Service to join the group.",
    })
  }

  await updateJoinRequestStatus(query_id, "approved", answers, true)
  await answerChatJoinRequestQuery(query_id, true)

  return Response.json({
    ok: true,
    result: "approved",
    message: "Welcome to the group! You have been approved.",
  })
}

export default {
  async fetch(request: Request, _env: unknown, _ctx: ExecutionContext) {
    const url = new URL(request.url)

    if (url.pathname === "/webhook" && request.method === "POST") {
      return handleWebhook(request)
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      return handleVerify(request)
    }

    return startHandler(request)
  },
}
