document.addEventListener('DOMContentLoaded', function() {
    initializeParkingMap();
    setupLicensePlateDetection();

    // Handle parking slot selection
    document.querySelectorAll('.parking-slot').forEach(slot => {
        slot.addEventListener('click', function() {
            if (this.classList.contains('occupied')) {
                showAlert('This parking slot is already occupied', 'warning');
                return;
            }

            selectParkingSlot(this.dataset.slotId, this.dataset.slotNumber);
        });
    });
});

function initializeParkingMap() {
    // This function initializes the indoor parking visualization
    // It will be refreshed periodically to show real-time slot status
    refreshParkingSlots();

    // Set up periodic refresh (every 30 seconds)
    setInterval(refreshParkingSlots, 30000);
}

async function refreshParkingSlots() {
    try {
        const slots = await apiCall('/api/parking-slots?location=indoor');

        // Update the status of each slot in the UI
        slots.forEach(slot => {
            const slotElement = document.querySelector(`.parking-slot[data-slot-id="${slot.id}"]`);
            if (slotElement) {
                if (slot.is_occupied) {
                    slotElement.classList.add('occupied');
                    slotElement.classList.remove('available');
                } else {
                    slotElement.classList.add('available');
                    slotElement.classList.remove('occupied');
                }
            }
        });
    } catch (error) {
        console.error('Error refreshing parking slots:', error);
    }
}

function selectParkingSlot(slotId, slotNumber) {
    // Display the vehicle selection form
    const parkingForm = document.getElementById('parking-form');
    if (parkingForm) {
        // Set the selected slot ID in the form
        document.getElementById('selected-slot-id').value = slotId;
        document.getElementById('selected-slot-number').textContent = slotNumber;

        // Show the form
        parkingForm.classList.remove('d-none');

        // Scroll to the form
        parkingForm.scrollIntoView({ behavior: 'smooth' });
    }
}

function setupLicensePlateDetection() {
    const licenseDetectionForm = document.getElementById('license-detection-form');
    if (!licenseDetectionForm) return;

    licenseDetectionForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const licensePlate = document.getElementById('license-plate-input').value;
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
                parking_type: 'Indoor'
            });

            // Reset form
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;

            // If successful, show detection result and recommended slot
            if (response.success) {
                const resultContainer = document.getElementById('detection-result');
                resultContainer.innerHTML = `
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-success text-white text-center">
                            <h5 class="mb-0">License Plate Detected</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-lg-6 col-md-12">
                                    <h6>Vehicle Information:</h6>
                                    <p><strong>License Plate:</strong> ${response.vehicle_info.license_plate}</p>
                                    <p><strong>Make/Model:</strong> ${response.vehicle_info.make} ${response.vehicle_info.model}</p>
                                    <p><strong>Color:</strong> ${response.vehicle_info.color}</p>
                                </div>
                                <div class="col-lg-6 col-md-12">
                                    <h6 class="mt-3">Recommended Parking Slot:</h6>
                                    <p><strong>Slot Number:</strong> ${response.slot_number}</p>
                                    <p><strong>Area:</strong> ${response.slot_area}</p>
                                    <button type="button" class="btn btn-primary w-100" 
                                            onclick="parkVehicle(${response.vehicle_id}, ${response.slot_id})">
                                        Park Here
                                    </button>
                                </div>
                            </div>
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

async function parkVehicle(vehicleId, slotId) {
    try {
        console.log("Parking vehicle with slot ID:", slotId, "vehicle ID:", vehicleId);

        const response = await apiCall('/api/parking-entry', 'POST', {
            vehicle_id: vehicleId,
            slot_id: slotId,
            parking_type: 'Indoor'
        });

        if (response.success) {
            showAlert(response.message, 'success');

            // Refresh the parking slots display
            refreshParkingSlots();

            // Reset forms and results
            document.getElementById('license-detection-form').reset();
            document.getElementById('detection-result').classList.add('d-none');

            // Redirect to dashboard after a delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        }
    } catch (error) {
        console.error('Error parking vehicle:', error);
    }
}

// Function for the manual vehicle and slot form
document.addEventListener('DOMContentLoaded', function() {
    const manualParkForm = document.getElementById('manual-park-form');
    if (!manualParkForm) return;

    manualParkForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const vehicleId = document.getElementById('vehicle-select').value;
        const slotId = document.getElementById('selected-slot-id').value;

        if (!vehicleId || !slotId) {
            showAlert('Please select a vehicle and parking slot', 'warning');

            return;
        }

        try {
            const response = await apiCall('/api/parking-entry', 'POST', {
                vehicle_id: vehicleId,
                slot_id: slotId,
                parking_type: 'Indoor'
            });

            if (response.success) {
                showAlert(response.message, 'success');

                // Refresh the parking slots display
                refreshParkingSlots();

                // Reset form
                manualParkForm.reset();
                document.getElementById('parking-form').classList.add('d-none');

                // Redirect to dashboard after a delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            }
        } catch (error) {
            console.error('Error parking vehicle:', error);
        }
    });
});
