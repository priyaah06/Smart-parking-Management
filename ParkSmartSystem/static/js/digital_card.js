document.addEventListener('DOMContentLoaded', function() {
    setupExitButtons();
    setupHistoryTable();
});

function setupExitButtons() {
    // Set up event listeners for all exit buttons
    document.querySelectorAll('.exit-parking-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const recordId = this.dataset.recordId;
            if (!recordId) return;
            
            // Confirm before exiting
            if (!confirm('Are you sure you want to exit this parking slot?')) {
                return;
            }
            
            try {
                const response = await apiCall('/api/parking-exit', 'POST', {
                    record_id: recordId
                });
                
                if (response.success) {
                    // Show success message with fee information
                    const message = `
                        <strong>Vehicle exited successfully!</strong><br>
                        Duration: ${formatDuration(response.duration)}<br>
                        Fee: ${formatCurrency(response.fee)} (Payment processed automatically)
                    `;
                    showAlert(message, 'success');
                    
                    // Reload page after a delay to show updated status
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            } catch (error) {
                console.error('Error processing exit:', error);
            }
        });
    });
}

function setupHistoryTable() {
    const historyTable = document.getElementById('parking-history-table');
    if (!historyTable) return;
    
    // Set up sorting for the table
    const headers = historyTable.querySelectorAll('th');
    headers.forEach(header => {
        if (header.dataset.sortable) {
            header.addEventListener('click', function() {
                const column = this.dataset.column;
                const isAsc = this.dataset.order === 'asc';
                
                // Update sorting arrows on headers
                headers.forEach(h => {
                    h.querySelector('span.sort-arrow')?.remove();
                });
                
                // Add sorting arrow to current header
                const arrow = isAsc ? '↓' : '↑';
                this.innerHTML += `<span class="sort-arrow ms-1">${arrow}</span>`;
                
                // Set new order
                this.dataset.order = isAsc ? 'desc' : 'asc';
                
                // Sort the table
                sortTable(historyTable, column, !isAsc);
            });
        }
    });
}

function sortTable(table, column, asc) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const tbody = table.querySelector('tbody');
    
    // Remove all rows
    rows.forEach(row => row.remove());
    
    // Sort rows
    rows.sort((a, b) => {
        let valA, valB;
        
        if (column === 'date') {
            valA = new Date(a.querySelector(`td[data-column="${column}"]`).dataset.timestamp);
            valB = new Date(b.querySelector(`td[data-column="${column}"]`).dataset.timestamp);
        } else if (column === 'duration' || column === 'fee') {
            valA = parseFloat(a.querySelector(`td[data-column="${column}"]`).dataset.value);
            valB = parseFloat(b.querySelector(`td[data-column="${column}"]`).dataset.value);
        } else {
            valA = a.querySelector(`td[data-column="${column}"]`).textContent.trim();
            valB = b.querySelector(`td[data-column="${column}"]`).textContent.trim();
        }
        
        if (asc) {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });
    
    // Add sorted rows back to table
    rows.forEach(row => tbody.appendChild(row));
}
