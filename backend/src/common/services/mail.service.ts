import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const BRAND = 'NRI Shaadi';
const MAROON = '#A4133C';
const GOLD = '#D4A017';
const CARD_STYLE =
  'font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#12090B;color:#fff;border-radius:12px;border:1px solid #3A2329';
const HEADER = `<h2 style="color:${GOLD};margin:0 0 4px">💍 ${BRAND}</h2><p style="color:#A58A90;margin:0 0 20px;font-size:13px">Trusted matrimony for Indians abroad</p>`;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,  // Google App Password
      },
    });
  }

  private async send(to: string | string[], subject: string, html: string): Promise<void> {
    if (!process.env.GMAIL_USER) {
      this.logger.warn(`[MAIL DEV] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"${BRAND}" <${process.env.GMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  async sendPasswordResetLink(to: string, userName: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_DEEP_LINK || 'nrishaadi'}://reset-password?token=${resetToken}`;
    const webUrl = `${process.env.WEB_BASE_URL || 'https://sugarbfapp.com'}/reset-password?token=${resetToken}`;

    await this.send(to, `Reset your ${BRAND} access`, `
      <div style="${CARD_STYLE}">
        ${HEADER}
        <p>Hi <strong>${userName}</strong>,</p>
        <p>An administrator has requested a login reset link for your account.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:${MAROON};color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700">
            Reset My Access
          </a>
        </p>
        <p style="color:#A58A90;font-size:13px">Or open this URL in your browser:<br><a href="${webUrl}" style="color:${GOLD}">${webUrl}</a></p>
        <p style="color:#A58A90;font-size:12px">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
      </div>
    `);
  }

  // ─── New User Alert to Admins ─────────────────────────────────────────────

  async sendNewUserAlertToAdmins(
    adminEmails: string[],
    user: {
      id: string; name: string; email: string; phone: string;
      gender?: string; religion?: string; city: string; country: string; createdAt: Date;
    },
  ): Promise<void> {
    if (!adminEmails.length) return;

    const row = (label: string, value: string) =>
      `<tr><td style="padding:8px;color:#A58A90;width:140px">${label}</td><td style="padding:8px">${value || '—'}</td></tr>`;

    await this.send(adminEmails, `New member joined ${BRAND}: ${user.name || 'Unnamed'}`, `
      <div style="${CARD_STYLE}">
        ${HEADER}
        <h3 style="color:#fff">👤 New member registered</h3>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          ${row('User ID', `<span style="font-family:monospace;font-size:12px">${user.id}</span>`)}
          ${row('Name', `<strong>${user.name || '—'}</strong>`)}
          ${row('Email', user.email)}
          ${row('Phone', user.phone)}
          ${row('Gender', user.gender)}
          ${row('Religion', user.religion)}
          ${row('Lives in', `${user.city || '—'}, ${user.country || '—'}`)}
          ${row('Joined', new Date(user.createdAt).toLocaleString('en-IN'))}
        </table>
        <p style="margin-top:24px">
          <a href="${process.env.ADMIN_WEB_URL || 'https://admin.sugarbfapp.com'}/users/${user.id}"
             style="background:${MAROON};color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700">
            View in Admin Panel
          </a>
        </p>
      </div>
    `);
  }

  // ─── Marketing Email (future use) ─────────────────────────────────────────

  async sendMarketingEmail(to: string[], subject: string, body: string): Promise<void> {
    await this.send(to, subject, `
      <div style="${CARD_STYLE}">
        ${HEADER}
        ${body}
        <p style="color:#A58A90;font-size:11px;margin-top:32px">You are receiving this because you are an ${BRAND} member.<br>
        <a href="${process.env.APP_DEEP_LINK || 'nrishaadi'}://unsubscribe" style="color:${GOLD}">Unsubscribe</a></p>
      </div>
    `);
  }

  // ─── Warning Email ────────────────────────────────────────────────────────

  async sendAccountWarning(to: string, userName: string, reason: string): Promise<void> {
    await this.send(to, `⚠️ Account Warning - ${BRAND}`, `
      <div style="${CARD_STYLE}">
        ${HEADER}
        <h3 style="color:#FF9500">⚠️ Account Warning</h3>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your ${BRAND} profile has received an official warning.</p>
        <p style="background:#2A181E;padding:16px;border-radius:8px;border-left:4px solid #FF9500">${reason}</p>
        <p>Please review our <a href="${process.env.PRIVACY_URL || 'https://api.sugarbf.club/api/v1/privacy'}" style="color:${GOLD}">Community Guidelines</a>.
        Repeated violations may result in account suspension.</p>
      </div>
    `);
  }
}
