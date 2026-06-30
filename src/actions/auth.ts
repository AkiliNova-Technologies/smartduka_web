"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const memoryOtpCache = new Map<string, { otp: string; expires: number }>();

/**
 * Action 1: Generate a secure 6-digit token and dispatch it via Resend
 */
export async function requestLoginOtp(email: string) {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const fiveMinutes = Date.now() + 5 * 60 * 1000;

    memoryOtpCache.set(email, { otp: generatedOtp, expires: fiveMinutes });

    // 3. Dispatch the transactional email payload using Resend
    // NOTE: On Resend's free tier, you can only send to your own registered email unless you verify your domain.
    await resend.emails.send({
      from: "SmartDuka Auth <onboarding@resend.dev>",
      to: email,
      subject: `${generatedOtp} is your SmartDuka verification code`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; rounded-xl: 16px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #09090b; margin-bottom: 4px;">Verify your email</h2>
          <p style="font-size: 13px; color: #71717a; margin-bottom: 24px;">Use the secure verification token below to access your account profile layer.</p>
          <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-radius: 12px; font-size: 24px; font-weight: 700; letter-spacing: 6px; color: #059669; margin-bottom: 24px;">
            ${generatedOtp}
          </div>
          <p style="font-size: 11px; color: #a1a1aa; line-height: 1.5;">This secure token was requested for an access gateway entry into the SmartDuka trade network. It expires in 5 minutes. If you did not make this request, please safely disregard this communication.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Resend Dispatch Error:", error);
    return { success: false, error: "Fulfillment failed. Please try again shortly." };
  }
}

/**
 * Action 2: Validate the user-submitted OTP and confirm routing vectors
 */
export async function verifyLoginOtp(email: string, submittedOtp: string) {
  const cachedRecord = memoryOtpCache.get(email);

  if (!cachedRecord) {
    return { success: false, error: "Token expired or session context missing. Request a fresh code." };
  }

  if (Date.now() > cachedRecord.expires) {
    memoryOtpCache.delete(email);
    return { success: false, error: "This token has expired. Please request a new code." };
  }

  if (cachedRecord.otp !== submittedOtp) {
    return { success: false, error: "Invalid token. Please verify the code and try again." };
  }

  memoryOtpCache.delete(email);

  // AUTOMATED BACKEND ROUTING LOGIC
  let targetRedirect = "/";
  if (email.endsWith("@smartduka.admin")) {
    targetRedirect = "/dashboard";
  } else if (email.endsWith("@duka.vendor")) {
    targetRedirect = "/vendor/orders";
  }

  return { success: true, redirectTo: targetRedirect };
}