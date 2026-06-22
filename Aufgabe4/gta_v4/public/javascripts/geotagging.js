// File origin: VS1LAB A2, A4

/* eslint-disable no-unused-vars */

// This script is executed when the browser loads index.html.

// "console.log" writes to the browser's console.
// The console window must be opened explicitly in the browser.
console.log("The geoTagging script is going to start...");

// The 'LocationHelper' and 'MapManager' classes are loaded in the
// HTML page before this script, so they are available here.

/**
 * A single shared MapManager instance. The Leaflet map may only be
 * initialized once per container, so we keep track of that here and
 * only refresh the markers on subsequent updates.
 */
let mapManager;
let mapInitialized = false;

/**
 * The current location is stored here so that both the tagging and the
 * discovery requests can reuse it.
 */
let currentLatitude = '';
let currentLongitude = '';

let currentPage = 1;
let totalPages = 1;
const PAGE_SIZE = 5;

/**
 * Render the map: initialize it once, then (re)draw all markers.
 * @param {string|number} latitude
 * @param {string|number} longitude
 * @param {{latitude, longitude, name}[]} tags
 */
const renderMap = (latitude, longitude, tags = []) => {
    if (!mapManager) {
        mapManager = new MapManager();
    }
    if (!mapInitialized) {
        mapManager.initMap(latitude, longitude);
        mapInitialized = true;
    }
    mapManager.updateMarkers(latitude, longitude, tags);
};

/**
 * Write the coordinates into the (hidden) form fields and remember them
 * for the AJAX requests, then center the map on the location.
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

    renderMap(latitude, longitude, []);
};

/**
 * Retrieve the current location once the page has loaded.
 * Existing coordinates from the form are reused, otherwise the
 * GeoLocation API is queried. Afterwards an initial discovery is
 * triggered to populate the result list and the map.
 */
const updateLocation = () => {
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;

    if (latitude && longitude) {
        showPosition(latitude, longitude);
        discover('');
    } else {
        LocationHelper.findLocation((locationHelper) => {
            showPosition(locationHelper.latitude, locationHelper.longitude);
            discover('');
        });
    }
};

/**
 * Render the GeoTag result list inside the discovery widget.
 * @param {{name, latitude, longitude, hashtag}[]} tags
 */
const renderTagList = (tags) => {
    const list = document.getElementById("discoveryResults");
    if (!list) {
        return;
    }
    list.innerHTML = '';
    tags.forEach((tag) => {
        const item = document.createElement('li');
        item.textContent =
            `${tag.name} ( ${tag.latitude},${tag.longitude}) ${tag.hashtag}`;
        list.appendChild(item);
    });
};

/**
 * Query the server for GeoTags via an asynchronous HTTP GET request
 * (Fetch API) using query parameters, then update list and map.
 * @param {string} searchTerm optional filter term
 * @param {number} [page=1] page number to request
 */
const discover = async (searchTerm, page = 1) => {
    if (!currentLatitude || !currentLongitude) {
        return;
    }

    const params = new URLSearchParams({
        latitude: currentLatitude,
        longitude: currentLongitude,
        page: String(page),
        pageSize: String(PAGE_SIZE)
    });
    if (searchTerm) {
        params.set('search', searchTerm);
    }

    try {
        const response = await fetch(`/api/geotags?${params.toString()}`);
        if (!response.ok) {
            console.error("Discovery request failed:", response.status);
            return;
        }
        const data = await response.json();
        currentPage = data.page;
        totalPages = data.totalPages;
        renderTagList(data.tags);
        renderPagination();
        renderMap(currentLatitude, currentLongitude, data.tags);
    } catch (error) {
        console.error("Error during discovery:", error);
    }
};

/**
 * Handler for the discovery form. Runs an asynchronous HTTP GET request
 * with query parameters instead of submitting the form to the server.
 * HTML5 form validation still runs before this handler is invoked.
 * @param {SubmitEvent} event
 */
const onDiscoverySubmit = (event) => {
    event.preventDefault();
    const searchTerm = document.getElementById("search").value;
    discover(searchTerm);
};

/**
 * Handler for the tagging form. Sends the new GeoTag asynchronously via
 * an HTTP POST request with a JSON body (Fetch API), then refreshes the
 * discovery widget so the new tag becomes visible.
 * HTML5 form validation still runs before this handler is invoked.
 * @param {SubmitEvent} event
 */
const onTaggingSubmit = async (event) => {
    event.preventDefault();

    const geoTag = {
        name: document.getElementById("name").value,
        latitude: currentLatitude,
        longitude: currentLongitude,
        hashtag: document.getElementById("hashtag").value
    };

    try {
        const response = await fetch('/api/geotags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geoTag)
        });
        if (!response.ok) {
            console.error("Tagging request failed:", response.status);
            return;
        }

        // Reset the editable tagging fields.
        document.getElementById("name").value = '';
        document.getElementById("hashtag").value = '';

        // Refresh the discovery widget, keeping any active search term.
        discover(document.getElementById("search").value);
    } catch (error) {
        console.error("Error while adding GeoTag:", error);
    }
};

/**
 * Update the pagination widget to reflect the current page state.
 */
const renderPagination = () => {
    const info = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('paginationPrev');
    const nextBtn = document.getElementById('paginationNext');
    if (!info || !prevBtn || !nextBtn) return;

    info.textContent = `Page ${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
};

/**
 * Register the event listeners for both forms and prevent their default
 * (page-reloading) submit behaviour.
 */
const setupEventListeners = () => {
    const taggingForm = document.getElementById('tag-form');
    if (taggingForm) {
        taggingForm.addEventListener('submit', onTaggingSubmit);
    }

    const discoveryForm = document.getElementById('discoveryFilterForm');
    if (discoveryForm) {
        discoveryForm.addEventListener('submit', onDiscoverySubmit);
    }

    const prevBtn = document.getElementById('paginationPrev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                discover(document.getElementById("search").value, currentPage - 1);
            }
        });
    }

    const nextBtn = document.getElementById('paginationNext');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                discover(document.getElementById("search").value, currentPage + 1);
            }
        });
    }
};

// Wait for the page to fully load its DOM content, then initialize.
document.addEventListener("DOMContentLoaded", () => {
    console.log("Page loaded, now updating location...");
    updateLocation();
    setupEventListeners();
});
