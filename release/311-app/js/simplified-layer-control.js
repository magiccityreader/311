/**
 * Simplified Layer Control Panel
 * Clean, minimal implementation of the Birmingham 311 layer control
 */

// Global variables (use existing ones from main file)
let map;
let isExpanded = false;
// allIssues will be passed as parameter to functions

// Initialize the simplified layer control
async function initSimplifiedLayerControl(mapInstance, issues) {
    console.log('=== INIT SIMPLIFIED LAYER CONTROL ===');
    
    map = mapInstance;
    window.map_5a5dcd89f74d5563ab698edfc46a7723 = mapInstance;
    const allIssues = issues || []; // Local variable, not global
    
    // Initialize selectedCategories if it doesn't exist
    if (typeof window.selectedCategories === 'undefined') {
        window.selectedCategories = new Set();
        console.log('Initialized window.selectedCategories as new Set');
    }
    
    console.log('initSimplifiedLayerControl called with:', {
        mapInstance: !!mapInstance,
        issues: issues ? issues.length : 'undefined',
        allIssues: allIssues ? allIssues.length : 'undefined',
        selectedCategories: window.selectedCategories ? window.selectedCategories.size : 'undefined'
    });
    console.log('Current window size:', window.innerWidth, 'x', window.innerHeight);
    
    // Safety check - don't create control if no issues
    if (!allIssues || allIssues.length === 0) {
        console.warn('Simplified layer control: No issues data available');
        return;
    }
    
    // Remove existing control
    const existing = document.getElementById('layer-control');
    if (existing) existing.remove();
    
    // Create the control with issues data
    await createSimplifiedLayerControl(allIssues);
}

// Create the layer control panel (simplified version)
async function createSimplifiedLayerControl(allIssues) {
    console.log('=== CREATE SIMPLIFIED LAYER CONTROL ===');
    console.log('createSimplifiedLayerControl called with allIssues:', allIssues ? allIssues.length : 'undefined');
    console.log('Document ready state:', document.readyState);
    console.log('Body exists:', !!document.body);
    
    try {
    
    // Main container
    const control = document.createElement('div');
    control.id = 'layer-control';
    control.className = 'layer-control';
    control.style.maxHeight = '70vh';
    control.style.overflow = 'visible';
    
    // Header with title and toggle
    const header = createHeader();
    control.appendChild(header);
    
    // Collapsible content
    const content = await createCollapsibleContent(allIssues, control, map);
    control.appendChild(content);
    
    // Add to page
    console.log('Appending control to document.body...');
    console.log('Control element:', control);
    console.log('Control ID:', control.id);
    console.log('Control classes:', control.className);
    document.body.appendChild(control);
    console.log('Control appended successfully');
    console.log('Control in DOM:', !!document.getElementById('layer-control'));
    
    // Set initial state after a brief delay to ensure DOM is ready
    setTimeout(() => {
        console.log('Setting initial state...');
        setInitialState(control, content);
        console.log('Initial state set');
    }, 100);
    } catch (error) {
        console.error("Error creating simplified layer control:", error);
        // Continue without the layer control rather than breaking the entire app
    }
}

// Create header section
function createHeader() {
    const header = document.createElement('div');
    header.className = 'layer-header';
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
    
    // Title
    const title = document.createElement('h3');
    title.innerHTML = 'Birmingham 311 requests';
    title.style.cssText = 'margin: 0; flex: 1;';
    header.appendChild(title);
    
    // Toggle button
    const toggle = document.createElement('div');
    toggle.id = 'layer-toggle-control';
    toggle.className = 'layer-toggle';
    toggle.innerHTML = '−';
    toggle.style.cssText = 'font-size: 18px; font-weight: bold; color: #888; margin-left: 10px; user-select: none;';
    header.appendChild(toggle);
    
    return header;
}

// Create collapsible content section
async function createCollapsibleContent(allIssues, controlDiv, mapInstance) {
    const contentContainer = document.createElement('div');
    contentContainer.id = 'layer-control-content';
    contentContainer.style.cssText = 'overflow: visible; transition: max-height 0.3s ease-out;';
    
    const collapsibleContent = document.createElement('div');
    collapsibleContent.id = 'collapsible-content';
    collapsibleContent.className = 'layer-content';
    collapsibleContent.style.cssText = 'transition: max-height 0.3s ease-out; overflow: visible;';
    
    // Ensure allIssues is defined
    if (!allIssues || allIssues.length === 0) {
        console.warn('createSimplifiedLayerControl - allIssues is empty or undefined');
        const emptyDiv = document.createElement('div');
        emptyDiv.innerHTML = '<div style="color: #888; font-size: 11px; margin: 10px 0;">No data available. Please refresh the page.</div>';
        collapsibleContent.appendChild(emptyDiv);
        contentContainer.appendChild(collapsibleContent);
        return contentContainer;
    }
    
    // Statistics
    const stats = createStats(allIssues);
    

    
    // Add separator
    const separator1 = document.createElement('div');
    separator1.className = 'group-header';
    separator1.style.height = '1px';
    separator1.style.borderBottom = '1px solid #333';
    separator1.style.margin = '4px 0';
    
    // Group issues by category
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
        visible: false
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
    
    // Initialize selected categories with top 10 (preselected)
    top10Categories.forEach(config => {
        if (typeof window.selectedCategories !== 'undefined') {
            window.selectedCategories.add(config.name);
        }
    });
    
    // Add separator
    const separator2 = document.createElement('div');
    separator2.className = 'group-header';
    separator2.style.height = '1px';
    separator2.style.borderBottom = '1px solid #333';
    separator2.style.margin = '4px 0';
    
    // Select all/none links for top 10 categories
    const top10SelectDiv = createSelectAllNoneLinks(top10Categories, 'top10');
    
    // Add elements to collapsible content
    collapsibleContent.appendChild(stats);
    
    // Add boundary layer controls
    const boundaryControls = createLocalBoundaryLayerControls(mapInstance);
    collapsibleContent.appendChild(boundaryControls);
    
    // Create the actual boundary layers
    try {
        await createBoundaryLayers();
    } catch (error) {
        console.error('Error creating boundary layers:', error);
        // Continue without boundary layers rather than breaking the entire control
    }
    

    collapsibleContent.appendChild(separator1);
    collapsibleContent.appendChild(top10SelectDiv);
    
    // Add top 10 categories
    top10Categories.forEach(config => {
        const item = createCategoryItem(config, collapsibleContent);
        collapsibleContent.appendChild(item);
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
        // Start collapsed - CSS handles the max-height: 0
        
        // Add select all/none for other categories
        const otherSelectDiv = createSelectAllNoneLinks(otherCategories, 'other');
        toggleContainer.appendChild(otherSelectDiv);
        
        // Add other categories
        otherCategories.forEach(config => {
            const item = createCategoryItem(config, toggleContainer);
            toggleContainer.appendChild(item);
        });
        
        collapsibleContent.appendChild(toggleContainer);
        
        // Toggle functionality for other categories
        otherHeader.addEventListener('click', function() {
            const isExpanded = toggleContainer.classList.contains('expanded');
            const contentContainer = document.getElementById('layer-control-content');
            
            if (isExpanded) {
                toggleContainer.classList.remove('expanded');
                this.classList.remove('expanded');
                // Reset to default height
                controlDiv.style.setProperty('max-height', '70vh', 'important');
                controlDiv.style.setProperty('height', 'auto', 'important');
                controlDiv.style.setProperty('overflow', 'visible', 'important');
                controlDiv.style.setProperty('overflow-y', 'visible', 'important');
                if (contentContainer) {
                    contentContainer.style.overflow = 'visible';
                }
            } else {
                toggleContainer.classList.add('expanded');
                this.classList.add('expanded');
                // Use calc based on window height (accounting for top position and padding)
                const topPosition = 5; // top: 5px from CSS
                const padding = 16; // 8px padding top and bottom
                const calculatedHeight = `calc(100vh - ${topPosition + padding}px)`;
                // Set max-height to limit container, height auto to grow with content
                controlDiv.style.setProperty('max-height', calculatedHeight, 'important');
                controlDiv.style.setProperty('height', 'auto', 'important');
                controlDiv.style.setProperty('overflow', 'auto', 'important');
                controlDiv.style.setProperty('overflow-y', 'auto', 'important');
                controlDiv.style.setProperty('overflow-x', 'hidden', 'important');
                if (contentContainer) {
                    contentContainer.style.overflow = 'visible';
                }
                // Small delay to allow CSS transition to complete, then force reflow
                setTimeout(() => {
                    controlDiv.offsetHeight; // Force reflow
                }, 10);
            }
        });
    }
    
    contentContainer.appendChild(collapsibleContent);
    
    // Add main toggle functionality with a delay to ensure DOM is ready
    setTimeout(() => {
        const headerDiv = document.querySelector('.layer-header');
        console.log('Looking for header element with class .layer-header:', !!headerDiv);
        if (headerDiv) {
            console.log('Header element found, adding click listener');
            headerDiv.addEventListener('click', function() {
            const isExpanded = collapsibleContent.classList.contains('expanded');
            const isCollapsed = collapsibleContent.classList.contains('collapsed');
            const toggleControl = document.getElementById('layer-toggle-control');
            const contentContainer = document.getElementById('layer-control-content');
            const isMobile = window.innerWidth <= 768;
            
            console.log('=== MINUS CONTROL CLICKED ===');
            console.log('isExpanded:', isExpanded);
            console.log('isCollapsed:', isCollapsed);
            console.log('isMobile:', isMobile);
            console.log('toggleControl found:', !!toggleControl);
            console.log('contentContainer found:', !!contentContainer);
            console.log('controlDiv found:', !!controlDiv);
            console.log('Current controlDiv styles:');
            console.log('  max-height:', controlDiv.style.maxHeight);
            console.log('  height:', controlDiv.style.height);
            console.log('  overflow:', controlDiv.style.overflow);
            if (contentContainer) {
                console.log('Current contentContainer styles:');
                console.log('  max-height:', contentContainer.style.maxHeight);
                console.log('  overflow:', contentContainer.style.overflow);
            }
            
            if (!toggleControl) {
                console.warn('Toggle control not found, skipping toggle operation');
                return;
            }
            
            if (isMobile) {
                // Mobile: two states - collapsed, expanded
                if (isCollapsed) {
                    // Collapsed -> Expanded
                    console.log('MOBILE: Collapsed to expanded state');
                    collapsibleContent.classList.remove('collapsed');
                    collapsibleContent.classList.add('expanded');
                    controlDiv.classList.remove('collapsed');
                    toggleControl.style.display = 'block';
                    toggleControl.innerHTML = '−';
                    // Reset to default height
                    controlDiv.style.setProperty('max-height', '70vh', 'important');
                    controlDiv.style.setProperty('height', 'auto', 'important');
                    controlDiv.style.setProperty('overflow', 'visible', 'important');
                    if (contentContainer) {
                        contentContainer.style.setProperty('max-height', 'none', 'important');
                        contentContainer.style.setProperty('overflow', 'visible', 'important');
                    }
                    console.log('MOBILE: Applied expanded styles');
                } else {
                    // Expanded -> Collapsed
                    console.log('MOBILE: Expanding to collapsed state');
                    collapsibleContent.classList.remove('expanded');
                    collapsibleContent.classList.add('collapsed');
                    controlDiv.classList.add('collapsed');
                    toggleControl.style.display = 'block';
                    toggleControl.innerHTML = '+';
                    // Reduce height to show only header - make it much smaller
                    controlDiv.style.setProperty('max-height', '50px', 'important');
                    controlDiv.style.setProperty('height', '50px', 'important');
                    controlDiv.style.setProperty('overflow', 'hidden', 'important');
                    if (contentContainer) {
                        contentContainer.style.setProperty('max-height', '0px', 'important');
                        contentContainer.style.setProperty('overflow', 'hidden', 'important');
                    }
                    console.log('MOBILE: Applied collapsed styles');
                    console.log('  controlDiv max-height:', controlDiv.style.maxHeight);
                    console.log('  controlDiv height:', controlDiv.style.height);
                    console.log('  controlDiv overflow:', controlDiv.style.overflow);
                    if (contentContainer) {
                        console.log('  contentContainer max-height:', contentContainer.style.maxHeight);
                        console.log('  contentContainer overflow:', contentContainer.style.overflow);
                    }
                }
            } else {
                // Desktop: two states - collapsed, expanded
                if (isExpanded) {
                    // Expanded -> Collapsed
                    console.log('DESKTOP: Expanding to collapsed state');
                    collapsibleContent.classList.remove('expanded');
                    collapsibleContent.classList.add('collapsed');
                    controlDiv.classList.add('collapsed');
                    toggleControl.innerHTML = '+';
                    // Reduce height to show only header - make it much smaller
                    controlDiv.style.setProperty('max-height', '50px', 'important');
                    controlDiv.style.setProperty('height', '50px', 'important');
                    controlDiv.style.setProperty('overflow', 'hidden', 'important');
                    if (contentContainer) {
                        contentContainer.style.setProperty('max-height', '0px', 'important');
                        contentContainer.style.setProperty('overflow', 'hidden', 'important');
                    }
                    console.log('DESKTOP: Applied collapsed styles');
                    console.log('  controlDiv max-height:', controlDiv.style.maxHeight);
                    console.log('  controlDiv height:', controlDiv.style.height);
                    console.log('  controlDiv overflow:', controlDiv.style.overflow);
                    if (contentContainer) {
                        console.log('  contentContainer max-height:', contentContainer.style.maxHeight);
                        console.log('  contentContainer overflow:', contentContainer.style.overflow);
                    }
                } else {
                    // Collapsed -> Expanded
                    console.log('DESKTOP: Collapsed to expanded state');
                    collapsibleContent.classList.remove('collapsed');
                    collapsibleContent.classList.add('expanded');
                    controlDiv.classList.remove('collapsed');
                    toggleControl.innerHTML = '−';
                    // Reset to default height
                    controlDiv.style.setProperty('max-height', '70vh', 'important');
                    controlDiv.style.setProperty('height', 'auto', 'important');
                    controlDiv.style.setProperty('overflow', 'visible', 'important');
                    if (contentContainer) {
                        contentContainer.style.setProperty('max-height', 'none', 'important');
                        contentContainer.style.setProperty('overflow', 'visible', 'important');
                    }
                    console.log('DESKTOP: Applied expanded styles');
                }
            }
            
            // Final debug: Show computed styles after changes
            setTimeout(() => {
                console.log('=== FINAL STATE AFTER CHANGES ===');
                console.log('controlDiv computed styles:');
                const computedStyle = window.getComputedStyle(controlDiv);
                console.log('  max-height:', computedStyle.maxHeight);
                console.log('  height:', computedStyle.height);
                console.log('  overflow:', computedStyle.overflow);
                if (contentContainer) {
                    const contentComputedStyle = window.getComputedStyle(contentContainer);
                    console.log('contentContainer computed styles:');
                    console.log('  max-height:', contentComputedStyle.maxHeight);
                    console.log('  overflow:', contentComputedStyle.overflow);
                }
                console.log('================================');
            }, 50);
        });
        } else {
            console.warn('Header element with class .layer-header not found! Cannot add click listener.');
            console.log('Available elements with "header" in class name:');
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.className && el.className.includes('header')) {
                    console.log('Found element:', el.tagName, 'with classes:', el.className);
                }
            });
        }
    }, 200); // 200ms delay to ensure DOM is ready
    
    return contentContainer;
}

// Format date/time for database update: "XX:XX a.m./p.m. Month Day, Year"
function formatDatabaseTime(dateString) {
    if (!dateString) return "Not available";
    try {
        // Treat naive datetime strings (without timezone) as UTC
        let normalizedDateString = dateString;
        if (dateString && !dateString.match(/[+-]\d{2}:\d{2}$/) && !dateString.endsWith("Z")) {
            normalizedDateString = dateString + "Z";
        }
        const date = new Date(normalizedDateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.error("Invalid date:", dateString);
            return "Not available";
        }
        
        // Format time in Central Time
        const timeOptions = {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        };
        const timeStr = date.toLocaleString("en-US", timeOptions);
        
        // Check if timeStr is valid
        if (timeStr === "Invalid Date" || !timeStr) {
            console.error("Invalid time string for date:", dateString);
            return "Not available";
        }
        
        // Format date in Central Time
        const dateOptions = {
            timeZone: "America/Chicago",
            month: "long",
            day: "numeric",
            year: "numeric"
        };
        let dateStr = date.toLocaleDateString("en-US", dateOptions);
        
        // Convert month names to abbreviations with periods
        for (const [full, abbrev] of Object.entries({
            "January": "Jan.",
            "February": "Feb.",
            "March": "March",
            "April": "April",
            "May": "May",
            "June": "June",
            "July": "July",
            "August": "Aug.",
            "September": "Sept.",
            "October": "Oct.",
            "November": "Nov.",
            "December": "Dec."
        })) {
            dateStr = dateStr.replace(full, abbrev);
        }
        
        // Check if dateStr is valid
        if (dateStr === "Invalid Date" || !dateStr) {
            console.error("Invalid date string for date:", dateString);
            return "Not available";
        }
        
        // Combine: "3:45 PM November 3, 2025" -> "3:45 p.m. November 3, 2025"
        const combined = `${timeStr} ${dateStr}`;
        return combined
            .replace(/\bAM\b/gi, "a.m.")
            .replace(/\bPM\b/gi, "p.m.");
    } catch (e) {
        console.error("Error formatting database time:", e, dateString);
        return "Not available";
    }
}







// Create statistics section
function createStats(allIssues) {
    const stats = document.createElement("div");
    stats.className = "layer-stats";
    
    // Validate allIssues parameter
    if (!allIssues || !Array.isArray(allIssues)) {
        console.warn("createStats: allIssues is not a valid array:", allIssues);
        stats.innerHTML = `
            <div style="font-size: 11px; color: #888; margin-bottom: 2px;">
                Total requests in dataset: Loading...<br>
                Requests within city limits: 0<br>
                Last updated: Loading...
            </div>
        `;
        return stats;
    }
    
    // Count requests within city limits
    const withinCityLimits = allIssues.filter(issue => issue.within_city_limits === 1).length;
    
    // Fetch database update time and total count
    let totalCount = allIssues.length;
    let formattedDbTime = "Loading...";
    
    // Fetch database update time
    fetch("/api/last-sync")
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error("Last sync API error");
        })
        .then(data => {
            if (data && data.last_sync_time) {
                const formatted = formatDatabaseTime(data.last_sync_time);
                if (formatted && formatted !== "Not available") {
                    formattedDbTime = formatted;
                } else {
                    console.warn("Could not format database time:", data.last_sync_time);
                    formattedDbTime = "Not available";
                }
                updateStatsDisplay();
            }
        })
        .catch(error => {
            console.warn("Could not fetch database update time:", error);
            formattedDbTime = "Not available";
            updateStatsDisplay();
        });
    
    // Fetch total count from stats API
    fetch("/api/issues/stats")
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error("Stats API error");
        })
        .then(statsData => {
            totalCount = statsData.total_issues || allIssues.length;
            updateStatsDisplay();
        })
        .catch(error => {
            console.warn("Could not fetch total count from stats API, using current count:", error);
            updateStatsDisplay();
        });
    
    // Function to update the display
    function updateStatsDisplay() {
        stats.innerHTML = `
            <div style="font-size: 11px; color: #888; margin-bottom: 2px;">
                Total requests in dataset: ${totalCount.toLocaleString()}<br>
                Requests within city limits: ${withinCityLimits.toLocaleString()}<br>
                Last updated ${formattedDbTime}
            </div>
        `;
    }
    
    // Set initial display
    updateStatsDisplay();
    
    return stats;
}





// Create select all/none links
function createSelectAllNoneLinks(categories, type) {
    const selectDiv = document.createElement('div');
    selectDiv.style.cssText = 'font-size: 10px; color: #888; margin: 4px 0 6px 0; text-align: left; font-weight: normal;';
    
    const selectAll = document.createElement('a');
    selectAll.href = '#';
    selectAll.textContent = 'Select all';
    selectAll.style.cssText = 'color: #888; text-decoration: none; margin-right: 8px; font-weight: normal;';
    
    const selectNone = document.createElement('a');
    selectNone.href = '#';
    selectNone.textContent = 'Select none';
    selectNone.style.cssText = 'color: #888; text-decoration: none; font-weight: normal;';
    
    selectAll.addEventListener('click', async function(e) {
        e.preventDefault();
        categories.forEach(config => {
            if (config.name === "Other") {
                // Handle "Other" category specially - select all subcategories
                if (!config.visible) {
                    config.subCategories.forEach(subConfig => {
                        if (typeof window.selectedCategories !== 'undefined') {
                            window.selectedCategories.add(subConfig.name);
                        }
                    });
                    config.visible = true;
                    const checkbox = document.getElementById(`layer-${config.name.replace(/\s+/g, '-')}`);
                    if (checkbox) checkbox.checked = true;
                }
            } else {
                // Handle regular categories
                if (!config.visible) {
                    if (typeof window.selectedCategories !== 'undefined') {
                        window.selectedCategories.add(config.name);
                    }
                    config.visible = true;
                    const checkbox = document.getElementById(`layer-${config.name.replace(/\s+/g, '-')}`);
                    if (checkbox) checkbox.checked = true;
                }
            }
        });
        if (typeof updateCompositeHeatmap === 'function') {
            window.updateCompositeHeatmap();
        }
        
        // Refresh photo layer if it's currently visible
        const photoCheckbox = document.getElementById('photo-layer-checkbox');
        if (photoCheckbox && photoCheckbox.checked && typeof createPhotoLayer === 'function') {
            await window.createPhotoLayer();
        }
    });
    
    selectNone.addEventListener('click', async function(e) {
        e.preventDefault();
        categories.forEach(config => {
            if (config.name === "Other") {
                // Handle "Other" category specially - deselect all subcategories
                if (config.visible) {
                    config.subCategories.forEach(subConfig => {
                        if (typeof window.selectedCategories !== 'undefined') {
                            window.selectedCategories.delete(subConfig.name);
                        }
                    });
                    config.visible = false;
                    const checkbox = document.getElementById(`layer-${config.name.replace(/\s+/g, '-')}`);
                    if (checkbox) checkbox.checked = false;
                }
            } else {
                // Handle regular categories
                if (config.visible) {
                    if (typeof window.selectedCategories !== 'undefined') {
                        window.selectedCategories.delete(config.name);
                    }
                    config.visible = false;
                    const checkbox = document.getElementById(`layer-${config.name.replace(/\s+/g, '-')}`);
                    if (checkbox) checkbox.checked = false;
                }
            }
        });
        if (typeof updateCompositeHeatmap === 'function') {
            window.updateCompositeHeatmap();
        }
        
        // Refresh photo layer if it's currently visible
        const photoCheckbox = document.getElementById('photo-layer-checkbox');
        if (photoCheckbox && photoCheckbox.checked && typeof createPhotoLayer === 'function') {
            await window.createPhotoLayer();
        }
    });
    
    selectDiv.appendChild(selectAll);
    selectDiv.appendChild(selectNone);
    
    return selectDiv;
}

// Create boundary layer controls
function createBoundaryLayerControls() {
    const boundaryDiv = document.createElement('div');
    boundaryDiv.className = 'boundary-section';
    
    // Boundary section header
    const boundaryHeader = document.createElement('div');
    boundaryHeader.className = 'group-header';
    boundaryHeader.textContent = 'Boundary Layers';
    boundaryDiv.appendChild(boundaryHeader);
    
    // Define boundary layers
    const boundaryLayers = [
        { name: 'City boundary', filename: 'city_limits', color: 'magenta', visible: true },
        { name: 'Community Boundaries', filename: 'community', color: 'cyan', visible: true },
        { name: 'Community Labels', filename: 'community', color: 'cyan', visible: true, labels: true },
        { name: 'Neighborhood Boundaries', filename: 'neighborhoods', color: 'white', visible: true },
        { name: 'Neighborhood Labels', filename: 'neighborhoods', color: 'white', visible: true, labels: true },
        { name: 'Census ZCTA (ZIP) 2023', filename: 'zcta_boundaries', color: 'orange', visible: false, labels: true },
    ];
    
    // Create select all/none links for boundary layers
    const boundarySelectDiv = document.createElement('div');
    boundarySelectDiv.style.cssText = 'font-size: 10px; color: #888; margin: 4px 0 6px 0; text-align: left; font-weight: normal;';
    
    const selectAllBoundary = document.createElement('a');
    selectAllBoundary.href = '#';
    selectAllBoundary.textContent = 'Select all';
    selectAllBoundary.style.cssText = 'color: #888; text-decoration: none; font-weight: normal; margin-right: 8px;';
    
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
                layerInfo.layer.addTo(map);
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
                map.removeLayer(layerInfo.layer);
                const checkbox = document.getElementById(`boundary-${layerConfig.name.replace(/\s+/g, '-')}`);
                if (checkbox) checkbox.checked = false;
            }
        });
    });
    
    boundarySelectDiv.appendChild(selectAllBoundary);
    boundarySelectDiv.appendChild(selectNoneBoundary);
    boundaryDiv.appendChild(boundarySelectDiv);
    
    // Create boundary layer checkboxes
    boundaryLayers.forEach(layerConfig => {
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
        boundaryDiv.appendChild(layerDiv);
        
        // Event listener for checkbox
        checkbox.addEventListener('change', function() {
            const layerName = layerConfig.name;
            const layerInfo = window.boundaryLayers[layerName];
            
            if (this.checked) {
                if (layerInfo) {
                    layerInfo.layer.addTo(map);
                    layerInfo.visible = true;
                    console.log(`Added ${layerName} boundary layer to map`);
                } else {
                    console.warn(`Boundary layer ${layerName} not found in window.boundaryLayers`);
                }
            } else {
                if (layerInfo) {
                    map.removeLayer(layerInfo.layer);
                    layerInfo.visible = false;
                    console.log(`Removed ${layerName} boundary layer from map`);
                } else {
                    console.warn(`Boundary layer ${layerName} not found in window.boundaryLayers`);
                }
            }
            
            // Ensure city boundary is always on top after boundary layer changes
            if (window.boundaryLayers && window.boundaryLayers['City boundary'] && window.boundaryLayers['City boundary'].visible) {
                window.boundaryLayers['City boundary'].layer.bringToFront();
            }
        });
    });
    
    return boundaryDiv;
}

// Create the actual boundary layers
async function createBoundaryLayers() {
    // Initialize boundaryLayers if it doesn't exist
    if (typeof window.boundaryLayers === 'undefined') {
        window.boundaryLayers = {};
    }
    
    const boundaryLayers = [
        { name: 'City boundary', filename: 'city_limits', color: 'magenta', visible: true },
        { name: 'Community Boundaries', filename: 'community', color: 'cyan', visible: true },
        { name: 'Community Labels', filename: 'community', color: 'cyan', visible: true, labels: true },
        { name: 'Neighborhood Boundaries', filename: 'neighborhoods', color: 'white', visible: true },
        { name: 'Neighborhood Labels', filename: 'neighborhoods', color: 'white', visible: true, labels: true },
        { name: 'Census ZCTA (ZIP) 2023', filename: 'zcta_boundaries', color: 'orange', visible: false, labels: true },
    ];
    
    console.log('Creating boundary layers...');
    
    for (const layerConfig of boundaryLayers) {
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
                                opacity: 0.5,
                                fill: false,
                                className: "multiply-blend",
                                zIndex: 10
                            };
                        }
                    });
                    layer.addLayer(boundaryLayer);
                }
                
                // Add labels for each feature
                geojsonData.features.forEach(feature => {
                    let latlng;
                    if (typeof turf !== 'undefined' && turf.centroid) {
                        const centroid = turf.centroid(feature);
                        latlng = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
                    } else {
                        // Fallback: use simple center calculation
                        const bounds = L.geoJSON(feature).getBounds();
                        const center = bounds.getCenter();
                        latlng = [center.lat, center.lng];
                    }
                    
                    // Position labels appropriately
                    if (layerConfig.name === 'Community Labels') {
                        const bounds = L.geoJSON(feature).getBounds();
                        const center = bounds.getCenter();
                        latlng = [center.lat, center.lng];
                    } else if (layerConfig.name === 'Neighborhood Labels') {
                        latlng[0] -= 0.002;
                        latlng[1] -= 0.001;
                    } else if (layerConfig.name === 'Census ZCTA (ZIP) 2023') {
                        const bounds = L.geoJSON(feature).getBounds();
                        const center = bounds.getCenter();
                        latlng = [center.lat, center.lng];
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
                                white-space: nowrap;
                                pointer-events: none;
                                z-index: 1000;
                            ">${feature.properties.name || feature.properties.NAME || feature.properties.ZCTA5CE10 || 'Unknown'}</div>`,
                            iconSize: [0, 0],
                            iconAnchor: [0, 0]
                        })
                    });
                    
                    layer.addLayer(labelMarker);
                });
            } else {
                // Create boundary layer with styling
                layer = L.geoJson(geojsonData, {
                    style: function(feature) {
                        if (layerConfig.name === "City boundary") {
                            return {
                                color: "magenta",
                                fillColor: "transparent",
                                weight: 4.0,
                                opacity: 1.0,
                                fillOpacity: 0,
                                className: "city-boundary-shadow multiply-blend",
                                zIndex: 1000
                            };
                        } else if (layerConfig.name === 'Community Boundaries') {
                            return {
                                color: 'cyan',
                                weight: 4.0,
                                opacity: 0.8,
                                fill: false,
                                className: "multiply-blend",
                                zIndex: 100
                            };
                        } else if (layerConfig.name === 'Neighborhood Boundaries') {
                            return {
                                color: 'white',
                                weight: 1,
                                opacity: 0.6,
                                fill: false,
                                className: "multiply-blend",
                                zIndex: 50
                            };
                        } else if (layerConfig.name === 'Census ZCTA (ZIP) 2023') {
                            return {
                                color: 'orange',
                                weight: 2,
                                opacity: 0.5,
                                fill: false,
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
                layer.addTo(map);
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
    
    console.log('Boundary layers created:', Object.keys(window.boundaryLayers));
}

// Create individual category item
function createCategoryItem(config, container) {
    const item = document.createElement('div');
    item.className = 'layer-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer-${config.name.replace(/\s+/g, '-')}`;
    checkbox.checked = config.visible;
    checkbox.classList.add('link-cursor');
    
    const label = document.createElement('label');
    label.htmlFor = `layer-${config.name.replace(/\s+/g, '-')}`;
    label.textContent = `${config.name} (${config.count.toLocaleString()})`;
    label.classList.add('link-cursor');
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    // Event listener for checkbox
    checkbox.addEventListener('change', async function() {
        const categoryName = config.name;
        
        if (categoryName === "Other") {
            // Handle "Other" category specially
            if (this.checked) {
                config.subCategories.forEach(subConfig => {
                    if (typeof window.selectedCategories !== 'undefined') {
                        window.selectedCategories.add(subConfig.name);
                    }
                });
                config.visible = true;
            } else {
                config.subCategories.forEach(subConfig => {
                    if (typeof window.selectedCategories !== 'undefined') {
                        window.selectedCategories.delete(subConfig.name);
                    }
                });
                config.visible = false;
            }
        } else {
            // Handle regular categories
            if (this.checked) {
                // Ensure selectedCategories exists
                if (typeof window.selectedCategories === 'undefined') {
                    window.selectedCategories = new Set();
                }
                window.selectedCategories.add(categoryName);
                config.visible = true;
                console.log(`Added ${categoryName} to selected categories. Total: ${window.selectedCategories.size}`);
            } else {
                // Ensure selectedCategories exists
                if (typeof window.selectedCategories === 'undefined') {
                    window.selectedCategories = new Set();
                }
                window.selectedCategories.delete(categoryName);
                config.visible = false;
                console.log(`Removed ${categoryName} from selected categories. Total: ${window.selectedCategories.size}`);
            }
        }
        
        // Update heatmap with new selection
        if (typeof updateCompositeHeatmap === 'function') {
            console.log('Calling updateCompositeHeatmap from simplified layer control checkbox');
            window.updateCompositeHeatmap();
        } else {
            console.warn('updateCompositeHeatmap function not found');
        }
        
        // Refresh photo layer if it's currently visible
        const photoCheckbox = document.getElementById('photo-layer-checkbox');
        if (photoCheckbox && photoCheckbox.checked && typeof createPhotoLayer === 'function') {
            await window.createPhotoLayer();
        }
    });
    
    return item;
}

// Set initial state
function setInitialState(controlDiv, contentContainer) {
    const toggleControl = document.getElementById('layer-toggle-control');
    const collapsibleContent = document.getElementById('collapsible-content');
    
    if (!toggleControl || !contentContainer || !collapsibleContent) {
        console.warn('Required elements not found for initial state setup');
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile: collapsed by default
        collapsibleContent.classList.remove("expanded", "default");
        collapsibleContent.classList.add("collapsed");
        toggleControl.style.display = "block";
        toggleControl.innerHTML = '+';
        // Set collapsed height
        controlDiv.classList.add('collapsed');
        controlDiv.style.setProperty('max-height', '50px', 'important');
        controlDiv.style.setProperty('height', '50px', 'important');
        controlDiv.style.setProperty('overflow', 'hidden', 'important');
    } else {
        // Desktop: expanded by default
        collapsibleContent.classList.remove("expanded", "collapsed");
        collapsibleContent.classList.add("expanded");
        toggleControl.style.display = "block";
        toggleControl.innerHTML = '−';
        // Set expanded height
        controlDiv.style.setProperty('max-height', '70vh', 'important');
        controlDiv.style.setProperty('height', 'auto', 'important');
        controlDiv.style.setProperty('overflow', 'visible', 'important');
    }
    
    // Simple resize handler that doesn't conflict with main app
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only update if the control exists and is visible
            if (controlDiv && controlDiv.parentNode) {
                const isMobile = window.innerWidth <= 768;
                const collapsibleContent = document.getElementById('collapsible-content');
                const toggleControl = document.getElementById('layer-toggle-control');
                
                if (collapsibleContent && toggleControl) {
                    if (isMobile) {
                        // Mobile: collapsed by default
                        collapsibleContent.classList.remove("expanded");
                        collapsibleContent.classList.add("collapsed");
                        controlDiv.classList.add('collapsed');
                        toggleControl.style.display = "block";
                        toggleControl.innerHTML = '+';
                        // Set mobile positioning
                        controlDiv.style.setProperty('top', '200px', 'important');
                        controlDiv.style.setProperty('left', '20px', 'important');
                        controlDiv.style.setProperty('right', '20px', 'important');
                        controlDiv.style.setProperty('width', 'auto', 'important');
                        controlDiv.style.setProperty('max-width', 'none', 'important');
                        // Set collapsed height
                        controlDiv.style.setProperty('max-height', '50px', 'important');
                        controlDiv.style.setProperty('height', '50px', 'important');
                        controlDiv.style.setProperty('overflow', 'hidden', 'important');
                    } else {
                        // Desktop: expanded by default
                        collapsibleContent.classList.remove("collapsed");
                        collapsibleContent.classList.add("expanded");
                        controlDiv.classList.remove("collapsed");
                        toggleControl.style.display = "block";
                        toggleControl.innerHTML = '−';
                        // Reset to default desktop positioning and styling
                        controlDiv.style.removeProperty('top');
                        controlDiv.style.removeProperty('left');
                        controlDiv.style.removeProperty('right');
                        controlDiv.style.removeProperty('width');
                        controlDiv.style.removeProperty('max-width');
                        // Set expanded height
                        controlDiv.style.setProperty('max-height', '70vh', 'important');
                        controlDiv.style.setProperty('height', 'auto', 'important');
                        controlDiv.style.setProperty('overflow', 'visible', 'important');
                    }
                }
            }
        }, 100); // 100ms debounce
    };
    
    window.addEventListener('resize', handleResize);

    // Update heatmap after initial setup
    if (typeof window.updateCompositeHeatmap === 'function') {
        console.log('Calling updateCompositeHeatmap from setInitialState');
        window.updateCompositeHeatmap();
    } else {
        console.warn('updateCompositeHeatmap function not found in setInitialState');
    }
}

// Export for use
console.log('Simplified layer control script loaded');
window.initSimplifiedLayerControl = initSimplifiedLayerControl;
console.log('initSimplifiedLayerControl exported:', typeof window.initSimplifiedLayerControl);
// Local boundary layer controls function
function createLocalBoundaryLayerControls(mapInstance) {
    const boundaryDiv = document.createElement('div');
    boundaryDiv.className = 'boundary-section';
    
    // Boundary section header
    const boundaryHeader = document.createElement('div');
    boundaryHeader.className = 'group-header';
    boundaryHeader.style.cssText = 'font-size: 11px; font-weight: bold; color: #fff; margin: 8px 0 4px 0; padding: 2px 0; border-bottom: 1px solid #333;';
    boundaryHeader.textContent = 'Boundary Layers';
    boundaryDiv.appendChild(boundaryHeader);
    
    // Create checkboxes for each boundary layer
    const boundaryLayers = [
        { name: 'City boundary', filename: 'city_limits', color: 'magenta', visible: true },
        { name: 'Community Boundaries', filename: 'community', color: 'cyan', visible: true },
        { name: 'Community Labels', filename: 'community', color: 'cyan', visible: true, labels: true },
        { name: 'Neighborhood Boundaries', filename: 'neighborhoods', color: 'white', visible: true },
        { name: 'Neighborhood Labels', filename: 'neighborhoods', color: 'white', visible: true, labels: true },
        { name: 'Census ZCTA (ZIP) 2023', filename: 'zcta_boundaries', color: 'orange', visible: false, labels: true },
    ];
    
    boundaryLayers.forEach(layer => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        layerDiv.style.cssText = 'display: flex; align-items: center; margin: 2px 0; font-size: 10px;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `boundary-${layer.name.replace(/\s+/g, '-')}`;
        checkbox.checked = layer.visible;
        checkbox.style.marginRight = '6px';
        
        const label = document.createElement('label');
        label.htmlFor = `boundary-${layer.name.replace(/\s+/g, '-')}`;
        label.textContent = layer.name;
        label.style.cssText = 'color: #ccc; cursor: pointer; flex: 1;';
        
        // Add event listener for boundary layer checkboxes
        checkbox.addEventListener('change', function() {
            const layerName = layer.name;
            console.log('Boundary layer checkbox changed:', layerName, 'checked:', this.checked);
            
            if (this.checked) {
                // Try to add the layer if it exists in window.boundaryLayers
                if (window.boundaryLayers && window.boundaryLayers[layerName]) {
                    const layerInfo = window.boundaryLayers[layerName];
                    if (layerInfo && layerInfo.layer) {
                        layerInfo.layer.addTo(mapInstance);
                        layerInfo.visible = true;
                        console.log(`Added ${layerName} boundary layer to map`);
                    }
                } else {
                    console.warn(`Boundary layer ${layerName} not found in window.boundaryLayers`);
                }
            } else {
                // Try to remove the layer if it exists
                if (window.boundaryLayers && window.boundaryLayers[layerName]) {
                    const layerInfo = window.boundaryLayers[layerName];
                    if (layerInfo && layerInfo.layer) {
                         mapInstance.removeLayer(layerInfo.layer);
                        layerInfo.visible = false;
                        console.log(`Removed ${layerName} boundary layer from map`);
                    }
                } else {
                    console.warn(`Boundary layer ${layerName} not found in window.boundaryLayers`);
                }
            }
        });
        
        layerDiv.appendChild(checkbox);
        layerDiv.appendChild(label);
        boundaryDiv.appendChild(layerDiv);
    });
    
    return boundaryDiv;
}
