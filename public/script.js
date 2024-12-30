// Initialize the application
async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const error = urlParams.get('error');

  if (error) {
    showError('Authentication failed. Please try again.');
    return;
  }

  if (accessToken) {
    // Store token temporarily in session storage
    sessionStorage.setItem('strava_token', accessToken);
    await loadAthleteData();
  }
}

// Handle Strava connection
async function connectWithStrava() {
  try {
    const response = await fetch('/api/auth');
    const data = await response.json();
    window.location.href = data.authUrl;
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to initialize Strava connection');
  }
}

// Load athlete data
async function loadAthleteData() {
  const accessToken = sessionStorage.getItem('strava_token');
  if (!accessToken) {
    return;
  }

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const athleteData = await response.json();
    
    // Update UI with athlete data
    document.getElementById('athlete-name').textContent = athleteData.firstname + ' ' + athleteData.lastname;
    document.getElementById('athlete-info').style.display = 'block';
    document.getElementById('connect-button').style.display = 'none';
    
    // Load activities
    await loadActivities(accessToken);
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to load athlete data');
  }
}

// Load activities
async function loadActivities(accessToken) {
  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const activities = await response.json();
    displayActivities(activities);
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to load activities');
  }
}

// Display activities in the UI
function displayActivities(activities) {
  const container = document.getElementById('activities');
  container.innerHTML = '';
  
  activities.forEach(activity => {
    const div = document.createElement('div');
    div.className = 'activity';
    div.innerHTML = `
      <h3>${activity.name}</h3>
      <p>Distance: ${(activity.distance / 1000).toFixed(2)} km</p>
      <p>Duration: ${Math.floor(activity.moving_time / 60)} minutes</p>
      <p>Date: ${new Date(activity.start_date).toLocaleDateString()}</p>
    `;
    container.appendChild(div);
  });
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Initialize on page load
window.addEventListener('load', init);