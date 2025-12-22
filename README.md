# n8n-nodes-jmap

Community node for [n8n](https://n8n.io/) to interact with JMAP email servers ([RFC 8620](https://datatracker.ietf.org/doc/html/rfc8620)/[RFC 8621](https://datatracker.ietf.org/doc/html/rfc8621)).

Compatible with:
- [Apache James](https://james.apache.org/)
- [Twake Mail](https://twake.app/)
- [Stalwart Mail Server](https://stalw.art/)
- [Fastmail](https://www.fastmail.com/)
- Any JMAP-compliant email server

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-jmap`
4. Agree to the risks and click **Install**

### Manual Installation

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-jmap
```

Then restart n8n.

---

## Authentication

This node supports **three authentication methods** to connect to JMAP servers.

### Method 1: Basic Authentication

The simplest method using email and password directly.

**Configuration:**
1. Create a new **JMAP API** credential
2. Set **Authentication Method** to `Basic Auth`
3. Fill in:
   - **JMAP Server URL**: `https://jmap.example.com/jmap`
   - **Email**: `user@example.com`
   - **Password**: Your password

**Use case:** Development, testing, or servers without OAuth2 support.

---

### Method 2: Bearer Token

Use a pre-obtained access token (e.g., from an external OAuth2 flow).

**Configuration:**
1. Create a new **JMAP API** credential
2. Set **Authentication Method** to `Bearer Token`
3. Fill in:
   - **JMAP Server URL**: `https://jmap.example.com/jmap`
   - **Access Token**: Your JWT or access token

**Use case:** Integration with existing authentication systems, tokens obtained via scripts or other workflows.

---

### Method 3: OAuth2 / OIDC with PKCE

Full OAuth2 Authorization Code flow with PKCE (Proof Key for Code Exchange). This is the **recommended method for production** as it provides:
- Automatic token refresh
- No password storage in n8n
- Secure SSO integration

**Configuration:**
1. Create a new **JMAP OAuth2 API** credential
2. Fill in:
   - **Client ID**: Your OIDC client ID
   - **Client Secret**: Leave empty for public clients (PKCE)
   - **Authorization URL**: `https://sso.example.com/oauth2/authorize`
   - **Access Token URL**: `https://sso.example.com/oauth2/token`
   - **JMAP Server URL**: `https://jmap.example.com/jmap`
3. Click **Connect** to initiate the OAuth2 flow
4. Log in with your SSO credentials

**Compatible Identity Providers:**
- [LemonLDAP::NG](https://lemonldap-ng.org/)
- [Keycloak](https://www.keycloak.org/)
- [Auth0](https://auth0.com/)
- Any OAuth2/OIDC compliant provider

#### Example: LemonLDAP::NG Configuration

```
Authorization URL: https://sso.example.com/oauth2/authorize
Access Token URL:  https://sso.example.com/oauth2/token
Client ID:         my-n8n-client
Scope:             openid email profile offline_access
```

#### Example: Keycloak Configuration

```
Authorization URL: https://keycloak.example.com/realms/myrealm/protocol/openid-connect/auth
Access Token URL:  https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token
Client ID:         n8n-jmap-client
Scope:             openid email profile offline_access
```

---

## Nodes

### JMAP Node

Main node for email operations.

| Resource | Operation | Description |
|----------|-----------|-------------|
| Email | Send | Send a new email |
| Email | Reply | Reply to an existing email |
| Email | Get | Retrieve an email by ID |
| Email | Get Many | List emails (with optional mailbox filter) |
| Email | Create Draft | Create a draft without sending |
| Email | Delete | Delete an email |
| Email | Mark as Read | Mark email as read |
| Email | Mark as Unread | Mark email as unread |
| Email | Move | Move email to another mailbox |
| Email | Add Label | Add a mailbox label to an email |
| Email | Remove Label | Remove a mailbox label from an email |
| Email | Get Labels | Get all labels for an email |
| Mailbox | Get | Get mailbox details by ID |
| Mailbox | Get Many | List all mailboxes |
| Thread | Get | Get thread details by ID |
| Thread | Get Many | Get all emails in a thread |

### JMAP Trigger Node

Polling-based trigger for new emails.

| Event | Description |
|-------|-------------|
| New Email | Triggers on any new email |
| New Email in Mailbox | Triggers on new email in a specific mailbox |

**Options:**
- **Simple Output**: Return simplified email data
- **Include Attachments Info**: Include attachment metadata
- **Mark as Read**: Automatically mark fetched emails as read

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Lint
npm run lint

# Format code
npm run format
```

### Local Testing

```bash
# Link for local n8n development
npm link

# In your n8n installation
npm link n8n-nodes-jmap
```

---

## JMAP Protocol

JMAP (JSON Meta Application Protocol) is a modern, efficient alternative to IMAP for email access:

- **Stateless**: No persistent connections required
- **JSON-based**: Easy to parse and debug
- **Efficient**: Batched requests, delta sync
- **Standardized**: RFC 8620 (Core) and RFC 8621 (Mail)

Learn more: [jmap.io](https://jmap.io/)

---

## License

AGPL-3.0

---

## Author

[Michel-Marie Maudet](https://github.com/mmaudet)
