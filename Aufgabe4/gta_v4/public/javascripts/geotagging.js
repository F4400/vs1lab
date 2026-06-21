// File origin: VS1LAB A2, A4

/* eslint-disable no-unused-vars */

// This script is executed when the browser loads index.html.

// "console.log" writes to the browser's console.
// The console window must be opened explicitly in the browser.
console.log("The geoTagging script is going to start...");

// The 'LocationHelper' and 'MapManager' classes are loaded in the
// HTML page before this script, so they are available here.

/**
 * Store current location coordinates for reuse
 */
let currentLatitude = '';
let currentLongitude = '';

/**
 * Render the map and write the coordinates into the form fields.
 * @param {string|number} latitude
 * @param {string|number} longitude
 */
const showPosition = (latitude, longitude) => {
    currentLatitude = latitude;
    currentLongitude = longitude;

    document.getElementById("latitude").value = latitude;
    document.getElementById("longitude").value = longitude;
    document.getElementById("search_latitude").value = latitude;
    document.getElementById("search_longitude").value = longitude;

    const mapManager = new MapManager();
    mapManager.initMap(latitude, longitude);
    mapManager.updateMarkers(latitude, longitude, []);
};

/**
 * Update location based on stored coordinates or GeoLocation API
 */
const updateLocation = () => {
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;

    if (latitude && longitude) {
        // Coordinates are already known, reuse them and skip the GeoLocation API.
        showPosition(latitude, longitude);
    } else {
        // No coordinates yet, query the GeoLocation API.
        LocationHelper.findLocation((locationHelper) => {
            showPosition(locationHelper.latitude, locationHelper.longitude);
        });
    }
};

/**
 * Add a new GeoTag via AJAX POST request
 */
const addGeoTag = async (event) => {
    event.preventDefault();
    
    const name = document.getElementById("name").value;
    const hashtag = document.getElementById("hashtag").value;
    
    if (!name || !currentLatitude || !currentLongitude) {
        alert("Please enter a name and ensure location is available");
        return;
    }

    const geoTag = {
        name: name,
        latitude: currentLatitude,
        longitude: currentLongitude,
        hashtag: hashtag
    };

    try {
        const response = await fetch('/api/geotags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(geoTag)
        });

        if (response.ok) {
            console.log("GeoTag added successfully");
            // Clear form
            document.getElementById("name").value = '';
            document.getElementById("hashtag").value = '';
            // Update discovery list
            updateDiscovery();
        } else {
            console.error("Failed to add GeoTag");
        }
    } catch (error) {
        console.error("Error adding GeoTag:", error);
    }
};

/**
 * Search for GeoTags via AJAX GET request and update the display
 */
const updateDiscovery = async (event) => {
    if (event) {
        event.preventDefault();
    }

    const searchTerm = document.getElementById("search").value;
    const latitude = document.getElementById("search_latitude").value;
    const longitude = document.getElementById("search_longitude").value;

    if (!latitude || !longitude) {
        alert("Location not available");
        return;
    }

    const params = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        ...(searchTerm && { search: searchTerm })
    });

    try {
        const response = await fetch(`/api/geotags?${params}`);
        if (response.ok) {
            const taglist = await response.json();
            console.log("Tags fetched:", taglist);
            
            // Update the tag list in the UI
            updateTagListUI(taglist);
            
            // Update the map
            const mapManager = new MapManager();
            mapManager.initMap(latitude, longitude);
            mapManager.updateMarkers(latitude, longitude, taglist);
        } else {
            console.error("Failed to fetch tags");
        }
    } catch (error) {
        console.error("Error fetching tags:", error);
    }
};

/**
 * Update the tag list UI with fetched tags
 */
const updateTagListUI = (tags) => {
    const tagListElement = document.getElementById("discoveryResults");
    if (!tagListElement) return;

    tagListElement.innerHTML = '';
    tags.forEach(tag => {
        const listItem = document.createElement('li');
        listItem.textContent = `${tag.name} (${tag.latitude}, ${tag.longitude}) ${tag.hashtag}`;
        tagListElement.appendChild(listItem);
    });
};

/**
 * Register event listeners for form buttons
 */
const setupEventListeners = () => {
    // Tagging form button
    const taggingForm = document.getElementById('tag-form');
    if (taggingForm) {
        taggingForm.addEventListener('submit', addGeoTag);
    }

    // Discovery form button
    const discoveryForm = document.getElementById('discoveryFilterForm');
    if (discoveryForm) {
        discoveryForm.addEventListener('submit', updateDiscovery);
    }
};

// Wait for the page to fully load its DOM content, then initialize
document.addEventListener("DOMContentLoaded", () => {
    console.log("Page loaded, now updating location...");
    updateLocation();
    setupEventListeners();
});
