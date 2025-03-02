import fetch from "node-fetch"
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
const searchQuery = "LeBron James alchemy";

export async function googleImageSearch(query) {
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${SEARCH_ENGINE_ID}&searchType=image&key=${GOOGLE_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);
        console.log(data.items[0].link);
        return data.items;

    } catch (error) {
        console.error("Error:", error);
    }
}