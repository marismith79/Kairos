// server/src/server.ts
import cors from "cors";
import express, { Application, Request, Response } from "express";

const app: Application = express(); 
const PORT: number = 3001; 

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"], 
    credentials: true, 
  })
);

app.use(express.json()); 

// // Register routes from your existing routes.ts
// const server = registerRoutes(app); // Ensure registerRoutes is properly typed

app.get("/", (req: Request, res: Response) => {
  res.send("Deployment is working!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
