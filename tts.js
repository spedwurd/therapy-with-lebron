// i made a lebron james voice clone using play.ht 
// but who knew that shit takes way too long to generate
// 💔💔💔💔💔💔💔💔💔


import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const VOICE_ID = "s3://voice-cloning-zero-shot/00bdb948-02bd-4503-8abc-7bbbb3a1cb39/lebron/manifest.json"; // Your cloned voice ID
var p = process.env.PLAYHT_API_KEY;
var o = process.env.PLAYHT_USER_ID;
  

export async function generateSpeech(text) {
    try {
        console.log(text);
        const response = await axios.post(
            "https://api.play.ht/api/v2/tts",
            {
                text: text,
                voice: VOICE_ID,
                output_format: "mp3"
            },
            {
                headers: { //i fuckin ghate hsio ts 
                    "Authorization": `Bearer ${p}`,
                    "X-User-Id": o,
                    "Content-Type": "application/json"
                }
            }
        );
        const completedMatch = response.data.match(/event: completed\r\n(data: )(.*?)\r\n/);
        console.log(completedMatch);
        try {
            const jsonData = JSON.parse(completedMatch[2]);
            var audio_url = jsonData.url;
            console.log(jsonData)
            console.log(audio_url);
            return audio_url;
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        
    } catch (error) {
        console.error("Error generating speech:", error.response ? error.response.data : error.message);
    }
}
