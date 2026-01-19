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

    async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
        const mailOptions = {
            from: `"SeatSync Security" <${process.env.FROM_EMAIL}>`,
            to,
            subject: 'SeatSync - Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #0F172A; margin: 0;">SeatSync Systems</h2>
                        <p style="color: #64748B; font-size: 14px; margin-top: 5px;">Examination Control Portal</p>
                    </div>
                    
                    <div style="padding: 20px; background-color: #F8FAFC; border-radius: 8px;">
                        <h3 style="color: #334155; margin-top: 0;">Password Reset Request</h3>
                        <p style="color: #475569; line-height: 1.6;">
                            We received a request to reset the password for your SeatSync Admin account. 
                            If you did not make this request, please ignore this email.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #0F172A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #64748B; font-size: 13px; margin-top: 20px;">
                            Or copy and paste this link into your browser:<br>
                            <a href="${resetLink}" style="color: #2563EB; word-break: break-all;">${resetLink}</a>
                        </p>

                        <p style="color: #EF4444; font-size: 13px; font-weight: bold;">
                            This link is valid for 15 minutes only.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 10px;">
                        <p style="color: #94A3B8; font-size: 12px;">
                            &copy; 2026 SeatSync Systems. All rights reserved.<br>
                            This is an automated system message. Please do not reply.
                        </p>
                    </div>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Password reset email sent: ${info.messageId}`);
        } catch (error: any) {
            console.error('[EmailService] Error sending email:', error.message);
            throw new Error('Failed to send password reset email');
        }
    }
}

export const emailService = new EmailService();
