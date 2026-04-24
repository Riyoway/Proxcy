import axios from 'axios';

export async function scrapeSocksList(): Promise<string[]> {
  const url = 'https://sockslist.us/Api?request=display&country=all&level=all&token=free';
  console.log(`Scraping ${url}...`);
  const res = await axios.get(url, { timeout: 15000 });
  
  const data = res.data;
  if (!Array.isArray(data)) return [];

  const proxies: string[] = [];
  for (const item of data) {
    if (item.ip && item.port) {
      proxies.push(`socks5://${item.ip}:${item.port}`);
    }
  }

  console.log(`Scraped ${proxies.length} proxies from sockslist.us`);
  return proxies;
}
