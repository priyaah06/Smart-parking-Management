let map, userMarker, slotMarker;
let directionsService, directionsRenderer;

document.addEventListener('DOMContentLoaded', function() {
    setupDestinationSearch();
    setupLicensePlateDetection();
});

// Initialize the map (called when Google Maps API is loaded)
function initMap() {
    // Default coordinates (will be replaced with user's location if available)
    const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // New York City
    
    // Create a map centered at the default location
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: defaultLocation,
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            {
                featureType: 'administrative.locality',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'poi',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'poi.park',
                elementType: 'geometry',
                stylers: [{ color: '#263c3f' }]
            },
            {
                featureType: 'poi.park',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#6b9a76' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#38414e' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#212a37' }]
            },
            {
                featureType: 'road',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#9ca5b3' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry',
                stylers: [{ color: '#746855' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#1f2835' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#f3d19c' }]
            },
            {
                featureType: 'transit',
                elementType: 'geometry',
                stylers: [{ color: '#2f3948' }]
            },
            {
                featureType: 'transit.station',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#17263c' }]
            },
            {
                featureType: 'water',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#515c6d' }]
            },
            {
                featureType: 'water',
                elementType: 'labels.text.stroke',
                stylers: [{ color: '#17263c' }]
            }
        ]
    });
    
    // Initialize directions service and renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 5
        }
    });
    
    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                map.setCenter(userLocation);
                
                // Add marker for user location
                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Your Location',
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        scaledSize: new google.maps.Size(40, 40)
                    }
                });
                
                // Store user location in form
                document.getElementById('user-lat').value = userLocation.lat;
                document.getElementById('user-lng').value = userLocation.lng;
                
                // Show the search form now that we have location
                document.getElementById('destination-form').classList.remove('d-none');
            },
            (error) => {
                console.error('Error getting location:', error);
                // Show error in UI
                showAlert('Unable to get your location. Please enter a destination manually.', 'warning');
                // Show the search form anyway
                document.getElementById('destination-form').classList.remove('d-none');
            }
        );
    } else {
        showAlert('Geolocation is not supported by your browser.', 'warning');
        // Show the search form anyway
        document.getElementById('destination-form').classList.remove('d-none');
    }
    
    // Initialize places autocomplete
    const input = document.getElementById('destination-input');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);
    
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
            showAlert('No details available for this place.', 'warning');
            return;
        }
        
        // Set the position of the marker using the place ID and location.
        if (slotMarker) slotMarker.setMap(null);
        
        const destinationMarker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            }
        });
        
        // Pan to the selected location
        map.setCenter(place.geometry.location);
        map.setZoom(17);
        
        // Store destination in form
        document.getElementById('destination-lat').value = place.geometry.location.lat();
        document.getElementById('destination-lng').value = place.geometry.location.lng();
        
        // Show the find parking button
        document.getElementById('find-parking-btn').classList.remove('d-none');
    });
}

function setupDestinationSearch() {
    const destinationForm = document.getElementById('destination-form');
    if (!destinationForm) return;
    
    document.getElementById('find-parking-btn').addEventListener('click', async function() {
        const userLat = document.getElementById('user-lat').value;
        const userLng = document.getElementById('user-lng').value;
        const destinationLat = document.getElementById('destination-lat').value;
        const destinationLng = document.getElementById('destination-lng').value;
        
        if (!destinationLat || !destinationLng) {
            showAlert('Please enter a destination', 'warning');
            return;
        }
        
        try {
            // Show loading
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Finding...';
            
            // Find nearest parking slot
            const response = await apiCall('/api/nearest-outdoor-slot', 'POST', {
                latitude: destinationLat,
                longitude: destinationLng
            });
            
            // Reset button
            this.disabled = false;
            this.innerHTML = 'Find Parking';
            
            if (response.success) {
                // Add marker for the parking slot
                const slotLocation = {
                    lat: response.coordinates.latitude,
                    lng: response.coordinates.longitude
                };
                
                if (slotMarker) slotMarker.setMap(null);
                
                slotMarker = new google.maps.Marker({
                    position: slotLocation,
                    map: map,
                    title: `Parking Slot ${response.slot_number}`,
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/parking.png',
                        scaledSize: new google.maps.Size(40, 40)
                    },
                    animation: google.maps.Animation.DROP
                });
                
                // Show route from user location to parking slot
                if (userLat && userLng) {
                    const origin = { lat: parseFloat(userLat), lng: parseFloat(userLng) };
                    
                    directionsService.route(
                        {
                            origin: origin,
                            destination: slotLocation,
                            travelMode: google.maps.TravelMode.DRIVING
                        },
                        (response, status) => {
                            if (status === 'OK') {
                                directionsRenderer.setDirections(response);
                            } else {
                                console.error('Directions request failed:', status);
                            }
                        }
                    );
                }
                
                // Show parking slot info
                const slotInfoContainer = document.getElementById('parking-slot-info');
                slotInfoContainer.innerHTML = `
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">Available Parking Slot</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Slot Number:</strong> ${response.slot_number}</p>
                            <p><strong>Distance:</strong> ${response.distance} meters</p>
                            <p><strong>Walking Time:</strong> ${response.estimated_time} minutes</p>
                            
                            <div class="mt-3">
                                <h6>Select Vehicle to Park:</h6>
                                <select id="vehicle-select-outdoor" class="form-select mb-3">
                                    ${Array.from(document.getElementById('vehicle-select').options)
                                        .map(opt => `<option value="${opt.value}">${opt.text}</option>`)
                                        .join('')}
                                </select>
                                
                                <button type="button" class="btn btn-success" 
                                        onclick="parkVehicleOutdoor(${response.slot_id})">
                                    Park Here
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                slotInfoContainer.classList.remove('d-none');
                slotInfoContainer.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            // Error is handled in apiCall
            this.disabled = false;
            this.innerHTML = 'Find Parking';
        }
    });
}

async function parkVehicleOutdoor(slotId) {
    const vehicleSelect = document.getElementById('vehicle-select-outdoor');
    if (!vehicleSelect) {
        showAlert('Please select a vehicle', 'warning');
        return;
    }
    
    const vehicleId = vehicleSelect.value;
    if (!vehicleId) {
        showAlert('Please select a vehicle', 'warning');
        return;
    }
    
    try {
        const response = await apiCall('/api/parking-entry', 'POST', {
            vehicle_id: vehicleId,
            slot_id: slotId,
            parking_type: 'Outdoor'
        });
        
        if (response.success) {
            showAlert(response.message, 'success');
            
            // Redirect to dashboard after a delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        }
    } catch (error) {
        console.error('Error parking vehicle:', error);
    }
}

function setupLicensePlateDetection() {
    const licenseDetectionForm = document.getElementById('license-detection-form-outdoor');
    if (!licenseDetectionForm) return;
    
    licenseDetectionForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const licensePlate = document.getElementById('license-plate-input-outdoor').value;
        if (!licensePlate) {
            showAlert('Please enter a license plate number', 'warning');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            const response = await apiCall('/api/simulate-license-detection', 'POST', {
                license_plate: licensePlate,
                parking_type: 'Outdoor'
            });
            
            // Reset form
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            
            // If successful, show detection result and recommended slot
            if (response.success) {
                const resultContainer = document.getElementById('detection-result-outdoor');
                resultContainer.innerHTML = `
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0">License Plate Detected</h5>
                        </div>
                        <div class="card-body">
                            <h6>Vehicle Information:</h6>
                            <p><strong>License Plate:</strong> ${response.vehicle_info.license_plate}</p>
                            <p><strong>Make/Model:</strong> ${response.vehicle_info.make} ${response.vehicle_info.model}</p>
                            <p><strong>Color:</strong> ${response.vehicle_info.color}</p>
                            
                            <h6 class="mt-3">Recommended Parking Slot:</h6>
                            <p><strong>Slot Number:</strong> ${response.slot_number}</p>
                            <p><strong>Area:</strong> ${response.slot_area}</p>
                            
                            <button type="button" class="btn btn-primary" 
                                    onclick="parkVehicle(${response.vehicle_id}, ${response.slot_id}, 'Outdoor')">
                                Park Here
                            </button>
                        </div>
                    </div>
                `;
                resultContainer.classList.remove('d-none');
                resultContainer.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            // Error is already handled in apiCall, just reset the button
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });
}

async function parkVehicle(vehicleId, slotId, parkingType) {
    try {
        const response = await apiCall('/api/parking-entry', 'POST', {
            vehicle_id: vehicleId,
            slot_id: slotId,
            parking_type: parkingType
        });
        
        if (response.success) {
            showAlert(response.message, 'success');
            
            // Reset forms and results
            document.getElementById('license-detection-form-outdoor').reset();
            document.getElementById('detection-result-outdoor').classList.add('d-none');
            
            // Redirect to dashboard after a delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        }
    } catch (error) {
        console.error('Error parking vehicle:', error);
    }
}
