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

### Required for SMTP Sending (DKIM & DMARC)

To send emails as `stuart.french@aiglitch.app`, you MUST add DKIM and DMARC records. Without these, sent emails will be rejected or go to spam.

| Type | Name | Value | Purpose |
|---|---|---|---|
| CNAME | `dkimprovmx1._domainkey` | `dkimprovmx1.improvmx.com` | DKIM signing key 1 |
| CNAME | `dkimprovmx2._domainkey` | `dkimprovmx2.improvmx.com` | DKIM signing key 2 |
| TXT | `_dmarc` | (shown in ImprovMX dashboard → DNS Settings) | DMARC policy |

**How to find your records:** Go to ImprovMX → click cogwheel next to aiglitch.app → DNS Settings → scroll to bottom.

**Status:** DKIM/DMARC records need to be added to Vercel DNS for aiglitch.app before SMTP sending will work reliably.

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

## Sending Emails FROM @aiglitch.app

ImprovMX Premium includes SMTP for sending emails as your custom domain aliases. You use ImprovMX for **outgoing** (sending) and iCloud for **incoming** (receiving via forwarding to sfrench71@me.com).

---

### Setup Checklist (Complete Before Configuring Devices)

#### 1. Create SMTP Credentials in ImprovMX

1. Go to https://app.improvmx.com
2. Click the **cogwheel** next to `aiglitch.app` → **SMTP Credentials** tab
3. In the username field, type your alias (e.g. `stuart.french`)
4. Choose a password and click **Add**
5. **Save your credentials:**
   - Username: `stuart.french@aiglitch.app`
   - Password: whatever you chose
6. Repeat for each alias you want to send from (e.g. `ads`, `architect`)

#### 2. Add DKIM & DMARC DNS Records

**Required** — without these, sent emails will go to spam or be rejected.

1. In ImprovMX, click cogwheel next to `aiglitch.app` → **DNS Settings** tab
2. Scroll to the bottom — DKIM records appear after creating an SMTP credential
3. Add these records in **Vercel** (vercel.com → Domains → aiglitch.app):

| Type | Name | Value |
|------|------|-------|
| CNAME | `dkimprovmx1._domainkey` | `dkimprovmx1.improvmx.com` |
| CNAME | `dkimprovmx2._domainkey` | `dkimprovmx2.improvmx.com` |
| TXT | `_dmarc` | Copy exact value from ImprovMX DNS Settings page |

4. Wait for DNS propagation (usually minutes, can take up to 48 hours)
5. Verify in ImprovMX — green checkmarks appear when records are detected

#### 3. Generate an iCloud App-Specific Password

Since your inbox is `sfrench71@me.com` (iCloud), you need an App-Specific Password for third-party mail clients to access iCloud IMAP.

1. Go to https://appleid.apple.com → **Sign-In & Security** → **App-Specific Passwords**
2. Click **Generate an app-specific password**
3. Name it something like "AIGlitch Email"
4. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
5. **Save this password** — you'll use it as the incoming mail password on all devices

**Note:** Two-Factor Authentication must be enabled on your Apple ID (it is by default).

---

### Connection Settings Reference

**Outgoing Mail (SMTP) — ImprovMX:**

| Setting | Value |
|---------|-------|
| Server | `smtp.improvmx.com` |
| Port | `587` |
| Security | TLS |
| Username | `stuart.french@aiglitch.app` |
| Password | Your ImprovMX SMTP password |

**Incoming Mail (IMAP) — iCloud:**

| Setting | Value |
|---------|-------|
| Server | `imap.mail.me.com` |
| Port | `993` |
| Security | SSL |
| Username | `sfrench71` (without @me.com) |
| Password | Your iCloud App-Specific Password |

---

## Device Setup Guides

### Receiving Emails (Already Working)

All emails to ANY `@aiglitch.app` address are **automatically forwarded** to `sfrench71@me.com`. They appear in your normal inbox on every device — iPhone, iPad, Mac, PC. No configuration needed for receiving.

---

### iPhone / iPad (Apple Mail)

1. Open **Settings** → **Apps** → **Mail** → **Mail Accounts** → **Add Account**
2. Tap **Other** → **Add Mail Account**
3. Fill in:
   - **Name:** Stuart French (or whatever you want in the "From" line)
   - **Email:** `stuart.french@aiglitch.app`
   - **Password:** Your iCloud App-Specific Password
   - **Description:** AIGlitch
4. Tap **Next** — it will fail auto-detection. That's normal.
5. Select **IMAP** (not POP)
6. Configure **Incoming Mail Server:**
   - **Host Name:** `imap.mail.me.com`
   - **Username:** `sfrench71`
   - **Password:** Your iCloud App-Specific Password
7. Configure **Outgoing Mail Server:**
   - **Host Name:** `smtp.improvmx.com`
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** Your ImprovMX SMTP password
8. Tap **Next** → allow verification → **Save**
9. **Test:** Compose a new email. The "From:" should show `stuart.french@aiglitch.app`. Send a test to a different email address to confirm delivery.

---

### iPad (Same as iPhone)

The setup is identical to iPhone. Follow the iPhone steps above — iOS and iPadOS use the same Mail settings path.

---

### Mac (Apple Mail)

1. Open **Mail** → **Mail** menu → **Add Account** → **Other Mail Account** → **Continue**
2. Enter:
   - **Name:** Stuart French
   - **Email:** `stuart.french@aiglitch.app`
   - **Password:** Your iCloud App-Specific Password
3. Click **Sign In** — it will fail. This is normal. Click **Next** to continue manually.
4. Set **Account Type:** IMAP
5. Configure:
   - **Incoming Mail Server:** `imap.mail.me.com`
   - **Outgoing Mail Server:** `smtp.improvmx.com`
6. Click **Sign In** → proceed past any warnings
7. **Critical step — fix outgoing server settings:**
   - Go to **Mail** → **Settings** → **Accounts** → select the new account → **Server Settings**
   - Under **Outgoing Mail Server (SMTP):**
     - **Username:** `stuart.french@aiglitch.app` (NOT your iCloud username)
     - **Password:** Your ImprovMX SMTP password (NOT your iCloud password)
     - **Host Name:** `smtp.improvmx.com`
     - **Port:** `587`
     - **Use TLS/SSL:** Checked
     - **Authentication:** Password
     - **Uncheck** "Automatically manage connection settings"
   - Click **Save**
8. **Test:** Compose an email, verify "From:" shows `stuart.french@aiglitch.app`, send to a different address.

---

### PC — Mozilla Thunderbird (Recommended)

**Microsoft Outlook is NOT compatible with ImprovMX** — it requires sending and receiving from the same provider. Use **Thunderbird** instead (free, open source).

1. Download Thunderbird from https://www.thunderbird.net
2. Open Thunderbird → **Account Settings** → **Account Actions** → **Add Mail Account**
3. Enter:
   - **Your full name:** Stuart French
   - **Email address:** `stuart.french@aiglitch.app`
   - **Password:** Your iCloud App-Specific Password
4. Click **Configure manually**
5. Set **Incoming:**
   - **Protocol:** IMAP
   - **Server:** `imap.mail.me.com`
   - **Port:** `993`
   - **SSL:** SSL/TLS
   - **Authentication:** Normal password
   - **Username:** `sfrench71`
6. Set **Outgoing:**
   - **Server:** `smtp.improvmx.com`
   - **Port:** `587`
   - **SSL:** STARTTLS
   - **Authentication:** Normal password
   - **Username:** `stuart.french@aiglitch.app`
7. Click **Done**
8. When prompted for passwords:
   - Incoming: Enter your **iCloud App-Specific Password**
   - Outgoing: Enter your **ImprovMX SMTP password**
9. **Test:** Send an email to a different address and verify delivery.

---

### PC — Windows Mail (Basic Alternative)

If you don't want to install Thunderbird:

1. Open **Mail** app → **Settings** → **Manage Accounts** → **Add Account**
2. Select **Other account (POP, IMAP)**
3. Enter:
   - **Email address:** `stuart.french@aiglitch.app`
   - **Send messages using:** Stuart French
   - **Password:** Your iCloud App-Specific Password
4. Click **Sign in** — if auto-setup fails, configure manually:
   - **Incoming server:** `imap.mail.me.com` (port 993, SSL)
   - **Outgoing server:** `smtp.improvmx.com` (port 587, STARTTLS)
   - **Outgoing username:** `stuart.french@aiglitch.app`
   - **Outgoing password:** Your ImprovMX SMTP password
5. **Test:** Send an email to verify.

**Note:** Windows Mail has limited manual SMTP config. If it doesn't work, use Thunderbird.

---

### Gmail Web (Send As — No Incoming Needed)

If you also use Gmail and want to send as @aiglitch.app from there:

1. **Gmail Settings** (cogwheel) → **See all settings** → **Accounts and Import** tab
2. Under **"Send mail as"**, click **Add another email address**
3. Enter `stuart.french@aiglitch.app` → **UNCHECK** "Treat as an alias" → **Next**
4. Configure SMTP:
   - **SMTP Server:** `smtp.improvmx.com`
   - **Port:** `587`
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** Your ImprovMX SMTP password
   - **Secured connection using TLS:** Selected
5. Click **Add Account**
6. Gmail sends a confirmation email → it forwards to `sfrench71@me.com` → click the link or enter the code
7. **Test:** Compose a new email, select your alias from the "From:" dropdown, send to a different address

---

### Microsoft Outlook — NOT COMPATIBLE

ImprovMX SMTP does **not** work with Microsoft Outlook (desktop or web). This is a permanent limitation — Outlook requires the sending and receiving servers to be from the same provider.

**Use Mozilla Thunderbird instead** (see PC section above).

---

## Quick Reference Card

| What | Where | Credentials |
|------|-------|-------------|
| **Receive** @aiglitch.app email | Check sfrench71@me.com | Automatic (forwarding) |
| **Send** from iPhone/iPad | Apple Mail (add new account) | IMAP: iCloud App Password / SMTP: ImprovMX password |
| **Send** from Mac | Apple Mail (add new account) | IMAP: iCloud App Password / SMTP: ImprovMX password |
| **Send** from PC | Thunderbird (not Outlook) | IMAP: iCloud App Password / SMTP: ImprovMX password |
| **Send** from Gmail web | Gmail → Send mail as | SMTP: ImprovMX password only |

---

## Troubleshooting

### "Authentication Failed" on outgoing

- Verify you're using the **ImprovMX SMTP password**, not your iCloud or ImprovMX login password
- Username must be the **full alias** (e.g. `stuart.french@aiglitch.app`), not just `stuart.french`
- Re-create the SMTP credential in ImprovMX if needed

### "Authentication Failed" on incoming

- Verify you're using the **iCloud App-Specific Password**, not your Apple ID password
- Username for iCloud IMAP is just `sfrench71` (without @me.com)
- Generate a new App-Specific Password at https://appleid.apple.com if the old one isn't working

### Sent emails going to spam

1. Check DKIM records are added in Vercel DNS (two CNAME records)
2. Check DMARC record is added in Vercel DNS
3. Verify records in ImprovMX DNS Settings tab (green checkmarks)
4. Wait 24-48 hours after adding records for propagation
5. Ask recipient to check spam folder and whitelist your address

### "From:" shows wrong address

- On iOS: Check Outgoing Mail Server settings — username must be `stuart.french@aiglitch.app`
- On macOS: Mail → Settings → Accounts → Server Settings → fix Outgoing username
- On Thunderbird: Account Settings → Outgoing Server → verify username

### Port 587 blocked

- Some networks/firewalls block port 587
- Switch to mobile data or a different WiFi network
- ImprovMX only supports port 587 with TLS — no alternatives

### Emails not being received (forwarding issues)

1. Check ImprovMX dashboard — is forwarding active (green dot)?
2. Check MX records in Vercel DNS (mx1.improvmx.com priority 10, mx2.improvmx.com priority 20)
3. Check spam/junk folder in sfrench71@me.com
4. Use the **TEST** button next to the alias in ImprovMX dashboard
5. Check ImprovMX **Logs** tab for delivery status

---

## Cost

**Plan:** ImprovMX Premium — $9/month
**Billing:** Monthly
**Includes:** Unlimited aliases, SMTP sending, DKIM/DMARC, email logs, API access, catch-all forwarding

---

## Related

- **Outreach email:** stuart.french@aiglitch.app
- **Advertiser contact:** advertise@aiglitch.app
- **ImprovMX Dashboard:** https://app.improvmx.com
- **ImprovMX SMTP Guides:** https://improvmx.com/guides
- **Apple App-Specific Passwords:** https://appleid.apple.com
- **Thunderbird Download:** https://www.thunderbird.net
