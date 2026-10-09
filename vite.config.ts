import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type Plugin } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;
const isGitHubPages = process.env.HOTELX_GITHUB_PAGES === 'true';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

// Dev-only SMTP sender for the "TEST SEND EMAIL" button. Browsers cannot speak
// SMTP, so the button posts the form values to this localhost endpoint, which
// sends through nodemailer. It never exists in the production build (apply:
// 'serve') and is only reachable on the local dev server.
function devSmtpPlugin(): Plugin {
  const readBody = async (request: AsyncIterable<unknown>) => {
    let raw = '';
    for await (const chunk of request) raw += String(chunk);
    return raw;
  };
  const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
  const reportPlans = [
    { report: 'Booking Status', filename: 'Booking Status (Arrival Next Day).pdf', dates: [isoDay(1), isoDay(1)] },
    { report: 'Manager Report', filename: 'Manager Report (Night Audit).pdf', dates: [isoDay(-1)] },
  ];
  const renderReportPdfs = async (baseUrl: string) => {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    const attachments: { filename: string; content: Buffer }[] = [];
    try {
      for (const plan of reportPlans) {
        const page = await browser.newPage({ viewport: { width: 1680, height: 950 } });
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.getByText('Digital Reporting', { exact: true }).first().click();
        await page.waitForTimeout(1500);
        await page.locator('.digital-report-card', { hasText: plan.report }).first().click();
        await page.waitForTimeout(2000);
        const inputs = page.locator('.report-date-filter input');
        for (let index = 0; index < plan.dates.length; index++) {
          if ((await inputs.count()) > index) await inputs.nth(index).fill(plan.dates[index]);
        }
        await page.waitForTimeout(1500);
        const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
        attachments.push({ filename: plan.filename, content: Buffer.from(pdf) });
        await page.close();
      }
    } finally {
      await browser.close();
    }
    return attachments;
  };
  return {
    name: 'hotelx-dev-smtp',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/send-email', (request, response) => {
        const send = (status: number, payload: unknown) => {
          response.statusCode = status;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(payload));
        };
        void (async () => {
          if (request.method !== 'POST') return send(405, { ok: false, error: 'Use POST.' });
          let body: {
            host?: string; port?: string | number; secure?: boolean; user?: string;
            password?: string; to?: string; subject?: string; html?: string; attachReports?: boolean;
          };
          try {
            body = JSON.parse(await readBody(request));
          } catch {
            return send(400, { ok: false, error: 'Invalid request body.' });
          }
          const { host, port, secure, user, password, to, subject, html, attachReports } = body;
          if (!host || !port || !user || !password || !to) {
            return send(400, { ok: false, error: 'Missing host, port, sender, password or recipient.' });
          }
          try {
            const { default: nodemailer } = await import('nodemailer');
            const transporter = nodemailer.createTransport({
              host,
              port: Number(port),
              secure: Boolean(secure),
              auth: { user, pass: password },
            });
            await transporter.verify();
            let attachments: { filename: string; content: Buffer }[] | undefined;
            if (attachReports) {
              attachments = await renderReportPdfs(`http://${request.headers.host ?? 'localhost:3000'}`);
            }
            const info = await transporter.sendMail({ from: user, to, subject, html, attachments });
            return send(200, { ok: true, messageId: info.messageId, response: info.response, attached: attachments?.map((item) => item.filename) ?? [] });
          } catch (error) {
            return send(502, { ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        })();
      });
    },
  };
}

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      devSmtpPlugin(),
      vinext(),
      ...(isGitHubPages ? [] : [sites(), cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      })]),
    ],
  };
});
