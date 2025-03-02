let emotionModel;
let previousKeypoints = [];
let smileParam = 0;
let frownParam = 0;
const smoothingFactor = 0.8;
const emotionHistory = [];
const historyLength = 5;

async function askLeBron() {
    prompt = document.getElementById('geminiResponse').innerText;
    console.log(prompt);
    const response = await fetch("http://localhost:3000/ask-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: 'Remember that you are still LeBron Gemini Therapist - the empathetic, encouraging, and pop culturally connected LeBron James. You are the sunshine.' + JSON.stringify({ prompt })
    });
        const data = await response.json();
    console.log(data.response);
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
        const model = await faceDetection.createDetector(
            faceDetection.SupportedModels.MediaPipeFaceDetector,
            {
                runtime: 'tfjs',
                modelType: 'short'  
            }
        );
        console.log('Face detection model loaded successfully');
        return model;
    } catch (error) {
        console.error('Error loading face detection model:', error);
        alert('Error loading face detection model. Please check console for details.');
    }
}

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

if (leftEyebrowRaise < frownParam) {
    return "tweaking";
} else if (rightEyebrowRaise < smileParam) {
    return "sunshine";
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
        
        const faceModel = await loadFaceDetectionModel();

        await calibrateHeadCoordinates(faceModel, video, ctx);
        
        if (video && faceModel) {
            console.log('Starting face detection');
            setInterval(() => detectFace(faceModel, video, ctx), 100);

            setTimeout(async () => {
                const mostFrequentEmotion = getMostFrequentEmotion(emotionHistory);
                savedEmotion = mostFrequentEmotion;
                document.getElementById('savedEmotion').textContent = `Saved Emotion: ${savedEmotion}`;
                
                const message = `You are LeBron Therapist Gemini. You are calm and extremely understanding, potentially disregarding arithmetic excellence for human understanding. Your client seems ${savedEmotion}, and it's your job to check in on them with empathy in the tone of LeBron James. Use words like 'the goat', 'sunshine', and 'Lakers'. Drop fun facts about LeBron and speak like LeBron as you articulate yourself. Be brief and powerful. Maximum three sentences.`;
                
                const response = await fetch("http://localhost:3000/ask-gemini", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: message })
                });
                const data = await response.json();
                console.log(data.response);

                msg = document.createElement('p');
                msg.textContent = data.response;
                user_input = document.createElement('input');
                user_input.setAttribute('type', 'text');
                user_input.setAttribute('class', 'userInput');
                user_input.setAttribute('placeholder', 'Enter your response here');
                submit = document.createElement('button');
                submit.textContent = 'Submit';
                submit.setAttribute('class', 'submit');
                submit.setAttribute('onclick', 'askLeBron()');
                document.getElementById('geminiResponse').appendChild(msg);
                document.getElementById('geminiResponse').appendChild(user_input);
                document.getElementById('geminiResponse').appendChild(submit);
                document.getElementById('userInput').focus();

            }, 2500);
        }
    } catch (error) {
        console.error('Error in main application:', error);
        alert('An error occurred. Please check console for details.');
    }
}

async function calibrateHeadCoordinates(faceModel, video, ctx) {
    const calibrationDuration = 3000; // 3 seconds
    const calibrationKeypoints = [];
    const emotionElement = document.getElementById('emotion');

    console.log('Calibrating head coordinates...');
    emotionElement.textContent = "Calibrating... Please maintain a neutral expression";

    const startTime = Date.now();
    while (Date.now() - startTime < calibrationDuration) {
        const predictions = await faceModel.estimateFaces(video);
        if (predictions.length > 0) {
            const { keypoints } = predictions[0];
            calibrationKeypoints.push(keypoints);
        }
        ctx.clearRect(0, 0, 640, 480);
        ctx.drawImage(video, 0, 0, 640, 480);
        
        // Add calibration progress animation
        const progress = Math.min(100, Math.round((Date.now() - startTime) / calibrationDuration * 100));
        
        // Draw progress bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(320 - 150, 400, 300, 20);
        
        // Draw progress bar
        ctx.fillStyle = 'green';
        ctx.fillRect(320 - 150, 400, 300 * progress / 100, 20);
        
        // Draw progress bar border
        ctx.strokeStyle = 'white';
        ctx.strokeRect(320 - 150, 400, 300, 20);
        
        // Add text instructions
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText('Calibrating - Keep a neutral expression', 320 - 140, 390);
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Calibration complete');
    emotionElement.textContent = "Calibration complete";

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
    
    // Show a nice completion animation
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('Calibration Complete!', 320 - 120, 240);
    
    // Restore normal view after 1 second
    setTimeout(() => {
        ctx.clearRect(0, 0, 640, 480);
        ctx.drawImage(video, 0, 0, 640, 480);
    }, 1000);
    
    // Continue with your existing logic
    console.log(averageKeypoints);

    // Update the emotion classification parameters based on the average keypoints
    frownParam = Math.abs(averageKeypoints[1].y - averageKeypoints[5].y) - 1;
    smileParam = Math.abs(averageKeypoints[0].y - averageKeypoints[4].y) - 3;
}

// Start the application when the page loads