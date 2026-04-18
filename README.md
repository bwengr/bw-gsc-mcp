# Google Search Console MCP Server

MCP server for querying Google Search Console data - rankings, clicks, impressions for websites.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**

   Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   You'll need:
   - `GSC_SITE_URL`: Your site URL in GSC (e.g., `sc-domain:bwengr.com`)
   - `GOOGLE_CLIENT_ID`: OAuth2 client ID from Google Cloud Console
   - `GOOGLE_CLIENT_SECRET`: OAuth2 client secret

3. **Get OAuth2 credentials:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project or select existing
   - Enable "Search Console API"
   - Create OAuth2 credentials (Desktop app or Web application)
   - Add `http://localhost:3000/oauth/callback` as redirect URI
   - Copy Client ID and Secret to `.env`

## Usage

```bash
npm start
```

## Available MCP Tools

- `getTopQueries` - Get top search queries by clicks
- `getPagePerformance` - Get performance data for specific pages
- `getSiteSummary` - Get overall site search performance
- `getRankingChanges` - Find pages with significant ranking changes

## Credentials

**NEVER commit `.env` to GitHub.** Credentials are stored locally only.