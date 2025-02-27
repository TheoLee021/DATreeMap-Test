// 파일 상단에 추가
const TREE_DETAIL_URL = '/api/rest/trees/';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize map with lower zoom level
    const map = L.map('map', {
        maxZoom: 20
    }).setView([37.31930349325796, -122.04499476044137], 16);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20
    }).addTo(map);
    
    // Zoom levels definition
    const ZOOM_LEVELS = {
        COMBINED: 17,     // Below 17: Show combined view
        SEPARATE: 17,     // 17 and above: Show separate areas
        MARKERS_ONLY: 18  // 18 and above: Show markers only, no areas
    };
    
    // Change tree icon to a simple green circle
    const treeIcon = L.divIcon({
        className: 'tree-marker',
        html: '<div class="tree-dot"></div>',
        iconSize: [12, 12]
    });
    
    // Load tree data from API
    loadTreesFromAPI();
    
    // Function to load tree data from API
    function loadTreesFromAPI() {
        // Change to DRF API URL
        const apiUrl = '/api/rest/trees/';
        // const apiUrl = TREE_DATA_URL;  // Previous URL commented out
        
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(geojsonData => {
                // DRF API may respond with a different format
                const finalData = apiUrl.includes('/rest/') ? processDrfResponse(geojsonData) : geojsonData;
                // const finalData = geojsonData;  // Previous format commented out
                
                console.log("API response:", finalData);
                displayTreesFromGeoJSON(finalData);
            })
            .catch(error => {
                console.error('Error loading API data:', error);
                // Error handling
            });
    }
    
    // DRF response processing helper function (to be used later)
    function processDrfResponse(response) {
        return response;
    }
    
    // Declare global variables
    let combinedCluster = null;
    let areaClusters = {};
    let defaultCluster = null;
    const ZOOM_THRESHOLD = 15;

    // Common cluster options - remove duplicate code
    function getClusterOptions(radius = 500, customIconFunction) {
        return {
            disableClusteringAtZoom: ZOOM_LEVELS.MARKERS_ONLY,
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            maxClusterRadius: radius,
            animate: false,
            animateAddingMarkers: false,
            iconCreateFunction: customIconFunction
        };
    }

    // Display trees from GeoJSON with clustering
    function displayTreesFromGeoJSON(geojson) {
        // Define cluster areas
        const clusterAreas = [
            {
                name: "West Campus",
                polygon: [
                    [37.318, -122.048],
                    [37.322719, -122.049764],
                    [37.322753, -122.045215],
                    [37.318, -122.045215]
                ],
                style: {
                    className: 'custom-cluster custom-cluster-west',
                    color: '#1B5E20',
                    fillColor: '#1B5E20'
                }
            },
            {
                name: "East Campus",
                polygon: [
                    [37.318, -122.045215],
                    [37.322753, -122.045215], 
                    [37.322745, -122.04157],
                    [37.318, -122.04157]
                ],
                style: {
                    className: 'custom-cluster custom-cluster-east',
                    color: '#0b6a3c',
                    fillColor: '#0b6a3c'
                }
            },
            {
                name: "South Campus",
                polygon: [
                    [37.315603, -122.046578],
                    [37.318, -122.048],
                    [37.318, -122.04157],
                    [37.315603, -122.04157]
                ],
                style: {
                    className: 'custom-cluster custom-cluster-south',
                    color: '#006633',
                    fillColor: '#006633'
                }
            }
        ];

        // Combined area covering the entire campus
        const combinedArea = {
            name: "De Anza College",
            polygon: [
                [37.315603, -122.046578],
                [37.318, -122.048],
                [37.322753, -122.049764],
                [37.322753, -122.04157],
                [37.315603, -122.04157]
            ],
            style: {
                className: 'custom-cluster custom-cluster-combined',
                color: '#1B5E20',
                fillColor: '#1B5E20'
            }
        };

        // Function to calculate cluster size and style
        function getClusterSizeAndClass(count) {
            let size, sizeClass;
            
            if (count < 100) {
                size = 40;
                sizeClass = 'custom-cluster-small';
            } else if (count < 500) {
                size = 50;
                sizeClass = 'custom-cluster-medium';
            } else {
                size = 60;
                sizeClass = 'custom-cluster-large';
            }
            
            return { size, sizeClass };
        }

        // Function to create area cluster icon
        function createAreaClusterIcon(area) {
            return function(cluster) {
                const count = cluster.getChildCount();
                const { size, sizeClass } = getClusterSizeAndClass(count);
                const className = area.style.className + ' ' + sizeClass;
                
                return L.divIcon({
                    html: `<div>
                            <span class="area-name">${area.name}</span>
                            <span class="cluster-count">${count}</span>
                          </div>`,
                    className: className,
                    iconSize: [size, size]
                });
            };
        }

        // Function to create combined cluster icon
        function createCombinedClusterIcon(cluster) {
            const count = cluster.getChildCount();
            const { size, sizeClass } = getClusterSizeAndClass(count);
            
            return L.divIcon({
                html: `<div>
                        <span class="area-name">${combinedArea.name}</span>
                        <span class="cluster-count">${count}</span>
                      </div>`,
                className: 'custom-cluster custom-cluster-combined ' + sizeClass,
                iconSize: [size, size]
            });
        }

        // Function to create default cluster icon
        function createDefaultClusterIcon(cluster) {
            const count = cluster.getChildCount();
            const { size, sizeClass } = getClusterSizeAndClass(count);
            
            return L.divIcon({
                html: `<div>
                        <span class="area-name">기타</span>
                        <span class="cluster-count">${count}</span>
                      </div>`,
                className: 'custom-cluster custom-cluster-default ' + sizeClass,
                iconSize: [size, size]
            });
        }

        // Function to create polygon style
        function createPolygonStyle(fillColor, opacity = 0.7) {
            return {
                stroke: true,
                color: 'white',
                weight: 1,
                fillColor: fillColor,
                fillOpacity: opacity,
                className: 'area-boundary'
            };
        }

        // Function to create tree marker
        function createTreeMarker(feature) {
            const coords = feature.geometry.coordinates;
            const latlng = L.latLng(coords[1], coords[0]);
            const properties = feature.properties;
            
            // Debug logging for properties and Feature ID
            console.log("Marker creation properties:", properties, "Feature ID:", feature.id);
            
            // Use feature.id as tag_number (important!)
            const tagNumber = feature.id || 'N/A';
            
            const marker = L.marker(latlng, { icon: treeIcon });
            
            // Set popup content
            let popupContent = `
                <h3>${properties.common_name || 'Tree'}</h3>
                <p>Species: ${properties.botanical_name || 'Unknown'}</p>
                <p>Tag #: ${tagNumber}</p>
                <button onclick="viewTreeDetails('${tagNumber}')">View Details</button>
            `;
            marker.bindPopup(popupContent);
            
            return { marker, latlng, properties };
        }

        // Create area polygons
        let areaPolygons = {};
        clusterAreas.forEach(area => {
            areaPolygons[area.name] = L.polygon(
                area.polygon, 
                createPolygonStyle(area.style.fillColor)
            );
        });
        
        let combinedPolygon = L.polygon(
            combinedArea.polygon, 
            createPolygonStyle(combinedArea.style.fillColor)
        );

        // Create cluster groups
        function createClusters() {
            // Initialize
            areaClusters = {};
            const allMarkers = [];
            
            // Create area clusters
            clusterAreas.forEach(area => {
                const options = getClusterOptions(500, createAreaClusterIcon(area));
                options.polygonOptions = {
                    fillColor: area.style.fillColor,
                    color: area.style.color,
                    weight: 3,
                    opacity: 0.5,
                    fillOpacity: 0.5
                };
                
                areaClusters[area.name] = L.markerClusterGroup(options);
            });

            // Create default cluster
            defaultCluster = L.markerClusterGroup(
                getClusterOptions(200, createDefaultClusterIcon)
            );

            // Create markers and add them to the appropriate cluster
            geojson.features.forEach(feature => {
                const { marker, latlng } = createTreeMarker(feature);
                allMarkers.push(marker);
                
                // Add marker to the appropriate area cluster
                let added = false;
                for (const area of clusterAreas) {
                    if (isMarkerInsidePolygon(latlng, area.polygon)) {
                        areaClusters[area.name].addLayer(marker);
                        added = true;
                        break;
                    }
                }
                
                // Add marker to the default cluster if it doesn't belong to any area
                if (!added) {
                    defaultCluster.addLayer(marker);
                }
            });
            
            // Create combined cluster
            combinedCluster = L.markerClusterGroup(
                getClusterOptions(500, createCombinedClusterIcon)
            );
            
            // Add all markers to the combined cluster
            allMarkers.forEach(marker => {
                combinedCluster.addLayer(marker);
            });
            
            // Add all clusters to the map initially
            combinedCluster.addTo(map);
            for (const areaName in areaClusters) {
                areaClusters[areaName].addTo(map);
            }
            if (defaultCluster) defaultCluster.addTo(map);
        }

        // Function to update map visibility based on zoom level
        function updateMapVisibility(zoomLevel) {
            // Debug log
            console.log("Updating visibility for zoom level:", zoomLevel);
            
            // Zoom level 18 or above: Show markers only
            if (zoomLevel >= ZOOM_LEVELS.MARKERS_ONLY) {
                // Hide all area polygons
                hideLayer(combinedPolygon);
                hideAllLayers(areaPolygons);
                
                // Show individual clusters only
                hideLayer(combinedCluster);
                showAllLayers(areaClusters);
                showLayer(defaultCluster);
            }
            // Zoom level 17~18: Show individual areas + clusters
            else if (zoomLevel >= ZOOM_LEVELS.SEPARATE) {
                // Show individual areas, hide combined area
                hideLayer(combinedPolygon);
                showAllLayers(areaPolygons);
                
                // Show individual clusters, hide combined cluster
                hideLayer(combinedCluster);
                showAllLayers(areaClusters);
                showLayer(defaultCluster);
            } 
            // Zoom level below 17: Show combined area + clusters
            else {
                // Show combined area, hide individual areas
                showLayer(combinedPolygon);
                hideAllLayers(areaPolygons);
                
                // Show combined cluster, hide individual clusters
                showLayer(combinedCluster);
                hideAllLayers(areaClusters);
                hideLayer(defaultCluster);
            }
        }
        
        // Function to show/hide layers
        function showLayer(layer) {
            if (layer && !map.hasLayer(layer)) {
                map.addLayer(layer);
            }
        }
        
        function hideLayer(layer) {
            if (layer && map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }
        
        function showAllLayers(layerCollection) {
            for (const name in layerCollection) {
                showLayer(layerCollection[name]);
            }
        }
        
        function hideAllLayers(layerCollection) {
            for (const name in layerCollection) {
                hideLayer(layerCollection[name]);
            }
        }
        
        // Initialize clusters and set up events
        createClusters();
        updateMapVisibility(map.getZoom());
        
        // Zoom level change event
        map.on('zoomend', function() {
            updateMapVisibility(map.getZoom());
        });
        
        // Add legend
        treeCount = geojson.features.length;
        addLegend(treeCount);
    }
    
    // Add legend function
    function addLegend(treeCount) {
        const legend = L.control({ position: 'bottomleft' });
        
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <div style="padding: 6px 8px; background: white; background: rgba(255,255,255,0.8); box-shadow: 0 0 15px rgba(0,0,0,0.2); border-radius: 5px;">
                    <h4>Tree Map</h4>
                    <p>Total Trees: <strong>${treeCount}</strong></p>
                    <div class="legend-areas">
                        <div><span style="background-color: #1B5E20"></span> West Campus</div>
                        <div><span style="background-color: #0b6a3c"></span> East Campus</div>
                        <div><span style="background-color: #006633"></span> South Campus</div>
                    </div>
                </div>`;
            return div;
        };
        
        legend.addTo(map);
    }
});

/**
 * Function to view tree details
 * @param {number} tagNumber - Tree tag number
 */
function viewTreeDetails(tagNumber) {
    console.log("Tree details requested for tag:", tagNumber); // Debug log
    
    // Use DRF API detailed info endpoint
    fetch(TREE_DETAIL_URL + tagNumber + '/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(treeData => {
            console.log("Tree data received:", treeData); // Debug log
            
            // Since id is tag_number, check feature.id as well
            const properties = treeData.properties || treeData;
            const tagNumber = treeData.id || properties.tag_number;
            
            // Add tag_number if it doesn't exist
            if (!properties.tag_number && treeData.id) {
                properties.tag_number = treeData.id;
            }
            
            displayTreeDetails(properties);
        })
        .catch(error => {
            console.error('Error fetching tree details:', error);
            alert(`Error loading details for tree Tag #${tagNumber}`);
        });
}

/**
 * Function to display tree details modal
 * @param {object} treeData - Tree data object
 */
function displayTreeDetails(treeData) {
    // If existing modal exists, remove it (prevent duplicates)
    const existingModal = document.querySelector('.tree-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'tree-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'tree-modal-title');
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'tree-modal-content';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tree-modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close dialog');
    closeButton.onclick = function() {
        document.body.removeChild(modal);
    };
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    });
    
    // Generate tree info HTML
    let detailsHtml = '<div class="tree-details">';
    detailsHtml += `<h2 id="tree-modal-title">${treeData.common_name || 'Unknown Tree'}</h2>`;
    
    if (treeData.botanical_name) {
        detailsHtml += `<p class="botanical-name"><em>${treeData.botanical_name}</em></p>`;
    }
    
    // Create tree attributes table
    detailsHtml += '<table class="tree-attributes">';
    detailsHtml += `<tr><th>Tag #:</th><td>${treeData.tag_number}</td></tr>`;
    
    if (treeData.height) {
        detailsHtml += `<tr><th>Height:</th><td>${treeData.height}</td></tr>`;
    }
    if (treeData.diameter) {
        detailsHtml += `<tr><th>Diameter:</th><td>${treeData.diameter}</td></tr>`;
    }
    if (treeData.crown_spread) {
        detailsHtml += `<tr><th>Crown Spread:</th><td>${treeData.crown_spread}</td></tr>`;
    }
    if (treeData.last_update) {
        detailsHtml += `<tr><th>Last Updated:</th><td>${treeData.last_update}</td></tr>`;
    }
    detailsHtml += '</table>';
    
    if (treeData.notes) {
        detailsHtml += `<div class="tree-notes"><h3>Expert's Notes:</h3><p>${treeData.notes}</p></div>`;
    }
    
    detailsHtml += '</div>';
    
    // Add content to modal
    modalContent.innerHTML = detailsHtml;
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Open modal animation
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Close modal on outside click
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Function to check if a marker is inside a polygon
function isMarkerInsidePolygon(latlng, polygonPoints) {
    const polygon = L.polygon(polygonPoints);
    const polyBounds = polygon.getBounds();
    
    if (!polyBounds.contains(latlng)) {
        return false;
    }
    
    // Ray-casting algorithm for accurate interior determination
    // Accurately determines if a point is inside even complex polygons
    let inside = false;
    const x = latlng.lng;
    const y = latlng.lat;
    
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
        const xi = polygonPoints[i][1], yi = polygonPoints[i][0];
        const xj = polygonPoints[j][1], yj = polygonPoints[j][0];
        
        const intersect = ((yi > y) !== (yj > y)) && 
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
    }
    
    return inside;
}