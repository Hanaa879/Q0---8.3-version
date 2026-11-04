let documents = [];
let incidents = [];

// Safe Storage Read
function loadData() {
    try {
        const rawDocs = localStorage.getItem('q0_docs');
        if (rawDocs) {
            const parsed = JSON.parse(rawDocs);
            if (Array.isArray(parsed)) {
                documents = parsed.filter(d => d && Array.isArray(d.approvals));
            }
        }
    } catch(e) { documents = []; }

    try {
        const rawInc = localStorage.getItem('q0_incidents');
        if (rawInc) {
            const parsed = JSON.parse(rawInc);
            if (Array.isArray(parsed)) incidents = parsed;
        }
    } catch(e) { incidents = []; }
}

function switchStudentTab(tabId, btn) {
    document.getElementById('subTab').classList.add('hidden');
    document.getElementById('myDocsTab').classList.add('hidden');
    document.querySelectorAll('#studentPortal .tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    btn.classList.add('active');
}

function changeRole() {
    const role = document.getElementById('roleSelector').value;
    document.getElementById('studentPortal').classList.add('hidden');
    document.getElementById('facultyPortal').classList.add('hidden');
    document.getElementById('maintenancePortal').classList.add('hidden');

    if (role === 'student') {
        document.getElementById('studentPortal').classList.remove('hidden');
    } else if (role === 'faculty') {
        document.getElementById('facultyPortal').classList.remove('hidden');
    } else if (role === 'maintenance') {
        document.getElementById('maintenancePortal').classList.remove('hidden');
    }
}

function submitDocRequest() {
    const email = document.getElementById('studentEmail').value.trim();
    const type = document.getElementById('docType').value;
    const urgency = document.getElementById('docUrgency').value;
    const reason = document.getElementById('docReason').value.trim();

    if (!email || !reason) {
        alert('Please complete all required fields.');
        return;
    }

    const checkedBoxes = document.querySelectorAll('.staff-checkbox:checked');
    const selectedStaff = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedStaff.length === 0) {
        alert('Please select at least one staff approver!');
        return;
    }

    const teacherApprovals = selectedStaff.map(staffName => ({
        staff: staffName,
        status: 'PENDING'
    }));

    const newDoc = {
        id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
        email: email,
        type: type,
        urgency: urgency,
        approvals: teacherApprovals,
        reason: reason,
        status: 'PENDING',
        date: new Date().toLocaleDateString()
    };

    documents.unshift(newDoc);
    saveAndRender();
    
    document.getElementById('docReason').value = '';
    alert('Request submitted! Requires sign-off from ' + selectedStaff.length + ' teacher(s).');
}

function submitIncidentReport() {
    const location = document.getElementById('incLocation').value.trim();
    const desc = document.getElementById('incDesc').value.trim();
    const fileInput = document.getElementById('incPhoto');

    if (!location || !desc) {
        alert('Please fill in location and description.');
        return;
    }
    if (!fileInput.files || !fileInput.files[0]) {
        alert('Please select an issue photo!');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(evt) {
        const img = new Image();
        img.src = evt.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 500;
            canvas.height = img.height * (500 / img.width);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);

            const newIncident = {
                id: 'INC-' + Math.floor(1000 + Math.random() * 9000),
                location: location,
                desc: desc,
                photo: compressedBase64,
                status: 'OPEN',
                date: new Date().toLocaleDateString()
            };
            incidents.unshift(newIncident);
            saveAndRender();
            
            document.getElementById('incLocation').value = '';
            document.getElementById('incDesc').value = '';
            document.getElementById('incPhoto').value = '';
            alert('Incident reported successfully!');
        };
    };
    reader.readAsDataURL(file);
}

function approveAsTeacher(docId, teacherName, action) {
    const item = documents.find(d => d.id === docId);
    if (!item || !item.approvals) return;

    const teacherObj = item.approvals.find(a => a.staff === teacherName);
    if (teacherObj) {
        teacherObj.status = action;
    }

    if (item.approvals.some(a => a.status === 'REJECTED')) {
        item.status = 'REJECTED';
    } else if (item.approvals.every(a => a.status === 'APPROVED')) {
        item.status = 'APPROVED';
    } else {
        item.status = 'PENDING';
    }

    saveAndRender();
}

function resolveIncident(id) {
    const item = incidents.find(i => i.id === id);
    if (item) item.status = 'RESOLVED';
    saveAndRender();
}

function saveAndRender() {
    try {
        localStorage.setItem('q0_docs', JSON.stringify(documents));
        localStorage.setItem('q0_incidents', JSON.stringify(incidents));
    } catch(e) {}
    renderAll();
}

function renderAll() {
    const pElem = document.getElementById('statPending');
    const aElem = document.getElementById('statApproved');
    const iElem = document.getElementById('statIncidents');

    if (pElem) pElem.innerText = documents.filter(d => d.status === 'PENDING').length;
    if (aElem) aElem.innerText = documents.filter(d => d.status === 'APPROVED').length;
    if (iElem) iElem.innerText = incidents.filter(i => i.status === 'OPEN').length;

    const urgencyWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    const sortedDocs = [...documents].sort((a, b) => (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0));

    const renderApprovalStatus = function(d) {
        if (!d.approvals || !Array.isArray(d.approvals)) return '';

        const approvedCount = d.approvals.filter(a => a.status === 'APPROVED').length;
        const totalCount = d.approvals.length;
        const pct = Math.round((approvedCount / totalCount) * 100);

        const pillsHtml = d.approvals.map(a => {
            let symbol = '⏳';
            if (a.status === 'APPROVED') symbol = '✓';
            if (a.status === 'REJECTED') symbol = '✕';
            return '<span class="teacher-pill ' + a.status + '">' + symbol + ' ' + a.staff + '</span>';
        }).join('');

        return '<div class="progress-container">' +
            '<div class="progress-lbl">' +
                '<span>Approval Progress: <b>' + approvedCount + '/' + totalCount + ' Teachers Approved</b></span>' +
                '<span>' + pct + '%</span>' +
            '</div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="teacher-pills">' + pillsHtml + '</div>' +
        '</div>';
    };

    // Student Docs Feed
    const sDocs = document.getElementById('studentDocsFeed');
    if (sDocs) {
        sDocs.innerHTML = sortedDocs.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No requests submitted yet.</p>' :
            sortedDocs.map(d => 
                '<div class="feed-item">' +
                    '<div class="feed-header">' +
                        '<div class="feed-title">' + d.type + ' (' + d.id + ')</div>' +
                        '<div><span class="urgency-badge urgency-' + d.urgency + '">' + d.urgency + '</span> <span class="badge ' + d.status + '">' + d.status + '</span></div>' +
                    '</div>' +
                    '<div class="feed-sub">Reason: ' + d.reason + ' • ' + d.date + '</div>' +
                    renderApprovalStatus(d) +
                '</div>'
            ).join('');
    }

    // Student Incidents Feed
    const sInc = document.getElementById('studentIncidentsFeed');
    if (sInc) {
        sInc.innerHTML = incidents.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No incidents reported yet.</p>' :
            incidents.map(i => 
                '<div class="feed-item">' +
                    '<div class="feed-header">' +
                        '<div class="feed-title">' + i.location + ' (' + i.id + ')</div>' +
                        '<span class="badge ' + i.status + '">' + i.status + '</span>' +
                    '</div>' +
                    '<div class="feed-sub">' + i.desc + ' • ' + i.date + '</div>' +
                '</div>'
            ).join('');
    }

    // Faculty Feed
    const fFeed = document.getElementById('facultyApprovalsFeed');
    const activeTeacherSelect = document.getElementById('activeTeacherSelect');
    const activeTeacher = activeTeacherSelect ? activeTeacherSelect.value : 'Dr. Smith (HOD)';

    if (fFeed) {
        const assignedDocs = sortedDocs.filter(d => d.approvals && d.approvals.some(a => a.staff === activeTeacher));

        if (assignedDocs.length === 0) {
            fFeed.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No active requests assigned to <b>' + activeTeacher + '</b>.</p>';
        } else {
            fFeed.innerHTML = assignedDocs.map(d => {
                const myApproval = d.approvals.find(a => a.staff === activeTeacher);
                const myStatus = myApproval ? myApproval.status : 'PENDING';
                const teacherShortName = activeTeacher.split(' ')[1] || activeTeacher;

                let actionButtons = '';
                if (d.status !== 'REJECTED') {
                    if (myStatus === 'PENDING') {
                        actionButtons = '<div class="action-btns">' +
                            '<button onclick="approveAsTeacher(\'' + d.id + '\', \'' + activeTeacher + '\', \'APPROVED\')" class="btn btn-sm btn-success">Approve as ' + teacherShortName + '</button>' +
                            '<button onclick="approveAsTeacher(\'' + d.id + '\', \'' + activeTeacher + '\', \'REJECTED\')" class="btn btn-sm btn-danger">Reject</button>' +
                        '</div>';
                    } else {
                        actionButtons = '<div style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">You marked this request as: <b>' + myStatus + '</b></div>';
                    }
                }

                return '<div class="feed-item">' +
                    '<div class="feed-header">' +
                        '<div class="feed-title">' + d.type + ' <span style="font-weight:normal; color:var(--text-muted);">(' + d.id + ')</span></div>' +
                        '<div><span class="urgency-badge urgency-' + d.urgency + '">' + d.urgency + '</span> <span class="badge ' + d.status + '">' + d.status + '</span></div>' +
                    '</div>' +
                    '<div class="feed-sub">Student: ' + d.email + ' • ' + d.date + '</div>' +
                    '<div style="font-size:0.85rem; color:#cbd5e1; margin-bottom:8px;">Reason: ' + d.reason + '</div>' +
                    renderApprovalStatus(d) +
                    actionButtons +
                '</div>';
            }).join('');
        }
    }

    // Maintenance Feed
    const mFeed = document.getElementById('maintenanceFeed');
    if (mFeed) {
        mFeed.innerHTML = incidents.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No issues reported.</p>' :
            incidents.map(i => 
                '<div class="feed-item">' +
                    '<div class="feed-header">' +
                        '<div class="feed-title">' + i.location + ' <span style="font-weight:normal; color:var(--text-muted);">(' + i.id + ')</span></div>' +
                        '<span class="badge ' + i.status + '">' + i.status + '</span>' +
                    '</div>' +
                    '<div class="feed-sub">Details: ' + i.desc + ' • ' + i.date + '</div>' +
                    '<img src="' + i.photo + '" class="img-preview">' +
                    (i.status === 'OPEN' ? '<button onclick="resolveIncident(\'' + i.id + '\')" class="btn btn-sm btn-success" style="margin-top:6px;">Mark Issue as Resolved</button>' : '') +
                '</div>'
            ).join('');
    }
}

// Guaranteed execution when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderAll();
});

// Immediate execution fallback
loadData();
renderAll();