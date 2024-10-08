﻿# Trackey

Trackey is a price tracking application built with Electron and Node.js. It allows users to monitor the prices of products on various websites and get alerts when the prices drop below a specified target. The application uses Azure OpenAI to dynamically determine the correct HTML selector for extracting the price from the webpage.

## Features

- Track prices of products from various websites.
- Get alerts when prices drop below a specified target.
- Uses Azure OpenAI to dynamically determine the correct HTML selector for price extraction.
- Save and load trackers from a JSON file.

## Setup

### Prerequisites

- Node.js installed on your machine.
- An Azure OpenAI account with the necessary API keys and endpoint.

### Steps to Setup Environment

1. **Clone the repository**:

    ```sh
    git clone <repository-url>
    cd trackey
    ```

2. **Install dependencies**:

    ```sh
    npm install
    ```

3. **Create a `.env` file** in the root directory and add your Azure OpenAI credentials. Refer to the `.env.example` file for the required environment variables:

    ```sh
    cp .env.example .env
    ```

    Edit the [`.env`](command:_github.copilot.openRelativePath?%5B%7B%22scheme%22%3A%22file%22%2C%22authority%22%3A%22%22%2C%22path%22%3A%22%2FD%3A%2Fcode%2FPriceTracker%2F.env%22%2C%22query%22%3A%22%22%2C%22fragment%22%3A%22%22%7D%2C%22e46f7e2a-6957-4185-bdbb-7a607bc09db0%22%5D "d:\code\PriceTracker\.env") file and add your Azure OpenAI credentials:

    ```properties
    AZURE_OPENAI_ENDPOINT=https://<your-azure-openai-endpoint>
    AZURE_OPENAI_API_KEY=<your-azure-openai-api-key>
    AZURE_OPENAI_CHAT_COMPLETION_MODEL_DEPLOYMENT_ID=<your-deployment-id>
    AZURE_OPENAI_API_VERSION=<your-api-version>
    ```

4. **Run the application**:

    ```sh
    npm start
    ```

### File Structure

- **main.js**: The main file that initializes the Electron app, handles IPC events, and manages price tracking logic. See main.js for more details.
- **preload.js**: Preloads scripts to expose APIs to the renderer process.
- **index.html**: The main HTML file for the Electron app's UI.
- **trackers.json**: A JSON file to save and load trackers.
