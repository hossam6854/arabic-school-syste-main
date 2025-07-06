"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { ResetAuthButton } from "@/components/reset-auth-button"

function LoginSuccessAlert({ setSuccessMessage }: { setSuccessMessage: (msg: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const registered = searchParams.get('registered')
    if (registered === 'true') {
      setSuccessMessage("تم إنشاء الحساب بنجاح. جميع الحسابات الجديدة تحتاج إلى موافقة الإدارة قبل أن تتمكن من تسجيل الدخول. سيتم إبلاغك عندما يتم تأكيد حسابك.")
    }
  }, [searchParams, setSuccessMessage])

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

      if (!formData.email || !formData.password) {
        setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور")
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (signInError) {
        setError(signInError.message || "فشل تسجيل الدخول. الرجاء التحقق من البيانات")
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError("فشل إنشاء جلسة. يرجى المحاولة مرة أخرى")
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id, is_confirmed")
        .eq("id", session.user.id)
        .single()

      if (userError || !userData) {
        setError("حدث خطأ في جلب بيانات المستخدم. يرجى المحاولة مرة أخرى")
        return
      }

      if (!userData.is_confirmed) {
        await supabase.auth.signOut()
        setError("حسابك بحاجة إلى موافقة الإدارة قبل تسجيل الدخول")
        return
      }

      const dashboardPaths = {
        1: "/student",
        2: "/parent",
        3: "/teacher",
        4: "/admin",
      }

      const redirectTo = dashboardPaths[userData.role_id as keyof typeof dashboardPaths] || "/"

      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "جاري تحويلك إلى لوحة التحكم...",
      })

      router.push(redirectTo)

    } catch (error: any) {
      setError(error.message || "حدث خطأ أثناء تسجيل الدخول")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="max-w-md w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl mb-2">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ✅ حل مشكلة useSearchParams عبر Suspense */}
          <Suspense fallback={null}>
            <LoginSuccessAlert setSuccessMessage={setSuccessMessage} />
          </Suspense>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert className="bg-green-50 border border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleClientLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                name="email"
                placeholder="example@example.com"
                required
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </span>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            ليس لديك حساب؟{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              إنشاء حساب جديد
            </Link>
          </div>
          <ResetAuthButton className="mt-2" />
        </CardFooter>
      </Card>
    </div>
  )
}
