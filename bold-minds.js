// This file will contain frontend logic for Bold Minds feature
// Functions to load, render, save, and export Bold Minds data will be implemented here

// Global state for Bold Minds data
let boldMindsData = [];

// Load Bold Minds data from API
async function loadBoldMindsData() {
    try {
        // Fetch all resources
        const resourcesResponse = await fetch('/api/resources');
        if (!resourcesResponse.ok) {
            throw new Error(`Failed to load resources: ${resourcesResponse.status}`);
        }
        const resourcesData = await resourcesResponse.json();
        const resources = resourcesData.resources;

        // Fetch existing nominations
        const yearSelect = document.getElementById('boldMindsYearSelect');
        const selectedYear = yearSelect ? yearSelect.value : new Date().getFullYear();
        const nominationsResponse = await fetch(`/api/bold-minds?year=${selectedYear}`);
        let nominations = [];
        if (nominationsResponse.ok) {
            nominations = await nominationsResponse.json();
        }

        // Create a map of nominations by emp_id
        const nominationsMap = {};
        nominations.forEach(nom => {
            nominationsMap[nom.emp_id] = nom;
        });

        // Merge resources with nominations
        boldMindsData = resources.map(resource => {
            const nomination = nominationsMap[resource.empId];
            return {
                emp_id: resource.empId,
                resource_name: resource.name,
                nominated_for: nomination ? nomination.nominated_for : '',
                nominated_month: nomination ? nomination.nominated_month : ''
            };
        });

        console.log('Bold Minds data loaded:', boldMindsData);
        renderBoldMindsTable();
    } catch (error) {
        console.error('Error in loadBoldMindsData:', error);
        alert('Error loading Bold Minds data');
    }
}

// Render Bold Minds table with dropdowns for Nominated For and Nominated Month
function renderBoldMindsTable() {
    const container = document.getElementById('boldMindsTableContainer');
    if (!container) return;

    container.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('table', 'table-striped');

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Emp ID</th>
            <th>Resource Name</th>
            <th>Nominated For</th>
            <th>Nominated Month</th>
        </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');

    boldMindsData.forEach(entry => {
        const tr = document.createElement('tr');

        // Emp ID
        const tdEmpId = document.createElement('td');
        tdEmpId.textContent = entry.emp_id;
        tr.appendChild(tdEmpId);

        // Resource Name
        const tdName = document.createElement('td');
        tdName.textContent = entry.resource_name;
        tr.appendChild(tdName);

        // Nominated For dropdown
        const tdNominatedFor = document.createElement('td');
        const selectNominatedFor = document.createElement('select');
        ['Select','Gold', 'Silver', 'Bronze'].forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            if (entry.nominated_for === level) option.selected = true;
            selectNominatedFor.appendChild(option);
        });
        // Apply color based on selection
        function updateColor() {
            const val = selectNominatedFor.value;
            selectNominatedFor.style.backgroundColor = '';
            if (val === 'Gold') selectNominatedFor.style.backgroundColor = 'gold';
            else if (val === 'Silver') selectNominatedFor.style.backgroundColor = 'silver';
            else if (val === 'Bronze') selectNominatedFor.style.backgroundColor = '#cd7f32'; // bronze color
        }
        updateColor();
        selectNominatedFor.addEventListener('change', (e) => {
            entry.nominated_for = e.target.value;
            updateColor();
        });
        tdNominatedFor.appendChild(selectNominatedFor);
        tr.appendChild(tdNominatedFor);

        // Nominated Month dropdown
        const tdNominatedMonth = document.createElement('td');
        const selectMonth = document.createElement('select');
        // Add default "Select" option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select';
        if (!entry.nominated_month) defaultOption.selected = true;
        selectMonth.appendChild(defaultOption);
        for (let m = 1; m <= 12; m++) {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
            if (entry.nominated_month === m) option.selected = true;
            selectMonth.appendChild(option);
        }
        selectMonth.addEventListener('change', (e) => {
            entry.nominated_month = e.target.value ? parseInt(e.target.value, 10) : '';
        });
        tdNominatedMonth.appendChild(selectMonth);
        tr.appendChild(tdNominatedMonth);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

// Save Bold Minds data to API
async function saveBoldMindsData() {
    try {
        // Filter only entries with nominated_for selected
        const nominationsToSave = boldMindsData.filter(entry => entry.nominated_for && entry.nominated_for.trim() !== '');
        const yearSelect = document.getElementById('boldMindsYearSelect');
        const selectedYear = yearSelect ? yearSelect.value : new Date().getFullYear();
        // Add nominated_year to each nomination
        const nominationsWithYear = nominationsToSave.map(entry => ({
            ...entry,
            nominated_year: parseInt(selectedYear, 10)
        }));
        const response = await fetch('/api/bold-minds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nominations: nominationsWithYear })
        });
        if (!response.ok) throw new Error('Failed to save Bold Minds data');
        alert('Bold Minds data saved successfully');
    } catch (error) {
        console.error(error);
        alert('Error saving Bold Minds data');
    }
}

// Export Bold Minds data to Excel (CSV format)
function exportBoldMindsToExcel() {
    let csvContent = 'Emp ID,Resource Name,Nominated For,Nominated Month\n';
    boldMindsData.forEach(entry => {
        const monthName = entry.nominated_month ? new Date(0, entry.nominated_month - 1).toLocaleString('default', { month: 'short' }) : '';
        csvContent += `${entry.emp_id},${entry.resource_name},${entry.nominated_for},${monthName}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bold_minds_export.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize Bold Minds view event listeners
function initializeBoldMinds() {
    // Populate year dropdown
    const yearSelect = document.getElementById('boldMindsYearSelect');
    if (yearSelect) {
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
        // Add change event listener to reload data on year change
        yearSelect.addEventListener('change', () => {
            loadBoldMindsData();
        });
    }

    document.getElementById('boldMindsSaveBtn').addEventListener('click', saveBoldMindsData);
    document.getElementById('boldMindsExportBtn').addEventListener('click', exportBoldMindsToExcel);
    loadBoldMindsData();
}

// Add to switchView function in app.js:
// if (view === 'boldMinds') {
//     initializeBoldMinds();
// }
