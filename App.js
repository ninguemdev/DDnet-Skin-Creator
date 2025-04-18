// App.js
const express = require('express');
const path = require('path');
const app = express();

// Serve static folders
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets', 'index.html'));
});

// Explicit routes for CSS and JS (optional, but ensures correct MIME)
app.get('/css/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'css', 'styles.css'));
});
app.get('/js/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'js', 'script.js'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});