/**
 * Scrape shuukh.mn court decisions - improved version.
 * Waits for JS to render actual decision content.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'shuukh-decisions.json');

const CSE_ID = 'c8b944c60a23529bb';

interface Decision {
  title: string;
  url: string;
  court: string;
  date: string;
  content: string;
  keyword: string;
  scrapedAt: string;
}

const KEYWORDS = [
  'авлига',
  'авлигын гэмт хэрэг',
  'нийтийн албаны ашиг сонирхол',
  'хөрөнгө мэдүүлэг зөрчил',
];

async function searchCSE(page: any, keyword: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const results: { title: string; url: string; snippet: string }[] = [];
  try {
    const searchUrl = `https://cse.google.com/cse?cx=${CSE_ID}&q=${encodeURIComponent(keyword + ' site:shuukh.mn/single_case')}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);

    const items = await page.$$eval('.gsc-webResult .gsc-result', (els: any[]) =>
      els.map((el: any) => ({
        title: el.querySelector('.gs-title a')?.textContent?.trim() || '',
        url: el.querySelector('.gs-title a')?.href || '',
        snippet: el.querySelector('.gs-snippet')?.textContent?.trim() || '',
      }))
    );

    for (const item of items) {
      if (item.url.includes('shuukh.mn') && item.url.includes('single_case')) {
        results.push(item);
      }
    }
  } catch (e: any) {
    console.log(`  CSE error: ${e.message?.slice(0, 80)}`);
  }
  return results;
}

async function scrapeDecisionPage(page: any, url: string): Promise<{ court: string; date: string; content: string }> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for content to load (shuukh.mn is a SPA)
    try {
      await page.waitForSelector('.result-content, .case-content, .decision-text, table, .detail', { timeout: 10000 });
    } catch {
      // Fallback: just wait
      await page.waitForTimeout(8000);
    }

    const data = await page.evaluate(() => {
      // Extract court name
      const courtEl = document.querySelector('.court-name, [class*="court"] select option[selected]');
      let court = courtEl?.textContent?.trim() || '';

      // Extract date
      const dateEl = document.querySelector('.date, [class*="date"], time');
      let date = dateEl?.textContent?.trim() || '';

      // Extract decision text - try multiple approaches
      // 1. Look for the main text area
      const textareas = document.querySelectorAll('textarea, .decision-text, .case-text');
      let content = '';
      for (const ta of textareas) {
        const text = (ta.textContent || (ta as HTMLTextAreaElement).value || '').trim();
        if (text.length > content.length) content = text;
      }

      // 2. Look for tables with case info
      if (content.length < 100) {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const text = table.textContent?.trim() || '';
          if (text.length > content.length) content = text;
        }
      }

      // 3. Look for any large text block in the main area
      if (content.length < 100) {
        const main = document.querySelector('.main-content, #content, .content, main');
        if (main) {
          content = main.textContent?.trim() || '';
        }
      }

      // 4. Get all visible text (last resort)
      if (content.length < 100) {
        content = document.body.textContent?.trim() || '';
      }

      return { court, date, content };
    });

    return {
      court: data.court,
      date: data.date,
      content: data.content.slice(0, 8000),
    };
  } catch {
    return { court: '', date: '', content: '' };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allDecisions: Decision[] = [];
  const seenUrls = new Set<string>();

  for (const keyword of KEYWORDS) {
    console.log(`Searching: "${keyword}"...`);
    const results = await searchCSE(page, keyword);
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allDecisions.push({
          title: r.title,
          url: r.url,
          court: '',
          date: '',
          content: r.snippet,
          keyword,
          scrapedAt: new Date().toISOString(),
        });
      }
    }
    console.log(`  ${results.length} results (${allDecisions.length} total unique)`);
    await page.waitForTimeout(2000);
  }

  // Scrape individual pages
  console.log(`\nScraping ${Math.min(allDecisions.length, 25)} decision pages...`);
  for (const decision of allDecisions.slice(0, 25)) {
    try {
      const { court, date, content } = await scrapeDecisionPage(page, decision.url);
      if (content.length > 100) {
        decision.court = court;
        decision.date = date;
        decision.content = content;
        console.log(`✓ ${decision.url.split('single_case/')[1]?.slice(0, 20)} (${content.length} chars)`);
      } else {
        console.log(`✗ ${decision.url.split('single_case/')[1]?.slice(0, 20)} (short: ${content.length})`);
      }
    } catch {}
    await page.waitForTimeout(1500);
  }

  await browser.close();

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(allDecisions, null, 2));
  console.log(`\nSaved ${allDecisions.length} decisions`);
}

main().catch(console.error);
