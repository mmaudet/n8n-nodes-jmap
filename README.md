# n8n-nodes-jmap

Community node for [n8n](https://n8n.io/) to interact with JMAP email servers ([RFC 8620](https://datatracker.ietf.org/doc/html/rfc8620)/[RFC 8621](https://datatracker.ietf.org/doc/html/rfc8621)).

Compatible with:
- [Apache James](https://james.apache.org/)
- [Twake Mail](https://twake.app/) by [LINAGORA](https://linagora.com/)
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
| Email | Get Many | List emails with advanced search filters |
| Email | Get Attachments | Download attachments as binary data |
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

## Features

### Advanced Email Search

The **Get Many** operation supports powerful search filters based on JMAP RFC 8621:

| Filter | Description |
|--------|-------------|
| **Received After** | Emails received after a specific date |
| **Received Before** | Emails received before a specific date |
| **From Contains** | Filter by sender address |
| **To Contains** | Filter by recipient address |
| **Subject Contains** | Filter by subject line |
| **Full Text Search** | Search in subject, body, and addresses |
| **Has Attachment** | Only emails with attachments |
| **Unread Only** | Only unread emails |
| **Flagged Only** | Only starred/flagged emails |

Combine multiple filters for precise email retrieval.

### Attachment Handling

The **Get Attachments** operation downloads email attachments as binary data, ready to use with other n8n nodes:

- **Inline image filtering**: Exclude embedded images (signatures, logos) by default
- **MIME type filtering**: Filter by file type (e.g., `application/pdf`, `image/*`)
- **Native compatibility**: Works seamlessly with n8n's Compression, Google Drive, S3, and other nodes

Example workflow: `JMAP Trigger` > `Get Attachments` > `Compression` (extract ZIP) > `Google Drive` (upload)

---

## AI Agent Integration

This node can be used as a tool by n8n AI Agents, enabling autonomous email operations.

### Setup

1. Ensure you're using n8n version 1.x or later
2. The node will automatically appear in the AI Agent's tool list

### Example Use Cases

- **Email assistant**: Let the AI read, search, and respond to emails
- **Automated triage**: AI categorizes and labels incoming emails
- **Smart notifications**: AI analyzes email content and triggers actions

### Supported Operations as AI Tool

The AI Agent can use all JMAP operations:
- Search emails with natural language queries
- Read and analyze email content
- Send replies based on context
- Organize emails (labels, folders, flags)
- Download and process attachments

---

## Contributing

Contributions are welcome! This project is open source and we encourage the community to help improve it.

### How to Contribute

1. **Fork** the repository
2. **Create a branch** for your feature or fix: `git checkout -b feature/my-feature`
3. **Make your changes** and test them locally
4. **Run linting**: `npm run lint`
5. **Commit** with a clear message
6. **Push** to your fork and open a **Pull Request**

### Ideas for Contributions

- Support for additional JMAP capabilities (Calendar, Contacts)
- Improved error handling and messages
- Additional search filters
- Documentation improvements
- Bug fixes and optimizations

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/n8n-nodes-jmap.git
cd n8n-nodes-jmap

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

### Testing Locally with n8n

```bash
# Start n8n with the local node
N8N_CUSTOM_EXTENSIONS="/path/to/n8n-nodes-jmap" n8n start
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

[Michel-Marie MAUDET](https://github.com/mmaudet)

This project is developed with the support of [LINAGORA](https://linagora.com/) and [Twake](https://twake.app/).
