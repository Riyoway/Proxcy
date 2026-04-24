import { scrapeFreeProxyList } from './free-proxy-list.js';
import { scrapeSocksList } from './sockslist.js';
import { scrapeProxy5 } from './proxy5.js';

export async function scrapeAllProxies(): Promise<string[]> {
  const proxies = new Set<string>();
  
  try {
    const fpl = await scrapeFreeProxyList();
    fpl.forEach((p: string) => proxies.add(p));
  } catch (err: any) {
    console.error('Failed to scrape free-proxy-list.net:', err.message);
  }

  try {
    const sl = await scrapeSocksList();
    sl.forEach((p: string) => proxies.add(p));
  } catch (err: any) {
    console.error('Failed to scrape sockslist.us:', err.message);
  }

  try {
    const p5 = await scrapeProxy5();
    p5.forEach((p: string) => proxies.add(p));
  } catch (err: any) {
    console.error('Failed to scrape proxy5.net:', err.message);
  }

  return Array.from(proxies);
}
