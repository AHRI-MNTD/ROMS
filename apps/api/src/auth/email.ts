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

export interface ApprovedRequestItemDetail {
  name: string;
  quantity: number;
  unit?: string;
  status: string;
}

export async function sendApprovedRequestsNotificationEmail(
  recipientEmail: string,
  details: {
    managerName: string;
    project: string;
    requestedBy: string;
    requestedFor?: string;
    items: ApprovedRequestItemDetail[];
  }
) {
  const host = env.SMTP_HOST || "smtp.gmail.com";
  const port = env.SMTP_PORT || 587;
  const user = env.SMTP_USER || "";
  const pass = env.SMTP_PASS || "";
  const from = env.SMTP_FROM || `"ROMS Inventory" <noreply@roms.local>`;

  if (!user || !pass || pass.includes("your-gmail-app-password")) {
    logger.warn(
      { recipientEmail, details },
      "SMTP credentials not fully configured. Approved request notification logged for dev/testing."
    );
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const itemsRowsHtml = details.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${it.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #166534;">${it.quantity} ${it.unit ?? "units"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #0d9488;">${it.status}</td>
        </tr>
      `
      )
      .join("");

    const mailOptions = {
      from,
      to: recipientEmail,
      subject: `[ROMS] Approved Material Requests - ${details.project}`,
      text: `Manager ${details.managerName} approved material request(s) for project ${details.project}.\nRequested By: ${details.requestedBy}\n\nPlease check the Approved Requests page in ROMS.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #0d9488; margin-bottom: 12px;">✅ Material Requisition Approved</h2>
          <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
            Manager <strong>${details.managerName}</strong> has approved inventory material request(s) for project <strong>${details.project}</strong>.
          </p>
          <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px;">
            <div><strong>Requested By:</strong> ${details.requestedBy}</div>
            ${details.requestedFor ? `<div><strong>Requested For:</strong> ${details.requestedFor}</div>` : ""}
            <div><strong>Project:</strong> ${details.project}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px; text-align: left;">Item Description</th>
                <th style="padding: 8px; text-align: left;">Approved Qty</th>
                <th style="padding: 8px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>
          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173/domains/inventory/stock-management/approved-requests" style="background-color: #0d9488; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
              View Approved Requests Hub
            </a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info({ recipientEmail }, "Approved requests notification email sent successfully");
  } catch (err) {
    logger.error(err, "Failed to send approved requests notification email");
  }
}
