// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAsaux5LRiMitD4VY2DIPezakXxB_68OUE",
    authDomain: "monumental-kazakhstan.firebaseapp.com",
    projectId: "monumental-kazakhstan",
    storageBucket: "monumental-kazakhstan.appspot.com",
    messagingSenderId: "539573517355",
    appId: "1:539573517355:web:6797404adc068302767e6e"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

// Define map globally so it's accessible to all scripts
const map = L.map('map').setView([48.0196, 66.9237], 5);

// Field configuration for popups
const FIELD_CONFIG = {
    order: [
        'region', 'city', 'address', 'building', 'roomLocation', 'artist', 
        'technique', 'year', 'description', 'notes', 'status', 'accessibility', 
        'locationCertainty', 'source', 'url', 'finalCode'
    ],
    labels: {
        roomLocation: 'Room / Location',
        locationCertainty: 'Location Certainty',
        finalCode: 'Code'
    }
};

const getFieldLabel = (field) => {
    return FIELD_CONFIG.labels[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
};

function copyCoordinates(text, event) {
    navigator.clipboard.writeText(text).then(() => {
        const box = event.currentTarget;
        const confirm = box.querySelector('.copy-confirm');
        box.classList.add('copied');
        setTimeout(() => box.classList.remove('copied'), 1500);
    }).catch(err => console.error("Copy failed:", err));
}

function shareMonument(lat, lng) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('A sharable link to this monument has been copied to your clipboard!');
    }).catch(err => {
        console.error("Failed to copy share link:", err);
    });
}

const createPopupContent = (data, lat, lng) => {
    const title = data.title || `${data.city} - ${data.building || data.category}`;
    const usedInTitle = { title: !!data.title, city: !data.title, building: !data.title, category: !data.title };

    const content = FIELD_CONFIG.order
        .filter(field => data[field] && !usedInTitle[field])
        .map(field => {
            const label = getFieldLabel(field);
            const value = data[field];
            if (field === 'url') {
                const fullUrl = value.startsWith('http') ? value : `http://${value}`;
                return `<b>${label}:</b> <a href="${fullUrl}" target="_blank" rel="noopener noreferrer">View Link</a>`;
            }
            return `<b>${label}:</b> ${value}`;
        })
        .join('<br>');

    return `
        <div class="popup-title">${title}</div>
        <div class="popup-content">${content}</div>
        <div class="coordinates-footer">
            <div class="coordinates-box" onclick="copyCoordinates('${lat.toFixed(6)},${lng.toFixed(6)}', event)" title="Copy coordinates">
                ${lat.toFixed(6)}, ${lng.toFixed(6)}
                <span class="copy-confirm">Copied!</span>
            </div>
            <div class="map-service-buttons">
                <a href="https://www.google.com/maps?q=${lat},${lng}" class="map-btn" title="Google Maps" target="_blank"><svg class="map-icon"><use href="#google-maps-icon"></use></svg></a>
                <a href="https://yandex.com/maps/?text=${lat},${lng}" class="map-btn" title="Yandex Maps" target="_blank"><svg class="map-icon"><use href="#yandex-icon"></use></svg></a>
                <a href="https://2gis.kz/search/${lat},${lng}" class="map-btn" title="2GIS" target="_blank"><svg class="map-icon"><use href="#2gis-icon"></use></svg></a>
                <button class="share-btn" title="Copy link to monument" onclick="shareMonument(${lat}, ${lng})"><svg class="share-icon"><use href="#share-icon"></use></svg></button>
            </div>
        </div>`;
};

const UserSubmissions = {
    showForm() {
        alert("User submission form logic has not been fully implemented yet.");
    }
};

function addSubmissionButton() {
    const button = document.createElement('button');
    button.innerHTML = '+ Add';
    button.title = "Submit a Monument";
    button.style.cssText = `
        position: absolute; bottom: 20px; right: 20px; z-index: 1000;
        background: #28a745; color: white; border: none;
        padding: 10px 15px; border-radius: 25px; cursor: pointer; font-weight: 600;
        box-shadow: 0 4px 15px rgba(40,167,69,0.4);
    `;
    button.onclick = UserSubmissions.showForm;
    document.body.appendChild(button);
}

// Main application startup sequence
document.addEventListener('DOMContentLoaded', () => {
    // Step 1: Initialize map layers
    MapLayers.init();
    
    // Step 2: Fetch data from Firebase
    db.collection("monumental-kazakhstan").get().then(snapshot => {
        
        // Step 3: Initialize the filter system with the fetched data
        Filters.init(snapshot.docs);
        
        // Step 4: Add supplementary UI elements
        addSubmissionButton();
        
    }).catch(error => {
        // Handle critical data loading errors
        const errorBox = document.getElementById('loading-overlay');
        console.error("Firebase error details:", error);
        errorBox.innerHTML = `
            <div style="text-align:center;color:#dc3545;background:#fff;padding:20px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                <h3>Error Loading Data</h3>
                <p>Could not fetch data from the database.</p>
                <p style="font-family:monospace;background:#f8f9fa;padding:10px;border-radius:4px;border:1px solid #ddd;text-align:left;max-width:400px;word-wrap:break-word;">
                    <b>Code:</b> ${error.code}<br>
                    <b>Message:</b> ${error.message}
                </p>
                <button onclick="location.reload()" style="padding:10px 20px;background:#007bff;color:white;border:none;border-radius:6px;cursor:pointer;">Retry</button>
            </div>`;
    });
});