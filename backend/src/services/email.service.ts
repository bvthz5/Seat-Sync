import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
            },
        });
    }

    private getBaseTemplate(content: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SeatSync Notification</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f1f5f9;
                        line-height: 1.6;
                        color: #334155;
                    }
                    .container {
                        max-width: 600px;
                        margin: 40px auto;
                        background-color: #ffffff;
                        border-radius: 16px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                        padding: 30px 40px;
                        text-align: center;
                    }
                    .header h1 {
                        color: #ffffff;
                        margin: 0;
                        font-size: 24px;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                    }
                    .header p {
                        color: #e0f2fe;
                        margin: 5px 0 0 0;
                        font-size: 14px;
                    }
                    .content {
                        padding: 40px;
                    }
                    .credential-box {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 24px;
                        margin: 24px 0;
                    }
                    .credential-row {
                        margin-bottom: 12px;
                    }
                    .credential-row:last-child {
                        margin-bottom: 0;
                    }
                    .label {
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: #64748b;
                        font-weight: 600;
                        margin-bottom: 4px;
                        display: block;
                    }
                    .value {
                        font-family: 'Consolas', 'Monaco', monospace;
                        font-size: 16px;
                        color: #0f172a;
                        background-color: #ffffff;
                        padding: 8px 12px;
                        border-radius: 6px;
                        border: 1px solid #cbd5e1;
                        display: block;
                    }
                    .btn-primary {
                        display: inline-block;
                        background-color: #2563eb;
                        color: #ffffff !important;
                        padding: 14px 32px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 16px;
                        text-align: center;
                        margin-top: 24px;
                        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
                    }
                    .btn-primary:hover {
                        background-color: #1d4ed8;
                    }
                    .warning-box {
                        background-color: #fef2f2;
                        border-left: 4px solid #ef4444;
                        padding: 16px;
                        margin-top: 24px;
                        border-radius: 6px;
                    }
                    .warning-text {
                        color: #991b1b;
                        font-size: 14px;
                        margin: 0;
                    }
                    .footer {
                        background-color: #f8fafc;
                        padding: 24px 40px;
                        text-align: center;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer p {
                        margin: 0;
                        font-size: 12px;
                        color: #94a3b8;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SeatSync</h1>
                        <p>Examination Control System</p>
                    </div>
                    <div class="content">
                        ${content}
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} SeatSync Systems. All rights reserved.</p>
                        <p style="margin-top: 8px;">Automated security notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
        const content = `
            <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Reset Your Password</h2>
            <p style="color: #475569;">
                We received a request to reset the password for your SeatSync account. 
                If you made this request, please click the button below to securely reset your password.
            </p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="btn-primary">Reset Password</a>
            </div>
            
            <p style="margin-top: 32px; font-size: 14px; color: #64748b;">
                Or copy and paste this secure link into your browser:
                <br>
                <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>

            <div class="warning-box">
                <p class="warning-text">
                    <strong>Security Notice:</strong> This link expires in 15 minutes. 
                    If you did not request this change, please ignore this email or contact support immediately.
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"SeatSync Security" <${process.env.FROM_EMAIL}>`,
            to,
            subject: 'Action Required: Reset Your Password',
            html: this.getBaseTemplate(content),
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Password reset email sent: ${info.messageId}`);
        } catch (error: any) {
            console.error('[EmailService] Error sending email:', error.message);
            throw new Error('Failed to send password reset email');
        }
    }

    async sendAdminCreatedEmail(to: string, name: string, email: string, password: string): Promise<void> {
        const loginUrl = process.env.APP_URL || 'http://localhost:5173';

        const content = `
            <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Welcome to SeatSync!</h2>
            <p style="color: #475569;">
                Hello <strong>${name}</strong>,<br><br>
                You have been appointed as an <strong>Exam Administrator</strong>. 
                Your account has been successfully created. Please find your secure login credentials below.
            </p>
            
            <div class="credential-box">
                <div class="credential-row">
                    <span class="label">Access Portal</span>
                    <span class="value" style="color: #2563eb; text-decoration: underline;">${loginUrl}</span>
                </div>
                <div class="credential-row">
                    <span class="label">Username / Email</span>
                    <span class="value">${email}</span>
                </div>
                <div class="credential-row">
                    <span class="label">Temporary Password</span>
                    <span class="value" style="letter-spacing: 1px; font-weight: bold;">${password}</span>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${loginUrl}" class="btn-primary">Login to Dashboard</a>
            </div>

            <div class="warning-box">
                <p class="warning-text">
                    <strong>Action Required:</strong> For your security, you will be required to change your password immediately upon your first login.
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"SeatSync Exam Cell" <${process.env.FROM_EMAIL}>`,
            to,
            subject: 'Welcome to SeatSync - Your Admin Credentials',
            html: this.getBaseTemplate(content),
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Admin creation email sent: ${info.messageId}`);
        } catch (error: any) {
            console.error('[EmailService] Error sending email:', error.message);
            throw new Error('Failed to send admin creation email');
        }
    }
}

export const emailService = new EmailService();
