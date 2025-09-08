// API Client for VHI Dashboard
class VHIAPI {
    constructor() {
        this.baseURL = '/api';
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Resources
    async getResources() {
        return this.request('/resources');
    }

    async addResource(resource) {
        return this.request('/resources', {
            method: 'POST',
            body: JSON.stringify(resource)
        });
    }

    async updateResource(empId, resource) {
        return this.request(`/resources/${empId}`, {
            method: 'PUT',
            body: JSON.stringify(resource)
        });
    }

    async deleteResource(id) {
        return this.request(`/resources/${id}`, {
            method: 'DELETE'
        });
    }

    // Columns
    async getColumns() {
        return this.request('/columns');
    }

    async addColumn(name) {
        return this.request('/columns', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async deleteColumn(name) {
        return this.request(`/columns/${name}`, {
            method: 'DELETE'
        });
    }

    // Resource data (custom columns)
    async updateResourceData(resourceId, columnName, value) {
        return this.request(`/resources/${resourceId}/data`, {
            method: 'POST',
            body: JSON.stringify({ column_name: columnName, value })
        });
    }

    // Leaves
    async getLeaves(month = null) {
        const url = month ? `/leaves?month=${month}` : '/leaves';
        return this.request(url);
    }

    async addLeave(leave) {
        return this.request('/leaves', {
            method: 'POST',
            body: JSON.stringify(leave)
        });
    }

    async updateLeave(id, leave) {
        return this.request(`/leaves/${id}`, {
            method: 'PUT',
            body: JSON.stringify(leave)
        });
    }

    async deleteLeave(id) {
        return this.request(`/leaves/${id}`, {
            method: 'DELETE'
        });
    }

    // Trainings
    async getTrainings(month = null, year = null) {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        const url = params.toString() ? `/trainings?${params.toString()}` : '/trainings';
        return this.request(url);
    }

    async addTraining(training) {
        return this.request('/trainings', {
            method: 'POST',
            body: JSON.stringify(training)
        });
    }

    async updateTraining(id, training) {
        return this.request(`/trainings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(training)
        });
    }

    async deleteTraining(id) {
        return this.request(`/trainings/${id}`, {
            method: 'DELETE'
        });
    }

    // Learnings
    async getLearnings(month = null, year = null) {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        const url = params.toString() ? `/learnings?${params.toString()}` : '/learnings';
        return this.request(url);
    }

    async addLearning(learning) {
        return this.request('/learnings', {
            method: 'POST',
            body: JSON.stringify(learning)
        });
    }

    async updateLearning(id, learning) {
        return this.request(`/learnings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(learning)
        });
    }

    async deleteLearning(id) {
        return this.request(`/learnings/${id}`, {
            method: 'DELETE'
        });
    }

    // Timesheet
    async getTimesheet(filters = {}) {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined) {
                params.append(key, filters[key]);
            }
        });
        const url = params.toString() ? `/timesheet?${params.toString()}` : '/timesheet';
        return this.request(url);
    }

    async addTimesheetEntry(entry) {
        return this.request('/timesheet', {
            method: 'POST',
            body: JSON.stringify(entry)
        });
    }

    async updateTimesheetEntry(id, entry) {
        return this.request(`/timesheet/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entry)
        });
    }

    async deleteTimesheetEntry(id) {
        return this.request(`/timesheet/${id}`, {
            method: 'DELETE'
        });
    }

    // Bold Minds
    async getBoldMinds() {
        return this.request('/bold-minds');
    }

    async saveBoldMinds(nominations) {
        return this.request('/bold-minds', {
            method: 'POST',
            body: JSON.stringify({ nominations })
        });
    }
}

// Global API instance
const api = new VHIAPI();

// Utility functions for the frontend
async function loadResources() {
    try {
        const response = await api.getResources();
        return response;
    } catch (error) {
        console.error('Failed to load resources:', error);
        // Fallback to empty data
        return { resources: [], columns: [] };
    }
}

async function saveResource(resource) {
    try {
        let savedResource;
        
        if (resource.id) {
            console.log('Attempting to update resource with empId:', resource.empId);
            await api.updateResource(resource.empId, {
                name: resource.name,
                empId: resource.empId
            });
            savedResource = resource;
        } else {
            console.log('Attempting to add new resource with empId:', resource.empId);
            savedResource = await api.addResource({
                empId: resource.empId,
                name: resource.name
            });
        }

        // Save custom column data
        const columns = await api.getColumns();
        for (const column of columns) {
            if (resource[column] !== undefined && resource[column] !== '') {
                await api.updateResourceData(savedResource.id || savedResource.empId, column, resource[column]);
            }
        }

        return true;
    } catch (error) {
        console.log('Attempting to save resource:', resource);
        console.error('Failed to save resource:', error);
        return false;
    }
}

async function deleteResource(resourceId) {
    try {
        await api.deleteResource(resourceId);
        return true;
    } catch (error) {
        console.error('Failed to delete resource:', error);
        return false;
    }
}

async function addCustomColumn(columnName) {
    try {
        await api.addColumn(columnName);
        return true;
    } catch (error) {
        console.error('Failed to add column:', error);
        return false;
    }
}

async function removeCustomColumn(columnName) {
    try {
        await api.deleteColumn(columnName);
        return true;
    } catch (error) {
        console.error('Failed to remove column:', error);
        return false;
    }
}

// Trainings utility functions
async function loadTrainings(month = null, year = null) {
    try {
        const response = await api.getTrainings(month, year);
        return response;
    } catch (error) {
        console.error('Failed to load trainings:', error);
        // Fallback to empty array
        return [];
    }
}

async function saveTraining(training) {
    try {
        if (training.id) {
            await api.updateTraining(training.id, {
                empId: training.empId,
                resource_name: training.resource_name,
                platform: training.platform,
                course_name: training.course_name,
                description: training.description,
                start_date: training.start_date,
                end_date: training.end_date,
                hours: training.hours
            });
        } else {
            await api.addTraining({
                empId: training.empId,
                resource_name: training.resource_name,
                platform: training.platform,
                course_name: training.course_name,
                description: training.description,
                start_date: training.start_date,
                end_date: training.end_date,
                hours: training.hours
            });
        }
        return true;
    } catch (error) {
        console.error('Failed to save training:', error);
        return false;
    }
}

async function deleteTraining(id) {
    try {
        await api.deleteTraining(id);
        return true;
    } catch (error) {
        console.error('Failed to delete training:', error);
        return false;
    }
}

// Learnings utility functions
async function loadLearnings(month = null, year = null) {
    try {
        const response = await api.getLearnings(month, year);
        return response;
    } catch (error) {
        console.error('Failed to load learnings:', error);
        // Fallback to empty array
        return [];
    }
}

async function saveLearning(learning) {
    try {
        if (learning.id) {
            await api.updateLearning(learning.id, {
                empId: learning.empId,
                resource_name: learning.resource_name,
                platform: learning.platform,
                description: learning.description,
                date: learning.date
            });
        } else {
            await api.addLearning({
                empId: learning.empId,
                resource_name: learning.resource_name,
                platform: learning.platform,
                description: learning.description,
                date: learning.date
            });
        }
        return true;
    } catch (error) {
        console.error('Failed to save learning:', error);
        return false;
    }
}

async function deleteLearning(id) {
    try {
        await api.deleteLearning(id);
        return true;
    } catch (error) {
        console.error('Failed to delete learning:', error);
        return false;
    }
}

// Timesheet utility functions
async function loadTimesheet(year, month, week) {
    try {
        const filters = {};
        if (year) filters.year = year;
        if (month) filters.month = month;
        if (week !== null && week !== undefined) filters.week = week;

        const response = await api.getTimesheet(filters);
        return response;
    } catch (error) {
        console.error('Failed to load timesheet:', error);
        // Fallback to empty array
        return [];
    }
}

async function saveTimesheetEntry(entry) {
    try {
        if (entry.id) {
            await api.updateTimesheetEntry(entry.id, {
                emp_id: entry.empId,
                year: entry.year,
                month: entry.month,
                week: entry.week,
                whizible: entry.whizible || '',
                changepoint: entry.changepoint || '',
                planview: entry.planview || '',
                comments: entry.comments || ''
            });
        } else {
            await api.addTimesheetEntry({
                emp_id: entry.empId,
                year: entry.year,
                month: entry.month,
                week: entry.week,
                whizible: entry.whizible || '',
                changepoint: entry.changepoint || '',
                planview: entry.planview || '',
                comments: entry.comments || ''
            });
        }
        return true;
    } catch (error) {
        console.error('Failed to save timesheet entry:', error);
        return false;
    }
}

async function deleteTimesheetEntry(id) {
    try {
        await api.deleteTimesheetEntry(id);
        return true;
    } catch (error) {
        console.error('Failed to delete timesheet entry:', error);
        return false;
    }
}

// CAM Status
async function getCamStatus(year, month) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month.toString().padStart(2, '0'));
    const url = `/cam-status?${params.toString()}`;
    return api.request(url);
}

async function saveCamStatus(entries) {
    return api.request('/cam-status', {
        method: 'POST',
        body: JSON.stringify({ entries })
    });
}

// Bold Minds utility functions
async function loadBoldMinds() {
    try {
        const response = await api.getBoldMinds();
        return response;
    } catch (error) {
        console.error('Failed to load Bold Minds:', error);
        // Fallback to empty array
        return [];
    }
}

async function saveBoldMinds(nominations) {
    try {
        await api.saveBoldMinds(nominations);
        return true;
    } catch (error) {
        console.error('Failed to save Bold Minds:', error);
        return false;
    }
}
