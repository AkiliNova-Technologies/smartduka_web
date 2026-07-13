"use client";

import { useState, FormEvent, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
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
    return "Sign-in window was closed before completion. Please try again.";
  }
  if (errorString.includes("auth/invalid-credential") || errorString.includes("auth/wrong-password")) {
    return "Invalid email or password. Please double-check your credentials.";
  }
  if (errorString.includes("auth/user-not-found")) {
    return "No account exists with this email address.";
  }
  if (errorString.includes("auth/too-many-requests")) {
    return "Account temporarily locked due to too many failed login attempts. Try again later.";
  }
  if (errorString.includes("auth/network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }
  return "An unexpected error occurred. Please try again.";
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, isAuthenticated, actionLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const result = await loginWithEmail(email, password);
      if (result.success) {
        toast.success("Welcome back to SmartDuka!");
      } else {
        toast.error(getFriendlyErrorMessage(result.error || ""));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(getFriendlyErrorMessage(message));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        toast.success(`Logged in successfully!`);
      } else {
        toast.error(getFriendlyErrorMessage(result.error || ""));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(getFriendlyErrorMessage(message));
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      <div className="flex flex-col items-center gap-1.5 text-center select-none">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Login to your account
        </h1>
        <p className="text-xs text-muted-foreground px-2 leading-relaxed">
          Enter your credentials below to access your account.
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-2" {...props}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email Address
            </FieldLabel>
            <div className="relative group mt-1.5">
              <Input 
                id="email" 
                type="email" 
                required 
                disabled={actionLoading}
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-6 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </FieldLabel>
            <div className="relative group mt-1.5 flex items-center">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                required 
                disabled={actionLoading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-6 pr-12 h-11 border-border/60 rounded-full bg-card focus-visible:ring-primary/20 focus-visible:border-primary text-sm w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={actionLoading}
                className="absolute right-4 p-1 text-muted-foreground/70 hover:text-foreground outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field className="pt-1">
            <Button 
              type="submit" 
              disabled={actionLoading} 
              className="w-full h-11 rounded-full text-xs font-semibold uppercase tracking-wider gap-2 bg-primary hover:bg-emerald-600 cursor-pointer text-white"
            >
              {actionLoading ? "Authenticating..." : "Continue"}
              {!actionLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="flex flex-col gap-4">
        <FieldSeparator className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Or continue with
        </FieldSeparator>
        
        <Field>
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleGoogleSignIn}
            disabled={actionLoading}
            className="w-full h-11 rounded-full text-xs font-medium gap-2 border-border/65 hover:bg-muted/60 cursor-pointer"
          >
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

      <div className="text-center text-xs text-muted-foreground select-none pt-2 border-t border-border/40">
        Don&apos;t have an account?{" "}
        <Link 
          href="/register" 
          className="font-semibold text-primary hover:text-emerald-600 transition-colors"
        >
          Sign up
        </Link>
      </div>

    </div>
  );
}