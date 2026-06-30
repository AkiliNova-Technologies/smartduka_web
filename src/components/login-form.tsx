"use client";

import { useState, FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestLoginOtp, verifyLoginOtp } from "@/actions/auth";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    
    const result = await requestLoginOtp(email);
    setLoading(false);

    if (result.success) {
      setStep("otp");
      toast.success("Verification token dispatched successfully.");
    } else {
      toast.error(result.error || "Something went wrong.");
    }
  };

  const handleOtpVerification = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);

    const result = await verifyLoginOtp(email, otp);
    setLoading(false);

    if (result.success && result.redirectTo) {
      toast.success("Access verified. Redirecting...");
      window.location.href = result.redirectTo;
    } else {
      toast.error(result.error || "Verification failed.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      
      {/* 1. HEADER SECTION CONTENT */}
      <div className="flex flex-col items-center gap-1.5 text-center select-none">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {step === "email" ? "Login to your account" : "Verify your email"}
        </h1>
        <p className="text-xs text-muted-foreground px-2 leading-relaxed">
          {step === "email" 
            ? "Enter your email address below to receive an OTP code." 
            : `Your 6-digit code was sent to you via email at ${email}`}
        </p>
      </div>

      {/* 2. DYNAMIC STEP TRANSITION WORKFLOW */}
      {step === "email" ? (
        <form onSubmit={handleEmailSubmission} className="flex flex-col gap-4" {...props}>
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
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-6 h-11 border-border/60 rounded-full focus-visible:ring-primary/20 bg-card focus-visible:border-primary placeholder:text-muted-foreground/50 text-sm"
                />
              </div>
            </Field>

            <Field className="pt-1">
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-full text-xs font-semibold uppercase tracking-wider gap-2 cursor-pointer bg-primary hover:bg-emerald-600 transition-colors">
                {loading ? "Sending..." : "Continue"}
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : (
        <form onSubmit={handleOtpVerification} className="flex flex-col gap-5" {...props}>
          <FieldGroup className="flex flex-col items-center">
            <Field className="w-full flex flex-col items-center">
              <div className="flex justify-center w-full">
                <InputOTP 
                  maxLength={6} 
                  value={otp} 
                  onChange={(val) => setOtp(val)}
                  disabled={loading}
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot 
                        key={index} 
                        index={index} 
                        className="size-12 rounded-full border border-border/60 bg-card text-base font-semibold text-foreground transition-all data-[active=true]:border-primary data-[active=true]:ring-1 data-[active=true]:ring-primary/10" 
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </Field>

            <Field className="w-full pt-2">
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6} 
                className="w-full h-11 rounded-full text-xs font-semibold uppercase tracking-wider cursor-pointer bg-primary hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </Field>

            <div className="text-center mt-2 select-none">
              <p className="text-xs font-medium text-muted-foreground">
                {"Didn't receive the code? "}
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="font-semibold text-primary hover:underline outline-none cursor-pointer"
                >
                  Request again
                </button>
              </p>
            </div>
          </FieldGroup>
        </form>
      )}

      {/* 3. SOCIAL DELEGATION LINKAGE LAYER */}
      {step === "email" && (
        <div className="flex flex-col gap-4">
          <FieldSeparator className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Or continue with
          </FieldSeparator>
          
          <Field>
            <Button variant="outline" type="button" className="w-full h-11 rounded-full text-xs font-medium gap-2 cursor-pointer border-border/65 hover:bg-muted/60 transition-colors">
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>
          </Field>
        </div>
      )}

    </div>
  );
}