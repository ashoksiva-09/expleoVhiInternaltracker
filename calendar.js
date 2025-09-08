let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentLocation = 'Pune';

function getYearOptions(start, end) {
    let options = '';
    for (let y = start; y <= end; y++) {
        options += `<option value="${y}"${y === currentYear ? ' selected' : ''}>${y}</option>`;
    }
    return options;
}

function renderCalendar(year, month, location) {
    const calendarContainer = document.getElementById('calendarContainer');
    calendarContainer.innerHTML = '';

    const date = new Date(year, month, 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = date.getDay();

    // Year dropdown: show 2020-2030
    let html = `
        <div class="calendar-header">
            <span class="calendar-arrow" id="prevMonth">&#8592;</span>
            <div style="flex:1;text-align:center;font-size:1.2rem;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;">
                <span>${monthName}</span>
                <select id="yearSelect" style="margin-left:8px;padding:2px 8px;border-radius:6px;border:1px solid #ddd;font-size:1rem;">
                    ${getYearOptions(2020, 2030)}
                </select>
            </div>
            <span class="calendar-arrow" id="nextMonth">&#8594;</span>
        </div>
        <table class="calendar"><thead><tr>
    `;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => html += `<th>${d}</th>`);
    html += '</tr></thead><tbody><tr>';

    let day = 1;
    for (let i = 0; i < 42; i++) {
        if (i < startDay || day > daysInMonth) {
            html += '<td></td>';
        } else {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holiday = holidays2025.find(
                h => h.date === dateStr && h.locations.includes(location)
            );
            if (holiday) {
                html += `<td class="holiday">${day}<span class="holiday-reason">${holiday.reason}</span></td>`;
            } else {
                html += `<td>${day}</td>`;
            }
            day++;
        }
        if ((i + 1) % 7 === 0 && day <= daysInMonth) html += '</tr><tr>';
    }
    html += '</tr></tbody></table>';
    calendarContainer.innerHTML = html;
    const tbody = calendarContainer.querySelector('tbody');

    document.getElementById('prevMonth').onclick = function() {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
        } else {
            currentMonth--;
        }
        renderCalendar(currentYear, currentMonth, currentLocation);
    };
    document.getElementById('nextMonth').onclick = function() {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
        } else {
            currentMonth++;
        }
        renderCalendar(currentYear, currentMonth, currentLocation);
    };
    document.getElementById('yearSelect').onchange = function(e) {
        currentYear = parseInt(e.target.value, 10);
        renderCalendar(currentYear, currentMonth, currentLocation);
    };
}

document.getElementById('locationSelect').onchange = function(e) {
    currentLocation = e.target.value;
    renderCalendar(currentYear, currentMonth, currentLocation);
};

// Initial render
renderCalendar(currentYear, currentMonth, currentLocation);