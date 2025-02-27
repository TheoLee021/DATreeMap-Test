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
        fetch(TREE_DATA_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(geojsonData => {
                console.log("API 응답:", geojsonData);
                displayTreesFromGeoJSON(geojsonData);
            })
            .catch(error => {
                console.error('Error loading API data:', error);
                // 오류 상황 대응 코드
            });
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
                name: "North Campus",
                polygon: [
                    [37.318, -122.045215],
                    [37.322753, -122.045215], 
                    [37.322745, -122.04157],
                    [37.318, -122.04157]
                ],
                style: {
                    className: 'custom-cluster custom-cluster-north',
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
            
            // 디버깅을 위해 속성 로깅
            console.log("마커 생성 시 속성:", properties);
            
            // 기존 코드로 복원
            const tagNumber = properties.tag_number || properties.tag_id || properties.id || properties.tree_id || 'N/A';
            
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
                        <div><span style="background-color: #0b6a3c"></span> North Campus</div>
                        <div><span style="background-color: #006633"></span> South Campus</div>
                    </div>
                </div>`;
            return div;
        };
        
        legend.addTo(map);
    }
});

// Function to view tree details
function viewTreeDetails(tagNumber) {
    console.log(`Viewing details for tree Tag #${tagNumber}`);
    
    fetch(TREE_DETAIL_URL + tagNumber + '/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(treeData => {
            // Create detailed information string
            let detailsHtml = '<div style="max-height: 300px; overflow-y: auto;">';
            detailsHtml += `<h2>${treeData.common_name}</h2>`;
            detailsHtml += `<p><strong>Botanical Name:</strong> ${treeData.botanical_name || 'N/A'}</p>`;
            detailsHtml += `<p><strong>Tag #:</strong> ${treeData.tag_number}</p>`;
            detailsHtml += `<p><strong>Health:</strong> ${treeData.health || 'N/A'}</p>`;
            detailsHtml += `<p><strong>Diameter:</strong> ${treeData.diameter || 'N/A'}</p>`;
            detailsHtml += `<p><strong>Height:</strong> ${treeData.height || 'N/A'}</p>`;
            
            if (treeData.crown_height) {
                detailsHtml += `<p><strong>Crown Height:</strong> ${treeData.crown_height}</p>`;
            }
            if (treeData.crown_spread) {
                detailsHtml += `<p><strong>Crown Spread:</strong> ${treeData.crown_spread}</p>`;
            }
            if (treeData.last_update) {
                detailsHtml += `<p><strong>Last Updated:</strong> ${treeData.last_update}</p>`;
            }
            if (treeData.notes) {
                detailsHtml += `<p><strong>Notes:</strong> ${treeData.notes}</p>`;
            }
            detailsHtml += '</div>';
            
            // Create a modal or use alert for simplicity
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
            modal.style.zIndex = '1000';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            
            const modalContent = document.createElement('div');
            modalContent.style.width = '60%';
            modalContent.style.maxWidth = '500px';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '5px';
            modalContent.style.position = 'relative';
            
            const closeButton = document.createElement('button');
            closeButton.innerText = 'X';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '10px';
            closeButton.style.border = 'none';
            closeButton.style.background = 'none';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = function() {
                document.body.removeChild(modal);
            };
            
            modalContent.innerHTML = detailsHtml;
            modalContent.appendChild(closeButton);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
        })
        .catch(error => {
            console.error('Error fetching tree details:', error);
            alert(`Error loading details for tree Tag #${tagNumber}`);
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