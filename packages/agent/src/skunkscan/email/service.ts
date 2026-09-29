/**
 * SkunkScan's own transactional email service - SendGrid API or plain SMTP
 * via nodemailer, driven entirely by env vars. Same portable pattern as
 * @elizaos/cloud-shared's EmailService (same two libraries, same "SendGrid
 * if an API key is set, else SMTP if host/port/password are set, else
 * disabled" fallback), deliberately reimplemented small here rather than
 * importing that package wholesale - see auth/schema.ts's header comment
 * and this milestone's own PR 1 investigation for why (cloud-shared is
 * built for Cloudflare Workers + a completely different database, and
 * importing it would drag in ~245 unrelated service modules).
 *
 * Env vars are SkunkScan-prefixed (SKUNKSCAN_SENDGRID_API_KEY, not
 * SENDGRID_API_KEY) deliberately, not just to avoid a naming collision -
 * SkunkScan is a separate product/identity from ElizaOS Cloud, and reusing
 * the same env var names could silently point SkunkScan's real user-facing
 * emails at the cloud product's SendGrid account/from-address (cloud-
 * shared's own hardcoded fallback is "noreply@elizacloud.ai" - visibly
 * wrong for this product) if the two ever ran with a shared environment.
 */
import sgMail from "@sendgrid/mail";
import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@elizaos/core";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

class SkunkScanEmailService {
  private initialized = false;
  private useSmtp = false;
  private fromEmail = "noreply@skunkscan.ai";
  private smtpTransporter: Transporter | null = null;

  private initialize(): void {
    if (this.initialized) return;

    this.fromEmail =
      process.env.SKUNKSCAN_EMAIL_FROM ||
      process.env.SKUNKSCAN_SENDGRID_FROM_EMAIL ||
      process.env.SKUNKSCAN_SMTP_FROM ||
      "noreply@skunkscan.ai";

    if (
      process.env.SKUNKSCAN_SMTP_HOST &&
      process.env.SKUNKSCAN_SMTP_PORT &&
      process.env.SKUNKSCAN_SMTP_PASSWORD
    ) {
      this.smtpTransporter = nodemailer.createTransport({
        host: process.env.SKUNKSCAN_SMTP_HOST,
        port: parseInt(process.env.SKUNKSCAN_SMTP_PORT, 10),
        secure: false,
        auth: {
          user: process.env.SKUNKSCAN_SMTP_USERNAME || "apikey",
          pass: process.env.SKUNKSCAN_SMTP_PASSWORD,
        },
      });
      this.useSmtp = true;
      this.initialized = true;
      logger.info("[SkunkscanEmail] Initialized with SMTP");
      return;
    }

    const apiKey = process.env.SKUNKSCAN_SENDGRID_API_KEY;
    if (!apiKey) {
      logger.warn(
        "[SkunkscanEmail] No email configuration found (SKUNKSCAN_SENDGRID_API_KEY or SKUNKSCAN_SMTP_* env vars) - verification/reset emails will not be sent.",
      );
      this.initialized = false;
      return;
    }

    sgMail.setApiKey(apiKey);
    this.initialized = true;
    logger.info("[SkunkscanEmail] Initialized with SendGrid API");
  }

  /**
   * Sends an email. Returns false (never throws) when no provider is
   * configured, or when the send itself fails - the caller decides how to
   * react (see auth-routes.ts's own doc comments on why register/forgot-
   * password never let this failure change what's returned to the client).
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    this.initialize();

    if (!this.initialized) {
      return false;
    }

    try {
      if (this.useSmtp && this.smtpTransporter) {
        await this.smtpTransporter.sendMail({
          from: this.fromEmail,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
      } else {
        await sgMail.send({
          from: this.fromEmail,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
      }

      logger.info(
        { to: options.to, subject: options.subject },
        "[SkunkscanEmail] Email sent",
      );
      return true;
    } catch (error) {
      logger.warn(
        {
          to: options.to,
          subject: options.subject,
          error: error instanceof Error ? error.message : String(error),
        },
        "[SkunkscanEmail] Email send failed",
      );
      return false;
    }
  }
}

export const skunkscanEmailService = new SkunkScanEmailService();
