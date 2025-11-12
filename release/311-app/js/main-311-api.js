/**
 * Birmingham 311 API-based Visualization
 * Loads 311 service request data from Flask API and creates interactive layers
 * with layer control panel matching the original design
 */


// Map initialization
let map_5a5dcd89f74d5563ab698edfc46a7723;
let layerControl;
let allLayers = {};
let issueLayers = {}; // Store 311 issue layers
let layerConfigs = [];
let allIssues = []; // Store all issues fetched from the API
let selectedCategories = new Set(); // Track selected categories for heatmap filtering

// Central Time formatting function
function formatCentralTime(dateString) {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// Format date/time for database footer: "XX:XX A.M./P.M. MONTH DAY, YEAR"
function formatDatabaseUpdatedTime(dateString) {
    if (!dateString) return 'Not available';
    try {
        // Treat naive datetime strings (without timezone) as UTC
        let normalizedDateString = dateString;
        if (dateString && !dateString.match(/[+-]\d{2}:\d{2}$/) && !dateString.endsWith('Z')) {
            normalizedDateString = dateString + 'Z';
        }
        const date = new Date(normalizedDateString);
        
        // Format time in Central Time
        const timeOptions = {
            timeZone: 'America/Chicago',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        const timeStr = date.toLocaleString('en-US', timeOptions);
        
        // Format date in Central Time
        const dateOptions = {
            timeZone: 'America/Chicago',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        };
        const dateStr = date.toLocaleDateString('en-US', dateOptions);
        
        // Combine: "3:45 PM" + "November 3, 2025" -> "3:45 P.M. NOVEMBER 3, 2025"
        const combined = `${timeStr} ${dateStr}`;
        return combined
            .replace(/\bAM\b/gi, 'A.M.')
            .replace(/\bPM\b/gi, 'P.M.')
            .toUpperCase();
    } catch (e) {
        return 'Not available';
    }
}

function formatCentralDate(dateString) {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}


// Photo layer variables
let photoLayer = null;
let photoMarkers = [];
let maxPhotosDisplayed = 300;
let photoThumbnailSize = 40;
let validIssueIds = [];

// Boundary layer storage
window.boundaryLayers = {};

// Initialize map
function initializeMap() {
    // Create map centered on Birmingham
    map_5a5dcd89f74d5563ab698edfc46a7723 = L.map('map_5a5dcd89f74d5563ab698edfc46a7723', {minZoom: 13}).setView([33.5186, -86.8025], 13);

    // Add CartoDB dark mode tiles (dark theme compatible)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map_5a5dcd89f74d5563ab698edfc46a7723);

    // Add cursor classes to map container
    const mapContainer = map_5a5dcd89f74d5563ab698edfc46a7723.getContainer();
    mapContainer.classList.add('background-cursor');
    
    // Add cursor functionality for different map states
    map_5a5dcd89f74d5563ab698edfc46a7723.on('dragstart', function() {
        mapContainer.classList.remove('background-cursor');
        mapContainer.classList.add('hand-cursor');
    });
    
    map_5a5dcd89f74d5563ab698edfc46a7723.on('dragend', function() {
        mapContainer.classList.remove('hand-cursor');
        mapContainer.classList.add('background-cursor');
    });
    
    map_5a5dcd89f74d5563ab698edfc46a7723.on('boxzoomstart', function() {
        mapContainer.classList.remove('background-cursor');
        mapContainer.classList.add('handwrite-cursor');
    });
    
    map_5a5dcd89f74d5563ab698edfc46a7723.on('boxzoomend', function() {
        mapContainer.classList.remove('handwrite-cursor');
        mapContainer.classList.add('background-cursor');
    });

    console.log('Map initialized');
    console.log('Map object:', map_5a5dcd89f74d5563ab698edfc46a7723);
}

// Load layer configuration and create layers
async function loadLayerConfiguration() {
    try {
        // Fetch layer configuration from API
        const response = await fetch('/api/layer_config?_t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        layerConfigs = config.layerConfigs;
        window.globalLayerConfig = config; // Set global config for layer control
        
        console.log('Layer config loaded:', config);
        console.log('Number of layers:', layerConfigs.length);
        
        // Boundary layers are created by createBoundaryLayerControls() in createLayerControl()
        
        // Load 311 issues from API
        await loadIssuesFromAPI();
        
        // Update issue layers for layer control
        updateIssueLayers();
        
        // Create layers from API data
        await createLayersFromAPIData();
        
        // Update heatmap after data is loaded
        
        
        // Export functions and data to global scope for simplified layer control
        window.updateCompositeHeatmap = updateCompositeHeatmap;
        window.createPhotoLayer = createPhotoLayer;
        window.selectedCategories = selectedCategories;
        window.allIssues = allIssues;
        window.map_5a5dcd89f74d5563ab698edfc46a7723 = map_5a5dcd89f74d5563ab698edfc46a7723;
        
        console.log("Exported functions to global scope (after data load):", {
            updateCompositeHeatmap: typeof window.updateCompositeHeatmap,
            createPhotoLayer: typeof window.createPhotoLayer,
            selectedCategories: typeof window.selectedCategories ? window.selectedCategories.size : "undefined",
            allIssues: window.allIssues ? window.allIssues.length : "undefined",
            map: typeof window.map_5a5dcd89f74d5563ab698edfc46a7723
        });
        
        
        // Update heatmap after data is exported
        // Initialize hamburger menu functionality
        initializeHamburgerMenu();
        
        // Update sidebar with analytics
        updateSidebarContent();
        
    } catch (error) {
        console.error('Error loading layer configuration:', error);
        
        // Don't create layer control here - it will be created after loadIssuesFromAPI()
        // Load issues anyway - we can still show the map with issue data
        await loadIssuesFromAPI();
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        `;
        errorDiv.textContent = 'Error loading map data. Please refresh the page.';
        document.body.appendChild(errorDiv);
        
        // Auto-remove error message after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    // Ensure function always returns a promise
    return Promise.resolve();
}

// Boundary layers are now created by createBoundaryLayerControls() in createLayerControl()

// Load 311 issues from API
async function loadIssuesFromAPI() {
    try {
        // Only fetch issues within city limits for sidebar calculations
        const response = await fetch("/api/issues?within_city_limits_flag=1&limit=20000&_t=" + Date.now() + "&_r=" + Math.random());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allIssues = await response.json();
        console.log(`Loaded ${allIssues.length} issues from API (within city limits only).`);
        console.log('Sample issue data structure:', allIssues[0]);
        
        // Set global allIssues for other functions
        window.allIssues = allIssues;
        
        // Initialize marker storage (lazy loading approach)
        initializeMarkerStorage();
        
        // Create layer control panel after successfully loading issues
        await createLayerControl();
    } catch (error) {
        console.error('Error fetching issues:', error);
        allIssues = []; // Ensure allIssues is defined even on error
        
        // Create layer control panel even if config fails
        await createLayerControl();
    }
}

// Update issue layers from API data (Hybrid approach - no individual layers)
function updateIssueLayers() {
    console.log('updateIssueLayers called with allIssues length:', allIssues.length);
    
    // Clear existing issue layers
    for (const key in issueLayers) {
        map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(issueLayers[key]);
    }
    issueLayers = {};

    // In hybrid approach, we don't create individual layers for each category
    // Instead, we just store the issues data and let the heatmap handle visualization
    // The heatmap will be updated based on selected categories in the layer control
    
    console.log('Hybrid approach: No individual issue layers created, using heatmap only');
}

// Get color for status
function getColorForStatus(status) {
    switch (status) {
        case 'Open': return '#FF0000'; // Red
        case 'Acknowledged': return '#FFA500'; // Orange
        case 'Closed': return '#008000'; // Green
        default: return '#808080'; // Gray
    }
}

// Create layers from API data
async function createLayersFromAPIData() {
    console.log('Creating layers from API data...');
    
    // Filter issues to only include those within city limits
    const issuesWithinCityLimits = allIssues.filter(issue => issue.within_city_limits === 1);
    console.log(`Working with ${issuesWithinCityLimits.length} issues within city limits out of ${allIssues.length} total issues`);
    
    // Group issues by request_type_full_category
    const issuesByCategory = issuesWithinCityLimits.reduce((acc, issue) => {
        const category = issue.request_type_full_category || 'Unknown';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(issue);
        return acc;
    }, {});
    
    // Get all categories and sort by count to determine top 10
    const allCategories = Object.entries(issuesByCategory)
        .map(([category, issues]) => ({ category, count: issues.length }))
        .sort((a, b) => b.count - a.count);
    
    const top10Categories = allCategories.slice(0, 10).map(item => item.category);
    
    // Initialize selected categories with top 10 (preselected)
    top10Categories.forEach(category => {
        selectedCategories.add(category);
    });
    
    // Debug: Show top 10 categories with their data point counts
    console.log("=== TOP 10 CATEGORIES PRESELECTED ===");
    top10Categories.forEach((config, index) => {
        const categoryIssues = allIssues.filter(issue => 
            issue.request_type_full_category === config && issue.within_city_limits === 1
        );
        console.log(`${index + 1}. ${config}: ${categoryIssues.length} data points`);
    });
    console.log("=== END PRESELECTED CATEGORIES ===");
    console.log('Preselected top 10 categories:', top10Categories);
}
    

// Create layer control panel - Simplified version
async function createLayerControl() {
    // Use the simplified layer control
    console.log('createLayerControl: Checking for initSimplifiedLayerControl...', typeof initSimplifiedLayerControl);
    console.log('createLayerControl: allIssues available?', allIssues ? allIssues.length : 'undefined');
    
    if (typeof initSimplifiedLayerControl === 'function') {
        // Only call simplified layer control if allIssues is available
        if (allIssues && allIssues.length > 0) {
            console.log('createLayerControl: Calling initSimplifiedLayerControl with', allIssues.length, 'issues');
            await initSimplifiedLayerControl(map_5a5dcd89f74d5563ab698edfc46a7723, allIssues);
            
            // Update heatmap after layer control is initialized
            return;
        } else {
            console.warn('createLayerControl: allIssues not available, skipping simplified layer control');
        }
    } else {
        console.warn('createLayerControl: initSimplifiedLayerControl not found');
    }
    
    // Fallback to original complex implementation if simplified version not available
    console.warn('Simplified layer control not available, using fallback');
    
    // Remove existing control if it exists
    const existingControl = document.getElementById('layer-control');
    if (existingControl) {
        existingControl.remove();
    }
    
    const controlDiv = document.createElement('div');
    controlDiv.id = 'layer-control';
    
    // Collapsible header
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
    
    // Title
    const title = document.createElement('h3');
    title.innerHTML = 'Birmingham 311 requests,<br><span style="line-height: 1.4;">Jan. 1-Oct. 27, 2025</span>';
    title.style.cssText = 'margin: 0; flex: 1;';
    
    // Plus/minus control
    const toggleControl = document.createElement('div');
    toggleControl.innerHTML = '+'; // Start with plus sign for collapsed state
    toggleControl.style.cssText = 'font-size: 18px; font-weight: bold; color: #888; margin-left: 10px; user-select: none;';
    toggleControl.id = 'layer-toggle-control';
    
    headerDiv.appendChild(title);
    headerDiv.appendChild(toggleControl);
    controlDiv.appendChild(headerDiv);
    
    // Collapsible content container
    const contentContainer = document.createElement('div');
    contentContainer.id = 'layer-control-content';
    contentContainer.style.cssText = 'overflow: visible; transition: max-height 0.3s ease-out;';
    
    // Statistics - Add directly to contentContainer (always visible)
    const statsDiv = document.createElement('div');
    statsDiv.className = 'layer-stats';
    
    // Count requests within city limits (all issues are already filtered to within city limits)
    const withinCityLimits = allIssues.filter(issue => issue.within_city_limits === 1).length;
    
    // Fetch total count from stats API
    let totalCount = allIssues.length; // Default to current count
    try {
        const statsResponse = await fetch('/api/issues/stats');
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            totalCount = statsData.total_issues || allIssues.length;
        }
    } catch (error) {
        console.warn('Could not fetch total count from stats API, using current count:', error);
    }
    
    statsDiv.innerHTML = `
        <div style="font-size: 11px; color: #888; margin-bottom: 2px;">
            Total requests in dataset: ${totalCount.toLocaleString()}<br>
            Requests within city limits: ${withinCityLimits.toLocaleString()}
        </div>
    `;
    
    // Photo layer control - Add to collapsible content (hidden when collapsed)
    const photoLayerDiv = document.createElement('div');
    photoLayerDiv.className = 'layer-item';
    
    const photoCheckbox = document.createElement('input');
    photoCheckbox.type = 'checkbox';
    photoCheckbox.id = 'photo-layer-checkbox';
    photoCheckbox.checked = false;
    
    const photoLabel = document.createElement('label');
    photoLabel.htmlFor = 'photo-layer-checkbox';
    photoLabel.textContent = 'Photo Thumbnails';
    photoLabel.style.color = '#fff';
    photoLabel.style.fontWeight = 'normal';
    
    photoLayerDiv.appendChild(photoCheckbox);
    photoLayerDiv.appendChild(photoLabel);
    
    // Photo layer checkbox event listener
    photoCheckbox.addEventListener('change', async function() {
        if (this.checked) {
            await createPhotoLayer();
        } else {
            if (photoLayer) {
                map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(photoLayer);
            }
        }
    });
    
    // Add separator before collapsible content
    const separator1 = document.createElement('div');
    separator1.className = 'group-header';
    separator1.style.height = '1px';
    separator1.style.borderBottom = '1px solid var(--border-color)';
    separator1.style.margin = '4px 0';
    
    // Create collapsible content container for categories
    const collapsibleContent = document.createElement('div');
    collapsibleContent.id = 'collapsible-content';
    collapsibleContent.style.cssText = 'transition: max-height 0.3s ease-out; overflow: hidden;';
    
    // Add stats and photo to collapsible content (hidden when collapsed)
    collapsibleContent.appendChild(statsDiv);
    collapsibleContent.appendChild(photoLayerDiv);
    collapsibleContent.appendChild(separator1);
    
    // Create boundary layer controls
    console.log('Creating boundary layer controls...');
    await createBoundaryLayerControls(contentContainer);
    console.log('Boundary layer controls created');
    
    // Ensure allIssues is defined
    if (!window.allIssues || window.allIssues.length === 0) {
        console.warn('createLayerControl - allIssues is empty or undefined, creating empty layer control');
        const emptyDiv = document.createElement('div');
        emptyDiv.innerHTML = '<div style="color: #888; font-size: 11px; margin: 10px 0;">No data available. Please refresh the page.</div>';
        collapsibleContent.appendChild(emptyDiv);
        controlDiv.appendChild(contentContainer);
        document.body.appendChild(controlDiv);
        
        return;
    }
    
    // Group issues by category and create layer configs
    // Filter issues to only include those within city limits for category analysis
    const issuesByCategory = allIssues.filter(issue => issue.within_city_limits === 1).reduce((acc, issue) => {
        const category = issue.request_type_full_category || 'Unknown';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(issue);
        return acc;
    }, {});
    
    // Convert to layer configs and sort by count (descending)
    const allLayerConfigs = Object.entries(issuesByCategory).map(([category, issues]) => ({
        name: category,
        count: issues.length,
        visible: false // All categories start as not visible
    })).sort((a, b) => b.count - a.count);
    
    // Split into top 10, other categories, and group low-count categories into "Other"
    const top10Categories = allLayerConfigs.slice(0, 10).map(config => ({...config, visible: true}));
    const otherCategories = allLayerConfigs.slice(10).filter(config => config.count > 2);
    const lowCountCategories = allLayerConfigs.filter(config => config.count <= 2);
    
    // Create "Other" category for low-count categories
    const otherCategoryConfig = {
        name: "Other",
        count: lowCountCategories.reduce((sum, config) => sum + config.count, 0),
        visible: false,
        subCategories: lowCountCategories
    };
    
    // Add "Other" category to otherCategories if it has any issues
    if (otherCategoryConfig.count > 0) {
        otherCategories.push(otherCategoryConfig);
    }
    
    // Heatmap is automatically updated when categories are toggled
    // No separate heatmap toggle needed
    
    // Add separator
    const separator2 = document.createElement('div');
    separator2.className = 'group-header';
    separator2.style.height = '1px';
    separator2.style.borderBottom = '1px solid var(--border-color)';
    separator2.style.margin = '4px 0';
    collapsibleContent.appendChild(separator2);
    
    // Add select all/none links for top 10 categories
    const top10SelectDiv = document.createElement('div');
    top10SelectDiv.style.cssText = 'font-size: 10px; color: #888; margin: 4px 0 6px 0; text-align: left; font-weight: normal;';
    
    const selectAllTop10 = document.createElement('a');
    selectAllTop10.href = '#';
    selectAllTop10.textContent = 'Select all';
    selectAllTop10.style.cssText = 'color: #888; text-decoration: none; margin-right: 8px; font-weight: normal;';
    
    const selectNoneTop10 = document.createElement('a');
    selectNoneTop10.href = '#';
    selectNoneTop10.textContent = 'Select none';
    selectNoneTop10.style.cssText = 'color: #888; text-decoration: none; font-weight: normal;';
    
    selectAllTop10.addEventListener('click', async function(e) {
        e.preventDefault();
        top10Categories.forEach(config => {
            if (!config.visible) {
                selectedCategories.add(config);
                config.visible = true;
                const checkbox = document.getElementById(`layer-${config.replace(/\s+/g, '-')}`);
                if (checkbox) checkbox.checked = true;
            }
        });
        updateCompositeHeatmap();
        
        // Refresh photo layer if it's currently visible
        const photoCheckbox = document.getElementById('photo-layer-checkbox');
        if (photoCheckbox && photoCheckbox.checked) {
            await createPhotoLayer();
        }
    });
    
    selectNoneTop10.addEventListener('click', async function(e) {
        e.preventDefault();
        top10Categories.forEach(config => {
            if (config.visible) {
                selectedCategories.delete(config);
                config.visible = false;
                const checkbox = document.getElementById(`layer-${config.replace(/\s+/g, '-')}`);
                if (checkbox) checkbox.checked = false;
            }
        });
        updateCompositeHeatmap();
        
        // Refresh photo layer if it's currently visible
        const photoCheckbox = document.getElementById('photo-layer-checkbox');
        if (photoCheckbox && photoCheckbox.checked) {
            await createPhotoLayer();
        }
    });
    
    top10SelectDiv.appendChild(selectAllTop10);
    top10SelectDiv.appendChild(selectNoneTop10);
    collapsibleContent.appendChild(top10SelectDiv);
    
    // Top 10 categories section (no header needed)
    
    // Add top 10 categories
    console.log('Adding top 10 categories to collapsible content:', top10Categories.length);
    top10Categories.forEach((config, index) => {
        console.log(`Adding category ${index + 1}: ${config} (${config.count})`);
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `layer-${config.replace(/\s+/g, '-')}`;
        checkbox.checked = config.visible;
        checkbox.classList.add('link-cursor');
        
        const label = document.createElement('label');
        label.htmlFor = `layer-${config.replace(/\s+/g, '-')}`;
        label.textContent = `${config} (${config.count.toLocaleString()})`;
        label.classList.add('link-cursor');
        
        layerDiv.appendChild(checkbox);
        layerDiv.appendChild(label);
        collapsibleContent.appendChild(layerDiv);
        console.log(`Added category ${index + 1} to collapsible content`);
        
        // Add layer to map if it's in top 10 (preselected)
        if (config.visible && issueLayers[config]) {
            map_5a5dcd89f74d5563ab698edfc46a7723.addLayer(issueLayers[config]);
        }
        
        // Event listener for checkbox (hybrid approach)
        checkbox.addEventListener('change', async function() {
            const categoryName = config;
            
            if (this.checked) {
                window.selectedCategories.add(categoryName);
                config.visible = true;
            } else {
                window.selectedCategories.delete(categoryName);
                config.visible = false;
            }
            
            // Update heatmap with new selection
            updateCompositeHeatmap();
            
            // Refresh photo layer if it's currently visible to show photos for newly visible categories
            const photoCheckbox = document.getElementById('photo-layer-checkbox');
            if (photoCheckbox && photoCheckbox.checked) {
                await createPhotoLayer();
            }
        });
    });
    
    // Add other categories with toggle
    if (otherCategories.length > 0) {
        // Add extra spacing before other categories
        const extraSpacing = document.createElement('div');
        extraSpacing.style.height = '8px';
        collapsibleContent.appendChild(extraSpacing);
        
        const otherHeader = document.createElement('div');
        otherHeader.className = 'group-header toggle-header';
        otherHeader.textContent = `Other Categories (${otherCategories.length})`;
        collapsibleContent.appendChild(otherHeader);
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';
        
        // Add select all/none for other categories
        const otherSelectDiv = document.createElement('div');
        otherSelectDiv.style.cssText = 'font-size: 10px; color: #888; margin: 4px 0 6px 0; text-align: left; font-weight: normal;';
        
        const selectAllOther = document.createElement('a');
        selectAllOther.href = '#';
        selectAllOther.textContent = 'Select all';
        selectAllOther.style.cssText = 'color: #888; text-decoration: none; margin-right: 8px; font-weight: normal;';
        
        const selectNoneOther = document.createElement('a');
        selectNoneOther.href = '#';
        selectNoneOther.textContent = 'Select none';
        selectNoneOther.style.cssText = 'color: #888; text-decoration: none; font-weight: normal;';
        
        selectAllOther.addEventListener('click', async function(e) {
            e.preventDefault();
            otherCategories.forEach(config => {
                if (config === "Other") {
                    // Handle "Other" category specially - select all subcategories
                    if (!config.visible) {
                        config.subCategories.forEach(subConfig => {
                            window.selectedCategories.add(subConfig.name);
                        });
                        config.visible = true;
                        const checkbox = document.getElementById(`layer-${config.replace(/s+/g, '-')}`);
                        if (checkbox) checkbox.checked = true;
                    }
                } else {
                    // Handle regular categories
                    if (!config.visible) {
                        selectedCategories.add(config);
                        config.visible = true;
                        const checkbox = document.getElementById(`layer-${config.replace(/s+/g, '-')}`);
                        if (checkbox) checkbox.checked = true;
                    }
                }
            });
            updateCompositeHeatmap();
            
            // Refresh photo layer if it's currently visible
            const photoCheckbox = document.getElementById('photo-layer-checkbox');
            if (photoCheckbox && photoCheckbox.checked) {
                await createPhotoLayer();
            }
        });
        
        selectNoneOther.addEventListener('click', async function(e) {
            e.preventDefault();
            otherCategories.forEach(config => {
                if (config === "Other") {
                    // Handle "Other" category specially - deselect all subcategories
                    if (config.visible) {
                        config.subCategories.forEach(subConfig => {
                            window.selectedCategories.delete(subConfig.name);
                        });
                        config.visible = false;
                        const checkbox = document.getElementById(`layer-${config.replace(/s+/g, '-')}`);
                        if (checkbox) checkbox.checked = false;
                    }
                } else {
                    // Handle regular categories
                    if (config.visible) {
                        selectedCategories.delete(config);
                        config.visible = false;
                        const checkbox = document.getElementById(`layer-${config.replace(/s+/g, '-')}`);
                        if (checkbox) checkbox.checked = false;
                    }
                }
            });
            updateCompositeHeatmap();
            
            // Refresh photo layer if it's currently visible
            const photoCheckbox = document.getElementById('photo-layer-checkbox');
            if (photoCheckbox && photoCheckbox.checked) {
                await createPhotoLayer();
            }
        });
        
        otherSelectDiv.appendChild(selectAllOther);
        otherSelectDiv.appendChild(selectNoneOther);
        toggleContainer.appendChild(otherSelectDiv);
        
        // Add other categories
        otherCategories.forEach(config => {
            const layerDiv = document.createElement('div');
            layerDiv.className = 'layer-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `layer-${config.replace(/\s+/g, '-')}`;
            checkbox.checked = config.visible;
            checkbox.classList.add('link-cursor');
            
            const label = document.createElement('label');
            label.htmlFor = `layer-${config.replace(/\s+/g, '-')}`;
            label.textContent = `${config} (${config.count.toLocaleString()})`;
            label.classList.add('link-cursor');
            
            layerDiv.appendChild(checkbox);
            layerDiv.appendChild(label);
            toggleContainer.appendChild(layerDiv);
            
            // Event listener for checkbox (hybrid approach)
            checkbox.addEventListener('change', async function() {
                const categoryName = config;
                
                if (categoryName === "Other") {
                    // Handle "Other" category specially
                    if (this.checked) {
                        config.subCategories.forEach(subConfig => {
                            window.selectedCategories.add(subConfig.name);
                        });
                        config.visible = true;
                    } else {
                        config.subCategories.forEach(subConfig => {
                            window.selectedCategories.delete(subConfig.name);
                        });
                        config.visible = false;
                    }
                } else {
                    // Handle regular categories
                    if (this.checked) {
                        window.selectedCategories.add(categoryName);
                        config.visible = true;
                    } else {
                        window.selectedCategories.delete(categoryName);
                        config.visible = false;
                    }
                }
                
                // Update heatmap with new selection
                updateCompositeHeatmap();
                
                // Refresh photo layer if it's currently visible to show photos for newly visible categories
                const photoCheckbox = document.getElementById('photo-layer-checkbox');
                if (photoCheckbox && photoCheckbox.checked) {
                    await createPhotoLayer();
                }
            });
        });
        
        collapsibleContent.appendChild(toggleContainer);
        
        // Toggle functionality for other categories
        otherHeader.addEventListener('click', function() {
            const isExpanded = toggleContainer.classList.contains('expanded');
            console.log('Other categories toggle clicked. Currently expanded:', isExpanded);
            
            if (isExpanded) {
                toggleContainer.classList.remove('expanded');
                this.classList.remove('expanded');
                // Collapse other categories
                toggleContainer.style.maxHeight = '0px';
                toggleContainer.style.overflow = 'hidden';
                toggleContainer.style.opacity = '0';
                console.log('Collapsed other categories');
            } else {
                toggleContainer.classList.add('expanded');
                this.classList.add('expanded');
                // Expand other categories
                toggleContainer.style.maxHeight = 'none';
                toggleContainer.style.overflow = 'visible';
                toggleContainer.style.opacity = '1';
                
                console.log('Expanded other categories');
                console.log('Toggle container computed styles:', window.getComputedStyle(toggleContainer).maxHeight, window.getComputedStyle(toggleContainer).overflow, window.getComputedStyle(toggleContainer).opacity);
            }
        });
    }
    
    contentContainer.appendChild(collapsibleContent);
    console.log('Content structure:', {
        controlDiv: controlDiv,
        contentContainer: contentContainer,
        collapsibleContent: collapsibleContent,
        collapsibleContentChildren: collapsibleContent.children.length,
        contentContainerChildren: contentContainer.children.length
    });
    controlDiv.appendChild(contentContainer);
    
    // Add main toggle functionality - Two states only
    headerDiv.addEventListener('click', function() {
        const isExpanded = collapsibleContent.classList.contains('expanded');
        const isCollapsed = collapsibleContent.classList.contains('collapsed');
        const toggleControl = document.getElementById('layer-toggle-control');
        const isMobile = window.innerWidth <= 768;
        
        if (!toggleControl) {
            console.warn('Toggle control not found, skipping toggle operation');
            return;
        }
        
        if (isMobile) {
            // Mobile: two states - collapsed, expanded
            if (isCollapsed) {
                // Collapsed -> Expanded
                collapsibleContent.classList.remove('collapsed');
                collapsibleContent.classList.add('expanded');
                collapsibleContent.style.maxHeight = 'none'; // Show all content
                collapsibleContent.style.overflow = 'visible';
                collapsibleContent.style.display = 'block';
                toggleControl.style.display = 'block';
                contentContainer.style.overflow = 'auto';
                toggleControl.innerHTML = '−'; // Show minus for expanded state
            } else {
                // Expanded -> Collapsed
                collapsibleContent.classList.remove('expanded');
                collapsibleContent.classList.add('collapsed');
                collapsibleContent.style.maxHeight = '0px'; // Hide collapsible content
                collapsibleContent.style.overflow = 'hidden';
                collapsibleContent.style.display = 'none';
                toggleControl.style.display = 'block';
                contentContainer.style.overflow = 'hidden';
                toggleControl.innerHTML = '+'; // Show plus for collapsed state
            }
        } else {
            // Desktop: two states - collapsed, expanded
            if (isCollapsed) {
                // Collapsed -> Expanded (show all content with scrollbar)
                collapsibleContent.classList.remove('collapsed');
                collapsibleContent.classList.add('expanded');
                collapsibleContent.style.maxHeight = 'none'; // Show all content
                collapsibleContent.style.overflow = 'visible';
                collapsibleContent.style.display = 'block'; // Show collapsible content
                toggleControl.style.display = 'block';
                contentContainer.style.overflow = 'auto';
                toggleControl.innerHTML = '−'; // Show minus for expanded state
                controlDiv.style.maxHeight = '80vh'; // Limit height and add scrollbar
                controlDiv.style.minHeight = 'auto';
                
                // Show any Leaflet layer controls when expanded
                const leafletControls = document.querySelectorAll('.leaflet-control-layers');
                leafletControls.forEach(control => {
                    control.style.display = 'block';
                });
            } else {
                // Expanded -> Collapsed (only header + date line visible, panel ends after date line)
                collapsibleContent.classList.remove('expanded');
                collapsibleContent.classList.add('collapsed');
                collapsibleContent.style.maxHeight = '0px'; // Hide all collapsible content
                collapsibleContent.style.overflow = 'hidden';
                collapsibleContent.style.display = 'none'; // Completely hide collapsible content
                toggleControl.style.display = 'block';
                contentContainer.style.overflow = 'hidden';
                toggleControl.innerHTML = '+'; // Show plus for collapsed state
                controlDiv.style.maxHeight = 'none';
                controlDiv.style.minHeight = 'auto';
                
                // Hide any Leaflet layer controls when collapsed
                const leafletControls = document.querySelectorAll('.leaflet-control-layers');
                leafletControls.forEach(control => {
                    control.style.display = 'none';
                });
            }
        }
    });
    // Set initial state based on screen size
    const setInitialState = () => {
        const isMobile = window.innerWidth <= 768;
        const toggleControl = document.getElementById('layer-toggle-control');
        
        if (!toggleControl) {
            console.warn('Toggle control not found, skipping initial state setup');
            return;
        }
        
        if (isMobile) {
            // Mobile: collapsed by default
            collapsibleContent.classList.remove("expanded");
            collapsibleContent.classList.add("collapsed");
            collapsibleContent.style.maxHeight = "0px"; // Hide collapsible content
            toggleControl.style.display = "none"; // Hide toggle button in collapsed state
            contentContainer.style.overflow = "hidden";
            toggleControl.innerHTML = '+'; // Show plus for collapsed state
        } else {
            // Desktop: start in collapsed state (only header + date line visible)
            collapsibleContent.classList.remove("expanded");
            collapsibleContent.classList.add("collapsed");
            collapsibleContent.style.maxHeight = "0px"; // Hide all collapsible content
            collapsibleContent.style.overflow = "hidden";
            collapsibleContent.style.display = "none"; // Completely hide collapsible content
            toggleControl.style.display = "block";
            contentContainer.style.overflow = "hidden";
            toggleControl.innerHTML = '+'; // Show plus for collapsed state
            controlDiv.style.maxHeight = "none";
            controlDiv.style.minHeight = "auto";
            
            // Hide any Leaflet layer controls when collapsed
            const leafletControls = document.querySelectorAll('.leaflet-control-layers');
            leafletControls.forEach(control => {
                control.style.display = 'none';
            });
        }
    };
    
    // Set initial state after a brief delay to ensure DOM is ready
    setTimeout(() => {
        console.log('Setting initial state...');
        setInitialState();
        
        // Debug: Check the actual state after setInitialState
        console.log('After setInitialState:');
        console.log('Collapsible content classes:', collapsibleContent.classList.toString());
        console.log('Collapsible content maxHeight:', collapsibleContent.style.maxHeight);
        console.log('Collapsible content display:', collapsibleContent.style.display);
        console.log('Toggle control innerHTML:', toggleControl.innerHTML);
        
        console.log('Layer control created and appended to body');
        console.log('Control div:', controlDiv);
        console.log('Collapsible content:', collapsibleContent);
    }, 500);
    
    // Debounced resize handler to prevent freezing
    let resizeTimeout;
    const debouncedResizeHandler = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only call setInitialState if we're not using the simplified layer control
            if (typeof window.initSimplifiedLayerControl === 'undefined') {
                setInitialState();
            }
        }, 150); // 150ms debounce
    };
    
    // Update on window resize
    window.addEventListener('resize', debouncedResizeHandler);
    
    document.body.appendChild(controlDiv);
    
}

// Create individual boundary layer
    
    // Update heatmap after layer control is created
    if (typeof window.updateCompositeHeatmap === "function") {
        console.log("Calling updateCompositeHeatmap after layer control creation");
        window.updateCompositeHeatmap();
    }
async function createBoundaryLayer(layerConfig) {
    try {
        const response = await fetch(`/api/boundaries/${layerConfig.filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const geojsonData = await response.json();

        let layer;
        
        if (layerConfig.labels) {
            // Create label layer for polygon centroids
            layer = L.layerGroup();
            
            // For ZCTA layer, also add the boundary lines
            if (layerConfig.name === 'Census ZCTA (ZIP) 2023') {
                const boundaryLayer = L.geoJson(geojsonData, {
                    style: function(feature) {
                        return {
                            color: 'orange',
                            weight: 2,
                            opacity: 0.3,
                            fill: false,
                            fillOpacity: 0,
                            className: "multiply-blend",
                            zIndex: 10
                        };
                    }
                });
                layer.addLayer(boundaryLayer);
            }
            
            geojsonData.features.forEach(function(feature) {
                const props = feature.properties;
                const name = props.name || props.NAME || props.community || props.neighborhood || props.ZCTA5CE20 || 'Unknown';
                
                // Calculate centroid for polygon features
                let centroid;
                if (feature.geometry.type === 'Polygon') {
                    centroid = turf.centroid(feature);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    centroid = turf.centroid(feature);
                } else if (feature.geometry.type === 'Point') {
                    centroid = feature;
                } else {
                    return; // Skip if not a supported geometry type
                }
                
                let latlng = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
                
                // Position labels to ensure they're inside their boundaries
                if (layerConfig.name === 'Community Labels') {
                    // For community labels, try to position them more toward the interior
                    const bounds = L.geoJSON(feature).getBounds();
                    const center = bounds.getCenter();
                    latlng[0] = center.lat;
                    latlng[1] = center.lng;
                    
                    // Apply specific offsets for certain communities
                    const communityName = name.toLowerCase();
                    if (communityName.includes('five points')) {
                        latlng[1] -= 0.004; // Move 50px west (left)
                    } else if (communityName.includes('north birmingham')) {
                        latlng[0] -= 0.008; // Move 100px down (south)
                    } else if (communityName.includes('east birmingham')) {
                        latlng[1] -= 0.004; // Move 50px left (west)
                    } else if (communityName.includes('crestwood')) {
                        latlng[1] -= 0.004; // Move 50px left (west)
                    } else if (communityName.includes('red mountain')) {
                        latlng[1] -= 0.004; // Move 50px left (west)
                    }
                } else if (layerConfig.name === 'Neighborhood Labels') {
                    // Offset neighborhood labels slightly to avoid overlap with community labels
                    latlng[0] -= 0.002; // Slight south offset for neighborhood labels
                    latlng[1] -= 0.001; // Slight west offset for neighborhood labels
                } else if (layerConfig.name === 'Census ZCTA (ZIP) 2023') {
                    // Position ZCTA labels at centroid with slight offset
                    const bounds = L.geoJSON(feature).getBounds();
                    const center = bounds.getCenter();
                    latlng[0] = center.lat;
                    latlng[1] = center.lng;
                    // Slight offset to avoid overlap with other labels
                    latlng[0] += 0.001; // Slight north offset
                    latlng[1] += 0.001; // Slight east offset
                }
                
                const labelMarker = L.marker(latlng, {
                    icon: L.divIcon({
                        className: 'boundary-label',
                        html: `<div style="
                            color: ${layerConfig.color};
                            font-size: ${layerConfig.name === 'Community Labels' ? '10px' : layerConfig.name === 'Census ZCTA (ZIP) 2023' ? '8px' : '9px'};
                            font-weight: ${layerConfig.name === 'Community Labels' ? '700' : layerConfig.name === 'Census ZCTA (ZIP) 2023' ? '500' : '400'};
                            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                            background: transparent;
                            border: none;
                            padding: 0;
                            font-family: 'Helvetica Now Micro', 'Inter', 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            text-align: center;
                            white-space: nowrap;
                            pointer-events: none;
                        ">${name}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0]
                    })
                });
                
                // Add the label marker to the layer group
                layer.addLayer(labelMarker);
            });
        } else {
            // Create boundary layer with reference file styling
            layer = L.geoJson(geojsonData, {
                style: function(feature) {
                    if (layerConfig.name === "City boundary") {
                        return {
                            color: "magenta",
                            fillColor: "transparent",
                            fillOpacity: 0.0,
                            weight: 3.0,
                            opacity: 0.45,
                            className: "city-boundary-shadow multiply-blend",
                            zIndex: 1000
                        };
                    } else if (layerConfig.name === 'Community Boundaries') {
                        return {
                            color: 'cyan',
                            weight: 4.0,
                            opacity: 0.85,
                            fill: false,
                            fillOpacity: 0,
                            className: "multiply-blend",
                            zIndex: 100
                        };
                    } else if (layerConfig.name === 'Neighborhood Boundaries') {
                        return {
                            color: 'white',
                            weight: 1,
                            opacity: 0.85,
                            fill: false,
                            fillOpacity: 0,
                            className: "multiply-blend",
                            zIndex: 50
                        };
                    } else if (layerConfig.name === 'Census ZCTA (ZIP) 2023') {
                        return {
                            color: 'orange',
                            weight: 2,
                            opacity: 0.3,
                            fill: false,
                            fillOpacity: 0,
                            className: "multiply-blend",
                            zIndex: 10
                        };
                    }
                    return {
                        color: layerConfig.color,
                        weight: 2,
                        opacity: 0.5,
                        fill: false,
                        fillOpacity: 0
                    };
                },
                onEachFeature: function(feature, layer) {
                    // No tooltips for boundary layers
                }
            });
        }

        window.boundaryLayers[layerConfig.name] = {
            layer: layer,
            visible: layerConfig.visible
        };
        if (layerConfig.visible) {
            layer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
            console.log(`Added ${layerConfig.name} to map`);
            // Bring city boundary to front
            if (layerConfig.name === "City boundary") {
                layer.bringToFront();
            }
        }
    } catch (error) {
        console.error(`Could not load ${layerConfig.filename}.geojson:`, error);
    }
}

    // Create boundary layer controls
    async function createBoundaryLayerControls(controlDiv) {
        const boundaryLayers = [
            { name: 'City boundary', filename: 'city_limits', color: 'magenta', visible: true },
            { name: 'Community Boundaries', filename: 'community', color: 'cyan', visible: true },
            { name: 'Community Labels', filename: 'community', color: 'cyan', visible: true, labels: true },
            { name: 'Neighborhood Boundaries', filename: 'neighborhoods', color: 'white', visible: true },
            { name: 'Neighborhood Labels', filename: 'neighborhoods', color: 'white', visible: true, labels: true },
            { name: 'Census ZCTA (ZIP) 2023', filename: 'zcta_boundaries', color: 'orange', visible: false, labels: true },
        ];
    
    // Create select all/none links for boundary layers first
    const boundarySelectDiv = document.createElement('div');
    boundarySelectDiv.style.cssText = 'font-size: 10px; color: #888; margin: 4px 0 6px 0; text-align: left; font-weight: normal;';
    
    const selectAllBoundary = document.createElement('a');
    selectAllBoundary.href = '#';
    selectAllBoundary.textContent = 'Select all';
    selectAllBoundary.style.cssText = 'color: #888; text-decoration: none; margin-right: 8px; font-weight: normal;';
    
    const selectNoneBoundary = document.createElement('a');
    selectNoneBoundary.href = '#';
    selectNoneBoundary.textContent = 'Select none';
    selectNoneBoundary.style.cssText = 'color: #888; text-decoration: none; font-weight: normal;';
    
    selectAllBoundary.addEventListener('click', function(e) {
        e.preventDefault();
        boundaryLayers.forEach(layerConfig => {
            const layerInfo = window.boundaryLayers[layerConfig.name];
            if (layerInfo && !layerInfo.visible) {
                layerInfo.visible = true;
                layerInfo.layer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
                const checkbox = document.getElementById(`boundary-${layerConfig.name.replace(/\s+/g, '-')}`);
                if (checkbox) checkbox.checked = true;
            }
        });
        // Ensure city boundary is always on top
        if (window.boundaryLayers['City boundary'] && window.boundaryLayers['City boundary'].visible) {
            window.boundaryLayers['City boundary'].layer.bringToFront();
        }
    });
    
    selectNoneBoundary.addEventListener('click', function(e) {
        e.preventDefault();
        boundaryLayers.forEach(layerConfig => {
            const layerInfo = window.boundaryLayers[layerConfig.name];
            if (layerInfo && layerInfo.visible) {
                layerInfo.visible = false;
                map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(layerInfo.layer);
                const checkbox = document.getElementById(`boundary-${layerConfig.name.replace(/\s+/g, '-')}`);
                if (checkbox) checkbox.checked = false;
            }
        });
    });
    
    boundarySelectDiv.appendChild(selectAllBoundary);
    boundarySelectDiv.appendChild(selectNoneBoundary);
    controlDiv.appendChild(boundarySelectDiv);
    
    // Create boundary layers
    for (const layerConfig of boundaryLayers) {
        await createBoundaryLayer(layerConfig);
        
        // Create control element
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        
        // Add indentation for label layers
        if (layerConfig.name === 'Community Labels' || layerConfig.name === 'Neighborhood Labels') {
            layerDiv.style.marginLeft = '20px';
        }
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `boundary-${layerConfig.name.replace(/\s+/g, '-')}`;
        checkbox.checked = layerConfig.visible;
        checkbox.classList.add('link-cursor');
        
        const label = document.createElement('label');
        label.htmlFor = `boundary-${layerConfig.name.replace(/\s+/g, '-')}`;
        label.textContent = layerConfig.name;
        label.classList.add('link-cursor');
        
        layerDiv.appendChild(checkbox);
        layerDiv.appendChild(label);
        controlDiv.appendChild(layerDiv);
        
        // Event listener for checkbox
        checkbox.addEventListener('change', function() {
            const layerName = layerConfig.name;
            const layerInfo = window.boundaryLayers[layerName];
            
            if (this.checked) {
                if (layerInfo) {
                    layerInfo.layer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
                    layerInfo.visible = true;
                    // Bring city boundary to front when toggled on
                    if (layerName === "City boundary") {
                        layerInfo.layer.bringToFront();
                    }
                }
            } else {
                if (layerInfo) {
                    map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(layerInfo.layer);
                    layerInfo.visible = false;
                }
            }
            
            // Ensure city boundary is always on top after boundary layer changes
            if (window.boundaryLayers && window.boundaryLayers['City boundary'] && window.boundaryLayers['City boundary'].visible) {
                window.boundaryLayers['City boundary'].layer.bringToFront();
            }
        });
    }
}

// Create photo layer functionality
async function createPhotoLayer() {
    if (photoLayer) {
        map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(photoLayer);
        photoLayer = null;
    }
    
    photoLayer = L.layerGroup();
    
    // OPTIMIZED: Get issues from visible categories only
    const allIssues = [];
    if (window.categoryData && window.selectedCategories && window.selectedCategories.size > 0) {
        window.selectedCategories.forEach(categoryName => {
            if (window.categoryData[categoryName] && Array.isArray(window.categoryData[categoryName])) {
                allIssues.push(...window.categoryData[categoryName]);
            }
        });
    }
    
    // If no visible categories, check all (fallback)
    if (allIssues.length === 0 && window.categoryData) {
        Object.values(window.categoryData).forEach(issues => {
            if (Array.isArray(issues)) {
                allIssues.push(...issues);
            }
        });
    }
    
    console.log(`Processing ${allIssues.length} issues for photo thumbnails...`);
    
    // Filter issues that have coordinates
    const issuesWithCoordinates = allIssues.filter(issue => {
        return issue.latitude && issue.longitude && 
               !isNaN(parseFloat(issue.latitude)) && 
               !isNaN(parseFloat(issue.longitude));
    });
    
    console.log(`${issuesWithCoordinates.length} issues have valid coordinates`);
    
    // OPTIMIZED: Limit to reasonable number (500 max)
    const maxPhotosToShow = 500;
    let issuesToDisplay = issuesWithCoordinates;
    if (issuesToDisplay.length > maxPhotosToShow) {
        issuesToDisplay = issuesToDisplay.sort(() => 0.5 - Math.random()).slice(0, maxPhotosToShow);
        console.log(`Limited to ${maxPhotosToShow} photos for performance`);
    }
    
    // OPTIMIZED: Try batch API call first, fall back to individual calls if needed
    const issueIds = issuesToDisplay.map(issue => issue.issue_id || issue.issueId || issue.id).filter(id => id);
    
    console.log(`Making ONE batch API call for ${issueIds.length} issues...`);
    
    let photosAdded = 0; // Declare outside try block
    
    try {
        const batchResponse = await fetch('/api/images/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                issue_ids: issueIds,
                variant: 'thumbnail'
            })
        });
        
        if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            console.log(`Batch API returned data for ${Object.keys(batchData).length} issues`);
            
            issuesToDisplay.forEach(issue => {
                const issueId = issue.issue_id || issue.issueId || issue.id;
                if (!issueId) return;
                
                const imageData = batchData[issueId];
                if (imageData && imageData.image_url && !imageData.error) {
                    // Create marker with thumbnail
                    const marker = createPhotoMarker(
                        parseFloat(issue.latitude), 
                        parseFloat(issue.longitude), 
                        imageData.image_url, 
                        imageData.image_url, // Will fetch full res on click
                        {issue_id: issueId}
                    );
                    photoLayer.addLayer(marker);
                    photosAdded++;
                }
            });
        } else {
            console.warn('Batch API not available (404), falling back to individual API calls with batching');
            // Fall back to individual calls with concurrency limit
            const concurrencyLimit = 20;
            let currentIndex = 0;
            
            const processBatch = async () => {
                const batch = issueIds.slice(currentIndex, currentIndex + concurrencyLimit);
                currentIndex += concurrencyLimit;
                
                const promises = batch.map(async (issueId) => {
                    const issue = issuesToDisplay.find(i => (i.issue_id || i.issueId || i.id) === issueId);
                    if (!issue) return null;
                    
                    try {
                        const response = await fetch(`/api/image/${issueId}?variant=thumbnail`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data && data.image_url) {
                                const marker = createPhotoMarker(
                                    parseFloat(issue.latitude), 
                                    parseFloat(issue.longitude), 
                                    data.image_url, 
                                    data.image_url,
                                    {issue_id: issueId}
                                );
                                return marker;
                            }
                        }
                    } catch (error) {
                        return null;
                    }
                    return null;
                });
                
                const results = await Promise.all(promises);
                results.forEach(marker => {
                    if (marker) {
                        photoLayer.addLayer(marker);
                        photosAdded++;
                    }
                });
                
                if (currentIndex < issueIds.length) {
                    await processBatch();
                }
            };
            
            await processBatch();
        }
    } catch (error) {
        console.error('Error in photo layer creation:', error);
    }
    
    // Add layer to map if we have photos
    if (photosAdded > 0) {
        console.log(`Added ${photosAdded} photo thumbnails to map`);
        photoLayer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
    } else {
        console.log('No photo thumbnails found to display');
    }
    
    // Add layer to map
    if (photosAdded > 0) {
        console.log(`Added ${photosAdded} photo thumbnails to map (no API calls needed!)`);
        photoLayer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
    } else {
        console.log('No photo thumbnails found to display');
    }
}

function createPhotoMarker(lat, lng, photoPath, fullResPath, properties) {
    // Use same circular style as mouseover thumbnails
    const size = 40; // Same size as mouseover
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'photo-thumbnail-marker',
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${photoPath}');background-size:cover;background-position:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        }),
        zIndexOffset: 1000
    });
    
    marker.on('click', async function() {
        // OPTIMIZED: Fetch full resolution on click if not already provided
        let fullResToUse = fullResPath;
        if (!fullResToUse && properties && properties.issue_id) {
            try {
                const fullResponse = await fetch(`/api/image/${properties.issue_id}?variant=full`);
                if (fullResponse.ok) {
                    const fullData = await fullResponse.json();
                    if (fullData && fullData.image_url) {
                        fullResToUse = fullData.image_url;
                    }
                }
            } catch (e) {
                // Fall back to thumbnail if full res fetch fails
                fullResToUse = photoPath;
            }
        }
        
        const img = new Image();
        img.onload = function() {
            showPhotoEnlarged(fullResToUse || photoPath, properties);
        };
        img.onerror = function() {
            alert('Full resolution image not available for this issue.');
        };
        img.src = fullResToUse || photoPath;
    });
    
    return marker;
}

function showPhotoEnlarged(fullResPath, properties) {
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-image');
    
    if (modal && modalImg) {
        modal.style.display = 'block';
        modalImg.src = fullResPath;
        
        // Find the issue data from all layers to get complete information
        let issueData = null;
        Object.entries(issueLayers).forEach(([layerName, layer]) => {
            layer.eachLayer(function(marker) {
                if (marker.feature && marker.feature.properties && 
                    marker.feature.properties.issue_id === properties.issue_id) {
                    issueData = marker.feature.properties;
                }
            });
        });
        
        // Update modal caption with detailed issue information
        let captionHTML = '';
        if (issueData) {
            // Extract street name and zip from full address
            const address = issueData.address || issueData.Address || 'Address not available';
            const fullStreet = address.split(',')[0] || 'Street name not available';
            // Remove house/building number from street address
            const streetName = fullStreet.replace(/^\d+\s*/, '') || 'Street name not available';
            const zipMatch = address.match(/\b\d{5}\b/);
            const zipCode = zipMatch ? zipMatch[0] : 'Zip not available';
            
            // Format dates
            const createdDate = issueData.created_at ? formatCentralDate(issueData.created_at) : 'Date not available';
            const status = issueData.status || 'Status not available';
            const category = issueData.request_type_full_category || 'Category not available';
            
            captionHTML = `
                <div style="color: #f0f6fc; font-size: 12px; line-height: 1.4; text-align: left;">
                    <strong>${category}</strong><br>
                    <span style="color: #888;">${streetName}, ${zipCode}</span><br>
                    <span style="color: #888;">Created: ${createdDate} • Status: ${status}</span>
                </div>
            `;
        }
        
        // Add caption below image
        let captionDiv = modal.querySelector('.photo-caption');
        if (!captionDiv) {
            captionDiv = document.createElement('div');
            captionDiv.className = 'photo-caption';
            captionDiv.style.cssText = 'position: absolute; bottom: 20px; left: 20px; right: 20px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px;';
            modal.appendChild(captionDiv);
        }
        captionDiv.innerHTML = captionHTML;
    }
}

// Initialize marker storage (called after data is loaded)
function initializeMarkerStorage() {
    console.log("=== INITIALIZING MARKER STORAGE ===");
    const startTime = performance.now();
    
    console.log('allIssues check:', {
        allIssues: !!window.allIssues,
        length: window.allIssues ? window.allIssues.length : 'undefined',
        type: typeof window.allIssues
    });
    
    if (!window.allIssues || window.allIssues.length === 0) {
        console.log('No issues data available for markers');
        return;
    }
    
    // Initialize marker storage by category
    window.categoryMarkerLayers = {};
    window.categoryData = {}; // Store raw data for each category
    window.loadedCategories = new Set(); // Track which categories have been loaded
    
    // Filter issues within city limits
    const issuesWithinCityLimits = window.allIssues.filter(issue => issue.within_city_limits === 1);
    console.log(`Preparing data for ${issuesWithinCityLimits.length} issues within city limits`);
    
    // Group issues by category
    issuesWithinCityLimits.forEach(issue => {
        const category = issue.request_type_full_category || 'Unknown';
        if (!window.categoryData[category]) {
            window.categoryData[category] = [];
        }
        window.categoryData[category].push(issue);
    });
    
    console.log(`Category data prepared:`, Object.keys(window.categoryData).map(cat => `${cat}: ${window.categoryData[cat].length}`));
    
    const endTime = performance.now();
    const initTime = endTime - startTime;
    console.log(`Prepared data for ${Object.keys(window.categoryData).length} categories in ${initTime.toFixed(2)}ms`);
    console.log('Categories:', Object.keys(window.categoryData));
}


// Detect iOS user agent
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Share functionality for issue detail views (make globally accessible)
window.shareIssue = async function(issueId, issueTitle) {
    const shareUrl = `${window.location.origin}/issue/${issueId}`;
    const shareText = issueTitle || `Birmingham 311 Issue #${issueId}`;
    
    const shareData = {
        title: shareText,
        text: shareText,
        url: shareUrl
    };
    
    // iOS: Always use native share sheet
    if (isIOS() && navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            // User cancelled, don't do anything
            if (err.name === 'AbortError') {
                return;
            }
            console.log('Share failed:', err);
        }
    }
    
    // Non-iOS: Copy to clipboard
    try {
        await navigator.clipboard.writeText(shareUrl);
        // Show temporary feedback on both share buttons
        const shareBtn = document.getElementById('share-issue-btn');
        const shareBtnBottom = document.getElementById('share-issue-btn-bottom');
        
        const updateShareButton = (btn) => {
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '✓';
                btn.style.color = '#4A9EFF';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '#fff001';
                }, 2000);
            }
        };
        
        updateShareButton(shareBtn);
        updateShareButton(shareBtnBottom);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Final fallback: show URL in alert
        alert(`Share this issue: ${shareUrl}`);
    }
};

// URL routing functions for issue detail views
function updateIssueURL(issueId) {
    if (issueId) {
        // Update URL path without triggering page reload
        const newPath = `/issue/${issueId}`;
        if (window.location.pathname !== newPath) {
            window.history.pushState({ issueId: issueId }, '', newPath + window.location.search + window.location.hash);
        }
    } else {
        // Remove issue from URL, go back to root
        if (window.location.pathname.startsWith('/issue/')) {
            window.history.pushState({}, '', '/' + window.location.search + window.location.hash);
        }
    }
}

function getIssueIdFromURL() {
    const path = window.location.pathname;
    const match = path.match(/^\/issue\/(\d+)$/);
    return match ? match[1] : null;
}

async function openIssueFromURL() {
    const issueId = getIssueIdFromURL();
    if (issueId && window.allIssues) {
        // Find the issue in loaded issues
        const issue = window.allIssues.find(i => i.issue_id == issueId || i.issue_id === issueId || i.id == issueId);
        if (issue) {
            await showIssueExpandedView(issue);
        } else {
            // Issue not in loaded data, fetch it directly
            try {
                const response = await fetch(`/api/issues/${issueId}`);
                if (response.ok) {
                    const issueData = await response.json();
                    await showIssueExpandedView(issueData);
                }
            } catch (error) {
                console.error('Error fetching issue from URL:', error);
            }
        }
    } else if (issueId) {
        // Issue ID in URL but data not loaded yet, wait for it
        const checkInterval = setInterval(async () => {
            if (window.allIssues && window.allIssues.length > 0) {
                clearInterval(checkInterval);
                await openIssueFromURL();
            }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
}

// Show issue expanded view
async function showIssueExpandedView(issueData) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('issue-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'issue-modal';
        modal.className = 'modal';
        modal.style.cssText = 'display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); cursor: pointer;';
        document.body.appendChild(modal);
    }
    
    // Show loading state
    const isMobileLoading = window.innerWidth <= 768;
    const loadingWidth = isMobileLoading ? '85%' : '40%';
    modal.innerHTML = `
        <div style="position: relative; margin: 5% auto; max-width: ${loadingWidth}; width: ${loadingWidth}; max-height: 80%; background: #1a1a1a; border-radius: 8px; padding: 20px; cursor: default; color: #fff; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">Loading issue details...</div>
            <div style="font-size: 14px; color: #C0C0C0;">Fetching data from database</div>
        </div>
    `;
    modal.style.display = 'block';
    
    try {
        // Fetch fresh issue data from API
        const currentIssueId = issueData.issue_id;
        if (!currentIssueId) {
            throw new Error('Issue ID not available');
        }
        
        // Fetch issue data first
        const issueResponse = await fetch(`/api/issues/${currentIssueId}`);
        
        if (!issueResponse.ok) {
            throw new Error(`Failed to fetch issue data: ${issueResponse.status}`);
        }
        
        const freshIssueData = await issueResponse.json();
        
        // Fetch comments from separate endpoint
        let commentsData = [];
        try {
            const commentsResponse = await fetch(`/api/issues/${currentIssueId}/comments`);
            if (commentsResponse.ok) {
                commentsData = await commentsResponse.json();
                console.log(`Fetched ${commentsData.length} comments from API`);
            }
        } catch (error) {
            console.warn('Failed to fetch comments:', error);
        }
        
        // Add comments to issueData for processing
        freshIssueData.comments = commentsData;
        
        // Always fetch image data from API (this is what worked before)
        let imageData = { image_url: null };
        try {
            const imageResponse = await fetch(`/api/image/${currentIssueId}`);
            if (imageResponse.ok) {
                imageData = await imageResponse.json();
                console.log('Modal: Fetched image from API for issue', currentIssueId, ':', imageData.image_url);
            } else {
                console.log('Modal: Image API returned status', imageResponse.status, 'for issue', currentIssueId);
            }
        } catch (imageError) {
            console.log(`Modal: Error fetching image for issue ${currentIssueId}:`, imageError.message);
        }
        
        // Use fresh data from API
        issueData = freshIssueData;
        
        // Create modal content
        const modalContent = document.createElement('div');
        // Responsive width: 85% on mobile, 40% on desktop
        const isMobile = window.innerWidth <= 768;
        const modalWidth = isMobile ? '85%' : '40%';
        modalContent.style.cssText = `position: relative; margin: 5% auto; max-width: ${modalWidth}; width: ${modalWidth}; max-height: 80%; background: #1a1a1a; border-radius: 8px; padding: 20px; cursor: default; color: #fff; overflow-y: auto;`;
    
    // Format dates
    const createdDate = issueData.created_at ? formatCentralDate(issueData.created_at) : 'Date not available';
    const updatedDate = issueData.updated_at ? formatCentralDate(issueData.updated_at) : 'Date not available';
    
    // Extract street name and zip from full address
    const address = issueData.address || issueData.Address || 'Address not available';
    const fullStreet = address.split(',')[0] || 'Street name not available';
    const streetName = fullStreet.replace(/^\d+\s*/, '') || 'Street name not available';
    const zipMatch = address.match(/\b\d{5}\b/);
    const zipCode = zipMatch ? zipMatch[0] : 'Zip not available';
    
    // Get representative image URL
    const representativeImageUrl = issueData.representative_image || issueData.image_full || null;
    
    // Get SeeClickFix link
    const seeClickFixLink = issueData.seeclickfix_url || `https://seeclickfix.com/issues/${issueData.issue_id}`;
    
    // Format date/time helper function
    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not available';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', { 
                timeZone: 'America/Chicago',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (e) {
            return 'Not available';
        }
    };
    
    // Get current time
    const currentTime = formatDateTime(new Date().toISOString());
    
    // Get database last sync time (will be fetched after modal is inserted)
    let lastSyncTime = 'Loading...';
    
    // Get reporter information
    const reporterName = issueData.reporter_name || issueData.reported_by || 'Anonymous';
    const reporterEmail = issueData.reporter_email || '';
    
    // Get coordinates
    const coordinates = issueData.latitude && issueData.longitude ? 
        `${issueData.latitude}, ${issueData.longitude}` : 'Coordinates not available';
    
    // Get point geometry
    const pointGeometry = issueData.point_geometry || 
        (issueData.latitude && issueData.longitude ? 
            `POINT(${issueData.longitude} ${issueData.latitude})` : 'Geometry not available');
    
    // Get square image URL
    const squareImageUrl = issueData.image_square_100x100 || issueData.representative_image || null;
    
    // Get video URL
    const videoUrl = issueData.video_url || issueData.video || null;

    // Get comments data (if available)
    // Comments already fetched from API and added to issueData
    const comments = issueData.comments || [];
    // Debug: log comments for troubleshooting
    console.log('Comments from issueData:', comments?.length || 0, 'comments found');
    if (comments && comments.length > 0) {
        console.log('First comment sample:', comments[0]);
    }
    
    // Build unified timeline with comments and status changes
    const timelineEvents = [];
    
    // Add issue creation event
    if (issueData.created_at) {
        timelineEvents.push({
            type: 'status',
            date: issueData.created_at,
            title: 'Issue Created',
            description: issueData.status || 'Status not available',
            status: issueData.status || 'Status not available'
        });
    }
    
    // Add issue update event (only if different from created)
    if (issueData.updated_at && issueData.updated_at !== issueData.created_at) {
        timelineEvents.push({
            type: 'status',
            date: issueData.updated_at,
            title: 'Issue Updated',
            description: issueData.status || 'Status not available',
            status: issueData.status || 'Status not available'
        });
    }
    
    // Add status history if available
    if (issueData.status_history && Array.isArray(issueData.status_history)) {
        issueData.status_history.forEach(historyItem => {
            timelineEvents.push({
                type: 'status',
                date: historyItem.changed_at || historyItem.date || historyItem.created_at,
                title: 'Status Changed',
                description: historyItem.status || historyItem.new_status || 'Status updated',
                status: historyItem.status || historyItem.new_status || 'Status updated',
                oldStatus: historyItem.old_status || null
            });
        });
    }
    
    // Add all comments to timeline
    // Handle comments - check multiple possible field names and data structures
    if (comments && Array.isArray(comments) && comments.length > 0) {
        comments.forEach(comment => {
            // Support multiple date field names
            const commentDate = comment.created_at || comment.date || comment.created_date || 
                               comment.timestamp || comment.time || null;
            
            // Support multiple comment text field names
            const commentText = comment.comment || comment.text || comment.body || 
                              comment.description || comment.message || 'No comment text';
            
            // Support multiple commenter field names 
            const commenterName = comment.commenter_name || comment.author_name || 
                                comment.name || comment.user_name || comment.submitter_name || 
                                'Anonymous';
            
            const commenterEmail = comment.commenter_email || comment.author_email || 
                                 comment.email || comment.user_email || null;
            
            // Get comment images if available
            const commentImageFull = comment.media_image_full || comment.image_full || null;
            const commentImageSquare = comment.media_image_square || comment.image_square_100x100 || null;
            
            // Add comment even if date is missing
            timelineEvents.push({
                type: 'comment',
                date: commentDate || issueData.created_at || issueData.updated_at || new Date().toISOString(),
                title: 'Comment',
                description: commentText,
                commenter: commenterName,
                commenter_email: commenterEmail,
                image_full: commentImageFull,
                image_square: commentImageSquare
            });
        });
    } else if (comments && !Array.isArray(comments)) {
        console.log('Comments exists but is not an array:', typeof comments, comments);
    }
    
    // Sort all events in descending order (newest first)
    timelineEvents.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA; // Descending order
    });
    
    // Get full image URL - prioritize API response (this is what worked before)
    const fullImageUrl = imageData.image_url || 
                        issueData.image_full_url || 
                        issueData.representative_image_url ||
                        issueData.image_url ||
                        null;
    
    if (fullImageUrl) {
        console.log('Modal: Image URL for issue', issueData.issue_id, ':', fullImageUrl);
    } else {
        console.log('Modal: No image URL found for issue', issueData.issue_id);
    }
    
    // Debug all issue data
    console.log('Issue data debug:', {
        issueId: issueData.issue_id,
        title: issueData.title,
        summary: issueData.summary,
        subject: issueData.subject,
        description: issueData.description,
        imageFull: issueData.image_full,
        representativeImage: issueData.representative_image,
        image: issueData.image,
        photo: issueData.photo,
        comments: issueData.comments,
        allKeys: Object.keys(issueData)
    });

    // Create modal HTML following the specified content order
    modalContent.innerHTML = `
        

        <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #C0C0C0; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica Now Micro Regular', Arial, sans-serif; display: flex; align-items: center; gap: 8px;">
                <button id="share-issue-btn" onclick="shareIssue('${issueData.issue_id || ''}', '${(issueData.request_type_full_category || issueData.title || '').replace(/'/g, "\\'")}')" style="background: none; border: none; padding: 0; cursor: pointer; color: #fff001; font-size: 16px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin: 0;" title="${isIOS() ? 'Share' : 'Copy link to clipboard'}">
                    ${isIOS() ? `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="4" y="6" width="16" height="13" rx="2" ry="2"></rect>
                        <path d="M12 2v10"></path>
                        <path d="M8 6l4-4 4 4"></path>
                    </svg>
                    ` : `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    `}
                </button>
                <span style="font-size: 12px; color: #888; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${isIOS() ? 'Share' : 'Copy'}</span>
                ISSUE ID: <a href="${seeClickFixLink}" target="_blank" style="color: #4A9EFF; text-decoration: none;">${issueData.issue_id || 'Not available'}</a>
            </p>
        </div>
        
        <div style="display: block; margin-bottom: 20px;">
            <h1 style="margin: 0; color: #fff; font-size: 24px; font-family: 'Helvetica Now Pro Display XBlk', Arial, sans-serif; font-weight: 213;">${issueData.request_type_full_category || 'Category not available'}</h1>
        </div>
        <button id="close-issue-modal" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
        
        ${fullImageUrl ? `
        <div style="margin-bottom: 20px; text-align: center;">
            <img src="${fullImageUrl}" alt="Full Image" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);" onerror="console.log('Image failed to load:', this.src); this.style.display='none';">
        </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #fff001; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica Now Micro Regular', Arial, sans-serif;">STATUS</p>
            <h3 style="color: #fff; margin: 0; font-size: 18px; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${issueData.status || 'Status not available'}</h3>
        </div>

        <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #fff001; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica Now Micro Regular', Arial, sans-serif;">DESCRIPTION</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.2; color: #fff; font-weight: bold; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${issueData.description || issueData.summary || issueData.subject || 'Description not available'}</p>
        </div>
        
        <div style="margin-bottom: 20px; display: flex; align-items: center;">
            <div style="width: 30px; height: 30px; background: #4A9EFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #fff; font-weight: bold; font-size: 12px; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">
                ${reporterName.charAt(0).toUpperCase()}
            </div>
            <div>
                <p style="margin: 0 0 5px 0; font-size: 14px; color: #fff; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${reporterName}</p>
                ${reporterEmail ? `<p style="margin: 0; font-size: 12px; color: #888; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${reporterEmail}</p>` : ''}
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #fff001; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica Now Micro Regular', Arial, sans-serif;">LOCATION</p>
            <p style="margin: 0; font-size: 14px; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${address}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #fff001; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica Now Micro Regular', Arial, sans-serif;">TIMELINE</p>
            <div id="timeline-container">
                ${timelineEvents.length > 0 ? timelineEvents.map(event => {
                    const eventDate = event.date ? formatCentralDate(event.date) : 'Date not available';
                    if (event.type === 'comment') {
                        const commentImageHtml = event.image_full ? `<div style="margin-top: 10px; text-align: center;"><img src="${event.image_full}" alt="Comment image" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);" onerror="console.log('Comment image failed to load:', this.src); this.style.display='none';"></div>` : '';
                        return `<div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid #4A9EFF;"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;"><p style="margin: 0; font-size: 12px; color: #4A9EFF; font-weight: bold; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${event.title}</p><p style="margin: 0; font-size: 11px; color: #888; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${eventDate}</p></div><p style="margin: 0 0 5px 0; font-size: 12px; color: #888; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${event.commenter}${event.commenter_email ? ' (' + event.commenter_email + ')' : ''}</p><p style="margin: 0; font-size: 14px; color: #fff; line-height: 1.4; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${event.description}</p>${commentImageHtml}</div>`;
                    } else {
                        const statusText = event.oldStatus ? `${event.oldStatus} → ${event.status}` : event.status;
                        return `<div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid #fff001;"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;"><p style="margin: 0; font-size: 12px; color: #fff001; font-weight: bold; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${event.title}</p><p style="margin: 0; font-size: 11px; color: #888; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${eventDate}</p></div><p style="margin: 0; font-size: 14px; color: #fff; line-height: 1.4; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${statusText}</p></div>`;
                    }
                }).join('') : '<p style="margin: 0; font-size: 14px; color: #888; font-family: \'Helvetica Now Text Regular\', Arial, sans-serif;">No timeline events available</p>'}
            </div>
        </div>
        
        ${squareImageUrl ? `
        <div style="margin-bottom: 20px; text-align: center;">
            <img src="${squareImageUrl}" alt="Square Image" style="width: 100px; height: 100px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        </div>
        ` : ''}
        
        ${videoUrl ? `
        <div style="margin-bottom: 20px; text-align: center;">
            <video controls style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
            <div style="margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                <button id="share-issue-btn-bottom" onclick="shareIssue('${issueData.issue_id || ''}', '${(issueData.request_type_full_category || issueData.title || '').replace(/'/g, "\\'")}')" style="background: none; border: none; padding: 0; cursor: pointer; color: #fff001; font-size: 16px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin: 0;" title="${isIOS() ? 'Share' : 'Copy link to clipboard'}">
                    ${isIOS() ? `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="4" y="6" width="16" height="13" rx="2" ry="2"></rect>
                        <path d="M12 2v10"></path>
                        <path d="M8 6l4-4 4 4"></path>
                    </svg>
                    ` : `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    `}
                </button>
                <span style="font-size: 12px; color: #888; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">${isIOS() ? 'Share' : 'Copy'}</span>
            </div>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #888; text-align: left; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;"><a href="https://mcr.pub/311?utm_campaign=311issuedetail" target="_blank" style="color: #4A9EFF; text-decoration: none; font-family: 'Helvetica Now Text', Arial, sans-serif;">Magic City Reader 311 API Clone</a></p>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #888; text-align: left; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">Current time: ${currentTime}</p>
            <p id="database-last-sync-time" style="margin: 0; font-size: 12px; color: #888; text-align: left; font-family: 'Helvetica Now Text Regular', Arial, sans-serif;">Database last updated: ${lastSyncTime}</p>
        </div>
    `;
    
    // Clear previous content and add new content
    modal.innerHTML = '';
    modal.appendChild(modalContent);
    
    // Show modal
    modal.style.display = 'block';
    
    // Fetch database last sync time and update display
    fetch('/api/last-sync')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const syncTimeElement = document.getElementById('database-last-sync-time');
            if (syncTimeElement) {
                if (data.last_sync_time) {
                    const formattedTime = formatDateTime(data.last_sync_time);
                    syncTimeElement.textContent = `Database last updated: ${formattedTime}`;
                } else {
                    syncTimeElement.textContent = 'Database last updated: Not available';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching last sync time:', error);
            const syncTimeElement = document.getElementById('database-last-sync-time');
            if (syncTimeElement) {
                syncTimeElement.textContent = 'Database last updated: Not available';
            }
        });
    
    // Update URL to include issue ID
    const issueId = issueData.issue_id || issueData.id;
    if (issueId) {
        updateIssueURL(issueId);
    }
    
    // Add close functionality
    const closeBtn = document.getElementById('close-issue-modal');
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        updateIssueURL(null); // Remove issue from URL
    };
    
    // Close modal when clicking outside
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            updateIssueURL(null); // Remove issue from URL
        }
    };
    
    
    } catch (error) {
        console.error('Error loading issue details:', error);
        
        // Show error state
        const isMobileError = window.innerWidth <= 768;
        const errorWidth = isMobileError ? '85%' : '40%';
        modal.innerHTML = `
            <div style="position: relative; margin: 5% auto; max-width: ${errorWidth}; width: ${errorWidth}; max-height: 80%; background: #1a1a1a; border-radius: 8px; padding: 20px; cursor: default; color: #fff; text-align: center;">
                <div style="font-size: 18px; margin-bottom: 10px; color: #ff6b6b;">Error Loading Issue</div>
                <div style="font-size: 14px; color: #C0C0C0; margin-bottom: 20px;">${error.message}</div>
                <button onclick="document.getElementById('issue-modal').style.display='none'; updateIssueURL(null);" style="background: #4A9EFF; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        `;
    }
}

// Load markers for a specific category (lazy loading)
function loadCategoryMarkers(category) {
    console.log(`=== LOADING MARKERS FOR CATEGORY: ${category} ===`);
    const startTime = performance.now();
    
    // Ensure loadedCategories and categoryMarkerLayers are initialized
    if (!window.loadedCategories) {
        window.loadedCategories = new Set();
    }
    if (!window.categoryMarkerLayers) {
        window.categoryMarkerLayers = {};
    }
    
    if (window.loadedCategories.has(category)) {
        console.log(`Category ${category} already loaded`);
        return window.categoryMarkerLayers[category];
    }
    
    if (!window.categoryData[category]) {
        console.log(`No data available for category: ${category}`);
        return null;
    }
    
    const issues = window.categoryData[category];
    const categoryLayer = L.layerGroup();
    
    console.log(`Creating ${issues.length} markers for category: ${category}`);
    
    issues.forEach(issue => {
        if (issue.latitude && issue.longitude) {
            // Create invisible marker for hover detection using divIcon
            const marker = L.marker([issue.latitude, issue.longitude], {
                icon: L.divIcon({
                    className: 'issue-hover-marker',
                    html: '<div style="width: 16px; height: 16px; background: transparent; border-radius: 50%; cursor: pointer;"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                }),
                interactive: true
            });
            
            // Add issue data to marker
            marker.issueData = issue;
            
            // Create hover circle (initially hidden) and optional thumbnail marker
            let hoverCircle = null;
            let thumbnailMarker = null;
            let isHovering = false;
            
            // Mouseover event
            marker.on('mouseover', function(e) {
                isHovering = true;
                // Start with subtle hover circle immediately
                hoverCircle = L.circle([issue.latitude, issue.longitude], {
                    radius: 200,
                    fill: false,
                    color: '#C0C0C0', // Silver color
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0,
                    className: 'issue-hover-circle'
                });
                hoverCircle.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
                hoverCircle.bringToFront();
                
                // Check for thumbnail URL in issue data first
                const thumbnailUrl = issue.representative_image_url || issue.image_square_100x100 || issue.image_full_url;
                if (thumbnailUrl) {
                    // Use image URL directly from issue data
                    if (!isHovering) return;
                    const size = 40;
                    const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${thumbnailUrl}');background-size:cover;background-position:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`;
                    if (!isHovering) return;
                    thumbnailMarker = L.marker([issue.latitude, issue.longitude], {
                        icon: L.divIcon({ className: 'issue-thumb-marker', html: html, iconSize: [size, size], iconAnchor: [size/2, size/2] }),
                        interactive: false
                    });
                    if (isHovering) {
                        thumbnailMarker.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
                        thumbnailMarker.bringToFront();
                    } else {
                        thumbnailMarker = null;
                    }
                } else {
                    // Fallback: fetch thumbnail from API
                    const issueId = issue.issue_id || issue.issueId || issue.id;
                    if (!issueId) return;
                    
                    fetch(`/api/image/${issueId}?variant=thumbnail`).then(async (resp) => {
                        if (!resp.ok) return;
                        // Check if still hovering before proceeding
                        if (!isHovering) return;
                        const data = await resp.json();
                        if (!data || !data.image_url) return;
                        // Check again after async operations
                        if (!isHovering) return;
                        // Build a circular divIcon with the thumbnail as background
                        const size = 40;
                        const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${data.image_url}');background-size:cover;background-position:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`;
                        // Check one more time before creating marker
                        if (!isHovering) return;
                        thumbnailMarker = L.marker([issue.latitude, issue.longitude], {
                            icon: L.divIcon({ className: 'issue-thumb-marker', html: html, iconSize: [size, size], iconAnchor: [size/2, size/2] }),
                            interactive: false
                        });
                        // Final check before adding to map
                        if (isHovering) {
                            thumbnailMarker.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
                            thumbnailMarker.bringToFront();
                        } else {
                            // Clean up if we created it but are no longer hovering
                            thumbnailMarker = null;
                        }
                    }).catch(() => {
                        // Ensure no orphaned references on error
                        if (!isHovering && thumbnailMarker) {
                            thumbnailMarker = null;
                        }
                    });
                }
            });
            
            // Mouseout event
            marker.on('mouseout', function(e) {
                isHovering = false;
                // Remove hover circle
                if (hoverCircle) {
                    map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(hoverCircle);
                    hoverCircle = null;
                }
                // Remove thumbnail overlay if present (check multiple times to handle async race conditions)
                if (thumbnailMarker) {
                    try {
                        if (map_5a5dcd89f74d5563ab698edfc46a7723.hasLayer(thumbnailMarker)) {
                            map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(thumbnailMarker);
                        }
                    } catch (e) {
                        // Layer might already be removed
                    }
                    thumbnailMarker = null;
                }
                // Set a timeout to catch any markers that get added after mouseout due to async timing
                setTimeout(() => {
                    if (!isHovering && thumbnailMarker && map_5a5dcd89f74d5563ab698edfc46a7723.hasLayer(thumbnailMarker)) {
                        map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(thumbnailMarker);
                        thumbnailMarker = null;
                    }
                }, 100);
            });
            
            // Click event - show issue expanded view
            marker.on('click', async function(e) {
                // Use the issue data stored on the marker
                const issueData = marker.issueData || issue;
                
                // Show expanded view
                await showIssueExpandedView(issueData);
            });
            
            // Add marker to category layer
            categoryLayer.addLayer(marker);
        }
    });
    
    // Store category layer
    window.categoryMarkerLayers[category] = categoryLayer;
    window.loadedCategories.add(category);
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    console.log(`Loaded ${categoryLayer.getLayers().length} markers for category: ${category} in ${loadTime.toFixed(2)}ms`);
    return categoryLayer;
}

// Update composite heatmap (lazy loading version)
function updateCompositeHeatmap() {
    // OPTIMIZED: Only update what changed - don't remove/add everything every time
    console.log("=== updateCompositeHeatmap called (OPTIMIZED) ===");
    
    // Ensure categoryMarkerLayers exists
    if (!window.categoryMarkerLayers) {
        window.categoryMarkerLayers = {};
    }
    if (!window.loadedCategories) {
        window.loadedCategories = new Set();
    }
    
    // Track which categories should be visible
    const categoriesToShow = new Set(window.selectedCategories || []);
    
    // Remove layers for categories that should no longer be visible
    Object.keys(window.categoryMarkerLayers).forEach(category => {
        if (!categoriesToShow.has(category)) {
            const layer = window.categoryMarkerLayers[category];
            if (layer && map_5a5dcd89f74d5563ab698edfc46a7723.hasLayer(layer)) {
                map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(layer);
            }
        }
    });
    
    // Remove existing heatmap layer
    if (window.compositeHeatmapLayer) {
        map_5a5dcd89f74d5563ab698edfc46a7723.removeLayer(window.compositeHeatmapLayer);
    }
    
    // Ensure loadedCategories is initialized
    if (!window.loadedCategories) {
        window.loadedCategories = new Set();
    }
    
    if (!window.allIssues || window.allIssues.length === 0) {
        console.log('No issues data available for heatmap');
        return;
    }
    
    // Filter issues by selected categories and city limits
    let filteredIssues = [];
    if (window.selectedCategories.size > 0) {
        filteredIssues = window.allIssues.filter(issue => 
            window.selectedCategories.has(issue.request_type_full_category) && 
            issue.within_city_limits === 1
        );
    }
    
    console.log(`Showing ${filteredIssues.length} issues from ${window.selectedCategories.size} selected categories`);
    
    // Collect all points from filtered issues for heatmap
    const heatData = [];
    filteredIssues.forEach(issue => {
        if (issue.latitude && issue.longitude) {
            heatData.push([issue.latitude, issue.longitude, 1]);
        }
    });
    
    if (heatData.length > 0) {
        // Create heatmap layer
        window.compositeHeatmapLayer = L.heatLayer(heatData, {
            minOpacity: 0.1,
            maxZoom: 18,
            radius: 30,
            blur: 22,
            gradient: {
                0.0: "navy",
                0.1: "blue",
                0.2: "cyan",
                0.3: "lime",
                0.4: "lime",
                0.5: "yellow",
                0.65: "orange",
                0.8: "orange",
                0.9: "red",
                1.0: "darkred"
            }
        });
        window.compositeHeatmapLayer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
        
        // Load and show selected category marker layers (lazy loading)
        if (window.selectedCategories.size > 0) {
            window.selectedCategories.forEach(category => {
                // Load markers for this category if not already loaded
                const categoryLayer = loadCategoryMarkers(category);
                if (categoryLayer) {
                    // Only add if not already on map (avoid re-adding)
                    if (!map_5a5dcd89f74d5563ab698edfc46a7723.hasLayer(categoryLayer)) {
                        categoryLayer.addTo(map_5a5dcd89f74d5563ab698edfc46a7723);
                    }
                }
            });
        }
        
        console.log(`Added heatmap with ${heatData.length} points`);
        console.log(`Showing markers for ${window.selectedCategories.size} selected categories`);
        console.log(`Loaded categories: ${Array.from(window.loadedCategories).join(', ')}`);
    }
}

// Update sidebar content with analytics
async function updateSidebarContent() {
    const sidebarContent = document.getElementById('sidebar-content');
    if (!sidebarContent) return;
    
    // Show loading state
    sidebarContent.innerHTML = `
        <div style="font-size: 11px; color: #888; margin-bottom: 15px;" class="loading">
            Analyzing all data...
        </div>
    `;
    
    try {
        // Load community boundaries
        const communityResponse = await fetch('/api/boundaries/community');
        const communityData = await communityResponse.json();
        
        // Analyze ALL loaded layers (regardless of visibility)
        const communityStats = {};
        const categoryStats = {};
        const monthlyStats = {};
        
        // Initialize community stats from boundary data (with error handling)
        if (communityData && communityData.features) {
            communityData.features.forEach(feature => {
                const name = feature.properties.name || feature.properties.NAME || 'Unknown';
                communityStats[name] = 0;
            });
        } else {
            console.warn('Community data not available, skipping community stats');
        }
        
        // Debug: Log which layers are being processed
        console.log('Processing ALL layers for analytics:', Object.keys(allLayers));
        
        // All issues are already filtered to within city limits from API
        // But we still filter here as a safety check in case API changes
        let totalRecords = 0;
        const issuesWithinCityLimits = allIssues.filter(issue => issue.within_city_limits === 1);
        totalRecords = issuesWithinCityLimits.length;
        
        // Count by category for issues within city limits
        issuesWithinCityLimits.forEach(issue => {
            const category = issue.request_type_full_category || 'Unknown';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        });
        
        // Generate analytics HTML
        // Generate analytics HTML with word cloud at the top
        let analyticsHTML = `
            <div style="margin-bottom: 20px; text-align: center;">
                <img src="/311/images/birmingham_2025_wordcloud.png" 
                     alt="Word Cloud - Birmingham 311 Requests 2025" 
                     style="width: 100%; max-width: 290px; height: auto; border-radius: 4px;"
                     onerror="this.style.display='none';">
            </div>
        `


        

        
        // Fetch and add community top issues - 5 lists, one per issue type
        try {
            const communityStatsResponse = await fetch('/api/stats/community-top-issues');
            if (communityStatsResponse.ok) {
                const communityStatsData = await communityStatsResponse.json();
                console.log('Community stats data received:', {
                    hasIssues: !!communityStatsData.issues,
                    hasTop5: !!communityStatsData.top5_issue_types,
                    issueTypesCount: communityStatsData.top5_issue_types ? communityStatsData.top5_issue_types.length : 0
                });
                
                if (communityStatsData.issues && communityStatsData.top5_issue_types && communityStatsData.top5_issue_types.length > 0) {
                    console.log('Adding community stats to HTML, issue types:', communityStatsData.top5_issue_types.length);
                    const communitySection = `
                        <div style="margin-bottom: 20px; border-top: 1px solid #30363d; padding-top: 15px;">
                            <h5 style="color: #58a6ff; margin-bottom: 12px; font-family: \"Helvetica Now Display Condensed\", \"Helvetica Now Condensed\", \"Helvetica Neue Condensed\", sans-serif;">Most requested issue categories</h5>
                            ${communityStatsData.top5_issue_types.map((issueType, issueIdx) => {
                                const communities = communityStatsData.issues[issueType] || [];
                                const totalCount = communities.reduce((sum, item) => sum + item.count, 0);
                                
                                if (communities.length === 0) {
                                    return '';
                                }
                                
                                return `
                                    <div style="margin-bottom: 15px; padding: 10px; background: rgba(88, 166, 255, 0.1); border-radius: 4px; border-left: 3px solid #58a6ff;">
                                        <div style="font-weight: bold; color: #58a6ff; margin-bottom: 8px; font-size: 11px;">
                                            ${issueIdx + 1}. ${issueType.substring(0, 60)}${issueType.length > 60 ? '...' : ''}
                                            <span style="color: #888; font-weight: normal; font-size: 10px;"> (${totalCount.toLocaleString()} total)</span>
                                        </div>
                                        ${communities.map((item, commIdx) => `
                                            <div style="font-size: 10px; margin-bottom: 3px; color: #f0f6fc; padding-left: 12px;">
                                                ${commIdx + 1}. ${item.community}: ${item.count.toLocaleString()}
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            }).filter(html => html !== '').join('')}
                        </div>
                    `;
                    analyticsHTML += communitySection;
                    console.log('Community section added, total HTML length:', analyticsHTML.length);
                } else {
                    console.warn('Community stats data missing required fields:', {
                        hasIssues: !!communityStatsData.issues,
                        hasTop5: !!communityStatsData.top5_issue_types,
                        top5Length: communityStatsData.top5_issue_types ? communityStatsData.top5_issue_types.length : 0
                    });
                }
                console.log('Analytics HTML after community stats (if added):', analyticsHTML.includes('Most requested issue categories'));
            } else {
                console.error('Community stats API returned status:', communityStatsResponse.status);
                // Add a placeholder to show the section exists
                analyticsHTML += `
                    <div style="margin-bottom: 20px; border-top: 1px solid #30363d; padding-top: 15px;">
                        <h5 style="color: #58a6ff; margin-bottom: 12px; font-family: "Helvetica Now Display Condensed", "Helvetica Now Condensed", "Helvetica Neue Condensed", sans-serif; color: #888;">Loading community statistics...</div>
                    </div>
                `;
            }
        } catch (communityError) {
            console.error('Error loading community stats:', communityError);
            // Add error message
            analyticsHTML += `
                <div style="margin-bottom: 20px; border-top: 1px solid #30363d; padding-top: 15px;">
                    <h5 style="color: #58a6ff; margin-bottom: 12px; font-family: "Helvetica Now Display Condensed", "Helvetica Now Condensed", "Helvetica Neue Condensed", sans-serif; color: #ff6b6b;">Error loading community statistics. Check console for details.</div>
                </div>
            `;
        }
        
        // Fetch and add top issue per community
        try {
            const topIssueResponse = await fetch('/api/stats/top-issue-per-community');
            if (topIssueResponse.ok) {
                const topIssueData = await topIssueResponse.json();
                console.log('Top issue per community data received:', topIssueData.communities ? topIssueData.communities.length : 0);
                
                if (topIssueData.communities && topIssueData.communities.length > 0) {
                    analyticsHTML += `
                        <div style="margin-bottom: 20px; border-top: 1px solid #30363d; padding-top: 15px;">
                            <h5 style="color: #58a6ff; margin-bottom: 12px; font-family: "Helvetica Now Display Condensed", "Helvetica Now Condensed", "Helvetica Neue Condensed", sans-serif; font-size: 12px; font-weight: bold;">
                                Most requested category by community
                            </h5>
                            <div style="overflow-y: auto; font-size: 10px;">
                                ${topIssueData.communities.map(item => `
                                    <div style="margin-bottom: 8px; padding: 8px; background: rgba(88, 166, 255, 0.05); border-radius: 4px; border-left: 2px solid #58a6ff;">
                                        <div style="font-weight: bold; color: #58a6ff; margin-bottom: 3px; font-size: 11px;">
                                            ${item.community}
                                        </div>
                                        <div style="color: #f0f6fc; margin-bottom: 2px; font-size: 11px;">
                                            ${item.top_issue_type.substring(0, 50)}${item.top_issue_type.length > 50 ? '...' : ''}
                                        </div>
                                        <div style="color: #888; font-size: 9px;">
                                            ${item.count.toLocaleString()} of ${item.total_issues.toLocaleString()} requests
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    console.log('Top issue per community section added');
                } else {
                    console.warn('No top issue per community data');
                }
            } else {
                console.error('Top issue per community API returned status:', topIssueResponse.status);
            }
        } catch (topIssueError) {
            console.error('Error loading top issue per community:', topIssueError);
        }
        
        // Always set innerHTML after all async operations complete
        sidebarContent.innerHTML = analyticsHTML;
        console.log('Sidebar HTML updated, length:', analyticsHTML.length);
        
    } catch (error) {
        console.error('Error updating sidebar content:', error);
        sidebarContent.innerHTML = `
            <div style="font-size: 11px; color: #888;">
                Error loading analytics data.
            </div>
        `;
    }
}

// Initialize hamburger menu functionality
function initializeHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('heatmap-sidebar');
    
    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', function() {
            // Toggle hamburger menu active state
            hamburgerMenu.classList.toggle('active');
            
            // Toggle sidebar open state
            sidebar.classList.toggle('sidebar-open');
        });
        
        // Close sidebar when clicking outside (mobile only)
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                const isClickInsideSidebar = sidebar.contains(event.target);
                const isClickOnHamburger = hamburgerMenu.contains(event.target);
                
                if (!isClickInsideSidebar && !isClickOnHamburger && sidebar.classList.contains('sidebar-open')) {
                    hamburgerMenu.classList.remove('active');
                    sidebar.classList.remove('sidebar-open');
                }
            }
        });
    }
}

// Helper function to get color for category
function getColorForCategory(category) {
    const colors = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];
    const hash = category.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
}

// Initialize map and load data when the DOM is ready
// Load and update database last updated footer
function updateDatabaseFooter() {
    const footer = document.getElementById('database-updated-footer');
    if (!footer) return;
    
    fetch('/api/last-sync')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.last_sync_time) {
                const formattedTime = formatDatabaseUpdatedTime(data.last_sync_time);
                footer.textContent = `DATABASE LAST UPDATED: ${formattedTime}`;
            } else {
                footer.textContent = 'DATABASE LAST UPDATED: Not available';
            }
        })
        .catch(error => {
            console.error('Error fetching last sync time:', error);
            footer.textContent = 'DATABASE LAST UPDATED: Not available';
        });
}

// Wait for Leaflet to be available
function waitForLeaflet(callback, maxAttempts = 50, interval = 100) {
    if (typeof L !== "undefined" && L && L.map) {
        callback();
    } else if (maxAttempts > 0) {
        setTimeout(() => waitForLeaflet(callback, maxAttempts - 1, interval), interval);
    } else {
        console.error("Leaflet failed to load after maximum attempts");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Update database footer (doesn't need Leaflet)
    // updateDatabaseFooter(); // Removed - database update time now shown in layer control
    
    // Wait for Leaflet before initializing map
    waitForLeaflet(() => {
        initializeMap();
        loadLayerConfiguration().then(() => {
            // Small delay to ensure allIssues is populated
            setTimeout(() => {
                // Check if there's already an issue ID in the URL hash
                const issueId = getIssueIdFromURL();
                if (issueId) {
                    openIssueFromURL();
                }
            }, 500);
        });
    });
    
    // Also handle popstate for direct navigation
    window.addEventListener('popstate', (event) => {
        const issueId = getIssueIdFromURL();
        if (issueId) {
            // URL changed to an issue, open it
            openIssueFromURL();
        } else {
            // URL changed away from issue, close modal
            const modal = document.getElementById('issue-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
});
// Test comment

