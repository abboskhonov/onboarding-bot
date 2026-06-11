import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Copy, Shield } from "lucide-react"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN || ""
  const webAppUrl = import.meta.env.WEB_APP_URL || ""
  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/webhook`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex min-h-svh flex-col items-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Telegram Guardian Bot</h1>
            <p className="text-sm text-slate-500">Custom onboarding & verification mini-app</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>Follow these steps to get your guardian bot running.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Step number={1} title="Set your bot token">
              <p className="text-sm text-slate-600">
                Add your Telegram bot token to the <code>.env</code> file. Get one from{" "}
                <a href="https://t.me/BotFather" className="text-blue-600 underline">@BotFather</a>.
              </p>
            </Step>

            <Step number={2} title="Set your public URL">
              <p className="text-sm text-slate-600">
                Update <code>WEB_APP_URL</code> in your <code>.env</code> to point to this app.
              </p>
            </Step>

            <Step number={3} title="Set the webhook">
              <p className="text-sm text-slate-600">
                Tell Telegram where to send updates. Run this command:
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-mono">
                <code className="flex-1 truncate">
                  curl -X POST "https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook" -d "url={webhookUrl}"
                </code>
                <button
                  onClick={() => copyToClipboard(`curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=${webhookUrl}"`)}
                  className="text-slate-500 hover:text-slate-900"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </Step>

            <Step number={4} title="Add bot to your group">
              <p className="text-sm text-slate-600">
                Add the bot as an admin with the <strong>Invite Users</strong> permission. Enable <strong>Approve New Members</strong> in group settings.
              </p>
            </Step>

            <Step number={5} title="Test it">
              <p className="text-sm text-slate-600">
                Ask someone to request to join the group. They should see the onboarding mini-app before being approved.
              </p>
            </Step>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Bot Token:</span>
              <span className="font-mono">
                {botToken ? "✅ Set" : "❌ Not set"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Web App URL:</span>
              <span className="font-mono">
                {webAppUrl || "Not set"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Webhook Endpoint:</span>
              <span className="font-mono">{webhookUrl}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <a href="/verify">
            <Button variant="outline">Preview Mini App</Button>
          </a>
          <a href="/api/verify">
            <Button variant="outline">API Endpoint</Button>
          </a>
        </div>
      </div>
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
        {number}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    </div>
  )
}
