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
