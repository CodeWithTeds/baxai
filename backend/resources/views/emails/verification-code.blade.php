<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
    }
    .wrapper {
      max-width: 520px;
      margin: 32px auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #E5E7EB;
    }
    .header {
      background: linear-gradient(135deg, #0052CC 0%, #003D9B 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-tagline {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: #4B5563;
      margin-bottom: 24px;
    }
    .code-box {
      background: #F8FAFC;
      border: 2px dashed #0052CC;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 20px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6B7280;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .code-number {
      font-size: 40px;
      font-weight: 900;
      letter-spacing: 12px;
      color: #0052CC;
      font-family: 'Courier New', Courier, monospace;
      margin: 0;
    }
    .expiry {
      font-size: 12px;
      color: #EF4444;
      font-weight: 600;
      margin-top: 10px;
    }
    .security-notice {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 6px;
      padding: 12px 14px;
      font-size: 12px;
      color: #92400E;
      line-height: 1.5;
      margin-top: 24px;
    }
    .footer {
      background: #F9FAFB;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
      font-size: 11px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">NUYDA ENTERPRISE</h1>
      <div class="brand-tagline">Custom Printing & Digital Solutions</div>
    </div>
    <div class="content">
      <div class="greeting">
        @if(!empty($name))
          Hello, {{ $name }}!
        @else
          Hello!
        @endif
      </div>
      <div class="message">
        @if($type === 'password_reset')
          We received a request to reset the password for your NUYDA account. Please enter the 4-digit code below in the mobile app to proceed:
        @else
          Thank you for registering with NUYDA! Please enter the 4-digit verification code below in the mobile app to verify your account:
        @endif
      </div>

      <div class="code-box">
        <div class="code-label">Your 4-Digit Verification Code</div>
        <div class="code-number">{{ $code }}</div>
        <div class="expiry">⏰ Code expires in 10 minutes</div>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong> Never share this code with anyone. NUYDA staff will never ask for your verification code. If you did not request this, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      &copy; {{ date('Y') }} NUYDA ENTERPRISE. All rights reserved.<br>
      Montalban, Rizal, Philippines
    </div>
  </div>
</body>
</html>
