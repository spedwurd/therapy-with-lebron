// Function to wait for Face-api.js to be available
function waitForFaceAPI() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      if (window.faceapi) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts > 10) {
        clearInterval(checkInterval);
        reject(new Error("Face-api.js did not load"));
      }
      attempts++;
    }, 500);
  });
}

async function main(){
  try {
    console.log("Checking if Face-api.js is loaded...");
    await waitForFaceAPI();

    console.log("Loading Face-api.js models...");

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]);

    console.log("Face-api.js models loaded!");

    startVideo();
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

// Function to start the video stream
function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      stream.getAudioTracks().forEach(track => track.enabled = false);
      document.getElementById("localVideo").srcObject = stream;
    })
    .catch((error) => console.error("Error accessing media devices:", error));
}

main();