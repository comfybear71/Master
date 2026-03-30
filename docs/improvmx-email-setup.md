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

ImprovMX Premium includes SMTP for sending emails as your custom domain aliases.

### Prerequisites (Do These First)

Before configuring any mail client, complete these 3 steps:

#### Step 1: Create SMTP Credentials

1. Go to https://app.improvmx.com
2. Click the **settings cogwheel** next to `aiglitch.app` → **SMTP Credentials**
3. Fill in the **username** (alias name, e.g. `stuart.french`) and choose a **password**
4. Click **Add**

You now have an SMTP credential: `stuart.french@aiglitch.app` with your chosen password.

**Repeat for each alias you want to send from** (e.g. `ads`, `architect`).

#### Step 2: Add DKIM & DMARC DNS Records

**Required** — without these, your sent emails will be rejected or go to spam.

1. In ImprovMX, click cogwheel next to `aiglitch.app` → **DNS Settings**
2. Scroll to the bottom to see the generated records
3. Add these to **Vercel DNS** (Domains → aiglitch.app):

| Type | Name | Value |
|------|------|-------|
| CNAME | `dkimprovmx1._domainkey` | `dkimprovmx1.improvmx.com` |
| CNAME | `dkimprovmx2._domainkey` | `dkimprovmx2.improvmx.com` |
| TXT | `_dmarc` | (copy exact value from ImprovMX dashboard) |

4. Wait for DNS propagation (minutes to 48 hours)
5. Use the **ImprovMX Inspector** tool to verify records are active

#### Step 3: Gmail App Password (Required for iOS/macOS)

Since emails forward to sfrench71@me.com (iCloud/Gmail), Apple Mail needs a Gmail App Password for incoming mail.

1. Go to https://myaccount.google.com/apppasswords
2. **Two-Step Verification must be enabled** on your Google account first
3. Create a new App Password for "Mail"
4. Copy the 16-character password — you'll use this for incoming mail on Apple devices

### SMTP Connection Settings

These are the same for ALL mail clients:

```
SMTP Server:  smtp.improvmx.com
Port:         587
Security:     TLS (STARTTLS)
Username:     stuart.french@aiglitch.app (your full alias)
Password:     The password you chose in Step 1
```

---

## How to Use @aiglitch.app Emails on Your Devices

### Receiving Emails

All emails to ANY `@aiglitch.app` address are **automatically forwarded** to `sfrench71@me.com`. No configuration needed — they appear in your normal inbox on every device.

**Example:** Someone emails ads@aiglitch.app → arrives in sfrench71@me.com instantly.

---

### iPhone / iPad (Apple Mail)

1. **Settings** → **Apps** → **Mail** → **Mail Accounts** → **Add Account** → **Other** → **Add Mail Account**
2. Enter:
   - **Name:** Your display name
   - **Email:** `stuart.french@aiglitch.app`
   - **Password:** Your Gmail App Password (from Step 3)
   - **Description:** e.g. "AIGlitch Email"
3. Tap **Next**, then configure:
   - **Incoming Mail Server (IMAP):**
     - Host Name: `imap.gmail.com`
     - Username: Your full Gmail address (e.g. `sfrench71@gmail.com`)
     - Password: Gmail App Password
   - **Outgoing Mail Server (SMTP):**
     - Host Name: `smtp.improvmx.com`
     - Username: `stuart.french@aiglitch.app`
     - Password: Your ImprovMX SMTP password (from Step 1)
4. Tap **Next**, allow verification, then **Save**
5. Disable Notes syncing unless needed
6. Compose a test email — verify "From:" shows `stuart.french@aiglitch.app`

**Tip:** For Google Contacts/Calendar sync, add your Google account separately via Settings → Mail → Accounts → Add Account → Google (disable Mail, enable Contacts/Calendar).

---

### Mac (Apple Mail)

1. **Mail** → **Add Account** → **Other Mail Account...** → **Continue**
2. Enter your display name, email (`stuart.french@aiglitch.app`), and Gmail App Password
3. Click **Sign In** (verification failure is normal at this step — proceed anyway)
4. Configure:
   - **Email:** `stuart.french@aiglitch.app`
   - **Username:** Your Gmail address
   - **Password:** Gmail App Password
   - **Account Type:** IMAP
   - **Incoming server:** `imap.gmail.com`
   - **Outgoing server:** `smtp.improvmx.com`
5. Click **Sign In** again, proceed past warnings by clicking **Next**
6. Keep only **Mail** checked, click **Done**
7. **Critical — fix outgoing server:** Go to **Mail** → **Settings** → **Accounts** → **Server Settings**:
   - **Outgoing Mail (SMTP):**
     - Username: `stuart.french@aiglitch.app` (your ImprovMX credential, NOT Gmail)
     - Password: Your ImprovMX SMTP password
     - Host Name: `smtp.improvmx.com`
     - Port: `587`
     - Use TLS/SSL: **Enabled**
     - Authentication: **Password**
     - **Uncheck** "Automatically manage connection settings"
8. Compose test email — verify "From:" shows your alias

---

### Gmail Web (Send As)

1. In Gmail, click **cogwheel** → **See all Settings** → **Accounts and Import**
2. Under **"Send mail as"**, click **Add another email address**
3. Enter `stuart.french@aiglitch.app`
4. **UNCHECK** "Treat as an alias"
5. Click **Next Step** → SMTP Configuration:
   - **SMTP Server:** `smtp.improvmx.com`
   - **Port:** `587`
   - **Username:** `stuart.french@aiglitch.app`
   - **Password:** Your ImprovMX SMTP password
   - **Security:** Secured connection using TLS
6. Click **Add Account**
7. Check your inbox for Gmail's confirmation email → click the link or enter the code
8. Test: Compose new email, select alias from "From:" dropdown, send to a DIFFERENT address

**Note:** You can add multiple aliases by repeating these steps for each one.

---

### Microsoft Outlook — NOT COMPATIBLE

**ImprovMX SMTP does not work with Microsoft Outlook.** This is a permanent technical limitation — Outlook requires the sending and receiving accounts to be from the same provider and doesn't allow separate SMTP/IMAP configuration.

**Alternative:** Use **Mozilla Thunderbird** instead (allows independent incoming/outgoing server configuration).

---

## Recommended Email Workflow

| Task | Send From | Receive At |
|------|-----------|------------|
| Sponsor outreach | `stuart.french@aiglitch.app` | sfrench71@me.com (auto-forward) |
| Ad partnerships | `ads@aiglitch.app` | sfrench71@me.com (auto-forward) |
| Advertiser inquiries | `advertise@aiglitch.app` | sfrench71@me.com (auto-forward) |
| General receiving | — | sfrench71@me.com (catch-all) |

**Why this works:**
- All incoming emails land in your personal inbox — no extra apps
- Send as different aliases depending on context
- Professional appearance — nobody sees your personal email
- Works on iPhone, iPad, Mac, and Gmail web

---

## Troubleshooting

### "Authentication Failed"

- Make sure you're using the **ImprovMX SMTP password** (from Step 1), not your ImprovMX login password
- Verify the username is your **full alias** (e.g. `stuart.french@aiglitch.app`), not just `stuart.french`
- Re-create the SMTP credential in ImprovMX if needed

### Emails going to spam

- **DKIM records not set up** — add the two CNAME records (see Step 2)
- **DMARC not configured** — add the TXT record from ImprovMX dashboard
- Wait 24-48 hours after adding DNS records
- Use ImprovMX Inspector to verify records are active

### "From:" shows wrong address

- In SMTP settings, change username from `smtp@improvmx.com` to your alias
- On macOS: Mail → Settings → Accounts → Server Settings → fix Outgoing username

### Port 587 blocked

- Some networks/firewalls block port 587
- Try mobile data or a different network
- ImprovMX only supports port 587 with TLS

### Gmail verification email not arriving

- The confirmation email goes to sfrench71@me.com (via catch-all forwarding)
- Check spam/junk folder
- Click **Resend** in Gmail settings if needed

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
