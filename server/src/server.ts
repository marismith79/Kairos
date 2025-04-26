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
import twilio from 'twilio';
const { VoiceResponse } = twilio.twiml;

const MODERATOR = "+19497763549";
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
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded bodies
// // If you're using webhooks (which Twilio uses), you might need raw body parsing
// app.use(express.raw({ type: "application/json" }));

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
  },
});

// Listen for new client connections.
io.on("connection", (socket) => {
  console.log("New client connected");
});

//Handle Twilio call events Request
startTranscription(server, io);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/", (req, res) => {
  console.log("")
  const twiml = new VoiceResponse();

  // Start streaming
  twiml.start().stream({
    url: `wss://${req.headers.host}/stream`,
  });

  // Add a short message and pause
  twiml.say("You will be placed into the conference.");
  twiml.pause({ length: 2 });

  // Then dial into the conference
  const dial = twiml.dial();
  dial.conference({
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    waitUrl: "", // no hold music
  }, "MyConferenceRoom");

  res.type("text/xml");
  res.send(twiml.toString());
  console.log(`Twiml: ${twiml.toString()}`);
});

app.post("/api/sentiment", (req: Request, res: Response) => {
  console.log("POST /api/sentiment endpoint hit");
  const s_formatted = req.body.sentiments;
  io.emit("sentimentUpdate", s_formatted);
  res.sendStatus(200);
});

app.post("/api/chat", (req: Request, res: Response) => {
  console.log("POST /api/chat endpoint hit");
  const e_formatted = req.body.emotions;
  io.emit("top3emotionsUpdate", e_formatted);
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

server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}, env port is ${process.env.PORT}`
  );
});
