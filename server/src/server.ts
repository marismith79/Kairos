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

//Handle Twilio call events Request
startTranscription(server);

app.get("/", (req, res) => res.send("Hello World"));

app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Start>
        <Stream url="wss://${req.headers.host}/"/>
      </Start>
      <Say>I will stream the next 60 seconds of audio through your websocket</Say>
      <Pause length="60" />
    </Response>
  `);
});

// Modify the sentiment endpoint to broadcast sentiment data.
app.post("/api/sentiment", (req: Request, res: Response) => {
  const sentiments = req.body.sentiments;
  console.log("Received sentiment data:", sentiments);
  
  // Broadcast sentiment data to all connected clients.
  io.emit("sentimentUpdate", sentiments);
  res.sendStatus(200);
});

// TESTING WITH EXAMPLE TEXT
app.post("/api/processText", (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }
  // Use the backend service to send the text for processing.
  humeSentiService.sendTextData(text);
  res.sendStatus(200);
});
app.post("/api/connect", async (req: Request, res: Response) => {
  const HUME_API_KEY = process.env.HUME_API_KEY;
  if (!HUME_API_KEY) {
    return res.status(500).json({ error: "HUME_API_KEY is not set" });
  }
  try {
    await humeSentiService.connect(HUME_API_KEY, (predictions) => {
      console.log("Received predictions:", predictions);
    });
    res.sendStatus(200);
  } catch (error) {
    console.error("Error connecting to Hume:", error);
    res.status(500).json({ error: "Error connecting to Hume" });
  }
});

// Adjust index.html path based on environment
app.get("*", (req: Request, res: Response) => {
  const indexPath = isProduction
    ? path.join(__dirname, "../../../client/dist/index.html")
    : path.join(__dirname, "../../client/dist/index.html");

  res.sendFile(indexPath);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}, env port is ${process.env.PORT}`);
});
