const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://proxy5.net/free-proxy');
  const $ = cheerio.load(res.data);
  let scriptCode = '';
  $('script').each((i, el) => {
    const html = $(el).html();
    if (html && html.includes('downloadProxies')) {
      scriptCode = html;
    }
  });
  console.log(scriptCode);
}
run();
