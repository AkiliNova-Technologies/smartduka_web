"use client";

import { useState, FormEvent, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

const getFriendlyErrorMessage = (errorString: string): string => {
  if (errorString.includes("auth/popup-closed-by-user")) {
    return "Sign-up window was closed before completion. Please try again.";
  }
  if (errorString.includes("auth/email-already-in-use")) {
    return "An account with this email address already exists. Try logging in.";
  }
  if (errorString.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (errorString.includes("auth/weak-password")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (errorString.includes("auth/network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }
  return "An unexpected error occurred during registration. Please try again.";
};

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const { registerWithEmail, loginWithGoogle, isAuthenticated, actionLoading } =
    useAuth();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const canProceedToStep2 = firstName.trim() && email.trim();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please verify your entries.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      await registerWithEmail(email, password, fullName);
      toast.success(`Welcome to SmartDuka, ${firstName}!`);
      router.push("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(getFriendlyErrorMessage(message));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      toast.success("Logged in successfully!");
      router.push("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(getFriendlyErrorMessage(message));
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      <div className="flex flex-col items-start gap-1.5 text-start select-none">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {step === 1 ? "Create your account" : "Set your password"}
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {step === 1
            ? "Enter your name and email to get started."
            : "Choose a strong password to secure your account."}
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-2" {...props}>
        <FieldGroup>
          {step === 1 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="firstName" className="text-xs font-medium text-muted-foreground">First Name</FieldLabel>
                  <div className="relative group mt-1.5">
                    <Input id="firstName" type="text" required placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="px-6 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm" />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName" className="text-xs font-medium text-muted-foreground">Last Name</FieldLabel>
                  <div className="relative group mt-1.5">
                    <Input id="lastName" type="text" required placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="px-6 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm" />
                  </div>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="email" className="text-xs font-medium text-muted-foreground">Email Address</FieldLabel>
                <div className="relative group mt-1.5">
                  <Input id="email" type="email" required placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-6 pr-6 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm" />
                </div>
              </Field>
              <Field className="pt-1">
                <Button type="button" onClick={() => setStep(2)} disabled={!canProceedToStep2} className="w-full h-11 rounded-full text-xs font-semibold tracking-wide gap-2 bg-primary hover:bg-emerald-600 cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
              <Field>
                <FieldLabel htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</FieldLabel>
                <div className="relative group mt-1.5 flex items-center">
                  <Input id="password" type={showPassword ? "text" : "password"} required disabled={actionLoading} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-6 pr-12 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm w-full" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={actionLoading} className="absolute right-4 p-1 text-muted-foreground/70 hover:text-foreground outline-none cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">Confirm Password</FieldLabel>
                <div className="relative group mt-1.5 flex items-center">
                  <Input id="confirmPassword" type={showPassword ? "text" : "password"} required disabled={actionLoading} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-6 pr-12 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm w-full" />
                </div>
              </Field>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" disabled={actionLoading} onClick={() => setStep(1)} className="w-auto h-11 rounded-full text-xs font-semibold px-5 cursor-pointer gap-1.5">
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
                <Button type="submit" disabled={actionLoading} className="flex-1 h-11 rounded-full text-xs font-semibold uppercase tracking-wider gap-2 bg-primary hover:bg-emerald-600 cursor-pointer text-white">
                  {actionLoading ? "Creating Account..." : "Register"}
                  {!actionLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </FieldGroup>
      </form>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <FieldSeparator className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Or sign up with</FieldSeparator>
          <Field>
            <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={actionLoading} className="w-full h-11 rounded-full text-xs font-medium gap-2 border-border/65 hover:bg-muted/60 cursor-pointer">
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{actionLoading ? "Connecting..." : "Continue with Google"}</span>
            </Button>
          </Field>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground select-none pt-2 border-t border-border/40">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:text-emerald-600 transition-colors">Sign in</Link>
      </div>
    </div>
  );
}