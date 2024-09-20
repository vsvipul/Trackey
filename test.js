const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://www.amazon.in/Hisense-inches-Tornado-55E7K-PRO/dp/B0C73QLNMV?th=1';

axios.get(url)
  .then(response => {
    const pageContent = response.data;
    const $ = cheerio.load(pageContent);

    const priceText = $('.a-price-whole').first().text().trim();
    console.log('Extracted price text:', priceText);

    const price = parseFloat(priceText.replace(/[^0-9.,-]+/g, "").replace(/,/g, ""));
    console.log('Parsed price:', price);
  })
  .catch(error => {
    console.error('Error fetching the URL:', error);
  });