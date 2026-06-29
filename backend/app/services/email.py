import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends a 6-digit OTP code to the user's email address.
    If SMTP details are not configured, prints the OTP to the console.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "="*50)
        print(f" [SIMULATOR EMAIL] TO: {to_email}")
        print(f" [SIMULATOR EMAIL] SUBJECT: StockAI Account Verification")
        print(f" [SIMULATOR EMAIL] CODE: {otp}")
        print(" (Note: To send real emails, set SMTP_USER and SMTP_PASSWORD in .env)")
        print("="*50 + "\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = f"{otp} is your StockAI Verification Code"

        body = f"""
        <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #0f172a;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #059669;">Stock<span style="color: #0f172a;">AI</span></span>
                    </div>
                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 750; line-height: 1.4; margin-top: 0; text-align: center; margin-bottom: 8px;">Verify your Email Address</h2>
                    <p style="font-size: 15px; line-height: 1.6; color: #475569; text-align: center; margin-bottom: 32px;">Please use the following 6-digit verification code to complete your signup process and claim your $100,000.00 virtual cash.</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; text-align: center; margin: 32px 0; color: #059669; background-color: #f0fdf4; padding: 18px; border-radius: 12px; border: 1px solid #bbf7d0; font-family: monospace;">
                        {otp}
                    </div>
                    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center; margin-top: 32px;">This verification code will expire in 10 minutes. If you did not request this email, you can safely ignore it.</p>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        # Standard SMTP connection
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"[SMTP EMAIL SUCCESS] Successfully sent OTP email to {to_email}")
        return True
    except Exception as e:
        print(f"[SMTP EMAIL ERROR] Failed to send email to {to_email}: {e}")
        # Print OTP code to console as fallback so developer is not blocked
        print("\n" + "="*50)
        print(f" [FALLBACK EMAIL] TO: {to_email}")
        print(f" [FALLBACK EMAIL] CODE: {otp}")
        print("="*50 + "\n")
        return False
