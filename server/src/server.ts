import express from "express";
import { fileURLToPath } from 'url';
import { Request, Response } from "express";
import path, { dirname } from "path";

const PORT = 3000,
  app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(path.join(__dirname, '../../client/dist')));

app.get("/api/v1", (req: Request, res: Response) => {
  res.send("hello !!!!");
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});