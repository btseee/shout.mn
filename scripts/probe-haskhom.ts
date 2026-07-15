/**
 * Find the HASKHOM (asset declaration) viewing system URL from IAAC.
 */
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://iaac.mn/statement', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);

  // Find all links with their hrefs
  const allLinks = await page.$$eval('a', els =>
    els.map(a => ({ text: (a.textContent || '').trim().slice(0, 100), href: a.href }))
      .filter(l => l.href.length > 0 && l.href !== '#')
  );

  console.log('All links on /statement page:');
  allLinks.forEach(l => console.log(`  "${l.text}" -> ${l.href}`));

  // Find buttons too
  const buttons = await page.$$eval('button, [role="button"], .btn, input[type="submit"]', els =>
    els.map(e => ({ text: (e.textContent || e.getAttribute('value') || '').trim().slice(0, 100), tag: e.tagName }))
  );
  console.log('\nButtons:');
  buttons.forEach(b => console.log(`  [${b.tag}] "${b.text}"`));

  // Check for iframes
  const iframes = await page.$$eval('iframe', els =>
    els.map(e => ({ src: e.src, id: e.id }))
  );
  console.log('\nIframes:');
  iframes.forEach(i => console.log(`  id=${i.id} src=${i.src}`));

  // Try haskhom subdomains
  const tryUrls = [
    'https://haskhom.iaac.mn',
    'https://hasxom.iaac.mn',
    'https://meduulel.iaac.mn',
    'https://hacx.iaac.mn',
    'https://open.iaac.mn',
  ];

  for (const url of tryUrls) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log(`\n${url} -> ${resp?.status()}`);
      if (resp?.ok()) {
        const title = await page.title();
        console.log(`  Title: ${title}`);
        const bodyText = await page.textContent('body');
        console.log(`  Body: ${bodyText?.slice(0, 500)}`);
      }
    } catch (e: any) {
      console.log(`\n${url} -> ERROR: ${e.message?.slice(0, 100)}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
