import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fetch from "node-fetch"
// import { generateSpeech } from "./tts.js"; retiring ts

dotenv.config();

const app = express();
const port = 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

app.use(cors());
app.use(bodyParser.json());
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function googleImageSearch(query) {
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${SEARCH_ENGINE_ID}&searchType=image&key=${GOOGLE_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items;

    } catch (error) {
        console.error("Error:", error);
    }
}

async function getGeminiResponse(prompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

app.post("/ask-gemini", async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await getGeminiResponse(prompt);
        res.json({ response });
    } catch (error) {
        console.error("Error getting response from Gemini:", error);
        res.status(500).json({ error: "Failed to get response from Gemini" });
    }
});

app.post("/gen-image", async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await googleImageSearch(prompt);
        res.json({ response });
    } catch (error) {
        console.error("Error getting response from Google Search:", error);
        res.status(500).json({ error: "Failed to get response from Google Search" });
    }
});

/* why is tts so damn slow 
app.post("/generate-speech", async (req, res) => {
    const { text } = req.body;
    try {
        const audioUrl = await generateSpeech(text);
        res.json({ audioUrl });
    } catch (error) {
        console.error("Error generating speech:", error);
        res.status(500).json({ error: "Failed to generate speech" });
    }
}
);
*/

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
