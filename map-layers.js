const MapLayers = {
    currentLayer: null,
    layers: {},
    controlContainer: null,

    init() {
        this.controlContainer = document.querySelector('.map-layer-control');
        this.layers = {
            street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors', maxZoom: 19
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri, Maxar, GeoEye', maxZoom: 18
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap', maxZoom: 17
            })
        };
        this.createButtons();
        this.switchTo('street'); // Set default layer
    },

    createButtons() {
        Object.keys(this.layers).forEach(name => {
            const button = document.createElement('button');
            button.className = 'layer-button';
            button.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            button.onclick = () => this.switchTo(name);
            this.controlContainer.appendChild(button);
        });
    },

    switchTo(name) {
        if (this.layers[name] && this.layers[name] !== this.currentLayer) {
            if (this.currentLayer) {
                map.removeLayer(this.currentLayer);
            }
            this.currentLayer = this.layers[name];
            this.currentLayer.addTo(map);
            this.updateActiveButton(name);
        }
    },
    
    updateActiveButton(name) {
        this.controlContainer.querySelectorAll('.layer-button').forEach(btn => {
            if (btn.textContent.toLowerCase() === name) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
};