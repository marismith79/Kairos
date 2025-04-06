import express, { Request, Response } from "express";
import { humeSentiService } from "./humeSentiService.js";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import dotenv from "dotenv";
import { fetchAccessToken } from "hume";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { outputEmitter } from "./generative.js";
import { startTranscription } from "./transcription.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're in production (Azure) or development
const isProduction = process.env.NODE_ENV === "production";
const envPath = isProduction
  ? path.join(__dirname, "../../../.env") // Azure path
  : path.join(__dirname, "../../.env"); // Local path

dotenv.config({ path: envPath });
console.log("[Server] Environment variables loaded from:", envPath);

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

// Adjust static file path based on environment
const clientPath = isProduction
  ? path.join(__dirname, "../../../client/dist") // Azure path
  : path.join(__dirname, "../../client/dist");

console.log("[Server] Environment:", process.env.NODE_ENV);
console.log("[Server] Serving static files from:", clientPath);
app.use(express.static(clientPath));

app.get("/api/v1", (req: Request, res: Response) => {
  res.send("hello !!!!");
});

app.get("/api/getHumeAccessToken", async (req: Request, res: Response) => {
  console.log("[Server] GET /api/getHumeAccessToken called.");
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    console.error("[Server] Missing Hume API credentials.");
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
    console.error("[Server] Error fetching Hume access token:", error);
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

startTranscription(server, io);

// Emit generated text output from the generative model.
outputEmitter.on("outputGenerated", (output) => {
  // console.log("[Server] Emitting generated output to clients:", output);
  io.emit("output", output);
});

// Stream TTS audio: as each audio chunk is received from Hume's TTS via humeSentiService,
humeSentiService.audioEmitter.on("audioChunk", (audioChunk: Buffer) => {
  // console.log("[Server] Emitting audio chunk, size:", audioChunk.length);
  io.emit("audioStream", audioChunk);
});

// Catch-all endpoint to serve the SPA.
app.get("*", (req: Request, res: Response) => {
  const indexPath = isProduction
    ? path.join(__dirname, "../../../client/dist/index.html")
    : path.join(__dirname, "../../client/dist/index.html");

  res.sendFile(indexPath);
});

server.listen(PORT, () => {
  console.log(`[Server] Server running on http://localhost:${PORT}, env port is ${process.env.PORT}`);
});
