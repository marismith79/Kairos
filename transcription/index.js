require('dotenv').config();  // Load environment variables

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// --- Twilio Voice Webhook ---
app.post('/voice', (req, res) => {
  const twiml = `
<Response>
  <Start>
    <Stream url="wss://thin-brooms-study.loca.lt/twilio-stream"/>
  </Start>
  <Say>Welcome to the real-time transcription service. Please speak.</Say>
  <Pause length="30"/>
</Response>`;
  
  res.type('text/xml');
  res.send(twiml);
});

// --- Create HTTP Server ---
const server = http.createServer(app);

// --- WebSocket Server for Twilio Media Streams ---
const wss = new WebSocket.Server({ server, path: '/twilio-stream' });

wss.on('connection', (socket) => {
  console.log('New Twilio media stream connection established.');

  // socket.on('message', (message) => {
  //   console.log("Received WebSocket message from Twilio:", message);  // Debugging log
  
  //   let msgObj;
  //   try {
  //     msgObj = JSON.parse(message);
  //   } catch (err) {
  //     console.error('Error parsing message:', err);
  //     return;
  //   }
  
  //   if (msgObj.event === 'start') {
  //     console.log("Twilio Media Stream started.");
  //   }
  
  //   if (msgObj.event === 'media' && msgObj.media && msgObj.media.payload) {
  //     console.log("Received audio data from Twilio.");
  //     const audioData = Buffer.from(msgObj.media.payload, 'base64');
  //     pushStream.write(audioData);
  //   }
  
  //   if (msgObj.event === 'stop') {
  //     console.log("Twilio Media Stream stopped.");
  //   }
  // });
  

  // Create a push stream for Azure Speech SDK to receive audio data.
  const pushStream = sdk.AudioInputStream.createPushStream();
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const speechConfig = sdk.SpeechConfig.fromSubscription("3Ne6VhDxwtjUX7IszubwZbO3MP1tYAfWP67ry4l7wJUL5I9E1LaQJQQJ99BBACYeBjFXJ3w3AAAYACOGk8dy", 'eastus');

  // Create the speech recognizer instance.
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizing = (s, e) => {
    console.log('Recognizing: ' + e.result.text);
  };

  recognizer.recognized = (s, e) => {
    console.log('Recognized: ' + e.result.text);
  };

  recognizer.startContinuousRecognitionAsync(
    () => console.log("🎙️ Azure Speech-to-Text started."),
    err => console.error("Error starting recognition:", err)
  );

  socket.on('message', (message) => {
    let msgObj;
    try {
      msgObj = JSON.parse(message);
    } catch (err) {
      console.error('Error parsing message:', err);
      return;
    }

    if (msgObj.event === 'media' && msgObj.media && msgObj.media.payload) {
      const audioData = Buffer.from(msgObj.media.payload, 'base64');
      pushStream.write(audioData);
    }
  });

  socket.on('close', () => {
    console.log('Twilio media stream connection closed.');
    recognizer.stopContinuousRecognitionAsync(() => {
      pushStream.close();
    });
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Twilio Call Transcription Server is Running');
});

// --- Start the Server ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
