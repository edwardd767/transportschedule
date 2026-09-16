import { chromium } from 'playwright';

const [url = 'http://localhost:3000/', selector, out = 'work/inspect.png'] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out });

if (selector) {
  const nodes = await page.$$(selector);
  console.log(`${nodes.length} match(es) for ${selector}`);
  for (const [index, node] of nodes.entries()) {
    console.log(`--- ${index} ---\n${await node.evaluate((element) => element.outerHTML)}`);
  }
} else {
  console.log(await page.content());
}

if (errors.length) console.log(`\nconsole errors:\n${errors.join('\n')}`);
console.log(`\nscreenshot: ${out}`);
await browser.close();
