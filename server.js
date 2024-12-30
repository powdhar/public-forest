const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.json());

// Get auth URL endpoint
app.get('/api/auth-url', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  // Handle different URL formats for Vercel
  let baseUrl;
  if (process.env.VERCEL_URL) {
    // Remove any preview deployment specific parts
    const cleanVercelUrl = process.env.VERCEL_URL.replace(/-[^.]+\.vercel\.app$/, '.vercel.app');
    baseUrl = `https://${cleanVercelUrl}`;
  } else {
    baseUrl = 'http://localhost:3000';
  }
  
  const redirectUri = `${baseUrl}/api/callback`;
  const scope = 'activity:read_all';
  
  console.log('Redirect URI:', redirectUri); // Debug log
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.json({ authUrl });
});

// Add back the callback endpoint
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
    
    if (data.errors) {
      console.error('Strava API Error:', data.errors);
      res.redirect('/?error=auth_failed');
      return;
    }
    
    res.redirect(`/?code=${code}`);
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// Token exchange endpoint
app.post('/api/token-exchange', async (req, res) => {
  const { code } = req.body;
  
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
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// Token refresh endpoint
app.post('/api/token-refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

module.exports = app;