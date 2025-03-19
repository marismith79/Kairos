import express, { Request, Response } from "express";
import { humeSentiService } from "./humeSentiService.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import dotenv from "dotenv";
import { fetchAccessToken } from "hume";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { startTranscription } from "./transcription.js";
import { outputEmitter } from "./generative.js";
import twilio from "twilio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're in production (Azure) or development
const isProduction = process.env.NODE_ENV === "production";

// Adjust paths based on environment
const envPath = isProduction
  ? path.join(__dirname, "../../../.env") // Azure path
  : path.join(__dirname, "../../.env"); // Local path

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// Enable CORS middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Parse JSON bodies
app.use(express.json());

// Adjust static file path based on environment
const clientPath = isProduction
  ? path.join(__dirname, "../../../client/dist") // Azure path
  : path.join(__dirname, "../../client/dist");

console.log("Environment:", process.env.NODE_ENV);
console.log("Serving static files from:", clientPath);
app.use(express.static(clientPath));

app.get("/api/v1", (req: Request, res: Response) => {
  res.send("hello !!!!");
});

app.get("/api/getHumeAccessToken", async (req: Request, res: Response) => {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    return res.status(500).json({
      error: "Hume API key or Secret key is missing on the server.",
    });
  }

  try {
    const accessToken = await fetchAccessToken({
      apiKey,
      secretKey,
    });

    if (!accessToken) {
      return res.status(500).json({
        error: "Failed to fetch Hume access token from Hume API.",
      });
    }

    res.json({ accessToken });
  } catch (error) {
    console.error("Error fetching Hume access token:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create an HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  }
});

// Listen for new client connections.
io.on('connection', (socket) => {
  console.log('New client connected');
});

// Listen for generated output from the AI bot and emit them to connected clients.
outputEmitter.on('outputGenerated', (output) => {
  console.log("Emitting generated output to clients:", output);
  io.emit('output', output);
});

// Handle Twilio call events and transcription
startTranscription(server, io);

/* 
  Updated TwiML endpoint for inbound calls.
  Incoming callers are placed into a conference named "MyConferenceRoom".
  We add a statusCallback attribute to receive conference events.
*/
app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Dial>
        <Conference 
          startConferenceOnEnter="true"
          endConferenceOnExit="true"
          waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
          statusCallback="${process.env.PUBLIC_URL}/conference-status"
          statusCallbackEvent="start join leave end">
          MyConferenceRoom
        </Conference>
      </Dial>
    </Response>
  `);
});

/*
  New endpoint to handle conference status callbacks.
  When a participant joins (and it's not the bot), trigger the outbound bot call.
*/
let botCallInitiated = false;
app.post("/conference-status", (req: Request, res: Response) => {
  console.log("Conference status callback received:", req.body);
  const event = req.body.StatusCallbackEvent;
  // Ensure that we only trigger when a non-bot participant joins and the bot hasn't been called yet.
  if (event === "participant-join" && !botCallInitiated) {
    // Optionally, you can check additional parameters in req.body to ensure this is the caller.
    console.log("Non-bot participant joined. Triggering bot call.");
    callBotIntoConference();
    botCallInitiated = true;
  }
  res.sendStatus(200);
});

/*
  New TwiML endpoint for the bot.
  When Twilio initiates an outbound call for the bot, it will request this URL.
  The response instructs the bot to join the same conference room.
*/
app.get("/bot-twiml", (req: Request, res: Response) => {
  console.log("Bot TwiML requested");
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Dial>
        <Conference 
          startConferenceOnEnter="true"
          endConferenceOnExit="true">
          MyConferenceRoom
        </Conference>
      </Dial>
    </Response>
  `);
});

/*
  Endpoint to handle sentiment data (unchanged).
*/
app.post("/api/sentiment", (req: Request, res: Response) => {
  console.log("POST /api/sentiment endpoint hit");
  const formatted = req.body.sentiments;
  io.emit("sentimentUpdate", formatted);
  res.sendStatus(200);
});

humeSentiService.connect(process.env.HUME_API_KEY!, (predictions) => {
  // console.log("Received predictions from Hume:", predictions);
});

// Adjust index.html path based on environment
app.get("*", (req: Request, res: Response) => {
  const indexPath = isProduction
    ? path.join(__dirname, "../../../client/dist/index.html")
    : path.join(__dirname, "../../client/dist/index.html");

  res.sendFile(indexPath);
});

// -------------------
// Bot Call Integration
// -------------------

// Function to initiate an outbound call for the bot
async function callBotIntoConference() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_NUMBER; 
  if (!accountSid || !authToken || !fromNumber) {
    console.error("Missing Twilio credentials");
    return;
  }
  const client = twilio(accountSid, authToken);

  try {
    // Initiate the outbound call.
    const call = await client.calls.create({
      url: `${process.env.PUBLIC_URL}/bot-twiml`,
      to: "client:Kairbot",
      from: fromNumber
    });
    console.log("Bot outbound call initiated. Call SID:", call.sid);
  } catch (error) {
    console.error("Error initiating bot call:", error);
  }
}

// Start the server without automatically triggering the bot call.
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}, env port is ${process.env.PORT}`);
});
