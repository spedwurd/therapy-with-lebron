const fetch = require("node-fetch");
require("dotenv").config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
const searchQuery = "lebron james";

async function googleImageSearch(query) {
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${SEARCH_ENGINE_ID}&searchType=image&key=${GOOGLE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items) {
            data.items.forEach((item, index) => {
                console.log(`${index + 1}: ${item.link}`); // Prints image URLs
            });
        } else {
            console.log("No images found.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

googleImageSearch(searchQuery);
