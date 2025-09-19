// Frontend logic for Certifications feature

let certifications = [];

// Load certifications from API
async function loadCertificationsFromDB() {
    try {
        const monthFilter = document.getElementById('certificationsMonthFilter').value;
        const yearFilter = document.getElementById('certificationsYearFilter').value;
        certifications = await loadCertifications(monthFilter, yearFilter);
        renderCertificationsTable();
    } catch (error) {
        console.error('Failed to load certifications from database:', error);
        certifications = [];
        renderCertificationsTable();
    }
}

// Render certifications table
function renderCertificationsTable() {
    const tbody = document.querySelector('#certificationsTable tbody');
    tbody.innerHTML = '';

    certifications.forEach((cert, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cert.empId}</td>
            <td>${cert.resource_name}</td>
            <td>${cert.certification_name}</td>
            <td>${cert.description || ''}</td>
            <td>${formatDateDDMMYYYY(cert.date)}</td>
            <td>
                <button type="button" class="edit-certification-btn" data-idx="${idx}" style="padding:4px 12px;border-radius:5px;background:#1976d2;color:#fff;border:none;cursor:pointer;margin-right:5px;">Edit</button>
                <button type="button" class="delete-certification-btn" data-id="${cert.id}" style="padding:4px 12px;border-radius:5px;background:#e53935;color:#fff;border:none;cursor:pointer;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach event listeners
    tbody.querySelectorAll('.edit-certification-btn').forEach(btn => {
        btn.onclick = function() {
            const idx = parseInt(this.getAttribute('data-idx'), 10);
            openCertificationModal(certifications[idx]);
        };
    });

    tbody.querySelectorAll('.delete-certification-btn').forEach(btn => {
        btn.onclick = async function() {
            const id = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this certification entry?')) {
                await deleteCertification(id);
                await loadCertificationsFromDB();
            }
        };
    });
}

// Open certification modal for add/edit
function openCertificationModal(certification = null) {
    const modal = document.getElementById('certificationModal');
    const modalTitle = document.getElementById('certificationModalTitle');
    const form = document.getElementById('certificationForm');

    // Update dropdowns with current resources
    updateCertificationResourceDropdowns();

    if (certification) {
        // Edit mode
        modalTitle.textContent = 'Edit Certification';
        form.dataset.mode = 'edit';
        form.dataset.id = certification.id;
        document.getElementById('certificationEmpId').value = certification.empId;
        document.getElementById('certificationResourceName').value = certification.resource_name;
        document.getElementById('certificationName').value = certification.certification_name || '';
        document.getElementById('certificationDescription').value = certification.description || '';
        document.getElementById('certificationDate').value = certification.date;
    } else {
        // Add mode
        modalTitle.textContent = 'Add Certification';
        form.dataset.mode = 'add';
        form.reset();
        document.getElementById('certificationEmpId').value = '';
        document.getElementById('certificationResourceName').value = '';
    }

    modal.style.display = '';
    document.getElementById('certificationModalOverlay').style.display = '';
}

// Close certification modal
function closeCertificationModal() {
    document.getElementById('certificationModal').style.display = 'none';
    document.getElementById('certificationModalOverlay').style.display = 'none';
}

// Certification form submission
document.getElementById('certificationForm').onsubmit = async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const certificationData = {
        empId: formData.get('empId'),
        resource_name: formData.get('resource_name'),
        certification_name: formData.get('certification_name'),
        description: formData.get('description'),
        date: formData.get('date')
    };

    if (this.dataset.mode === 'edit') {
        certificationData.id = this.dataset.id;
    }

    const success = await saveCertification(certificationData);
    if (success) {
        closeCertificationModal();
        await loadCertificationsFromDB();
    } else {
        alert('Failed to save certification. Please try again.');
    }
};

// Cancel button for certification modal
document.getElementById('certificationCancelBtn').onclick = closeCertificationModal;
document.getElementById('certificationModalOverlay').onclick = closeCertificationModal;

// Add certification button
document.addEventListener('DOMContentLoaded', function() {
    const addCertificationBtn = document.getElementById('addCertificationBtn');
    if (addCertificationBtn) {
        addCertificationBtn.onclick = function() {
            openCertificationModal();
        };
    }
});

// Month and year filter change handlers
document.getElementById('certificationsMonthFilter').onchange = function() {
    loadCertificationsFromDB();
};

document.getElementById('certificationsYearFilter').onchange = function() {
    loadCertificationsFromDB();
};

// Export to Excel functionality
document.getElementById('exportCertificationsBtn').onclick = function() {
    exportCertificationsToExcel();
};

function exportCertificationsToExcel() {
    if (!certifications || certifications.length === 0) {
        alert('No certification data available to export.');
        return;
    }

    let csvContent = "Employee ID,Resource Name,Certification Name,Description,Date\n";

    certifications.forEach(cert => {
        const row = [
            String(cert.empId || ''),
            String(cert.resource_name || ''),
            String(cert.certification_name || ''),
            String(cert.description || ''),
            formatDateDDMMYYYY(cert.date) || ''
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
        csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `certifications_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Update resource dropdowns for certifications modal
function updateCertificationResourceDropdowns() {
    const empIdSelect = document.getElementById('certificationEmpId');
    const resourceNameSelect = document.getElementById('certificationResourceName');
    if (!empIdSelect || !resourceNameSelect) return;

    empIdSelect.innerHTML = '<option value="">Select Employee ID</option>';
    resourceNameSelect.innerHTML = '<option value="">Select Resource Name</option>';

    resources.forEach(res => {
        const empIdOption = document.createElement('option');
        empIdOption.value = res.empId;
        empIdOption.textContent = res.empId;
        empIdSelect.appendChild(empIdOption);

        const nameOption = document.createElement('option');
        nameOption.value = res.name;
        nameOption.textContent = res.name;
        resourceNameSelect.appendChild(nameOption);
    });
}

// Sync Employee ID and Resource Name dropdowns
document.addEventListener('DOMContentLoaded', function() {
    const empIdSelect = document.getElementById('certificationEmpId');
    const resourceNameSelect = document.getElementById('certificationResourceName');

    if (empIdSelect && resourceNameSelect) {
        empIdSelect.addEventListener('change', function() {
            const selectedEmpId = this.value;
            const matchedResource = resources.find(r => r.empId === selectedEmpId);
            if (matchedResource) {
                resourceNameSelect.value = matchedResource.name;
            } else {
                resourceNameSelect.value = '';
            }
        });

        resourceNameSelect.addEventListener('change', function() {
            const selectedName = this.value;
            const matchedResource = resources.find(r => r.name === selectedName);
            if (matchedResource) {
                empIdSelect.value = matchedResource.empId;
            } else {
                empIdSelect.value = '';
            }
        });
    }
});
