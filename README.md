# Google Search Console MCP Server

Query Google Search Console data from any AI assistant that supports the MCP protocol - rankings, clicks, impressions, and page-level performance.

## Prerequisites

- Node.js 18+
- A Google account with access to Google Search Console

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Search Console API**:
   - Go to APIs & Services > Library
   - Search for "Search Console API"
   - Click Enable

### 3. Create OAuth2 credentials

1. Go to APIs & Services > Credentials
2. Click Create Credentials > OAuth client ID
3. Application type: **Desktop app** (or Web application)
4. Name it whatever you like
5. Copy the **Client ID** and **Client Secret**

### 4. Configure your `.env` file

```bash
cp .env.example .env
```

Fill in the values:

| Variable | Where to find it |
|---|---|
| `GSC_SITE_URL` | GSC Settings > Association > Sc-domain (e.g. `sc-domain:bwengr.com`) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console > Credentials (from step 3) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console > Credentials (from step 3) |

### 5. Run the server

```bash
npm start
```

On first run, a browser window will open automatically to complete OAuth authentication. After that, tokens are stored locally in `.tokens.json` and you will not be prompted again.

## Connecting to your AI assistant

This server communicates over **stdio** (standard input/output), which is the standard way to connect MCP servers to AI assistants. Configure your AI assistant to use:

```bash
node /path/to/src/index.js
```

Replace `/path/to` with the actual path to this project on your machine.

## Available tools

### getTopQueries

Returns your top search queries ranked by clicks.

- **Parameters:** `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD), `rowLimit` (optional, default 10)
- **Returns:** query, clicks, impressions, CTR, position for each row

### getSiteSummary

Returns overall site search performance totals.

- **Parameters:** `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD)
- **Returns:** total clicks, impressions, CTR, average position

### getPagePerformance

Returns performance data filtered to a specific page.

- **Parameters:** `pageUrl` (exact URL as shown in GSC), `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD)
- **Returns:** clicks, impressions, CTR, position for that page

### getRankingChanges

Finds pages with the biggest position changes between two periods.

- **Parameters:** `days` (number of days to compare, default 28)
- **Returns:** page URL, position change, current position, prior position

## Important

Never commit `.env` or `.tokens.json` to version control. These files are already excluded via `.gitignore`.