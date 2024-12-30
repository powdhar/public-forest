// Mock data to simulate Strava activities
const MOCK_ACTIVITIES = [
    {
        name: "Morning Run in Central Park",
        start_date: "2024-12-28T08:30:00Z",
        distance: 5200, // in meters
        moving_time: 1800, // in seconds
        average_speed: 2.88, // meters per second
        total_elevation_gain: 45, // meters
        type: "Run"
    },
    {
        name: "Evening City Ride",
        start_date: "2024-12-27T17:00:00Z",
        distance: 15000,
        moving_time: 3600,
        average_speed: 4.16,
        total_elevation_gain: 120,
        type: "Ride"
    }
];

// Generate more mock activities for testing larger datasets
function generateMockActivities(count) {
    const activities = [...MOCK_ACTIVITIES]; // Start with our base activities
    const activityTypes = ['Run', 'Ride', 'Swim', 'Hike'];
    const locations = ['Park', 'City', 'Trail', 'Beach', 'Mountains'];
    const timeOfDay = ['Morning', 'Afternoon', 'Evening', 'Night'];
    
    for (let i = 2; i < count; i++) {
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const time = timeOfDay[Math.floor(Math.random() * timeOfDay.length)];
        
        // Create date between 1-60 days ago
        const daysAgo = Math.floor(Math.random() * 60) + 1;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        activities.push({
            name: `${time} ${type} at ${location}`,
            start_date: date.toISOString(),
            distance: Math.floor(Math.random() * 20000) + 1000, // 1-21km in meters
            moving_time: Math.floor(Math.random() * 7200) + 1800, // 30-150 minutes in seconds
            average_speed: Math.random() * 5 + 1, // 1-6 m/s
            total_elevation_gain: Math.floor(Math.random() * 500), // 0-500m elevation
            type: type
        });
    }
    
    return activities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
}

// DOM Elements - only what we need for visualization
const elements = {
    forestContainer: document.getElementById('forest-container'),
    treeGrid: document.getElementById('tree-grid'),
    activityCount: document.getElementById('activity-count'),
    totalActivities: document.getElementById('total-activities'),
    totalDistance: document.getElementById('total-distance'),
    totalTime: document.getElementById('total-time'),
    statsContainer: document.getElementById('stats-container'),
    loadingContainer: document.getElementById('loading-container'),
    lottieContainer: document.getElementById('lottie-loading')
};

// Initialize Lottie animation
let loadingAnimation = null;
function initLoadingAnimation() {
    loadingAnimation = lottie.loadAnimation({
        container: elements.lottieContainer,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: 'loading-animation.json', // Replace with your Lottie file path
        rendererSettings: {
            progressiveLoad: true,
            preserveAspectRatio: 'xMidYMid meet'
        }
    });
}

// Simplified state management
let state = {
    activities: generateMockActivities(50) // Generate 50 mock activities
};

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
                <span class="popover-stat-label">Type:</span>
                <span class="popover-stat-value">${activity.type}</span>
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
    elements.activityCount.textContent = `Each tree represents one of your ${state.activities.length} activities`;
    updateStats();
    renderForest();
    elements.statsContainer.classList.remove('hidden');
    elements.forestContainer.classList.remove('hidden');
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

// Loading state management
function setLoading(isLoading) {
    if (isLoading) {
        elements.loadingContainer.classList.remove('hidden');
        if (loadingAnimation) {
            loadingAnimation.play();
        }
    } else {
        elements.loadingContainer.classList.add('hidden');
        if (loadingAnimation) {
            loadingAnimation.stop();
        }
    }
}

// Simulate loading for development
async function simulateLoading() {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
}

// Initialize the development version
function init() {
    initLoadingAnimation();
    simulateLoading().then(() => {
        updateUI(); // Show the forest after "loading"
    });
}

// Start the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Development helpers
window.devTools = {
    // Add more activities
    addActivities: (count) => {
        state.activities = generateMockActivities(count);
        updateUI();
    },
    // Clear all activities
    clearActivities: () => {
        state.activities = [];
        updateUI();
    },
    // Get current state
    getState: () => {
        console.log('Current state:', state);
        return state;
    }
};