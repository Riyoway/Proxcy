import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';

const puppeteer = puppeteerExtra as any;

// Bypass Cloudflare detection
puppeteer.use(StealthPlugin());

export async function scrapeProxy5(): Promise<string[]> {
  const url = 'https://proxy5.net/free-proxy';
  console.log(`Scraping ${url} (Requires Cloudflare Bypass)...`);
  
  let browser;
  const proxies: string[] = [];
  
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      executablePath: executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    
    const page = await browser.newPage();
    
    // Wait until network is idle so Cloudflare turnstile can pass
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    
    // Execute a fetch within the browser context to get the raw proxy list text
    // This perfectly bypasses the 30-second fake progress bar wait
    const text = await page.evaluate(async () => {
      // @ts-ignore
      if (typeof proxylister_ajax === 'undefined') return '';
      // @ts-ignore
      const downloadUrl = proxylister_ajax.ajax_url + '?action=proxylister_download&nonce=' + proxylister_ajax.nonce + '&format=txt&filter={}';
      const res = await fetch(downloadUrl);
      return await res.text();
    });
    
    if (text) {
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Match IP:Port format
        if (trimmed.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)) {
          proxies.push(`http://${trimmed}`);
        }
      }
    } else {
      console.log(`Failed to find proxy5.net ajax variables (Cloudflare might have blocked it).`);
    }
  } catch (err: any) {
    console.error('Failed to scrape proxy5.net:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`Scraped ${proxies.length} proxies from proxy5.net`);
  return proxies;
}
