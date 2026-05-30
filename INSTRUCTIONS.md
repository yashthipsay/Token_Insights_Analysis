# Setup and Execution Instructions

This guide provides step-by-step instructions on how to spin up the Token Insight & Analytics API project.

## 1. Environment Configuration

Before running the application, you need to configure your environment variables. 
Copy the provided `.env.example` file to create a new `.env` file:

```bash
cp .env.example .env
```

### What values should I enter in the `.env` file?

*   `APP_URL`: You can leave this as-is in local development, or set it to `http://localhost:3000`.
*   `AI_BASE_URL`: The base URL of the OpenAI-compatible API you are using to access your free model (e.g., `https://api.groq.com/openai/v1` or a local `http://localhost:11434/v1` for local models).
*   `AI_API_KEY`: Your API key for the chosen provider. You can generate this key from your provider's developer dashboard. 
    *   *Note: If you do not have an API key right now, you can leave it empty. The application is designed to return a graceful mock AI response so you can still test the flow.*
*   `AI_MODEL_NAME`: The identifier for the model you want to use (e.g., `llama-3.3-70b-versatile` for Groq, or `gpt-4o-mini` for OpenAI).

## 2. Running Locally (Native Node.js)

If you have Node.js (v18+) installed on your machine:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The Express backend and the Vite frontend will start concurrently.
    Navigate to `http://localhost:3000` in your browser to view the interactive dashboard.

## 3. Running with Docker (Recommended)

If you have Docker and Docker Compose installed, you can spin up the entire application in a containerized environment. This ensures consistency across different machines.

1.  **Build and run the containers**:
    ```bash
    docker compose up --build
    ```

2.  **Access the application**: 
    The server will be exposed on port `3000`. Open `http://localhost:3000` in your web browser.

3.  **To stop the application**:
    Press `Ctrl+C` in the terminal where it's running, or run:
    ```bash
    docker compose down
    ```

## 4. Testing the Endpoints

You can use the frontend dashboard at `http://localhost:3000` to interact visually with the APIs.
Alternatively, use the provided `api.http` file with an extension like REST Client for VS Code, or import the `postman_collection.json` into Postman.
