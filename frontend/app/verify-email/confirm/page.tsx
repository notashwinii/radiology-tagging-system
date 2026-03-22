"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api } from "@/lib/api"

export default function VerifyEmailConfirmPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")
  const [verifiedEmail, setVerifiedEmail] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError("Verification token is missing.")
        setLoading(false)
        return
      }

      try {
        const response = await api.verifyEmail(token)
        setSuccessMessage(response.message)
        setVerifiedEmail(response.email)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("We could not verify your email.")
        }
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-lg bg-card/90 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardHeader className="space-y-3">
          <CardTitle>Email verification</CardTitle>
          <CardDescription>
            {loading ? "We are validating your verification link." : "Verification status is ready."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <Alert>
              <AlertDescription>Verifying your email now...</AlertDescription>
            </Alert>
          )}

          {!loading && successMessage && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
            </Alert>
          )}

          {!loading && error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && successMessage && (
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href={`/login?mode=login&verified=1${verifiedEmail ? `&email=${encodeURIComponent(verifiedEmail)}` : ""}`}>
                  Continue to sign in
                </Link>
              </Button>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href={`/verify-email/pending${verifiedEmail ? `?email=${encodeURIComponent(verifiedEmail)}` : ""}`}>
                  Go to verification help
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login?mode=login">Back to sign in</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
