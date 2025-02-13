const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// Serve image files
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve the main HTML file for all routes to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'combine.html'));
});

// Use Heroku's dynamic port or 3000 for local development
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});