/**
 * Scrape IAAC news articles - improved version.
 * Navigates to each article and extracts actual content after JS renders.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'iaac-news.json');

interface Article {
  url: string;
  title: string;
  date: string;
  content: string;
  scrapedAt: string;
}

async function getArticleLinks(page: any): Promise<{ url: string; title: string }[]> {
  const allLinks: { url: string; title: string }[] = [];
  const seen = new Set<string>();

  // Scrape multiple news sections
  const sections = [
    'https://iaac.mn/9/news',    // Мэдээ мэдээлэл
    'https://iaac.mn/59/news',   // Онцлох нийтлэл
    'https://iaac.mn/57/news',   // Хэн, юу хэлэв?
    'https://iaac.mn/58/news',   // Нийтлэл, ярилцлага
  ];

  for (const sectionUrl of sections) {
    try {
      await page.goto(sectionUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(4000);

      const links = await page.$$eval('a[href*="/nitem"]', (els: any[]) =>
        els.map((a: any) => ({
          url: a.href,
          title: a.textContent?.trim().replace(/\s+/g, ' ') || '',
        }))
      );

      for (const link of links) {
        if (!seen.has(link.url) && link.title.length > 5) {
          seen.add(link.url);
          allLinks.push(link);
        }
      }
      console.log(`Section ${sectionUrl.split('/').slice(-2).join('/')}: ${links.length} links`);
    } catch (e: any) {
      console.log(`Section error: ${e.message?.slice(0, 80)}`);
    }
  }

  return allLinks;
}

async function scrapeArticle(page: any, url: string): Promise<Article | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);

    // Extract title from h1 or page-title
    const title = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) return h1.textContent?.trim() || '';
      const titleEl = document.querySelector('.page-title, .article-title, .detail-title');
      return titleEl?.textContent?.trim() || '';
    });

    // Extract date
    const date = await page.evaluate(() => {
      const timeEl = document.querySelector('time');
      if (timeEl) return timeEl.textContent?.trim() || '';
      const dateEl = document.querySelector('[class*="date"], [class*="Date"]');
      return dateEl?.textContent?.trim() || '';
    });

    // Extract main content - look for the article body
    const content = await page.evaluate(() => {
      // Try specific content containers
      const selectors = [
        '.detail-content', '.article-body', '.news-content',
        '.content-body', '.nitem-body', '.post-content',
        'article .content', '.main-content .text',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && (el.textContent || '').trim().length > 100) {
          return el.textContent?.trim() || '';
        }
      }

      // Fallback: find the largest text block
      const allDivs = Array.from(document.querySelectorAll('div, article, section'));
      let bestText = '';
      for (const div of allDivs) {
        const text = (div.textContent || '').trim();
        if (text.length > bestText.length && text.length < 20000) {
          // Check it's not the nav
          const isNav = div.closest('nav, header, footer');
          const isMenu = div.querySelector('nav, .menu, .sidebar');
          if (!isNav && !isMenu) {
            bestText = text;
          }
        }
      }
      return bestText;
    });

    if (content.length > 100) {
      return {
        url,
        title: title || 'Untitled',
        date,
        content: content.slice(0, 8000),
        scrapedAt: new Date().toISOString(),
      };
    }
  } catch {}
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Collecting article links...');
  const links = await getArticleLinks(page);
  console.log(`Total unique articles: ${links.length}`);

  const articles: Article[] = [];

  for (const link of links.slice(0, 40)) {
    try {
      const article = await scrapeArticle(page, link.url);
      if (article) {
        articles.push(article);
        console.log(`✓ ${article.title.slice(0, 60)} (${article.content.length} chars)`);
      } else {
        console.log(`✗ ${link.title.slice(0, 60)} (no content)`);
      }
    } catch (e: any) {
      console.log(`✗ ${link.title.slice(0, 60)}: ${e.message?.slice(0, 80)}`);
    }
    await page.waitForTimeout(1000);
  }

  await browser.close();

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(articles, null, 2));
  console.log(`\nSaved ${articles.length} articles`);
}

main().catch(console.error);
