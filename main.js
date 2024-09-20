require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { AzureOpenAI } = require('openai');

const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_CHAT_COMPLETION_MODEL_DEPLOYMENT_ID,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

const trackersFilePath = path.join(__dirname, 'trackers.json');
let trackers = {};
const intervalMapping = {};

app.on('ready', () => {
    trackers = loadTrackers(trackersFilePath);
    createWindow();
    initializeTrackers();
});

const loadTrackers = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading trackers:', error);
  }
  return {};
};

const saveTrackers = (filePath) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(trackers, null, 2));
  } catch (error) {
    console.error('Error saving trackers:', error);
  }
};

// Function to extract price from page content using OpenAI API
const getPriceSelectorFromPage = async (pageContent, cssSelector) => {
    // Load the HTML content using cheerio
    const $ = cheerio.load(pageContent);
  
    // Extract the relevant part of the HTML using the provided CSS selector
    const relevantHtml = $(cssSelector).html();
  
    const prompt = `
      Extract only the CSS selector for the price from the following HTML content:
      ${relevantHtml}
      The price is usually within an element with id 'price' or class 'price'.
      Return only the CSS selector, nothing else. For example, it could be '#price' or '.price'.
    `;
  
    console.log('Sending prompt to OpenAI API:', prompt);
  
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      });
  
      console.log('Response from OpenAI API:', response);
  
      const selector = response.choices[0].message.content.trim().match(/[#.][a-zA-Z0-9-_]+/)[0];
      console.log('Extracted CSS selector:', selector);
  
      return selector;
    } catch (error) {
      console.error('Error using OpenAI API:', error);
      return null;
    }
};

const checkPrice = async (url, cssSelector, targetPrice, event, storedSelector) => {
  try {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
    });
    const pageContent = response.data;
    let selector = storedSelector;

    if (!selector) {
      selector = await getPriceSelectorFromPage(pageContent, cssSelector);
      if (!selector) {
        console.error('Failed to get CSS selector from OpenAI API');
        return;
      }
      trackers[url].selector = selector; // Store the selector for future use
      saveTrackers(trackersFilePath); // Save trackers to file
    }

    // Sanitize the selector
    selector = selector.trim().replace(/[^a-zA-Z0-9-_#.\s]/g, '');
    console.log('Sanitized CSS selector:', selector);

    const $ = cheerio.load(pageContent);
    const priceText = $(selector).first().text().trim();
    console.log('Extracted price text:', priceText);

    const price = parseFloat(priceText.replace(/[^0-9.,-]+/g, "").replace(/,/g, ""));
    console.log('Parsed price:', price);

    const now = new Date().toLocaleString();
    trackers[url].lastPrice = price;
    trackers[url].lastFetched = now;
    saveTrackers(trackersFilePath); // Save trackers to file

    // Send update-tracker event to update the UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (event) {
      event.sender.send('update-tracker', { url, price, lastFetched: now });
    } else if (mainWindow) {
      mainWindow.webContents.send('update-tracker', { url, price, lastFetched: now });
    }

    if (price !== null && price <= targetPrice) {
      if (event) {
        event.sender.send('price-alert', { url, price });
      } else if (mainWindow) {
        mainWindow.webContents.send('price-alert', { url, price });
      }
    }
  } catch (error) {
    console.error('Error fetching the URL:', error);
  }
};

const createWindow = () => {
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          enableRemoteModule: false
      }
    });
  
    mainWindow.loadFile('index.html');
  
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('load-trackers', trackers);
    });
};

const initializeTrackers = () => {
  Object.keys(trackers).forEach(url => {
    const { cssSelector, targetPrice, frequency, selector, paused } = trackers[url];
    if (!paused) {
      const intervalId = setInterval(() => checkPrice(url, cssSelector, targetPrice, null, selector), frequency * 60 * 1000); // Convert minutes to milliseconds
      intervalMapping[url] = intervalId;
    }
  });
};

// Handle form submission
ipcMain.on('add-tracker', (event, trackerData) => {
  console.log('Tracker Data:', trackerData);
  const { url, cssSelector, targetPrice, frequency } = trackerData;

  trackers[url] = { paused: false, frequency, cssSelector, targetPrice, lastPrice: 'N/A', lastFetched: 'N/A' };
  saveTrackers(trackersFilePath); // Save trackers to file

  if (!trackers[url].paused) {
    const intervalId = setInterval(() => checkPrice(url, cssSelector, targetPrice, null, trackers[url]?.selector), frequency * 60 * 1000); // Convert minutes to milliseconds
    intervalMapping[url] = intervalId;
  }

  event.sender.send('tracker-added', { url, cssSelector, targetPrice, frequency });
});

// Handle resume of trackers
ipcMain.on('resume-tracker', (event, { url }) => {
  console.log('Resuming tracker:', url);
  const { frequency, cssSelector, targetPrice } = trackers[url];
  const intervalId = setInterval(() => checkPrice(url, cssSelector, targetPrice, event, trackers[url]?.selector), frequency * 60 * 1000); // Convert minutes to milliseconds
  intervalMapping[url] = intervalId;
  trackers[url].paused = false;
  saveTrackers(trackersFilePath); // Save trackers to file
});

// Handle pause of trackers
ipcMain.on('pause-tracker', (event, { url }) => {
    console.log('Pausing tracker:', url);
    clearInterval(intervalMapping[url]);
    delete intervalMapping[url];
    trackers[url].paused = true;
    saveTrackers(trackersFilePath); // Save trackers to file
});