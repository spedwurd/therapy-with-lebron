require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 8080;

app.use(express.json()); // Parse JSON requests

app.post('/generate', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY; // Access API key from environment variables
  const prompt = req.body.prompt;

  if (!apiKey || !prompt) {
    return res.status(400).json({ error: "API key and prompt are required." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ generatedText: text });
  } catch (error) {
    console.error("Server-side error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// .env file (create this in the same directory as server.js)
// GOOGLE_API_KEY=YOUR_API_KEY

// Client-side fetch example (to call the server-side endpoint)