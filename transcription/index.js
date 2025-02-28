const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// --- Twilio Voice Webhook ---
// When Twilio receives a call, it will request this endpoint.
// The returned TwiML instructs Twilio to start a media stream.
app.post('/voice', (req, res) => {
  const twiml = `
<Response>
  <Start>
    <Stream url="wss://your-ngrok-url/twilio-stream"/>
  </Start>
  <Say>Welcome to the real-time transcription service. Please speak.</Say>
  <Pause length="10"/>
</Response>`;
  res.type('text/xml');
  res.send(twiml);
});

// --- Create HTTP Server ---
const server = http.createServer(app);

// --- WebSocket Server for Twilio Media Streams ---
// Twilio will connect here to send audio data in real time.
const wss = new WebSocket.Server({ server, path: '/twilio-stream' });

wss.on('connection', (socket) => {
  console.log('New Twilio media stream connection established.');

  // Create a push stream for Azure Speech SDK to receive audio data.
  const pushStream = sdk.AudioInputStream.createPushStream();
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_TO_TEXT, 'eastus');

  // Create the speech recognizer instance.
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  // Log intermediate (partial) results.
  recognizer.recognizing = (s, e) => {
    console.log('Recognizing: ' + e.result.text);
  };

  // Log final recognized results.
  recognizer.recognized = (s, e) => {
    console.log('Recognized: ' + e.result.text);
  };

  // Start continuous recognition.
  recognizer.startContinuousRecognitionAsync();

  // Handle incoming messages from Twilio.
  socket.on('message', (message) => {
    let msgObj;
    try {
      msgObj = JSON.parse(message);
    } catch (err) {
      console.error('Error parsing message:', err);
      return;
    }
    
    // Twilio sends a "media" event with base64 audio payloads.
    if (msgObj.event === 'media' && msgObj.media && msgObj.media.payload) {
      // Decode the base64 audio payload.
      const audioData = Buffer.from(msgObj.media.payload, 'base64');
      // Write the audio data to the Azure Speech push stream.
      pushStream.write(audioData);
    }
  });

  // Clean up when the connection closes.
  socket.on('close', () => {
    console.log('Twilio media stream connection closed.');
    recognizer.stopContinuousRecognitionAsync(() => {
      pushStream.close();
    });
  });
});

// --- Start the Server ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
