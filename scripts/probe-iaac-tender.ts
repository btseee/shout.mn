/**
 * Probe IAAC asset declaration system and tender.gov.mn
 * with domcontentloaded instead of networkidle.
 */
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // === IAAC ===
  console.log('=== IAAC PROBE ===');
  const iaacPage = await browser.newPage();
  const iaacApi: { url: string; method: string; status: number; body?: string }[] = [];

  iaacPage.on('response', async (res) => {
    const u = res.url();
    if (u.includes('iaac.mn') && !u.includes('.js') && !u.includes('.css') && !u.includes('.png') && !u.includes('.jpg') && !u.includes('.svg') && !u.includes('.woff') && !u.includes('google') && !u.includes('facebook')) {
      const ct = res.headers()['content-type'] || '';
      const entry = { url: u, method: res.request().method(), status: res.status(), body: '' };
      if (ct.includes('json') || ct.includes('text')) {
        try {
          entry.body = (await res.text()).slice(0, 1500);
        } catch {}
      }
      iaacApi.push(entry);
    }
  });

  try {
    await iaacPage.goto('https://iaac.mn', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await iaacPage.waitForTimeout(8000);

    console.log('IAAC page title:', await iaacPage.title());

    // Find all links
    const iaacLinks = await iaacPage.$$eval('a', els =>
      els.map(a => ({ text: (a.textContent || '').trim().slice(0, 80), href: a.href }))
        .filter(l => l.href.includes('iaac.mn') && l.text.length > 0)
    );
    console.log('\nIAAC links (first 50):');
    iaacLinks.slice(0, 50).forEach(l => console.log(`  ${l.text} -> ${l.href}`));

    // Look for "Мэдүүлэг" (declaration) related links
    const declLinks = iaacLinks.filter(l =>
      l.text.includes('мэдүүл') || l.text.includes('Мэдүүл') ||
      l.href.includes('meduulel') || l.href.includes('declaration')
    );
    console.log('\nDeclaration-related links:');
    declLinks.forEach(l => console.log(`  ${l.text} -> ${l.href}`));

    // Try navigating to declaration page
    if (declLinks.length > 0) {
      const targetUrl = declLinks[0].href;
      console.log(`\nNavigating to: ${targetUrl}`);
      await iaacPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await iaacPage.waitForTimeout(8000);

      const bodyText = await iaacPage.textContent('body');
      console.log('Page content (first 3000):');
      console.log(bodyText?.slice(0, 3000));
    }

    console.log('\nIAAC API calls:');
    iaacApi.forEach(r => {
      console.log(`${r.method} ${r.url} [${r.status}]`);
      if (r.body) console.log(`  body: ${r.body.slice(0, 500)}`);
    });
  } catch (e: any) {
    console.log('IAAC error:', e.message?.slice(0, 300));
  }

  // === TENDER ===
  console.log('\n\n=== TENDER PROBE ===');
  const tenderPage = await browser.newPage();
  const tenderApi: { url: string; method: string; status: number; body?: string }[] = [];

  tenderPage.on('response', async (res) => {
    const u = res.url();
    if ((u.includes('tender') || u.includes('procure')) && !u.includes('.js') && !u.includes('.css') && !u.includes('.png')) {
      const ct = res.headers()['content-type'] || '';
      const entry = { url: u, method: res.request().method(), status: res.status(), body: '' };
      if (ct.includes('json')) {
        try {
          entry.body = (await res.text()).slice(0, 1500);
        } catch {}
      }
      tenderApi.push(entry);
    }
  });

  try {
    await tenderPage.goto('https://tender.gov.mn', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await tenderPage.waitForTimeout(8000);

    console.log('Tender page title:', await tenderPage.title());

    const tenderLinks = await tenderPage.$$eval('a', els =>
      els.map(a => ({ text: (a.textContent || '').trim().slice(0, 80), href: a.href }))
        .filter(l => l.text.length > 0 && l.href.includes('tender'))
    );
    console.log('\nTender links (first 30):');
    tenderLinks.slice(0, 30).forEach(l => console.log(`  ${l.text} -> ${l.href}`));

    console.log('\nTender API calls:');
    tenderApi.forEach(r => {
      console.log(`${r.method} ${r.url} [${r.status}]`);
      if (r.body) console.log(`  body: ${r.body.slice(0, 500)}`);
    });
  } catch (e: any) {
    console.log('Tender error:', e.message?.slice(0, 300));
  }

  await browser.close();
}

main().catch(console.error);
