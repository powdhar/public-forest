const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.json());

// Authentication endpoint
app.get('/api/auth', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/callback`;
  const scope = 'read,activity:read_all';
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.json({ authUrl });
});

// Callback endpoint
app.get('/api/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    res.redirect(`/?access_token=${data.access_token}`);
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// Export for Vercel
module.exports = app;