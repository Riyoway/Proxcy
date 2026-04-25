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
  const proxyRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/gi;
  const matches = text.match(proxyRegex);
  const proxies: string[] = [];

  if (matches) {
    for (const match of matches) {
      proxies.push(`http://${match}`);
    }
  }

  console.log(`Scraped ${proxies.length} proxies from free-proxy-list.net`);
  return proxies;
}
