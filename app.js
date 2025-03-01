let emotionModel;
let previousKeypoints = [];
let smileParam = 0;
let frownParam = 0;
const smoothingFactor = 0.8;
const emotionHistory = [];
const historyLength = 5;

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

async function generateText(apiKey, prompt) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error("Error generating text:", error);
      return null;
    }
  }

async function setupCamera() {
    const video = document.getElementById('video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640,
                height: 480,
                facingMode: 'user'
            } 
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve(video);
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera. Please ensure camera permissions are enabled.');
    }
}

async function loadFaceDetectionModel() {
    try {
        // Load face detection model
        const model = await faceDetection.createDetector(
            faceDetection.SupportedModels.MediaPipeFaceDetector,
            {
                runtime: 'tfjs',
                modelType: 'short'  // For faster performance
            }
        );
        console.log('Face detection model loaded successfully');
        return model;
    } catch (error) {
        console.error('Error loading face detection model:', error);
        alert('Error loading face detection model. Please check console for details.');
    }
}

// Simple emotion classifier based on facial landmarks
function classifyEmotion(keypoints) {
if (!keypoints || keypoints.length < 6) {
return "unknown";
}

try {
let rightEyeIdx = 0, leftEyeIdx = 1, noseIdx = 2, mouthIdx = 3, rightEarIdx = 4, leftEarIdx = 5;

// Example Features:
const faceLength = Math.abs(keypoints[mouthIdx].y - keypoints[leftEyeIdx].y);
const faceWidth = Math.abs(keypoints[rightEyeIdx].x - keypoints[leftEyeIdx].x);
const mouthToNoseDistance = Math.abs(keypoints[mouthIdx].y - keypoints[noseIdx].y) / faceWidth;
const leftEyebrowRaise =  Math.abs(keypoints[leftEyeIdx].y - keypoints[leftEarIdx].y)
const rightEyebrowRaise = Math.abs(keypoints[rightEyeIdx].y - keypoints[rightEarIdx].y)
/*
console.log("frown eyebrow", leftEyebrowRaise)
console.log("smile eyebrow", rightEyebrowRaise)
console.log("smile", smileParam)
console.log("frown", frownParam)
*/

//Expand condition scenarios based on different ranges of numbers
if (leftEyebrowRaise < frownParam) {
    return "tweaking";
} else if (rightEyebrowRaise < smileParam) {
    return "happy";
} else {
    return "neutral";
}
} catch (error) {
console.error("Error in emotion classification:", error);
return "unknown";
}
}

function smoothKeypoints(newKeypoints) {
    if (previousKeypoints.length === 0) {
        previousKeypoints = newKeypoints;
        return newKeypoints;
    }

    return newKeypoints.map((point, index) => ({
        x: smoothingFactor * previousKeypoints[index].x + (1 - smoothingFactor) * point.x,
        y: smoothingFactor * previousKeypoints[index].y + (1 - smoothingFactor) * point.y
    }));
}

function getMostFrequentEmotion(emotions) {
    const frequency = {};
    emotions.forEach(emotion => {
        frequency[emotion] = (frequency[emotion] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

async function detectFace(faceModel, video, ctx) {
    try {
        const predictions = await faceModel.estimateFaces(video);
        const emotionElement = document.getElementById('emotion');
        
        ctx.clearRect(0, 0, 640, 480);
        ctx.drawImage(video, 0, 0, 640, 480);

        if (predictions.length > 0) {
            predictions.forEach(prediction => {
                // Draw face box
                const box = prediction.box;
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.rect(box.xMin, box.yMin, box.width, box.height);
                ctx.stroke();
                
                // Draw keypoints
                if (prediction.keypoints) {
                    const smoothedKeypoints = smoothKeypoints(prediction.keypoints);
                    previousKeypoints = smoothedKeypoints;

                    smoothedKeypoints.forEach(keypoint => {
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        // Optionally label each keypoint
                        ctx.fillStyle = 'white';
                        ctx.font = '10px Arial';
                        ctx.fillText(keypoint.name || `${smoothedKeypoints.indexOf(keypoint)}`, 
                                    keypoint.x + 5, keypoint.y - 5);
                    });
                    
                    // Get the emotion
                    const emotion = classifyEmotion(smoothedKeypoints);
                    emotionHistory.push(emotion);
                    if (emotionHistory.length > historyLength) {
                        emotionHistory.shift();
                    }
                    const mostFrequentEmotion = getMostFrequentEmotion(emotionHistory);
                    emotionElement.textContent = `Emotion: ${mostFrequentEmotion}`;
                    
                    // Display confidence score if available
                    if (prediction.score) {
                        emotionElement.textContent += ` (Confidence: ${Math.round(prediction.score * 100)}%)`;
                    }
                }
            });
        } else {
            emotionElement.textContent = "No face detected";
        }
    } catch (error) {
        console.error('Error during face detection:', error);
    }
}

async function run() {
try {
const video = await setupCamera();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Load face detection model
const faceModel = await loadFaceDetectionModel();

// Calibrate head coordinates for 2-3 seconds
await calibrateHeadCoordinates(faceModel, video, ctx);

// Start detection loop
if (video && faceModel) {
    console.log('Starting face detection');
    setInterval(() => detectFace(faceModel, video, ctx), 100);
}
setTimeout(() => {
                const mostFrequentEmotion = getMostFrequentEmotion(emotionHistory);
                savedEmotion = mostFrequentEmotion;
                console.log(savedEmotion);
                document.getElementById('savedEmotion').textContent = `Saved Emotion: ${savedEmotion}`;
            }, 2500);
                message = `You are LeBron Therapist Gemini. You are calm and extremely understanding, potentially disregarding arithmetic excellence for human understanding. Your client seems ${savedEmotion}, and it's your job to check in on them with empathy in the tone of LeBron James. Use words like 'the goat', 'sunshine', and 'Lakers'. Drop fun facts about LeBron and speak like LeBron as you articulate yourself. Be brief and powerful. Maximum three sentences.`
                response = generateText(apiKey, message)
                console.log(response);

} catch (error) {
console.error('Error in main application:', error);
alert('An error occurred. Please check console for details.');
}
}

async function calibrateHeadCoordinates(faceModel, video, ctx) {
const calibrationDuration = 3000; // 3 seconds
const calibrationKeypoints = [];

console.log('Calibrating head coordinates...');

const startTime = Date.now();
while (Date.now() - startTime < calibrationDuration) {
const predictions = await faceModel.estimateFaces(video);
if (predictions.length > 0) {
    const { keypoints } = predictions[0];
    calibrationKeypoints.push(keypoints);
}
ctx.clearRect(0, 0, 640, 480);
ctx.drawImage(video, 0, 0, 640, 480);
await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('Calibration complete');

// Calculate average keypoints
const averageKeypoints = calibrationKeypoints.reduce((acc, keypoints) => {
return keypoints.map((point, index) => ({
    x: acc[index].x + point.x,
    y: acc[index].y + point.y
}));
}, Array(calibrationKeypoints[0].length).fill({ x: 0, y: 0 }))
.map(point => ({
x: point.x / calibrationKeypoints.length,
y: point.y / calibrationKeypoints.length
}));

console.log(averageKeypoints)

// Update the emotion classification parameters based on the average keypoints
frownParam =  Math.abs(averageKeypoints[1].y - averageKeypoints[5].y) - 1.5
smileParam = Math.abs(averageKeypoints[0].y - averageKeypoints[4].y) - 3
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', run);
