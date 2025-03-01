import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { getGeminiResponse } from "./gemini.js";
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});