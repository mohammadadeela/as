import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { signInWithGoogle, signInWithFacebook } from "@/lib/firebase";
import { SiFacebook } from "react-icons/si";
import { Loader2 } from "lucide-react";

type Step = "auth" | "forgot-email" | "forgot-code" | "forgot-newpass";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<Step>("auth");
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const login = useLogin();
  const register = useRegister();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ email: "", password: "", fullName: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const firebaseLoginMutation = useMutation({
    mutationFn: async (data: { idToken: string; provider: string; displayName: string | null }) => {
      const res = await fetch("/api/auth/firebase-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: t.auth.welcomeBackToast });
      setLocation("/");
    },
    onError: (err: any) => {
      const msg = err.message === "account_blocked" ? "هذا الحساب محظور" : err.message;
      toast({ title: t.auth.error, description: msg, variant: "destructive" });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send code");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.auth.codeSent });
      setStep("forgot-code");
      setResendCountdown(30);
    },
  });

  const verifyResetCodeMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Invalid code");
      }
      return res.json();
    },
    onSuccess: () => setStep("forgot-newpass"),
    onError: (err: any) => {
      const msg = err.message === "invalid_code" ? t.auth.invalidCode : err.message;
      toast({ title: t.auth.error, description: msg, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; newPassword: string }) => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Reset failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.auth.passwordResetSuccess });
      setStep("auth");
      setIsLogin(true);
      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      const msg = err.message === "invalid_code" ? t.auth.invalidCode : err.message;
      toast({ title: t.auth.error, description: msg, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (user) setLocation("/");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login.mutateAsync({ email: formData.email, password: formData.password });
        toast({ title: t.auth.welcomeBackToast });
        setLocation("/");
      } else {
        await register.mutateAsync({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        });
        toast({ title: t.auth.welcomeBackToast });
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: t.auth.error, description: err.message, variant: "destructive" });
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      const { idToken, displayName } = await signInWithGoogle();
      await firebaseLoginMutation.mutateAsync({ idToken, provider: "google", displayName });
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast({ title: t.auth.error, description: err.message, variant: "destructive" });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setSocialLoading("facebook");
    try {
      const { idToken, displayName } = await signInWithFacebook();
      await firebaseLoginMutation.mutateAsync({ idToken, provider: "facebook", displayName });
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast({ title: t.auth.error, description: err.message, variant: "destructive" });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleForgotSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    forgotPasswordMutation.mutate(forgotEmail);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t.auth.error, description: t.auth.passwordMismatch, variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t.auth.error, description: t.auth.passwordTooShort, variant: "destructive" });
      return;
    }
    resetPasswordMutation.mutate({ email: forgotEmail, code: resetCode, newPassword });
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 py-20 bg-muted/20">
        <div className="bg-card w-full max-w-md p-6 sm:p-8 md:p-12 shadow-2xl border border-border/50">

          {/* ── FORGOT PASSWORD — ENTER EMAIL ── */}
          {step === "forgot-email" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl mb-2" data-testid="text-forgot-title">{t.auth.forgotPasswordTitle}</h1>
                <p className="text-muted-foreground text-sm">{t.auth.forgotPasswordDesc}</p>
              </div>
              <form onSubmit={handleForgotSendCode} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t.auth.email}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="rounded-none h-12"
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={forgotPasswordMutation.isPending}
                  className="w-full rounded-none h-12 uppercase tracking-widest text-sm font-semibold"
                  data-testid="button-send-reset-code"
                >
                  {forgotPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.sendCode}
                </Button>
              </form>
              <button
                onClick={() => setStep("auth")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-login"
              >
                {t.auth.backToLogin}
              </button>
            </div>
          )}

          {/* ── FORGOT PASSWORD — ENTER CODE ── */}
          {step === "forgot-code" && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h1 className="font-display text-3xl mb-2" data-testid="text-reset-title">{t.auth.checkEmail}</h1>
                <p className="text-muted-foreground text-sm">{t.auth.verifyDesc} <span className="font-medium text-foreground">{forgotEmail}</span></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-code">{t.auth.verificationCode}</Label>
                <Input
                  id="reset-code"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="rounded-none h-12 text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  data-testid="input-reset-code"
                />
              </div>
              <Button
                onClick={() => verifyResetCodeMutation.mutate({ email: forgotEmail, code: resetCode })}
                disabled={resetCode.length !== 6 || verifyResetCodeMutation.isPending}
                className="w-full rounded-none h-12 uppercase tracking-widest text-sm font-semibold"
                data-testid="button-verify-reset-code"
              >
                {verifyResetCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.verify}
              </Button>
              <button
                onClick={() => {
                  forgotPasswordMutation.mutate(forgotEmail);
                }}
                disabled={resendCountdown > 0 || forgotPasswordMutation.isPending}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="button-resend-code"
              >
                {resendCountdown > 0
                  ? `${t.auth.resendCode} (${resendCountdown}s)`
                  : forgotPasswordMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin inline" />
                    : t.auth.resendCode}
              </button>

              <button
                onClick={() => setStep("forgot-email")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-forgot"
              >
                {t.auth.backToLogin}
              </button>
            </div>
          )}

          {/* ── FORGOT PASSWORD — SET NEW PASSWORD ── */}
          {step === "forgot-newpass" && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h1 className="font-display text-3xl mb-2" data-testid="text-newpass-title">{t.auth.resetPassword}</h1>
                <p className="text-muted-foreground text-sm">{t.auth.enterCodeAndPassword}</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t.auth.newPassword}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="rounded-none h-12"
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t.auth.confirmNewPassword}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="rounded-none h-12"
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full rounded-none h-12 uppercase tracking-widest text-sm font-semibold"
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.resetPassword}
                </Button>
              </form>
            </div>
          )}

          {/* ── MAIN LOGIN / REGISTER STEP ── */}
          {step === "auth" && (
            <>
              <div className="text-center mb-8 sm:mb-10">
                <h1 className="font-display text-3xl sm:text-4xl mb-2" data-testid="text-auth-title">
                  {isLogin ? t.auth.signIn : t.auth.createAccount}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {isLogin ? t.auth.welcomeBack : t.auth.joinUs}
                </p>
              </div>

              {/* Social login buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={!!socialLoading || firebaseLoginMutation.isPending}
                  className="w-full h-12 flex items-center justify-center gap-3 border border-border hover:bg-muted transition-colors text-sm font-medium"
                  data-testid="button-google-login"
                >
                  {socialLoading === "google" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {t.auth.continueWithGoogle}
                </button>

                <button
                  onClick={handleFacebookLogin}
                  disabled={!!socialLoading || firebaseLoginMutation.isPending}
                  className="w-full h-12 flex items-center justify-center gap-3 border border-border hover:bg-muted transition-colors text-sm font-medium"
                  data-testid="button-facebook-login"
                >
                  {socialLoading === "facebook" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <SiFacebook className="w-5 h-5 text-[#1877F2]" />
                  )}
                  {t.auth.continueWithFacebook}
                </button>
              </div>

              <div className="relative flex items-center gap-3 mb-6">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{t.auth.orContinueWith}</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t.auth.fullName}</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      className="rounded-none h-12"
                      required
                      data-testid="input-fullname"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-none h-12"
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">{t.auth.password}</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(formData.email); setStep("forgot-email"); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-forgot-password"
                      >
                        {t.auth.forgotPassword}
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="rounded-none h-12"
                    required
                    data-testid="input-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={login.isPending || register.isPending}
                  className="w-full rounded-none h-12 uppercase tracking-widest text-sm font-semibold mt-2"
                  data-testid="button-auth-submit"
                >
                  {(login.isPending || register.isPending)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isLogin ? t.auth.signIn : t.auth.register}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                {isLogin ? t.auth.noAccount : t.auth.hasAccount}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-foreground font-semibold uppercase tracking-widest ms-1 hover:underline"
                  data-testid="button-toggle-auth"
                >
                  {isLogin ? t.auth.register : t.auth.signIn}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
