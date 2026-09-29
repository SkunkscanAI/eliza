/**
 * Plain, inline templates for SkunkScan's 2 transactional emails - no
 * templating engine needed for just these two (cloud-shared's
 * template-renderer machinery is built for ~6+ email types with shared
 * layout; not worth pulling in for this).
 */
import type { SendEmailOptions } from "./service";

export function buildVerificationEmail(verificationLink: string): Omit<SendEmailOptions, "to"> {
  return {
    subject: "Verify your SkunkScan email address",
    text:
      `Confirm your email address to finish setting up your SkunkScan account:\n\n` +
      `${verificationLink}\n\n` +
      `This link expires in 24 hours. If you didn't create a SkunkScan account, you can ignore this email.`,
    html:
      `<p>Confirm your email address to finish setting up your SkunkScan account:</p>` +
      `<p><a href="${verificationLink}">${verificationLink}</a></p>` +
      `<p>This link expires in 24 hours. If you didn't create a SkunkScan account, you can ignore this email.</p>`,
  };
}

export function buildPasswordResetEmail(resetLink: string): Omit<SendEmailOptions, "to"> {
  return {
    subject: "Reset your SkunkScan password",
    text:
      `Someone requested a password reset for your SkunkScan account. If this was you, reset your password here:\n\n` +
      `${resetLink}\n\n` +
      `This link expires in 1 hour. If you didn't request this, you can ignore this email - your password will not change.`,
    html:
      `<p>Someone requested a password reset for your SkunkScan account. If this was you, reset your password here:</p>` +
      `<p><a href="${resetLink}">${resetLink}</a></p>` +
      `<p>This link expires in 1 hour. If you didn't request this, you can ignore this email - your password will not change.</p>`,
  };
}
