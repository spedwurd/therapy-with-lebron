let emotionModel;
let previousKeypoints = [];
let smileParam = 0;
let frownParam = 0;
const smoothingFactor = 0.8;
const emotionHistory = [];
const historyLength = 5;
let savedEmotion = "neutral"; 

var audio = new Audio('https://peregrine-results.s3.amazonaws.com/pigeon/FmNnxX5rbVHwekiOAy_0.mp3');


/**
 * Send user input to the LeBron AI and get a response
 */
async function askLeBron() {
    audio.play();
    console.log('played');
    const userInput = document.getElementById('userInput').value;
    console.log(userInput)
    if (!userInput.trim()) return;
    
    try {
        appendMessage('user', userInput);
        
        document.getElementById('userInput').value = '';
        
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading';
        loadingEl.textContent = 'LeBron is typing...';
        document.getElementById('geminiResponse').appendChild(loadingEl);
        
        const response = await fetch("http://localhost:3000/ask-gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: `Remember that you are still LeBron Gemini Therapist - the empathetic, encouraging, and pop culturally connected LeBron James. You are the sunshine. The user says: ${userInput}. Max 3 sentences.`
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        // Remove loading indicator
        document.getElementById('geminiResponse').removeChild(loadingEl);
        
        // Add AI response to chat
        appendMessage('ai', data.response);
    } catch (error) {
        console.error('Error communicating with LeBron AI:', error);
        document.getElementById('geminiResponse').innerHTML += `<p class="error">Sorry, there was an error connecting with LeBron. Please try again.</p>`;
    }
}

/**
 * Add a message to the chat interface
 */
function appendMessage(sender, text) {
    const messageEl = document.createElement('div');
    messageEl.style.fontStyle = 'italic';
    messageEl.className = `message ${sender}-message`;
    
    const contentEl = document.createElement('p');
    contentEl.textContent = text;
    messageEl.appendChild(contentEl);
    
    document.getElementById('geminiResponse').appendChild(messageEl);
    
    // Auto scroll to bottom
    document.getElementById('geminiResponse').scrollTop = document.getElementById('geminiResponse').scrollHeight;
}

/**
 * Initialize the camera for face tracking
 */
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
        return null;
    }
}

/**
 * Load the TensorFlow.js face detection model
 */
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
        return null;
    }
}

/**
 * Classify emotion based on facial keypoints
 */
function classifyEmotion(keypoints) {
    if (!keypoints || keypoints.length < 6) {
        return "unknown";
    }

    try {
        const rightEyeIdx = 0, leftEyeIdx = 1, noseIdx = 2, mouthIdx = 3, rightEarIdx = 4, leftEarIdx = 5;

        // Extract relevant facial features
        const leftEyebrowRaise = Math.abs(keypoints[leftEyeIdx].y - keypoints[leftEarIdx].y);
        const rightEyebrowRaise = Math.abs(keypoints[rightEyeIdx].y - keypoints[rightEarIdx].y);

        // Determine emotion based on calibrated parameters
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

/**
 * Apply smoothing to keypoints to reduce jitter
 */
function smoothKeypoints(newKeypoints) {
    if (previousKeypoints.length === 0) {
        previousKeypoints = newKeypoints;
        return newKeypoints;
    }

    return newKeypoints.map((point, index) => ({
        x: smoothingFactor * previousKeypoints[index].x + (1 - smoothingFactor) * point.x,
        y: smoothingFactor * previousKeypoints[index].y + (1 - smoothingFactor) * point.y,
        name: point.name // Preserve name property if present
    }));
}

/**
 * Get the most frequent emotion from history
 */
function getMostFrequentEmotion(emotions) {
    if (!emotions || emotions.length === 0) return "neutral";
    
    const frequency = {};
    emotions.forEach(emotion => {
        frequency[emotion] = (frequency[emotion] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

/**
 * Process video frames and detect faces/emotions
 */
async function detectFace(faceModel, video, ctx) {
    if (!faceModel || !video || !ctx) return;
    
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
                        
                        // Label each keypoint
                        ctx.fillStyle = 'white';
                        ctx.font = '10px Arial';
                        ctx.fillText(keypoint.name || `${smoothedKeypoints.indexOf(keypoint)}`, 
                                    keypoint.x + 5, keypoint.y - 5);
                    });
                    
                    // Classify and track emotion
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

/**
 * Calibrate facial parameters based on neutral expression
 */
async function calibrateHeadCoordinates(faceModel, video, ctx) {
    if (!faceModel || !video || !ctx) return;
    
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
        
        // Draw progress bar
        drawProgressBar(ctx, progress, 'Calibrating - Keep a neutral expression');
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Calibration complete');
    emotionElement.textContent = "Calibration complete";

    // Calculate average keypoints
    if (calibrationKeypoints.length === 0) {
        console.error('No faces detected during calibration');
        return;
    }
    
    const averageKeypoints = calculateAverageKeypoints(calibrationKeypoints);
    
    // Show completion animation
    showCalibrationComplete(ctx);
    
    // Update the emotion classification parameters based on the average keypoints
    frownParam = Math.abs(averageKeypoints[1].y - averageKeypoints[5].y) - 1;
    smileParam = Math.abs(averageKeypoints[0].y - averageKeypoints[4].y) - 3;
    
    console.log('Calibration parameters set:', { frownParam, smileParam });
}

/**
 * Draw progress bar for calibration
 */
function drawProgressBar(ctx, progress, text) {
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
    ctx.fillText(text, 320 - 140, 390);
}

/**
 * Show calibration complete animation
 */
function showCalibrationComplete(ctx) {
    // Green overlay animation
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('Calibration Complete!', 320 - 120, 240);
}

/**
 * Calculate average keypoints from calibration data
 */
function calculateAverageKeypoints(calibrationKeypoints) {
    return calibrationKeypoints.reduce((acc, keypoints) => {
        return keypoints.map((point, index) => ({
            x: (acc[index]?.x || 0) + point.x,
            y: (acc[index]?.y || 0) + point.y
        }));
    }, [])
    .map(point => ({
        x: point.x / calibrationKeypoints.length,
        y: point.y / calibrationKeypoints.length
    }));
}

/**
 * Initialize the chat interface
 */
function initializeChat(initialMessage) {
    const container = document.getElementById('geminiResponse');
    
    // Add initial AI message
    appendMessage('ai', initialMessage);
    
    // Add input field and submit button
    
    // Add event listener for Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            askLeBron();
        }
    });
    
    userInput.focus();
}

/**
 * Main application entry point
 */
async function run() {
    try {
        // Setup UI elements for status
        const statusElement = document.getElementById('status');
        document.getElementById('canvas').removeAttribute('hidden');
        document.getElementById('start-button').remove();
        if (!statusElement) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'status';
            document.body.appendChild(statusDiv);
        }
        
        // Initialize system components
        statusElement.textContent = "Initializing camera...";
        const video = await setupCamera();
        document.getElementById('lebron').removeAttribute('hidden');
        if (!video) throw new Error('Failed to setup camera');
        
        statusElement.textContent = "Loading face detection model...";
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const faceModel = await loadFaceDetectionModel();
        if (!faceModel) throw new Error('Failed to load face model');
        
        // Calibrate the system
        statusElement.textContent = "Starting calibration...";
        await calibrateHeadCoordinates(faceModel, video, ctx);
        statusElement.textContent = "Calibration complete";
        
        // Start face detection loop
        console.log('Starting face detection');
        setInterval(() => detectFace(faceModel, video, ctx), 100);

        // Generate initial greeting based on detected emotion
        setTimeout(async () => {
            const mostFrequentEmotion = getMostFrequentEmotion(emotionHistory);
            savedEmotion = mostFrequentEmotion;
            document.getElementById('savedEmotion').textContent = `Detected Mood: ${savedEmotion}`;
            
            statusElement.textContent = "Connecting to LeBron...";
            
            // Construct tailored prompt based on detected emotion
            const message = `You are LeBron Therapist Gemini. You are calm and extremely understanding, potentially disregarding arithmetic excellence for human understanding. Your client seems ${savedEmotion}, and it's your job to check in on them with empathy in the tone of LeBron James. Use words like 'the goat', 'sunshine', and 'Lakers'. Drop fun facts about LeBron and speak like LeBron as you articulate yourself. Be brief and powerful. Maximum three sentences.`;
            
            try {
                const response = await fetch("http://localhost:3000/ask-gemini", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: message })
                });
                
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log(data.response);
                
                // Initialize chat with LeBron's greeting
                initializeChat(data.response);
                statusElement.textContent = "LeBron is ready to chat";
                
            } catch (error) {
                console.error('Error getting initial response:', error);
                initializeChat("Hey sunshine, LeBron here ready to chat with you! The GOAT is in the building and I'm all ears. Let's talk it out!");
                statusElement.textContent = "Connected (offline mode)";
            }
        }, 2500);
        
    } catch (error) {
        console.error('Error in main application:', error);
        alert('An error occurred: ' + error.message);
    }
}