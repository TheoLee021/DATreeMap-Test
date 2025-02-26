document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    const map = L.map('map').setView([37.31930349325796, -122.04499476044137], 17);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Create tree icon
    const treeIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/628/628324.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
    
    // Load tree data from CSV file
    loadTreesFromCSV();
    
    // Function to load tree data from CSV
    function loadTreesFromCSV() {
        fetch('Tree Dataset_De Anza College_Backup.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(csvData => {
                const trees = parseCSV(csvData);
                displayTrees(trees);
            })
            .catch(error => {
                console.error('Error loading CSV data:', error);
                // Fallback to sample data if CSV loading fails
                displaySampleTrees();
            });
    }
    
    // Parse CSV data
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Find column indices for latitude and longitude
        const latIndex = headers.findIndex(header => 
            header.toLowerCase().includes('lat'));
        const lngIndex = headers.findIndex(header => 
            header.toLowerCase().includes('lon') || header.toLowerCase().includes('lng'));
        const idIndex = headers.findIndex(header => 
            header.toLowerCase().includes('id'));
        const speciesIndex = headers.findIndex(header => 
            header.toLowerCase().includes('species'));
        const nameIndex = headers.findIndex(header => 
            header.toLowerCase().includes('name') || header.toLowerCase().includes('common'));
        
        const trees = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            const values = lines[i].split(',').map(value => value.trim());
            
            // Check if latitude and longitude are valid
            const lat = parseFloat(values[latIndex]);
            const lng = parseFloat(values[lngIndex]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                trees.push({
                    id: idIndex >= 0 ? values[idIndex] : i,
                    name: nameIndex >= 0 ? values[nameIndex] : 'Tree',
                    species: speciesIndex >= 0 ? values[speciesIndex] : 'Unknown',
                    lat: lat,
                    lng: lng,
                    // Store all other data for detailed view
                    allData: headers.reduce((obj, header, index) => {
                        obj[header] = values[index];
                        return obj;
                    }, {})
                });
            }
        }
        
        return trees;
    }
    
    // Display trees on the map
    function displayTrees(trees) {
        if (trees.length === 0) {
            console.warn('No valid tree data found. Using sample data.');
            displaySampleTrees();
            return;
        }
        
        trees.forEach(tree => {
            const marker = L.marker([tree.lat, tree.lng], { icon: treeIcon }).addTo(map);
            
            // Create popup content
            let popupContent = `
                <h3>${tree.name || 'Tree'}</h3>
                <p>Species: ${tree.species || 'Unknown'}</p>
                <p>ID: ${tree.id}</p>
                <button onclick="viewTreeDetails('${tree.id}')">View Details</button>
            `;
            
            marker.bindPopup(popupContent);
        });
        
        // Store trees data globally for use in details view
        window.treesData = trees;
    }
    
    // Fallback function to display sample trees if CSV loading fails
    function displaySampleTrees() {
        const sampleTrees = [
            { id: 1, name: "Oak Tree", lat: 37.31960, lng: -122.04520, species: "Quercus" },
            { id: 2, name: "Pine Tree", lat: 37.31920, lng: -122.04480, species: "Pinus" },
            { id: 3, name: "Cherry Tree", lat: 37.31900, lng: -122.04450, species: "Prunus" }
        ];
        
        sampleTrees.forEach(tree => {
            const marker = L.marker([tree.lat, tree.lng], { icon: treeIcon }).addTo(map);
            marker.bindPopup(`
                <h3>${tree.name}</h3>
                <p>Species: ${tree.species}</p>
                <p>ID: ${tree.id}</p>
                <button onclick="viewTreeDetails(${tree.id})">View Details</button>
            `);
        });
        
        // Store sample trees data globally
        window.treesData = sampleTrees;
    }
});

// Function to view tree details
function viewTreeDetails(treeId) {
    console.log(`Viewing details for tree ID ${treeId}`);
    
    // Find the tree data
    const tree = window.treesData.find(tree => tree.id.toString() === treeId.toString());
    
    if (tree) {
        // Create detailed information string
        let detailsText = '';
        
        if (tree.allData) {
            // If we have complete data from CSV
            for (const [key, value] of Object.entries(tree.allData)) {
                if (value && value.trim() !== '') {
                    detailsText += `${key}: ${value}\n`;
                }
            }
        } else {
            // Fallback for sample data
            detailsText = `ID: ${tree.id}\nName: ${tree.name}\nSpecies: ${tree.species}\nLocation: ${tree.lat}, ${tree.lng}`;
        }
        
        alert(`Tree Details:\n${detailsText}`);
    } else {
        alert(`No data found for tree ID ${treeId}`);
    }
} 