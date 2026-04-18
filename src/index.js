import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.join(__dirname, '.tokens.json');

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

let oauth2Client;
let searchconsole;

function loadTokens() {
  if (fs.existsSync(TOKENS_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    oauth2Client.setCredentials(tokens);
    return true;
  }
  return false;
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens));
}

async function authenticate() {
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth/callback'
  );

  if (loadTokens()) {
    searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    return;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.error('Open this URL in your browser to authorize:');
  console.error(authUrl);

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const code = await new Promise(resolve => rl.question('Enter authorization code: ', resolve));
  rl.close();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  saveTokens(tokens);
  searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
}

const server = new McpServer({
  name: 'bw-gsc-mcp',
  version: '1.0.0',
});

server.setToolRequestHandlers(
  {
    name: 'getTopQueries',
    description: 'Get top search queries by clicks from Google Search Console',
    inputSchema: {
      startDate: { type: 'string', description: 'Start date YYYY-MM-DD', default: '28daysAgo' },
      endDate: { type: 'string', description: 'End date YYYY-MM-DD', default: 'today' },
      rowLimit: { type: 'number', description: 'Max rows to return', default: 25 },
    },
  },
  async (args) => {
    if (!searchconsole) await authenticate();

    const siteUrl = process.env.GSC_SITE_URL;
    const endDate = args.endDate || new Date().toISOString().split('T')[0];
    const startDate = args.startDate || '28daysAgo';

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowCount: args.rowLimit || 25,
        aggregationType: 'byPage',
      },
    });

    const rows = response.data.rows || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            rows.map(row => ({
              query: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: (row.ctr * 100).toFixed(2) + '%',
              position: row.position.toFixed(1),
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

server.setToolRequestHandlers(
  {
    name: 'getPagePerformance',
    description: 'Get performance data for specific pages',
    inputSchema: {
      pageUrl: { type: 'string', description: 'Specific page URL to query' },
      startDate: { type: 'string', description: 'Start date YYYY-MM-DD', default: '28daysAgo' },
      endDate: { type: 'string', description: 'End date YYYY-MM-DD', default: 'today' },
    },
  },
  async (args) => {
    if (!searchconsole) await authenticate();

    const siteUrl = process.env.GSC_SITE_URL;
    const endDate = args.endDate || new Date().toISOString().split('T')[0];
    const startDate = args.startDate || '28daysAgo';

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowCount: 100,
        aggregationType: 'byPage',
      },
    });

    const rows = response.data.rows || [];
    const pageRows = rows.filter(row => row.keys[1] === args.pageUrl);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            pageRows.map(row => ({
              query: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: (row.ctr * 100).toFixed(2) + '%',
              position: row.position.toFixed(1),
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

server.setToolRequestHandlers(
  {
    name: 'getSiteSummary',
    description: 'Get overall site search performance summary',
    inputSchema: {
      startDate: { type: 'string', description: 'Start date YYYY-MM-DD', default: '28daysAgo' },
      endDate: { type: 'string', description: 'End date YYYY-MM-DD', default: 'today' },
    },
  },
  async (args) => {
    if (!searchconsole) await authenticate();

    const siteUrl = process.env.GSC_SITE_URL;
    const endDate = args.endDate || new Date().toISOString().split('T')[0];
    const startDate = args.startDate || '28daysAgo';

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        rowCount: 1,
      },
    });

    const totals = response.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              dateRange: `${startDate} to ${endDate}`,
              totalClicks: totals.clicks,
              totalImpressions: totals.impressions,
              averageCtr: (totals.ctr * 100).toFixed(2) + '%',
              averagePosition: totals.position.toFixed(1),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.setToolRequestHandlers(
  {
    name: 'getRankingChanges',
    description: 'Find pages with significant ranking changes',
    inputSchema: {
      days: { type: 'number', description: 'Number of days to compare', default: 28 },
    },
  },
  async (args) => {
    if (!searchconsole) await authenticate();

    const siteUrl = process.env.GSC_SITE_URL;
    const days = args.days || 28;

    const period2Start = new Date();
    period2Start.setDate(period2Start.getDate() - days * 2);
    const period1Start = new Date(period2Start);
    period1Start.setDate(period1Start.getDate() - days);

    const [period1, period2] = await Promise.all([
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: period1Start.toISOString().split('T')[0],
          endDate: period2Start.toISOString().split('T')[0],
          dimensions: ['page'],
          rowCount: 1000,
        },
      }),
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: period2Start.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          dimensions: ['page'],
          rowCount: 1000,
        },
      }),
    ]);

    const p1Map = new Map((period1.data.rows || []).map(r => [r.keys[0], r]));
    const p2Map = new Map((period2.data.rows || []).map(r => [r.keys[0], r]));

    const changes = [];
    for (const [page, p2Row] of p2Map) {
      const p1Row = p1Map.get(page);
      if (p1Row) {
        const posDiff = p1Row.position - p2Row.position;
        if (Math.abs(posDiff) >= 5) {
          changes.push({
            page,
            previousPosition: p1Row.position.toFixed(1),
            currentPosition: p2Row.position.toFixed(1),
            positionChange: posDiff > 0 ? `+${posDiff.toFixed(1)}` : posDiff.toFixed(1),
            previousClicks: p1Row.clicks,
            currentClicks: p2Row.clicks,
          });
        }
      }
    }

    changes.sort((a, b) => parseFloat(b.positionChange) - parseFloat(a.positionChange));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(changes.slice(0, 25), null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GSC MCP Server running');
}

main().catch(console.error);