import express from 'express';
import {matchRouter} from "./routes/matches.js";

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

app.use('/matches', matchRouter)

// Root route
app.get('/', (req, res) => {
  res.send('e-sport API is up and running');
});

// Start server and log URL
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
