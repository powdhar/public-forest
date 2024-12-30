// Configuration
const CONFIG = {
    SCOPE: 'activity:read_all',
    DEBUG: true
};

// DOM Elements
const elements = {
    connectButton: document.getElementById('strava-connect'),
    authContainer: document.getElementById('auth-container'),
    loadingContainer: document.getElementById('loading-container'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    statsContainer: document.getElementById('stats-container'),
    forestContainer: document.getElementById('forest-container'),
    treeGrid: document.getElementById('tree-grid'),
    activityCount: document.getElementById('activity-count'),
    totalActivities: document.getElementById('total-activities'),
    totalDistance: document.getElementById('total-distance'),
    totalTime: document.getElementById('total-time'),
    loadingContainer: document.getElementById('loading-container'),
    lottieContainer: document.getElementById('lottie-loading')
};

// Lottie animation setup
let loadingAnimation = null;
function initLoadingAnimation() {
    loadingAnimation = lottie.loadAnimation({
        container: elements.lottieContainer,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: 'loading-animation.json',
        rendererSettings: {
            progressiveLoad: true,
            preserveAspectRatio: 'xMidYMid meet'
        }
    });
}

// State management
let state = {
    activities: [],
    isLoading: false,
    error: null,
    accessToken: null,
    isAuthenticated: false
};

// Authentication functions
async function handleLogin() {
    try {
        const response = await fetch('/api/auth-url');
        const data = await response.json();
        window.location.href = data.authUrl;
    } catch (error) {
        showError('Failed to initialize login');
    }
}

async function exchangeToken(code) {
    try {
        const response = await fetch('/api/token-exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        const data = await response.json();
        
        if (data.access_token) {
            localStorage.setItem('stravaAccessToken', data.access_token);
            localStorage.setItem('stravaRefreshToken', data.refresh_token);
            localStorage.setItem('stravaTokenExpiry', Date.now() + (data.expires_in * 1000));
            
            state.accessToken = data.access_token;
            state.isAuthenticated = true;
            await fetchActivities(data.access_token);
        } else {
            throw new Error('Failed to get access token');
        }
    } catch (err) {
        showError('Authentication failed. Please try again.');
    }
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('stravaRefreshToken');
    
    try {
        const response = await fetch('/api/token-refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();
        
        if (data.access_token) {
            localStorage.setItem('stravaAccessToken', data.access_token);
            localStorage.setItem('stravaRefreshToken', data.refresh_token);
            localStorage.setItem('stravaTokenExpiry', Date.now() + (data.expires_in * 1000));
            return data.access_token;
        }
        throw new Error('Failed to refresh token');
    } catch (err) {
        showError('Failed to refresh authentication. Please log in again.');
        state.isAuthenticated = false;
        return null;
    }
}

async function checkAndRefreshToken() {
    const expiryTime = localStorage.getItem('stravaTokenExpiry');
    
    if (expiryTime && Date.now() > parseInt(expiryTime) - 300000) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            state.accessToken = newToken;
            return newToken;
        }
    }
    
    return localStorage.getItem('stravaAccessToken');
}

// Data fetching
async function fetchActivities(token) {
    setLoading(true);
    hideError();
    
    try {
        let page = 1;
        let allActivities = [];
        let hasMore = true;
        
        while (hasMore) {
            const response = await fetch(
                `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=200`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch activities');
            }
            
            const data = await response.json();
            
            if (data.length === 0) {
                hasMore = false;
            } else {
                allActivities = [...allActivities, ...data];
                page += 1;
            }
        }
        
        state.activities = allActivities;
        updateUI();
    } catch (err) {
        showError('Failed to fetch activities. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Popover management
let currentPopover = null;

function createPopover(activity, clickEvent) {
    removePopover();
    
    const popover = document.createElement('div');
    popover.className = 'popover';
    
    const activityDate = new Date(activity.start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const distance = (activity.distance / 1000).toFixed(2);
    const duration = (activity.moving_time / 3600).toFixed(2);
    const avgSpeed = (activity.average_speed * 3.6).toFixed(2);
    const elevation = activity.total_elevation_gain.toFixed(0);

    popover.innerHTML = `
        <div class="popover-title">${activity.name}</div>
        <div class="popover-content">
            <div class="popover-stat">
                <span class="popover-stat-label">Date:</span>
                <span class="popover-stat-value">${activityDate}</span>
            </div>
            <div class="popover-stat">
                <span class="popover-stat-label">Distance:</span>
                <span class="popover-stat-value">${distance} km</span>
            </div>
            <div class="popover-stat">
                <span class="popover-stat-label">Duration:</span>
                <span class="popover-stat-value">${duration} hours</span>
            </div>
            <div class="popover-stat">
                <span class="popover-stat-label">Average Speed:</span>
                <span class="popover-stat-value">${avgSpeed} km/h</span>
            </div>
            <div class="popover-stat">
                <span class="popover-stat-label">Elevation Gain:</span>
                <span class="popover-stat-value">${elevation} m</span>
            </div>
        </div>
    `;

    document.body.appendChild(popover);
    
    const rect = clickEvent.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    let top = rect.top + scrollTop - 10;
    let left = rect.left + scrollLeft + rect.width / 2;
    
    const popoverRect = popover.getBoundingClientRect();
    
    if (top - popoverRect.height < scrollTop) {
        top = rect.bottom + scrollTop + 10;
    }
    
    if (left + popoverRect.width / 2 > window.innerWidth) {
        left = window.innerWidth - popoverRect.width - 10;
    }
    
    if (left - popoverRect.width / 2 < 0) {
        left = 10;
    }
    
    popover.style.top = `${top - popoverRect.height}px`;
    popover.style.left = `${left - popoverRect.width / 2}px`;
    
    currentPopover = popover;
    
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}

function removePopover() {
    if (currentPopover) {
        currentPopover.remove();
        currentPopover = null;
        document.removeEventListener('click', handleOutsideClick);
    }
}

function handleOutsideClick(event) {
    if (currentPopover && !currentPopover.contains(event.target) && !event.target.classList.contains('tree')) {
        removePopover();
    }
}

// UI updates
function updateUI() {
    if (state.activities.length > 0) {
        // Hide connect button when authenticated and showing activities
        elements.authContainer.classList.add('hidden');
        
        // Show stats and forest
        elements.activityCount.textContent = `Each tree represents one of your ${state.activities.length} activities`;
        updateStats();
        renderForest();
        elements.statsContainer.classList.remove('hidden');
        elements.forestContainer.classList.remove('hidden');
    } else {
        // Show connect button when not authenticated
        elements.authContainer.classList.remove('hidden');
        elements.connectButton.classList.remove('hidden');
        
        // Hide stats and forest
        elements.statsContainer.classList.add('hidden');
        elements.forestContainer.classList.add('hidden');
    }
}

function updateStats() {
    const totalDistance = state.activities.reduce((sum, activity) => sum + activity.distance, 0) / 1000;
    const totalTime = state.activities.reduce((sum, activity) => sum + activity.moving_time, 0) / 3600;
    
    elements.totalActivities.textContent = state.activities.length;
    elements.totalDistance.textContent = `${totalDistance.toFixed(1)} km`;
    elements.totalTime.textContent = `${totalTime.toFixed(1)} hours`;
}

function renderForest() {
    elements.treeGrid.innerHTML = '';
    
    state.activities.forEach(activity => {
        const treeSpan = document.createElement('span');
        treeSpan.className = 'tree';
        treeSpan.textContent = '🌳';
        treeSpan.title = `${activity.name} - ${(activity.distance / 1000).toFixed(2)}km`;
        
        treeSpan.addEventListener('click', (event) => {
            event.stopPropagation();
            createPopover(activity, event);
        });
        
        elements.treeGrid.appendChild(treeSpan);
    });
}

// UI helpers
function setLoading(loading) {
    state.isLoading = loading;
    elements.loadingContainer.classList.toggle('hidden', !loading);
    
    // Hide connect button while loading
    if (loading) {
        elements.authContainer.classList.add('hidden');
    } else if (!state.isAuthenticated) {
        elements.authContainer.classList.remove('hidden');
    }
    
    if (loading && loadingAnimation) {
        loadingAnimation.play();
    } else if (loadingAnimation) {
        loadingAnimation.stop();
    }
}

function showError(message) {
    state.error = message;
    elements.errorMessage.textContent = message;
    elements.errorContainer.classList.remove('hidden');
}

function hideError() {
    state.error = null;
    elements.errorContainer.classList.add('hidden');
}

// Initialize the application
function init() {
    // Initialize Lottie animation first
    initLoadingAnimation();
    
    // Set up event listeners
    elements.connectButton.addEventListener('click', handleLogin);
    
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');
    const error = urlParams.get('error');
    
    if (error) {
        showError('Authentication failed. Please try again.');
        updateUI(); // Show connect button
        return;
    }
    
    if (accessToken) {
        // Store the tokens
        localStorage.setItem('stravaAccessToken', accessToken);
        localStorage.setItem('stravaRefreshToken', refreshToken);
        localStorage.setItem('stravaTokenExpiry', Date.now() + (parseInt(expiresIn) * 1000));
        
        // Update state
        state.accessToken = accessToken;
        state.isAuthenticated = true;
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Fetch activities
        fetchActivities(accessToken);
    } else {
        const storedToken = localStorage.getItem('stravaAccessToken');
        if (storedToken) {
            state.isAuthenticated = true;
            state.accessToken = storedToken;
            checkAndRefreshToken().then(validToken => {
                if (validToken) {
                    fetchActivities(validToken);
                } else {
                    // If token refresh failed, show connect button
                    updateUI();
                }
            });
        } else {
            // No stored token, show connect button
            updateUI();
        }
    }
}

// Start the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);