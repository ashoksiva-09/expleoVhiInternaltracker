// Application State
let currentView = 'calendar';
let resources = [];
let resourceColumns = [];
let timesheetData = [];
let leaves = [];
let timesheetSort = { field: null, asc: true };
let timesheetSearch = '';
let boldMindsData = [];

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    await loadResourcesFromDB();
    initializeNavigation();
    initializeTimesheet();
    initializeResources();
    initializeLeaves();
    populateYearDropdowns();
});

// Navigation
window.switchView = function(view) {
    // Hide all views
    document.querySelectorAll('.view-content').forEach(v => {
        v.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('#vhi-sidebar-nav li').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected view and activate nav item
    const viewElement = document.getElementById(view + 'View');
    const navElement = document.getElementById(view + 'Menu');

    if (viewElement) {
        viewElement.classList.add('active');
    }
    if (navElement) {
        navElement.classList.add('active');
    }

    currentView = view;

    // Initialize view-specific functionality
    if (view === 'timesheet') {
        renderTimesheet();
    } else if (view === 'resources') {
        renderResources();
    } else if (view === 'leaves') {
        renderLeavesCalendar(new Date().getFullYear(), new Date().getMonth());
        renderLeavesTable();
        populateLeavesReportFilters();
        renderLeavesChart();
    } else if (view === 'camStatus') {
        initializeCamStatus();
    } else if (view === 'boldMinds') {
        initializeBoldMinds();
    }
};

function initializeNavigation() {
    // Navigation is handled by onclick handlers in index.html
    // No additional setup needed here
}

// Timesheet Management
function initializeTimesheet() {
    const tsYearSelect = document.getElementById('tsYearSelect');
    const tsMonthSelect = document.getElementById('tsMonthSelect');
    
    console.log('tsYearSelect:', tsYearSelect); // Debugging line
    console.log('tsMonthSelect:', tsMonthSelect); // Debugging line
    
    if (tsYearSelect && tsMonthSelect) {
        tsYearSelect.addEventListener('change', updateWeekRangeFilter);
        tsMonthSelect.addEventListener('change', updateWeekRangeFilter);
    } else {
        console.error('Year or Month select elements not found!'); // Debugging line
    }
    
    // Sorting
    document.getElementById('empIdHeader').addEventListener('click', () => {
        toggleSort('empId');
    });
    
    document.getElementById('resourceNameHeader').addEventListener('click', () => {
        toggleSort('name');
    });
    
    // Search
    document.getElementById('resourceSearchInput').addEventListener('input', (e) => {
        timesheetSearch = e.target.value;
        renderTimesheet();
    });
}

// Update Week Range Filter
function updateWeekRangeFilter() {
    const year = parseInt(document.getElementById('tsYearSelect').value, 10);
    const month = parseInt(document.getElementById('tsMonthSelect').value, 10);
    const weekRangeSelect = document.getElementById('weekRangeSelect');
    const weekRangeGroup = document.getElementById('weekRangeGroup');
    
    const weeks = getWeeksInMonth(year, month);
    weekRangeSelect.innerHTML = '';
    
    weeks.forEach((w, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = formatWeekRange(w);
        weekRangeSelect.appendChild(opt);
    });
    
    weekRangeGroup.style.display = weeks.length > 0 ? 'flex' : 'none';
}

// Initialize Resources
function initializeResources() {
    document.getElementById('addColBtn').addEventListener('click', addColumn);
    document.getElementById('addResourceForm').addEventListener('submit', addResource);
}

// Add Column Function
function addColumn() {
    const colName = document.getElementById('newColNameInput').value.trim();
    if (colName && !resourceColumns.includes(colName)) {
        resourceColumns.push(colName);
        resources.forEach(r => r[colName] = '');
        document.getElementById('newColNameInput').value = '';
        renderResources();
    }
}

// Load resources from database
async function loadResourcesFromDB() {
    try {
        const response = await loadResources();
        resources = response.resources;
        resourceColumns = response.columns || [];
    } catch (error) {
        console.error('Failed to load resources from database:', error);
        // Fallback to empty arrays
        resources = [];
        resourceColumns = [];
    }
}

// Sync timesheetData with resources and load from database
async function syncTimesheetData() {
    const year = parseInt(document.getElementById('tsYearSelect')?.value) || new Date().getFullYear();
    const month = parseInt(document.getElementById('tsMonthSelect')?.value) || new Date().getMonth() + 1;
    const weekSelect = document.getElementById('weekRangeSelect');
    const week = weekSelect && weekSelect.value !== '' ? parseInt(weekSelect.value) : null;

    try {
        // Load timesheet data from database
        const dbTimesheetData = await loadTimesheet(year, month, week);
        console.log('Timesheet data loaded from database:', dbTimesheetData);

        const oldDataMap = {};
        timesheetData.forEach(d => { oldDataMap[d.empId] = d; });
        const dbDataMap = {};
        dbTimesheetData.forEach(d => { dbDataMap[d.emp_id] = d; });

        // Merge data from database with current resources
        timesheetData = resources.map(r => {
            const dbEntry = dbDataMap[r.empId];
            const oldEntry = oldDataMap[r.empId];
            
            if (dbEntry) {
                // Use database entry if available
                return {
                    ...r,
                    id: dbEntry.id,
                    whizible: dbEntry.whizible || '',
                    changepoint: dbEntry.changepoint || '',
                    planview: dbEntry.planview || '',
                    comments: dbEntry.comments || ''
                };
            } else if (oldEntry) {
                // Use old entry if no database entry
                return { ...oldEntry };
            } else {
                // Create new entry
                return {
                    ...r,
                    whizible: '',
                    changepoint: '',
                    planview: '',
                    comments: ''
                };
            }
        });
    } catch (error) {
        console.error('Failed to sync timesheet data:', error);
        // Fallback to existing sync logic
        const oldDataMap = {};
        timesheetData.forEach(d => { oldDataMap[d.empId] = d; });
        
        timesheetData = resources.map(r => {
            const old = oldDataMap[r.empId];
            return old ? { ...old } : { ...r, whizible: '', changepoint: '', planview: '', comments: '' };
        });
    }
}

// Render Timesheet
async function renderTimesheet() {
    await syncTimesheetData();
    const tbody = document.getElementById('timesheetTableBody');
    tbody.innerHTML = '';

    // Filter and sort data
    let filteredData = timesheetData.filter(entry =>
        entry.name.toLowerCase().includes(timesheetSearch.toLowerCase()) ||
        entry.empId.toLowerCase().includes(timesheetSearch.toLowerCase())
    );

    if (timesheetSort.field) {
        filteredData.sort((a, b) => {
            const aVal = a[timesheetSort.field];
            const bVal = b[timesheetSort.field];
            if (aVal < bVal) return timesheetSort.asc ? -1 : 1;
            if (aVal > bVal) return timesheetSort.asc ? 1 : -1;
            return 0;
        });
    }

    filteredData.forEach(entry => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${entry.empId}</td>
            <td>${entry.name}</td>
            <td><input type="text" class="form-control whizible-input" value="${entry.whizible || ''}" data-empid="${entry.empId}"></td>
            <td><input type="text" class="form-control changepoint-input" value="${entry.changepoint || ''}" data-empid="${entry.empId}"></td>
            <td><input type="text" class="form-control planview-input" value="${entry.planview || ''}" data-empid="${entry.empId}"></td>
            <td><input type="text" class="form-control comments-input" value="${entry.comments || ''}" data-empid="${entry.empId}"></td>
            <td>
                <button class="btn btn-sm btn-primary save-btn" data-empid="${entry.empId}">Save</button>
                <button class="btn btn-sm btn-danger delete-btn" data-empid="${entry.empId}" ${!entry.id ? 'disabled' : ''}>Delete</button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Add event listeners for inputs and buttons
    addTimesheetEventListeners();
}

// Add event listeners for timesheet inputs and buttons
function addTimesheetEventListeners() {
    // Input change listeners
    document.querySelectorAll('.whizible-input, .changepoint-input, .planview-input, .comments-input').forEach(input => {
        input.addEventListener('change', handleTimesheetInputChange);
    });

    // Save buttons
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', handleTimesheetSave);
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleTimesheetDelete);
    });
}

// Handle timesheet input changes
function handleTimesheetInputChange(e) {
    const empId = e.target.dataset.empid;
    const field = e.target.classList[1].replace('-input', ''); // whizible, changepoint, planview, comments
    const value = e.target.value;

    const entry = timesheetData.find(d => d.empId === empId);
    if (entry) {
        entry[field] = value;
    }
}

// Handle timesheet save
async function handleTimesheetSave(e) {
    const empId = e.target.dataset.empid;
    const entry = timesheetData.find(d => d.empId === empId);

    if (entry) {
        const year = parseInt(document.getElementById('tsYearSelect').value);
        const month = parseInt(document.getElementById('tsMonthSelect').value);
        const weekSelect = document.getElementById('weekRangeSelect');
        const week = weekSelect && weekSelect.value !== '' ? parseInt(weekSelect.value) : null;

        const timesheetEntry = {
            ...entry,
            year,
            month,
            week
        };

        const success = await saveTimesheetEntry(timesheetEntry);
        if (success) {
            alert('Timesheet entry saved successfully!');
            await syncTimesheetData(); // Refresh data
            renderTimesheet();
        } else {
            alert('Failed to save timesheet entry.');
        }
    }
}

// Handle timesheet delete
async function handleTimesheetDelete(e) {
    const empId = e.target.dataset.empid;
    const entry = timesheetData.find(d => d.empId === empId);

    if (entry && entry.id) {
        if (confirm('Are you sure you want to delete this timesheet entry?')) {
            const success = await deleteTimesheetEntry(entry.id);
            if (success) {
                alert('Timesheet entry deleted successfully!');
                await syncTimesheetData(); // Refresh data
                renderTimesheet();
            } else {
                alert('Failed to delete timesheet entry.');
            }
        }
    }
}

// Toggle sort
function toggleSort(field) {
    if (timesheetSort.field === field) {
        timesheetSort.asc = !timesheetSort.asc;
    } else {
        timesheetSort.field = field;
        timesheetSort.asc = true;
    }
    renderTimesheet();
}

// Utility functions for weeks
function getWeeksInMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);

    // Adjust to start of week (Monday)
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);

    while (startDate <= lastDay) {
        const weekStart = new Date(startDate);
        const weekEnd = new Date(startDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        weeks.push({
            start: weekStart,
            end: weekEnd
        });

        startDate.setDate(startDate.getDate() + 7);
    }

    return weeks;
}

function formatWeekRange(week) {
    const start = week.start.toLocaleDateString();
    const end = week.end.toLocaleDateString();
    return `${start} - ${end}`;
}

// Initialize Leaves
function initializeLeaves() {
    // Add event listeners for leaves functionality
    document.getElementById('addLeaveBtn').addEventListener('click', showAddLeaveModal);
    document.getElementById('addLeaveForm').addEventListener('submit', addLeave);
    document.getElementById('leavesReportBtn').addEventListener('click', generateLeavesReport);
}

// CAM Status Management

let camStatusData = [];
let camStatusResources = [];
let camStatusYear = new Date().getFullYear();
let camStatusMonth = new Date().getMonth() + 1;

// Helper function to get weekdays in a month
function getWeekdaysInMonth(year, month) {
    const weekdays = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            weekdays.push(day);
        }
    }
    return weekdays;
}

async function loadCamStatus(year, month) {
    camStatusYear = year;
    camStatusMonth = month;
    const spinner = document.getElementById('camStatusSpinner');
    if (spinner) spinner.style.display = 'block';
    try {
        console.log('Loading resources for CAM Status...');
        const data = await loadResources(); // Load resources first
        camStatusResources = data.resources;
        console.log('Resources loaded:', camStatusResources);

        console.log(`Loading CAM Status data for year=${year}, month=${month}...`);
        const camData = await getCamStatus(year, month);
        camStatusData = camData;
        console.log('CAM Status data loaded:', camStatusData);

        renderCamStatusGrid();
    } catch (error) {
        console.error('Failed to load CAM Status data:', error);
        camStatusData = [];
        camStatusResources = [];
        renderCamStatusGrid();
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

function renderCamStatusGrid() {
    const container = document.getElementById('camStatusGridContainer');
    if (!container) {
        console.error('CAM Status container element not found!');
        return;
    }
    container.innerHTML = '';

    if (!camStatusResources.length) {
        container.innerHTML = '<p>No resources found.</p>';
        return;
    }

    // Get weekdays in the selected month
    const weekdays = getWeekdaysInMonth(camStatusYear, camStatusMonth - 1);

    // Create table
    const table = document.createElement('table');
    table.classList.add('cam-status-table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Resource name header
    const thResource = document.createElement('th');
    thResource.textContent = 'Resource';
    thResource.style.border = '1px solid #ccc';
    thResource.style.padding = '8px';
    headerRow.appendChild(thResource);

    // Date columns headers
    weekdays.forEach(day => {
        const thDay = document.createElement('th');
        const dateStr = new Date(camStatusYear, camStatusMonth - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        thDay.textContent = dateStr;
        thDay.style.border = '1px solid #ccc';
        thDay.style.padding = '4px';
        thDay.style.fontSize = '0.75rem';
        thDay.style.whiteSpace = 'nowrap';
        headerRow.appendChild(thDay);
    });

    // Total column header
    const thTotal = document.createElement('th');
    thTotal.textContent = 'Total';
    thTotal.style.border = '1px solid #ccc';
    thTotal.style.padding = '8px';
    headerRow.appendChild(thTotal);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Map camStatusData for quick lookup: resource_id -> date -> status
    const statusMap = {};
    camStatusData.forEach(entry => {
        if (!statusMap[entry.resource_id]) {
            statusMap[entry.resource_id] = {};
        }
        statusMap[entry.resource_id][entry.date] = entry.status;
    });

    // Table body
    const tbody = document.createElement('tbody');

    camStatusResources.forEach(resource => {
        const row = document.createElement('tr');

        // Resource name cell
        const tdName = document.createElement('td');
        tdName.textContent = resource.name;
        tdName.style.border = '1px solid #ccc';
        tdName.style.padding = '8px';
        row.appendChild(tdName);

        // Cells for each weekday with checkbox
        let checkedCount = 0;
        const totalDays = weekdays.length;

        weekdays.forEach(day => {
            const tdDay = document.createElement('td');
            tdDay.style.border = '1px solid #ccc';
            tdDay.style.padding = '4px';
            tdDay.style.textAlign = 'center';

            const dateStr = `${camStatusYear}-${String(camStatusMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const checked = statusMap[resource.id] && statusMap[resource.id][dateStr] === 1;

            if (checked) checkedCount++;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.resourceId = resource.id;
            checkbox.dataset.date = dateStr;
            checkbox.checked = checked;

            // Event listener to update camStatusData on change
            checkbox.addEventListener('change', (e) => {
                const rId = parseInt(e.target.dataset.resourceId, 10);
                const d = e.target.dataset.date;
                const val = e.target.checked ? 1 : 0;

                // Update statusMap and camStatusData
                if (!statusMap[rId]) statusMap[rId] = {};
                statusMap[rId][d] = val;

                // Update camStatusData array
                const existingIndex = camStatusData.findIndex(entry => entry.resource_id === rId && entry.date === d);
                if (existingIndex !== -1) {
                    camStatusData[existingIndex].status = val;
                } else {
                    camStatusData.push({ resource_id: rId, date: d, status: val });
                }

                // Update total cell text - count only current month weekdays
                const totalCell = row.querySelector('.total-cell');
                const currentMonthStatuses = Object.keys(statusMap[rId]).filter(date => {
                    const dateObj = new Date(date);
                    return dateObj.getFullYear() === camStatusYear && dateObj.getMonth() === camStatusMonth - 1;
                });
                const newCheckedCount = currentMonthStatuses.filter(date => statusMap[rId][date] === 1).length;
                totalCell.textContent = `${newCheckedCount}/${totalDays}`;
            });

            tdDay.appendChild(checkbox);
            row.appendChild(tdDay);
        });

        // Total cell
        const tdTotal = document.createElement('td');
        tdTotal.classList.add('total-cell');
        tdTotal.style.border = '1px solid #ccc';
        tdTotal.style.padding = '8px';
        tdTotal.style.textAlign = 'center';
        tdTotal.textContent = `${checkedCount}/${totalDays}`;
        row.appendChild(tdTotal);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

function collectCamStatusChanges() {
    const checkboxes = document.querySelectorAll('#camStatusGridContainer input[type="checkbox"]');
    const entries = [];

    checkboxes.forEach(checkbox => {
        const resourceId = parseInt(checkbox.dataset.resourceId, 10);
        const date = checkbox.dataset.date;
        const status = checkbox.checked ? 1 : 0;

        entries.push({
            resource_id: resourceId,
            date: date,
            status: status
        });
    });

    return entries;
}

async function handleSaveCamStatus() {
    const saveBtn = document.getElementById('camSaveBtn');
    const spinner = document.getElementById('camStatusSpinner');

    // Show spinner and disable save button
    if (spinner) spinner.style.display = 'block';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    const entries = collectCamStatusChanges();
    try {
        await saveCamStatus(entries);
        alert('CAM Status saved successfully!');
    } catch (error) {
        console.error('Failed to save CAM Status:', error);
        alert('Failed to save CAM Status. Please try again.');
    } finally {
        // Hide spinner and enable save button
        if (spinner) spinner.style.display = 'none';
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

// Initialize CAM Status view
function initializeCamStatus() {
    const yearSelect = document.getElementById('camYearSelect');
    const monthSelect = document.getElementById('camMonthSelect');
    const saveBtn = document.getElementById('camSaveBtn');

    if (yearSelect && monthSelect && saveBtn) {
        // Populate year dropdown dynamically
        populateYearDropdowns();

        // Set default selected year and month as strings
        yearSelect.value = String(camStatusYear);
        monthSelect.value = String(camStatusMonth);

        console.log('initializeCamStatus: yearSelect.value =', yearSelect.value, ', monthSelect.value =', monthSelect.value);

        yearSelect.addEventListener('change', () => {
            console.log('yearSelect changed to', yearSelect.value);
            camStatusYear = parseInt(yearSelect.value, 10);
            loadCamStatus(camStatusYear, camStatusMonth);
        });

        monthSelect.addEventListener('change', () => {
            console.log('monthSelect changed to', monthSelect.value);
            camStatusMonth = parseInt(monthSelect.value, 10);
            loadCamStatus(camStatusYear, camStatusMonth);
        });

        saveBtn.addEventListener('click', handleSaveCamStatus);

        // Load initial data
        loadCamStatus(camStatusYear, camStatusMonth);
    } else {
        console.error('CAM Status controls not found in DOM');
    }
}



// Populate Year Dropdowns
function populateYearDropdowns() {
    const yearSelects = document.querySelectorAll('.year-select');

    yearSelects.forEach(select => {
        select.innerHTML = '';
        for (let year = 2021; year <= 2030; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === new Date().getFullYear()) option.selected = true;
            select.appendChild(option);
        }
    });
}

// Add Resource
async function addResource(e) {
    e.preventDefault();
    const empId = document.getElementById('newEmpIdInput').value.trim();
    const name = document.getElementById('newNameInput').value.trim();

    if (empId && name) {
        const success = await saveResource({ empId, name });
        if (success) {
            await loadResourcesFromDB();
            renderResources();
            document.getElementById('newEmpIdInput').value = '';
            document.getElementById('newNameInput').value = '';
        } else {
            alert('Failed to add resource');
        }
    }
}

// Render Resources
function renderResources() {
    const tbody = document.getElementById('resourcesTableBody');
    tbody.innerHTML = '';

    resources.forEach(resource => {
        const row = document.createElement('tr');

        let cells = `<td>${resource.empId}</td><td>${resource.name}</td>`;

        resourceColumns.forEach(col => {
            cells += `<td><input type="text" class="form-control" value="${resource[col] || ''}" onchange="updateResourceData('${resource.empId}', '${col}', this.value)"></td>`;
        });

        cells += `<td><button class="btn btn-sm btn-danger" onclick="deleteResource('${resource.id}')">Delete</button></td>`;

        row.innerHTML = cells;
        tbody.appendChild(row);
    });
}

// Update Resource Data
async function updateResourceData(empId, column, value) {
    const resource = resources.find(r => r.empId === empId);
    if (resource) {
        resource[column] = value;
        await saveResource(resource);
    }
}

// Delete Resource
async function deleteResource(id) {
    if (confirm('Are you sure you want to delete this resource?')) {
        const success = await deleteResource(id);
        if (success) {
            await loadResourcesFromDB();
            renderResources();
        } else {
            alert('Failed to delete resource');
        }
    }
}

function showAddLeaveModal() {
    // Implementation for showing add leave modal
    console.log('Show add leave modal');
}

async function addLeave(e) {
    e.preventDefault();
    // Implementation for adding leave
    console.log('Add leave');
}

function generateLeavesReport() {
    // Implementation for generating leaves report
    console.log('Generate leaves report');
}
