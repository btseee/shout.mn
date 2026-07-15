/**
 * Scrape individual IAAC article pages for full content.
 * Targets specific nitem URLs for detailed extraction.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

async function scrapeFullArticle(page: any, url: string): Promise<string> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for content to render
    await page.waitForTimeout(6000);

    // Try to get the main article content
    const content = await page.evaluate(() => {
      // Remove navigation, header, footer
      const removeSelectors = ['nav', 'header', 'footer', '.menu', '.sidebar', '.social'];

      // Get all text nodes in the main content area
      const mainContent = document.querySelector('.detail, .article, .content, main, #content');
      if (mainContent) {
        // Clone and remove nav elements
        const clone = mainContent.cloneNode(true) as HTMLElement;
        for (const sel of removeSelectors) {
          clone.querySelectorAll(sel).forEach(el => el.remove());
        }
        return clone.textContent?.trim() || '';
      }

      // Fallback: get body text and remove known nav
      const body = document.body.cloneNode(true) as HTMLElement;
      for (const sel of removeSelectors) {
        body.querySelectorAll(sel).forEach(el => el.remove());
      }
      return body.textContent?.trim() || '';
    });

    return content.slice(0, 15000);
  } catch {
    return '';
  }
}

async function main() {
  // Read existing articles
  const existingPath = join(DATA_DIR, 'iaac-news.json');
  let articles: any[] = [];
  try {
    articles = JSON.parse(readFileSync(existingPath, 'utf8'));
  } catch {}

  // Get unique URLs
  const urls = [...new Set(articles.map(a => a.url))];
  console.log(`Re-scraping ${urls.length} articles for full content...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const updatedArticles: any[] = [];

  for (const url of urls) {
    try {
      const content = await scrapeFullArticle(page, url);
      if (content.length > 200) {
        // Find existing article data
        const existing = articles.find(a => a.url === url);
        updatedArticles.push({
          url,
          title: existing?.title || 'Untitled',
          date: existing?.date || '',
          content,
          scrapedAt: new Date().toISOString(),
        });
        console.log(`✓ ${url} (${content.length} chars)`);
      } else {
        console.log(`✗ ${url} (short: ${content.length})`);
      }
    } catch (e: any) {
      console.log(`✗ ${url}: ${e.message?.slice(0, 80)}`);
    }
    await page.waitForTimeout(1500);
  }

  await browser.close();

  writeFileSync(existingPath, JSON.stringify(updatedArticles, null, 2));
  console.log(`\nUpdated ${updatedArticles.length} articles`);
}

main().catch(console.error);
