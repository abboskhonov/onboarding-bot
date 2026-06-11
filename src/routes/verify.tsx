import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react"

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
})

const QUESTIONS = [
  {
    id: "name",
    label: "What is your name?",
    type: "text" as const,
    placeholder: "Enter your full name",
    required: true,
  },
  {
    id: "reason",
    label: "Why do you want to join this group?",
    type: "textarea" as const,
    placeholder: "Tell us a bit about yourself and why you want to join...",
    required: true,
  },
  {
    id: "experience",
    label: "How did you hear about this group?",
    type: "text" as const,
    placeholder: "e.g. Friend, social media, search...",
    required: true,
  },
]

const TERMS_TEXT = `
TERMS OF SERVICE

1. Respect all members
   Treat everyone with kindness and respect. No harassment, bullying, or hate speech.

2. No spam or self-promotion
   Do not post unsolicited advertisements, spam, or repetitive content.

3. Stay on topic
   Keep discussions relevant to the group's purpose.

4. No illegal content
   Do not share or request content that violates laws or Telegram's terms.

5. Privacy
   Do not share private information of others without consent.

6. Admin decisions
   Admins have the final say on all moderation decisions.

7. Violations
   Violations may result in warnings, mutes, or permanent removal.

By checking the box below, you agree to abide by these terms.
`

function VerifyPage() {
  const [queryId, setQueryId] = useState<string | null>(null)
  const [initData, setInitData] = useState<string>("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "approved" | "declined" | "error">("idle")
  const [message, setMessage] = useState("")
  const [telegramUser, setTelegramUser] = useState<{ first_name?: string } | null>(null)

  useEffect(() => {
    // Read query_id from URL
    const urlParams = new URLSearchParams(window.location.search)
    const q = urlParams.get("q")
    if (q) setQueryId(q)

    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()
      tg.setHeaderColor("#f8fafc")
      tg.setBackgroundColor("#f8fafc")
      tg.enableClosingConfirmation()

      const data = tg.initData
      setInitData(data)
      setTelegramUser(tg.initDataUnsafe.user || null)

      // Use MainButton for submit
      tg.MainButton.setParams({
        text: "Submit Application",
        color: "#0f172a",
        text_color: "#ffffff",
        is_active: false,
        is_visible: false,
      })
    }
  }, [])

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const isFormValid = useCallback(() => {
    const allRequiredAnswered = QUESTIONS.every(
      (q) => !q.required || (answers[q.id]?.trim() || "").length > 0
    )
    return allRequiredAnswered && agreed
  }, [answers, agreed])

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      if (isFormValid()) {
        tg.MainButton.setParams({ is_active: true, is_visible: true })
      } else {
        tg.MainButton.setParams({ is_active: false, is_visible: false })
      }
    }
  }, [isFormValid])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    const onClick = () => handleSubmit()
    tg.MainButton.onClick(onClick)
    return () => {
      tg.MainButton.offClick(onClick)
    }
  }, [queryId, answers, agreed, initData])

  const handleSubmit = async () => {
    if (!isFormValid()) return
    if (!queryId) {
      setStatus("error")
      setMessage("Missing query ID. Please restart the application.")
      return
    }

    setStatus("submitting")

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_id: queryId,
          answers,
          agreed_to_terms: agreed,
          initData,
        }),
      })

      const data = (await res.json()) as {
        ok: boolean
        result?: string
        message?: string
        error?: string
      }

      if (data.ok && data.result === "approved") {
        setStatus("approved")
        setMessage(data.message || "Welcome to the group!")
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.MainButton.hide()
        }
      } else if (data.ok && data.result === "declined") {
        setStatus("declined")
        setMessage(data.message || "You must agree to the Terms of Service.")
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.MainButton.hide()
        }
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch {
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Group Verification
            </h1>
            <p className="text-sm text-slate-500">
              {telegramUser?.first_name
                ? `Hello, ${telegramUser.first_name}!`
                : "Complete the steps below to join."}
            </p>
          </div>
        </div>

        {/* Success / Declined States */}
        {status === "approved" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <CardTitle className="text-center text-green-800">
                You&apos;re In!
              </CardTitle>
              <CardDescription className="text-center text-green-700">
                {message}
              </CardDescription>
              <Button
                className="mt-2 bg-green-700 hover:bg-green-800"
                onClick={() => window.Telegram?.WebApp?.close()}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "declined" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <XCircle className="h-12 w-12 text-red-600" />
              <CardTitle className="text-center text-red-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-center text-red-700">
                {message}
              </CardDescription>
              <Button
                variant="outline"
                className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => {
                  setStatus("idle")
                  setAgreed(false)
                }}
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        {status !== "approved" && status !== "declined" && (
          <>
            {/* Questions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About You</CardTitle>
                <CardDescription>
                  Please answer a few questions so we know you&apos;re a real person.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {QUESTIONS.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label htmlFor={q.id}>
                      {q.label}
                      {q.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </Label>
                    {q.type === "textarea" ? (
                      <Textarea
                        id={q.id}
                        placeholder={q.placeholder}
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          handleAnswerChange(q.id, e.target.value)
                        }
                        rows={3}
                        disabled={status === "submitting"}
                      />
                    ) : (
                      <Input
                        id={q.id}
                        placeholder={q.placeholder}
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          handleAnswerChange(q.id, e.target.value)
                        }
                        disabled={status === "submitting"}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Terms Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms of Service</CardTitle>
                <CardDescription>
                  Please read the rules carefully before joining.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 rounded-md border bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  <div className="whitespace-pre-wrap">{TERMS_TEXT}</div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(checked) =>
                      setAgreed(checked === true)
                    }
                    disabled={status === "submitting"}
                  />
                  <Label
                    htmlFor="terms"
                    className="cursor-pointer text-sm font-normal leading-snug text-slate-700"
                  >
                    I have read and agree to the Terms of Service and group
                    rules. I understand that violations may result in removal
                    from the group.
                  </Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!isFormValid() || status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit & Join Group"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </>
        )}

        {/* Error Toast */}
        {status === "error" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-center text-sm font-medium text-red-700">
                {message}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
