"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api } from "@/lib/api"

export default function VerifyEmailPendingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const sent = searchParams.get("sent") !== "0"

  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const introMessage = useMemo(() => {
    if (!email) {
      return "Your account needs email verification before you can continue."
    }
    return sent
      ? `We sent a verification link to ${email}.`
      : `Your account was created for ${email}, but the verification email was not sent automatically.`
  }, [email, sent])

  const handleResend = async () => {
    if (!email) {
      setError("We need your email address to resend the verification link.")
      return
    }

    setError("")
    setSuccess("")
    setResendLoading(true)
    try {
      const response = await api.resendVerificationEmail(email)
      setSuccess(response.message)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Could not resend verification email.")
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-lg bg-card/90 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardHeader className="space-y-3">
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>{introMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You must verify your email before signing in or using the app.
            </AlertDescription>
          </Alert>

          {success && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={handleResend} disabled={resendLoading}>
              {resendLoading ? "Sending..." : "Resend verification email"}
            </Button>

            <Button variant="outline" onClick={() => router.push(`/login?mode=login${email ? `&email=${encodeURIComponent(email)}` : ""}`)}>
              Back to sign in
            </Button>

            <Button variant="ghost" asChild>
              <Link href="/login?mode=signup">Change email / create a different account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
