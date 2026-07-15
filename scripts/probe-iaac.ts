/**
 * Probe IAAC site to discover internal API endpoints.
 * Captures XHR/fetch requests made by the frontend.
 */
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const requests: { url: string; method: string; status: number }[] = [];

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('api') || url.includes('Api') || url.includes('API') ||
        url.includes('medeellee') || url.includes('tailan') || url.includes('search') ||
        url.includes('hungulga') || url.includes('hulga')) {
      requests.push({ url, method: req.method(), status: 0 });
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('api') || url.includes('Api') || url.includes('API') ||
        url.includes('medeellee') || url.includes('tailan') || url.includes('search') ||
        url.includes('hungulga') || url.includes('hulga')) {
      const entry = requests.find(r => r.url === url);
      if (entry) entry.status = res.status();

      // Try to read JSON responses
      if (res.headers()['content-type']?.includes('json')) {
        try {
          const body = await res.json();
          console.log(`\n=== ${res.status()} ${url} ===`);
          console.log(JSON.stringify(body).slice(0, 2000));
        } catch {}
      }
    }
  });

  console.log('Navigating to iaac.mn...');
  await page.goto('https://iaac.mn', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('\n=== All API-like requests ===');
  requests.forEach(r => console.log(`${r.method} ${r.url} [${r.status}]`));

  // Try to find asset declaration page
  console.log('\n--- Looking for declaration/meduulel links ---');
  const links = await page.$$eval('a', els =>
    els.filter(a => {
      const text = (a.textContent || '').toLowerCase();
      const href = (a.href || '').toLowerCase();
      return text.includes('мэдүүл') || text.includes('hungulga') || text.includes('hulga') ||
             href.includes('meduulel') || href.includes('hungulga') || href.includes('hulga') ||
             href.includes('asset') || href.includes('declaration');
    }).map(a => ({ text: (a.textContent || '').trim().slice(0, 100), href: a.href }))
  );
  console.log(JSON.stringify(links, null, 2));

  // Try navigating to common IAAC pages
  const tryUrls = [
    'https://iaac.mn/page/meduulel-burgeer',
    'https://iaac.mn/meduulel',
    'https://iaac.mn/page/593',
    'https://hulga.iaac.mn',
    'https://meduulel.iaac.mn',
  ];

  for (const url of tryUrls) {
    try {
      console.log(`\nTrying: ${url}`);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log(`Status: ${resp?.status()}`);
      if (resp?.ok()) {
        const title = await page.title();
        console.log(`Title: ${title}`);
      }
    } catch (e: any) {
      console.log(`Error: ${e.message?.slice(0, 200)}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
