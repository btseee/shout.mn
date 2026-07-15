/**
 * Probe shuukh.mn and tender.gov.mn to discover internal API endpoints.
 */
import { chromium } from 'playwright';

async function probeSite(name: string, url: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PROBING: ${name} (${url})`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const apiCalls: { url: string; method: string; status: number }[] = [];

  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('api') || u.includes('Api') || u.includes('/api/') ||
        u.includes('search') || u.includes('shaltgoo') || u.includes('tuuh')) {
      apiCalls.push({ url: u, method: req.method(), status: 0 });
    }
  });

  page.on('response', async (res) => {
    const u = res.url();
    const entry = apiCalls.find(r => r.url === u);
    if (entry) entry.status = res.status();

    if (res.headers()['content-type']?.includes('json') && entry) {
      try {
        const body = await res.json();
        console.log(`\n=== ${res.status()} ${res.url} ===`);
        console.log(JSON.stringify(body).slice(0, 3000));
      } catch {}
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Try searching for keywords
    const searchInputs = await page.$$('input[type="text"], input[type="search"], input.search');
    if (searchInputs.length > 0) {
      console.log(`Found ${searchInputs.length} search input(s), typing "авлига"...`);
      await searchInputs[0].fill('авлига');
      await searchInputs[0].press('Enter');
      await page.waitForTimeout(5000);
    }

    console.log('\n--- API calls captured ---');
    apiCalls.forEach(r => console.log(`${r.method} ${r.url} [${r.status}]`));

    // Dump page content snippet
    const text = await page.textContent('body');
    console.log('\n--- Page text (first 2000 chars) ---');
    console.log(text?.slice(0, 2000));

  } catch (e: any) {
    console.log(`Navigation error: ${e.message?.slice(0, 300)}`);
  }

  await browser.close();
}

async function main() {
  await probeSite('shuukh.mn', 'https://shuukh.mn');
  await probeSite('tender.gov.mn', 'https://tender.gov.mn');
}

main().catch(console.error);
