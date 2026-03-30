# ImprovMX Email Forwarding Setup

## Overview

ImprovMX handles email forwarding for the `aiglitch.app` domain. All emails sent to `@aiglitch.app` addresses are forwarded to the personal inbox `sfrench71@me.com`.

**Service:** ImprovMX Premium ($9/month)
**Account:** sfrench71@me.com
**Dashboard:** https://app.improvmx.com
**Guides:** https://improvmx.com/guides

---

## Current Configuration

### Domain: aiglitch.app

| Alias | Email Address | Forwards To |
|---|---|---|
| `*` (catch-all) | *@aiglitch.app | Sfrench71@me.com |
| `ads` | ads@aiglitch.app | sfrench71@me.com |
| `architect` | architect@aiglitch.app | sfrench71@me.com |

**Status:** Email forwarding active (green indicator)

### Email Addresses in Use

| Address | Purpose | Used In |
|---|---|---|
| stuart.french@aiglitch.app | Main outreach email | MasterHQ sponsor emails, media kit |
| advertise@aiglitch.app | Advertiser contact | Media kit, sponsor pitches |
| ads@aiglitch.app | Ad inquiries | Alias configured in ImprovMX |
| architect@aiglitch.app | The Architect persona | Alias configured in ImprovMX |

The catch-all (`*`) alias means ANY `@aiglitch.app` address (including `stuart.french@` and `advertise@`) will forward to `sfrench71@me.com` without needing individual aliases.

---

## DNS Configuration

ImprovMX requires specific DNS records on the domain. These are configured in **Vercel DNS** (since aiglitch.app is managed by Vercel).

### Required DNS Records

| Type | Name | Value | Purpose |
|---|---|---|---|
| MX | @ | `mx1.improvmx.com` (priority 10) | Primary mail server |
| MX | @ | `mx2.improvmx.com` (priority 20) | Backup mail server |
| TXT | @ | `v=spf1 include:spf.improvmx.com ~all` | SPF — prevents emails being marked as spam |

### Optional (for sending emails FROM @aiglitch.app)

To send emails as `stuart.french@aiglitch.app` (not just receive), you also need:

| Type | Name | Value | Purpose |
|---|---|---|---|
| TXT | @ | `v=DKIM1; ...` (from ImprovMX SMTP settings) | DKIM signing |
| CNAME | `improvmx._domainkey` | (from ImprovMX dashboard) | DKIM verification |

**Note:** MasterHQ currently sends emails via `mailto:` links (opens user's email client). If we implement direct SMTP sending from the server, DKIM/DMARC records will be needed.

---

## How to Add a New Domain (e.g. masterhq.dev)

1. Go to https://app.improvmx.com
2. In the **"Add new domain"** field at the bottom, type `masterhq.dev`
3. Click **Add Domain**
4. ImprovMX will show the required DNS records (MX + SPF TXT)
5. Add those records in **Vercel DNS** for the domain:
   - Go to vercel.com/dashboard → Domain → masterhq.dev → DNS Records
   - Add MX record: `mx1.improvmx.com` priority 10
   - Add MX record: `mx2.improvmx.com` priority 20
   - Add TXT record: `v=spf1 include:spf.improvmx.com ~all`
6. Wait for DNS propagation (usually 5-30 minutes)
7. Back in ImprovMX, click **Check DNS** to verify
8. Add aliases as needed (or rely on the catch-all `*`)

---

## How to Add a New Email Alias

1. Go to https://app.improvmx.com
2. Click on the domain (e.g. `aiglitch.app`)
3. In the **"new-alias"** field, type the alias name (e.g. `support`)
4. Set the **FORWARDS TO** address (default: sfrench71@me.com)
5. Click **ADD**
6. Test by clicking **TEST** next to the new alias

---

## SMTP Sending (Optional)

ImprovMX Premium includes SMTP access for sending emails AS your custom domain.

**SMTP Settings:**
- Server: `smtp.improvmx.com`
- Port: 587 (STARTTLS) or 465 (SSL)
- Username: Your ImprovMX email (the alias, e.g. `stuart.french@aiglitch.app`)
- Password: Generated in ImprovMX dashboard → SMTP section

This would allow MasterHQ to send sponsor outreach emails directly from the server instead of via `mailto:` links.

---

## How to Use @aiglitch.app Emails on Your Devices

### Receiving Emails

**How it works:** All emails sent to ANY `@aiglitch.app` address are automatically **forwarded** to `sfrench71@me.com`. You don't need special configuration to receive them.

**Steps:**
1. Just use your existing Apple/Gmail/Outlook email setup
2. Check your email on iPhone/iPad/Mac/PC normally — incoming @aiglitch.app emails appear in `sfrench71@me.com`
3. No additional configuration needed

**Example flow:**
- Someone sends to: `ads@aiglitch.app`
- Email is instantly forwarded to: `sfrench71@me.com`
- You see it in Apple Mail, Gmail, Outlook, etc.

---

### Sending Emails FROM @aiglitch.app

To **send** email as `stuart.french@aiglitch.app` or any `@aiglitch.app` address, you need to configure SMTP on your mail client.

#### Step 1: Get Your SMTP Password

1. Go to https://app.improvmx.com
2. Click **Account Settings** → **SMTP**
3. Generate a password (if not already created)
4. Copy this password

**⚠️ Important:** This is NOT your ImprovMX login password. It's a separate SMTP-only password.

#### Step 2: Configure Mail Client

**SMTP Configuration (same for all devices):**
```
Server:   smtp.improvmx.com
Port:     587 (with STARTTLS) or 465 (with SSL)
Username: stuart.french@aiglitch.app (or any alias you want to send as)
Password: [Your SMTP password from Step 1]
```

---

### iPhone / iPad Setup

**Using Apple Mail:**

1. Open **Settings** → **Mail** → **Accounts** → **Add Account**
2. Choose **Other**
3. Fill in:
   - **Name:** Your name (appears in "From:")
   - **Email:** `stuart.french@aiglitch.app`
   - **Password:** [Your SMTP password]
4. Tap **Next**
5. For **Incoming Mail Server**, use your existing account settings (it will auto-detect)
   - If Apple doesn't auto-detect, manually enter your email provider's IMAP settings
6. For **Outgoing Mail Server (SMTP)**, enter:
   - **Host:** `smtp.improvmx.com`
   - **Port:** `587`
   - **Use SSL:** Toggle ON
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** [Your SMTP password]
7. Tap **Save**

**Verification:**
- Write a test email to yourself
- Open Compose → check the "From:" line — it should show `stuart.french@aiglitch.app`
- Send and verify it arrives

**If it doesn't work:**
- Verify you copied the SMTP password correctly
- Check "OUTGOING (SMTP) Server Requires Authentication" is enabled
- Try port 465 instead of 587

---

### Mac (Apple Mail)

1. Open **Apple Mail** → **Mail** → **Preferences** → **Accounts**
2. Click **+** → **Other Mail Account**
3. Fill in:
   - **Full Name:** Your name
   - **Email Address:** `stuart.french@aiglitch.app`
   - **Password:** [Your SMTP password]
4. Click **Create**
5. If it fails auto-setup, manually configure **SMTP:**
   - Go to **Mail** → **Preferences** → **Accounts** → Select your account → **Server Settings**
   - **Outgoing Mail Server (SMTP):** Click dropdown → **Edit SMTP Server List**
   - Click **+** to add new server:
     - **Server Name:** `smtp.improvmx.com`
     - **Port:** `587`
     - **Username:** `stuart.french@aiglitch.app`
     - **Password:** [Your SMTP password]
     - **Use SSL/TLS:** Checked
   - Click **OK**
6. Compose a test email and verify the "From:" line shows `stuart.french@aiglitch.app`

---

### Windows (Outlook / Windows Mail)

**Using Outlook Desktop:**

1. Open **Outlook** → **File** → **Add Account**
2. Enter `stuart.french@aiglitch.app` → Click **Advanced Options**
3. Check **Let me set up my account manually**
4. Choose **IMAP** (or POP3, depending on your preference)
5. For **Incoming Server:** Use your main email provider's settings (not ImprovMX)
   - Example: If primary email is Gmail, use Gmail's IMAP settings
6. For **Outgoing Server (SMTP):**
   - **Server:** `smtp.improvmx.com`
   - **Port:** `587`
   - **Encryption:** STARTTLS
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** [Your SMTP password]
7. Click **Next** and verify connection

**Using Gmail in Outlook:**
1. Use your main Google Account login for **Incoming** (IMAP)
2. Use ImprovMX SMTP for **Outgoing**
   - Outlook will use ImprovMX to send emails, but receive them via your main account
   - In the "From:" line, manually select `stuart.french@aiglitch.app` when composing

**Using Windows Mail:**
1. **Settings** → **Accounts** → **Email & accounts** → **+ Add account**
2. Select **Advanced setup** → **IMAP**
3. Incoming server: Your main email provider (Gmail, Outlook, etc.)
4. Outgoing server:
   - **Server:** `smtp.improvmx.com`
   - **Port:** `587`
   - **Encryption Method:** STARTTLS
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** [Your SMTP password]
5. Click **Sign in**

---

### Web Browser (Gmail, Outlook, etc.)

If you use **Gmail Web** or **Outlook Web** and want to send as `@aiglitch.app`:

**Gmail:**
1. Go to **Gmail Settings** → **Accounts and Import** → **Send mail as**
2. Click **Add another email address**
3. Enter `stuart.french@aiglitch.app`
4. Check **Treat as an alias**
5. Click **Next Step** → SMTP Configuration:
   - **SMTP Server:** `smtp.improvmx.com`
   - **Port:** `587` (with STARTTLS) or `465` (with SSL)
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** [Your SMTP password]
6. Click **Add Account**
7. Verify by checking your inbox — Gmail sends a confirmation email to `stuart.french@aiglitch.app`

**Outlook Web:**
1. Go to **Settings** → **Mail** → **Forwarding**
2. Scroll to **Send from another address**
3. Enter `stuart.french@aiglitch.app`
4. Outlook may redirect you to ImprovMX or require SMTP configuration
5. Follow the SMTP settings above if prompted

---

## Recommended Email Workflow

**Best practice for a solo developer:**

| Task | Email Address | How |
|------|---|---|
| Receive all incoming | `sfrench71@me.com` | Automatic (catch-all forwarding) |
| Outreach / Sponsorships | Send FROM `stuart.french@aiglitch.app` | Configure SMTP (Step 2 above) |
| Advertiser inquiries | Send FROM `advertise@aiglitch.app` | Configure SMTP (Step 2 above) |
| Ad partnerships | Send FROM `ads@aiglitch.app` | Configure SMTP (Step 2 above) |

**Why this setup works:**
- All incoming emails land in your personal inbox (`sfrench71@me.com`)
- You can send as different aliases depending on context (outreach, ads, general)
- Nobody needs your personal email address — they contact you via professional aliases
- Zero configuration on iOS/Android — just use your normal mail app

---

## Common Issues & Fixes

### "Authentication Failed" Error

**Cause:** Wrong password

**Fix:**
1. Re-generate SMTP password in ImprovMX dashboard
2. Make sure you copied the **SMTP password**, not your ImprovMX login password
3. Try 3-4 times with the correct password before debugging further

### Emails Send But Appear as "smtp@improvmx.com"

**Cause:** Username is set to `smtp@improvmx.com` instead of your alias

**Fix:**
- In your mail client's SMTP settings, change username from `smtp@improvmx.com` to `stuart.french@aiglitch.app` (or whichever alias you're using)

### "Port 587 not working, try 465"

**Cause:** Some networks block port 587

**Fix:**
1. Try port `465` with SSL instead
2. If both fail, you may be on a network with strict firewall rules (some workplaces, public WiFi)
3. Switch to mobile data or a different network

### Sent emails going to spam

**Cause:** SPF/DKIM not configured on domain

**Fix:**
1. Verify DNS records are set up (see "DNS Configuration" section)
2. Set up DKIM records in ImprovMX dashboard
3. Consider adding a DMARC record for additional credibility
4. Wait 24-48 hours for DNS propagation
5. Ask recipient to whitelist `stuart.french@aiglitch.app`

### Can't find the password I generated

**If you lost your SMTP password:**
1. Go to https://app.improvmx.com → **Account Settings** → **SMTP**
2. You'll see the password you generated (or generate a new one)
3. If you never generated one, click **Generate SMTP Password** now

---

## Security Notes

- **SMTP Password:** Store this securely, treat it like a password
- **Never share:** Don't share SMTP passwords via email, chat, or screenshots
- **Regenerate:** If you suspect compromise, regenerate SMTP password immediately in ImprovMX
- **DKIM/DMARC:** Not yet configured on aiglitch.app (optional but recommended for deliverability)

---

## Related Documentation

- **ImprovMX Dashboard:** https://app.improvmx.com
- **ImprovMX Guides:** https://improvmx.com/guides
- **Vercel DNS Setup:** https://vercel.com/docs/projects/domains

---

## Troubleshooting

### Emails not being received
1. Check ImprovMX dashboard — is forwarding active (green dot)?
2. Check DNS records are correct (MX records pointing to improvmx.com)
3. Check spam/junk folder in sfrench71@me.com
4. Use the **TEST** button next to the alias in ImprovMX dashboard
5. Check ImprovMX email logs (if available on Premium plan)

### Emails going to spam
1. Ensure SPF TXT record is set: `v=spf1 include:spf.improvmx.com ~all`
2. Set up DKIM records (from ImprovMX SMTP settings)
3. Consider adding a DMARC record: `v=DMARC1; p=none; rua=mailto:sfrench71@me.com`

---

## Cost

**Plan:** Premium — $9/month
**Billing:** Monthly via ImprovMX
**What you get:** Unlimited aliases, SMTP sending, email logs, API access, catch-all forwarding

---

## Related

- **Outreach email:** stuart.french@aiglitch.app (used in MasterHQ sponsor emails)
- **Advertiser contact:** advertise@aiglitch.app (used in media kit)
- **MasterHQ email generation:** `/api/outreach` route generates personalized sponsor emails
- **Media Kit:** masterhq.dev/media-kit includes contact information
