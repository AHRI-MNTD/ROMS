import nodemailer from "nodemailer";
import { env } from "../env";
import { logger } from "../utils/logger";

export async function sendVerificationEmail(email: string, code: string) {
  const host = env.SMTP_HOST || "smtp.gmail.com";
  const port = env.SMTP_PORT || 587;
  const user = env.SMTP_USER || "";
  const pass = env.SMTP_PASS || "";
  const from = env.SMTP_FROM || `"ROMS System" <noreply@roms.local>`;

  if (!user || !pass || pass.includes("your-gmail-app-password")) {
    logger.warn(
      { email, code },
      "SMTP credentials not fully configured. Please configure SMTP_USER and SMTP_PASS in your .env file to send real emails."
    );
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to: email,
      subject: "Verify Your ROMS Account",
      text: `Your ROMS verification code is: ${code}\n\nPlease enter this code on the website to verify your email address.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">Verify Your ROMS Account</h2>
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">Thank you for registering with ROMS. Please use the following 6-digit verification code to complete your signup:</p>
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111827; margin-bottom: 24px;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire shortly. If you did not request this email, please ignore it.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info({ email }, "Verification email sent successfully");
  } catch (err) {
    logger.error(err, "Failed to send verification email");
    throw err;
  }
}
