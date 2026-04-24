import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeFreeProxyList(): Promise<string[]> {
  const url = 'https://free-proxy-list.net/en/';
  console.log(`Scraping ${url}...`);
  const res = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(res.data as string);
  
  const textarea = $('#raw > div > div > div.modal-body > textarea').val() || $('textarea.form-control').val();
  if (!textarea) return [];

  const text = textarea.toString();
  const lines = text.split('\n');
  const proxies: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes('Free proxies') || trimmed.includes('Updated at')) {
      continue;
    }
    // Match IP:Port format
    if (trimmed.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)) {
      proxies.push(`http://${trimmed}`);
    }
  }

  console.log(`Scraped ${proxies.length} proxies from free-proxy-list.net`);
  return proxies;
}
