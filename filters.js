const Filters = {
    active: {},
    options: {
        region: new Set(), category: new Set(), city: new Set(), artist: new Set(),
        status: new Set(), accessibility: new Set(), locationCertainty: new Set()
    },
    allDocs: [],
    markers: [],
    markerClusterGroup: null,
    searchableFields: ['title', 'artist', 'city', 'address', 'year', 'description', 'technique', 'building'],
    debounceTimer: null,
    isMobile: window.innerWidth <= 768,

    init(allDocs) {
        this.allDocs = allDocs;
        this.setupMarkerClustering();
        this.populateFilterOptions();
        this.createFilterUI();
        this.setupEventListeners();
        this.applyFiltersFromURL();
        document.getElementById('loading-overlay').style.display = 'none';
    },

    setupMarkerClustering() {
        this.markerClusterGroup = L.markerClusterGroup({
            // *** UPDATED CLUSTER OPTIONS ***
            maxClusterRadius: 60,
            disableClusteringAtZoom: 12, // Show individual markers sooner
            zoomToBoundsOnClick: true, // This is the desired behavior
            spiderfyOnMaxZoom: false // Disable the "ring" effect at max zoom
        });
        map.addLayer(this.markerClusterGroup);
    },

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', () => {
            this.showLoading(true);
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.applyAllFilters(), 300);
        });
        window.addEventListener('resize', () => this.handleResponsiveChange());
    },

    togglePanel() {
        const container = document.getElementById('filter-container');
        container.classList.toggle('collapsed');
        document.querySelector('.filter-toggle').textContent = container.classList.contains('collapsed') ? '☰' : '×';
        setTimeout(() => map.invalidateSize(), 350);
    },

    handleResponsiveChange() {
        this.isMobile = window.innerWidth <= 768;
        // Simplified responsive handling
    },

    createFilterUI() {
        const controlsContainer = document.querySelector('.filter-controls');
        controlsContainer.innerHTML = '';
        Object.keys(this.options).forEach(type => {
            if (this.options[type].size > 0) {
                controlsContainer.appendChild(this.createFilterGroup(type, this.options[type]));
            }
        });
        controlsContainer.appendChild(this.createYearFilterGroup());
    },

    createFilterGroup(type, options) {
        const container = document.createElement('div');
        container.className = 'filter-group';
        const labelText = type.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
        container.innerHTML = `<div class="filter-group-label"><span>${labelText}</span></div>`;
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        Array.from(options).sort().forEach(value => {
            checkboxContainer.innerHTML += `
                <div class="checkbox-item"><label>
                    <input type="checkbox" data-filter-type="${type}" data-filter-value="${value}" onchange="Filters.onFilterChange()">
                    ${value}
                </label></div>`;
        });
        container.appendChild(checkboxContainer);
        return container;
    },
    
    createYearFilterGroup() {
        const yearGroup = document.createElement('div');
        yearGroup.className = 'filter-group';
        yearGroup.innerHTML = `
            <div class="filter-group-label"><span>Year Range</span></div>
            <div class="year-filter-container">
                <input type="number" id="year-from" placeholder="From" onchange="Filters.onFilterChange()">
                <input type="number" id="year-to" placeholder="To" onchange="Filters.onFilterChange()">
            </div>`;
        return yearGroup;
    },

    onFilterChange() {
        this.showLoading(true);
        this.active = {};
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            const type = cb.dataset.filterType, value = cb.dataset.filterValue;
            if (!this.active[type]) this.active[type] = [];
            this.active[type].push(value);
        });
        const from = document.getElementById('year-from').value;
        const to = document.getElementById('year-to').value;
        if (from || to) this.active.year = { from, to };
        this.updateURL();
        this.updateFilterCounts();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.applyAllFilters(), 150);
    },
    
    applyAllFilters() {
        let filteredDocs = [...this.allDocs];
        let searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim();

        if (!searchTerm) {
            // Hide search results list if search is cleared
            document.getElementById('search-results-list').innerHTML = '';
            document.querySelector('.filter-controls').style.display = 'block';
        }

        // Apply checkbox and year filters
        Object.entries(this.active).forEach(([type, values]) => {
            if (!values || (Array.isArray(values) && values.length === 0)) return;
            filteredDocs = filteredDocs.filter(doc => {
                const data = doc.data();
                if (type === 'year') {
                    const year = parseInt(data.year, 10);
                    if (isNaN(year)) return false;
                    const from = values.from ? parseInt(values.from) : -Infinity;
                    const to = values.to ? parseInt(values.to) : Infinity;
                    return year >= from && year <= to;
                }
                return Array.isArray(values) ? values.includes(data[type]) : data[type] === values;
            });
        });
        
        // Apply search filter ONLY if there is a search term
        if (searchTerm) {
            filteredDocs = filteredDocs.filter(doc => {
                const data = doc.data();
                return this.searchableFields.some(field => data[field]?.toString().toLowerCase().includes(searchTerm));
            });
            this.renderSearchResultsList(filteredDocs);
        }
        
        this.renderMarkers(filteredDocs);
        this.showLoading(false);
    },

    renderSearchResultsList(docs) {
        const listContainer = document.getElementById('search-results-list');
        const filtersContainer = document.querySelector('.filter-controls');
        
        listContainer.innerHTML = '';
        if (docs.length === 0) {
            filtersContainer.style.display = 'block'; // Show filters if no search results
            return;
        }

        filtersContainer.style.display = 'none'; // Hide filters to show search results

        docs.forEach(doc => {
            const data = doc.data();
            const [lat, lng] = [parseFloat(data.latitude), parseFloat(data.longitude)];
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="title">${data.title || 'Untitled Monument'}</div>
                <div class="city">${data.city || 'Unknown City'}</div>
            `;
            item.onclick = () => {
                map.setView([lat, lng], 16); // Zoom to the specific marker
                // Find the corresponding marker and open its popup
                const targetMarker = this.markers.find(m => m.getLatLng().equals([lat, lng]));
                if (targetMarker) {
                    targetMarker.openPopup();
                }
            };
            listContainer.appendChild(item);
        });
    },

    renderMarkers(docsToDisplay) {
        this.markerClusterGroup.clearLayers();
        this.markers = [];
        document.getElementById('empty-state').style.display = docsToDisplay.length === 0 ? 'block' : 'none';
        
        docsToDisplay.forEach(doc => {
            const data = doc.data();
            const [lat, lng] = [parseFloat(data.latitude), parseFloat(data.longitude)];
            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng]);
                // *** ADDED POPUP PADDING ***
                const popupOptions = {
                    maxWidth: 350,
                    autoPan: true,
                    autoPanPadding: L.point(340, 50) // (left/right, top/bottom) - considering the filter panel width
                };
                marker.bindPopup(createPopupContent(data, lat, lng), popupOptions);
                this.markers.push(marker);
            }
        });
        this.markerClusterGroup.addLayers(this.markers);
        this.updateResultsCount(this.markers.length);
        if (!document.getElementById('search-input')?.value.trim()) {
            this.autoZoom();
        }
    },

    clearAll() {
        this.active = {};
        document.querySelectorAll('input:checked').forEach(el => el.checked = false);
        document.querySelectorAll('input[type=number]').forEach(el => el.value = '');
        document.getElementById('search-input').value = '';
        this.updateURL();
        this.createFilterUI();
        this.applyAllFilters();
    },

    autoZoom() {
        if (this.markers.length > 0) {
            map.fitBounds(this.markerClusterGroup.getBounds(), { padding: [50, 50] });
        } else if (Object.keys(this.active).length === 0 && document.getElementById('search-input').value === '') {
            map.setView([48.0196, 66.9237], 5);
        }
    },

    updateResultsCount(count) {
        const text = document.getElementById('search-input')?.value.trim() ? `Found ${count} monuments` : `Showing ${count} monuments`;
        document.getElementById('results-text').textContent = text;
    },
    
    updateFilterCounts() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const label = group.querySelector('.filter-group-label span');
            if (!label) return;
            const type = label.textContent.toLowerCase().replace(/ /g, '');
            let countSpan = group.querySelector('.filter-count');
            const activeCount = this.active[type]?.length || (type === 'yearrange' && this.active.year ? 1 : 0);
            
            if (activeCount > 0) {
                if (!countSpan) {
                    countSpan = document.createElement('span');
                    countSpan.className = 'filter-count';
                    label.parentElement.appendChild(countSpan);
                }
                countSpan.textContent = activeCount;
            } else if (countSpan) {
                countSpan.remove();
            }
        });
    },

    populateFilterOptions() {
        Object.keys(this.options).forEach(key => this.options[key].clear());
        this.allDocs.forEach(doc => {
            const data = doc.data();
            Object.keys(this.options).forEach(key => {
                if (data[key]) this.options[key].add(data[key]);
            });
        });
    },

    updateURL() {
        const params = new URLSearchParams();
        Object.entries(this.active).forEach(([key, value]) => {
            if (key === 'year') {
                if (value.from) params.set('year_from', value.from);
                if (value.to) params.set('year_to', value.to);
            } else if (Array.isArray(value)) {
                params.set(key, value.join(','));
            }
        });
        history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
    },

    applyFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        this.active = {};
        params.forEach((value, key) => {
            if (key === 'year_from' || key === 'year_to') {
                if (!this.active.year) this.active.year = {};
                this.active.year[key === 'year_from' ? 'from' : 'to'] = value;
            } else if (key !== 'lat' && key !== 'lng') {
                this.active[key] = value.split(',');
            }
        });
        this.updateUIFromState();
        this.updateFilterCounts();
        this.applyAllFilters();
    },
    
    updateUIFromState() {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            const type = cb.dataset.filterType;
            const value = cb.dataset.filterValue;
            cb.checked = !!(this.active[type] && this.active[type].includes(value));
        });
        document.getElementById('year-from').value = this.active.year?.from || '';
        document.getElementById('year-to').value = this.active.year?.to || '';
    },
    
    showLoading(isLoading) {
        document.querySelector('.filter-loading').style.display = isLoading ? 'block' : 'none';
    }
};