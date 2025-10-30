// Global utility functions and event handlers

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips and popovers if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        });

        var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
        var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl)
        });
    }

    // Add active class to current nav item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });

    // Initialize any forms with client-side validation
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
});

// Global utility functions
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function formatDuration(minutes) {
    if (!minutes) return 'N/A';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
        return `${mins} minutes`;
    } else if (mins === 0) {
        return `${hours} hours`;
    } else {
        return `${hours} hours, ${mins} minutes`;
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return `$${parseFloat(amount).toFixed(2)}`;
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Function to make API calls
async function apiCall(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        let responseData;
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Unexpected response: ${text.slice(0, 100)}...`);
        }

        if (!response.ok) {
            throw new Error(responseData.message || 'API call failed');
        }

        return responseData;
    } catch (error) {
        console.error('API Error:', error);
        showAlert(error.message || 'An error occurred', 'danger');
        throw error;
    }
}

// Simulate license plate detection
document.addEventListener('DOMContentLoaded', () => {
    const simulateBtn = document.getElementById('simulate-detection-btn');
    if (simulateBtn) {
        simulateBtn.addEventListener('click', async () => {
            const plateInput = document.getElementById('license-plate-input');
            const plateNumber = plateInput.value.trim();

            if (!plateNumber) {
                showAlert('Please enter a license plate number.', 'warning');
                return;
            }

            try {
                const result = await apiCall('/api/simulate-license-detection', 'POST', {
                    license_plate: plateNumber,
                    parking_type: 'Indoor'
                });

                showAlert(
                    `Simulated detection successful!<br>
                    <strong>Plate:</strong> ${plateNumber}<br>
                    <strong>Slot:</strong> ${result.slot_number}<br>
                    <strong>Area:</strong> ${result.slot_area}<br>
                    <strong>Level:</strong> ${result.level || 'N/A'}`,
                    'success'
                );
            } catch (err) {
                // Error already shown by showAlert
            }
        });
    }
});
