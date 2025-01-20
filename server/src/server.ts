import express from "express";
import { fileURLToPath } from 'url';
import { Request, Response } from "express";
import path, { dirname } from "path";
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're in production (Azure) or development
const isProduction = process.env.NODE_ENV === 'production';

// Adjust paths based on environment
const envPath = isProduction 
  ? path.join(__dirname, '../../../.env')    // Azure path
  : path.join(__dirname, '../../.env');      // Local path

dotenv.config({ path: envPath });

const PORT = process.env.PORT || 3000;
const app = express();

// Adjust static file path based on environment
const clientPath = isProduction
  ? path.join(__dirname, '../../../client/dist')    // Azure path
  : path.join(__dirname, '../../client/dist');      // Local path

console.log('Environment:', process.env.NODE_ENV);
console.log('Serving static files from:', clientPath);
app.use(express.static(clientPath));

app.get("/api/v1", (req: Request, res: Response) => {
  res.send("hello !!!!");
});

// Adjust index.html path based on environment
app.get('*', (req, res) => {
  const indexPath = isProduction
    ? path.join(__dirname, '../../../client/dist/index.html')    // Azure path
    : path.join(__dirname, '../../client/dist/index.html');      // Local path
    
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}, env port is ${process.env.PORT}`);
});
