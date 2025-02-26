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
    
    // 트리 아이콘을 심플한 초록색 원으로 변경
    const treeIcon = L.divIcon({
        className: 'tree-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -6],
        html: '<div class="tree-dot"></div>'
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
                displayTreesFromGeoJSON(geojsonData);
            })
            .catch(error => {
                console.error('Error loading API data:', error);
                // Fallback to sample data
                displaySampleTrees();
            });
    }
    
    // 전역 변수 선언
    let combinedCluster = null;
    let areaClusters = {};
    let defaultCluster = null;
    const ZOOM_THRESHOLD = 15;

    // Display trees from GeoJSON with clustering
    function displayTreesFromGeoJSON(geojson) {
        // 클러스터 영역 정의
        const clusterAreas = [
            {
                name: "서쪽 캠퍼스",
                polygon: [
                    [37.318, -122.048],  // 첫 번째 꼭지점
                    [37.322719, -122.049764],  // 두 번째 꼭지점
                    [37.322753, -122.045215],  // 세 번째 꼭지점
                    [37.318, -122.045215]   // 네 번째 꼭지점
                ],
                style: {
                    className: 'custom-cluster custom-cluster-west',
                    color: '#388E3C',
                    fillColor: '#66BB6A'
                }
            },
            {
                name: "북쪽 캠퍼스",
                polygon: [
                    [37.318, -122.045215],
                    [37.322753, -122.045215], 
                    [37.322745, -122.04157],
                    [37.318, -122.04157]
                ],
                style: {
                    className: 'custom-cluster custom-cluster-north',
                    color: '#1976D2',
                    fillColor: '#2196F3'
                }
            },
            {
                name: "남쪽 캠퍼스",
                polygon: [
                    [37.315603, -122.046578],
                    [37.318, -122.048],
                    [37.318, -122.04157],
                    [37.315603, -122.04157]
                ],
                style: {
                    className: 'custom-cluster custom-cluster-south',
                    color: '#E64A19',
                    fillColor: '#FF5722'
                }
            }
        ];

        // 각 영역을 지도에 시각적으로 표시 (선택 사항)
        clusterAreas.forEach(area => {
            L.polygon(area.polygon, {
                color: area.style.color,
                weight: 2,
                fillColor: area.style.fillColor,
                fillOpacity: 0.1,
                className: 'area-boundary'
            }).addTo(map);
        });

        // 마커를 영역별로 그룹화하는 함수
        function createClusters() {
            // areaClusters 초기화
            areaClusters = {};
            
            // 통합 클러스터 생성
            combinedCluster = L.markerClusterGroup({
                disableClusteringAtZoom: 18,
                spiderfyOnMaxZoom: false,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true,
                maxClusterRadius: 250,
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    let size = count < 10 ? 40 : (count < 100 ? 50 : 60);
                    
                    return L.divIcon({
                        html: '<div><span>' + count + '</span></div>',
                        className: 'custom-cluster custom-cluster-combined',
                        iconSize: [size, size]
                    });
                }
            });

            // 각 영역별 클러스터 생성
            clusterAreas.forEach(area => {
                areaClusters[area.name] = L.markerClusterGroup({
                    disableClusteringAtZoom: 18,
                    spiderfyOnMaxZoom: false,
                    showCoverageOnHover: true,
                    zoomToBoundsOnClick: true,
                    maxClusterRadius: 250,
                    iconCreateFunction: function(cluster) {
                        const count = cluster.getChildCount();
                        let size;
                        if (count < 10) size = 40;
                        else if (count < 100) size = 50;
                        else size = 60;

                        return L.divIcon({
                            html: '<div><span>' + count + '</span></div>',
                            className: area.style.className,
                            iconSize: [size, size]
                        });
                    },
                    polygonOptions: {
                        fillColor: area.style.fillColor,
                        color: area.style.color,
                        weight: 3,
                        opacity: 0.5,
                        fillOpacity: 0.2
                    }
                });
            });

            // GeoJSON 처리
            geojson.features.forEach(feature => {
                const coords = feature.geometry.coordinates;
                const latlng = L.latLng(coords[1], coords[0]);
                const properties = feature.properties;
                
                // 마커 생성
                const marker = L.marker(latlng, { icon: treeIcon });
                
                // 팝업 설정
                let popupContent = `
                    <h3>${properties.common_name || 'Tree'}</h3>
                    <p>Species: ${properties.botanical_name || 'Unknown'}</p>
                    <p>Tag #: ${properties.tag_number}</p>
                    <button onclick="viewTreeDetails(${properties.tag_number})">View Details</button>
                `;
                marker.bindPopup(popupContent);
                
                // 통합 클러스터에 모든 마커 추가
                combinedCluster.addLayer(marker);
                
                // 마커가 속한 영역 확인 (영역별 클러스터용)
                let added = false;
                for (const area of clusterAreas) {
                    const polygon = L.polygon(area.polygon);
                    if (polygon.getBounds().contains(latlng) && isMarkerInsidePolygon(latlng, area.polygon)) {
                        areaClusters[area.name].addLayer(marker);
                        added = true;
                        break;
                    }
                }
                
                // 어떤 영역에도 속하지 않는 경우
                if (!added) {
                    if (!defaultCluster) {
                        defaultCluster = L.markerClusterGroup({
                            disableClusteringAtZoom: 18,
                            spiderfyOnMaxZoom: false,
                            showCoverageOnHover: true,
                            maxClusterRadius: 200,
                            iconCreateFunction: function(cluster) {
                                const count = cluster.getChildCount();
                                let size = count < 10 ? 40 : (count < 100 ? 50 : 60);
                                
                                return L.divIcon({
                                    html: '<div><span>' + count + '</span></div>',
                                    className: 'custom-cluster custom-cluster-default',
                                    iconSize: [size, size]
                                });
                            }
                        });
                    }
                    defaultCluster.addLayer(marker);
                }
            });
            
            // 줌 레벨에 따라 클러스터 표시 방식 결정
            updateClusterDisplay();
            
            // 범례 추가
            addLegend(geojson.features.length);
        }
        
        // 영역별 클러스터 생성 실행
        createClusters();
    }
    
    // 중복된 updateClusterDisplay 함수와 이벤트 리스너 제거
    // 여기서만 정의하고 사용
    function updateClusterDisplay() {
        const currentZoom = map.getZoom();
        console.log("현재 줌 레벨:", currentZoom, "기준 레벨:", ZOOM_THRESHOLD);
        
        // 모든 클러스터 레이어 제거
        if (combinedCluster) {
            try {
                map.removeLayer(combinedCluster);
            } catch (e) {
                console.log("combinedCluster 레이어 제거 실패:", e);
            }
        }
        
        for (const areaName in areaClusters) {
            try {
                map.removeLayer(areaClusters[areaName]);
            } catch (e) {
                console.log(`${areaName} 레이어 제거 실패:`, e);
            }
        }
        
        if (defaultCluster) {
            try {
                map.removeLayer(defaultCluster);
            } catch (e) {
                console.log("defaultCluster 레이어 제거 실패:", e);
            }
        }
        
        // 줌 레벨에 따라 클러스터 표시
        if (currentZoom <= ZOOM_THRESHOLD) {
            console.log("통합 클러스터 표시");
            // 축소 상태: 통합 클러스터 표시
            map.addLayer(combinedCluster);
        } else {
            console.log("영역별 클러스터 표시");
            // 확대 상태: 영역별 클러스터 표시
            for (const areaName in areaClusters) {
                map.addLayer(areaClusters[areaName]);
            }
            if (defaultCluster) map.addLayer(defaultCluster);
        }
    }
    
    // 줌 이벤트 리스너 - 한 번만 등록
    map.on('zoomend', function() {
        console.log("zoomend 이벤트 발생");
        updateClusterDisplay();
    });

    // 범례 추가 함수
    function addLegend(treeCount) {
        const legend = L.control({ position: 'bottomleft' });
        
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <div style="padding: 6px 8px; background: white; background: rgba(255,255,255,0.8); box-shadow: 0 0 15px rgba(0,0,0,0.2); border-radius: 5px;">
                    <h4>Tree Map</h4>
                    <p>Total Trees: <strong>${treeCount}</strong></p>
                    <div class="legend-areas">
                        <div><span style="background-color: #66BB6A"></span> 서쪽 캠퍼스</div>
                        <div><span style="background-color: #2196F3"></span> 북쪽 캠퍼스</div>
                        <div><span style="background-color: #FF5722"></span> 남쪽 캠퍼스</div>
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

// 다각형 내부에 마커가 있는지 확인하는 함수
function isMarkerInsidePolygon(latlng, polygonPoints) {
    const polygon = L.polygon(polygonPoints);
    const polyBounds = polygon.getBounds();
    
    if (!polyBounds.contains(latlng)) {
        return false;
    }
    
    // Ray-casting 알고리즘으로 정확한 내부 판정
    // 복잡한 다각형에서도 정확하게 내부 여부 판단
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

// Fallback function to display sample trees if API loading fails
function displaySampleTrees() {
    const sampleTrees = [
        { id: 1, name: "Oak Tree", lat: 37.31960, lng: -122.04520, species: "Quercus" },
        { id: 2, name: "Pine Tree", lat: 37.31920, lng: -122.04480, species: "Pinus" },
        { id: 3, name: "Cherry Tree", lat: 37.31900, lng: -122.04450, species: "Prunus" }
    ];
    
    // Create a marker cluster group for samples
    const markers = L.markerClusterGroup();
    
    sampleTrees.forEach(tree => {
        const marker = L.marker([tree.lat, tree.lng], { icon: treeIcon });
        marker.bindPopup(`
            <h3>${tree.name}</h3>
            <p>Species: ${tree.species}</p>
            <p>ID: ${tree.id}</p>
            <button onclick="viewTreeDetails(${tree.id})">View Details</button>
        `);
        markers.addLayer(marker);
    });
    
    map.addLayer(markers);
} 