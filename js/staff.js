// Staff pages: courier and vehicle reviews.
// Sprint 1 prototype: reads and updates the sample data in js/data.js (no backend).

// Ids decided during this visit, kept visible so Staff can see the result.
const staffReviewedCourierIds = [];
const staffReviewedVehicleIds = [];

// Convert a YYYY-MM-DD string into a local Date object (no time zone shift).
function staffParseDate(value) {
    const parts = value.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Format a YYYY-MM-DD date as a short label such as "03 Oct".
function staffFormatDate(value) {
    if (!value) {
        return '-';
    }
    return staffParseDate(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Format a YYYY-MM-DD date with the year, such as "03 Oct 2026".
function staffFormatFullDate(value) {
    if (!value) {
        return 'Missing';
    }
    return staffParseDate(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Hide the middle digits of a NIF, for example 245118321 becomes 245***321.
function staffMaskNif(nif) {
    if (!nif || nif.length !== 9) {
        return '-';
    }
    return nif.slice(0, 3) + '***' + nif.slice(6);
}

// Create a table cell with plain text (textContent never interprets HTML).
function staffCell(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}

// Build a status badge using the shared cms-badge styles.
function staffStatusBadge(status) {
    const styles = {
        pending: 'cms-badge-warning',
        approved: 'cms-badge-success',
        rejected: 'cms-badge-danger'
    };
    const badge = document.createElement('span');
    badge.className = 'cms-badge ' + (styles[status] || 'cms-badge-warning');
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    return badge;
}

// Build an Approve or Reject button that remembers which record it belongs to.
function staffDecisionButton(action, id) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action === 'approve' ? 'btn btn-sm btn-success mr-1' : 'btn btn-sm btn-danger';
    button.textContent = action === 'approve' ? 'Approve' : 'Reject';
    button.dataset.action = action;
    button.dataset.id = id;
    return button;
}

// Add a single full-width message row, used when a table has nothing to show.
function staffEmptyRow(body, message, columns) {
    const row = document.createElement('tr');
    const cell = staffCell(message);
    cell.colSpan = columns;
    cell.className = 'text-center text-muted';
    row.appendChild(cell);
    body.appendChild(row);
}

// Build the status cell and the decision cell shared by both review tables.
// When blockReason is given, the Approve button is disabled and the reason is shown.
function staffAppendDecisionCells(row, status, id, blockReason) {
    const statusCell = document.createElement('td');
    statusCell.appendChild(staffStatusBadge(status));
    row.appendChild(statusCell);

    const decisionCell = document.createElement('td');
    if (status === 'pending') {
        const approveButton = staffDecisionButton('approve', id);
        if (blockReason) {
            approveButton.disabled = true;
            approveButton.title = blockReason;
        }
        decisionCell.appendChild(approveButton);
        decisionCell.appendChild(staffDecisionButton('reject', id));

        if (blockReason) {
            const note = document.createElement('small');
            note.className = 'd-block text-danger mt-1';
            note.textContent = blockReason;
            decisionCell.appendChild(note);
        }
    } else {
        decisionCell.textContent = '-';
    }
    row.appendChild(decisionCell);
}

// ---------- Courier applications ----------

// Render courier accounts that are pending, plus the ones decided during this visit.
function staffRenderCourierApplications() {
    const body = document.getElementById('courierApplicationsBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';

    const couriers = movioData.users.filter(user =>
        user.role === 'courier' &&
        (user.approval_status === 'pending' || staffReviewedCourierIds.includes(user.user_id))
    );

    if (couriers.length === 0) {
        staffEmptyRow(body, 'No courier applications awaiting review.', 6);
        return;
    }

    couriers.forEach(user => {
        const row = document.createElement('tr');
        row.appendChild(staffCell(user.name));
        row.appendChild(staffCell(user.email));
        row.appendChild(staffCell(staffMaskNif(user.nif)));
        row.appendChild(staffCell(staffFormatDate(user.created_at)));
        staffAppendDecisionCells(row, user.approval_status, user.user_id);
        body.appendChild(row);
    });
}

// Handle a click on Approve or Reject for one pending courier.
// Reject first asks for a mandatory reason in the modal.
function staffDecideCourier(userId, action) {
    const user = movioData.users.find(item => item.user_id === userId);
    if (!user || user.approval_status !== 'pending') {
        return;
    }
    if (action === 'reject') {
        staffOpenRejectModal('courier', userId, 'Courier: ' + user.name + ' (' + user.email + ')');
        return;
    }
    staffApplyCourierDecision(user, 'approved', '');
}

// Save the courier decision, keep the row visible and refresh the table.
function staffApplyCourierDecision(user, status, comment) {
    user.approval_status = status;
    user.review_comment = comment;
    staffReviewedCourierIds.push(user.user_id);
    staffRenderCourierApplications();
    cmsToast(user.name + (status === 'approved' ? ' approved as courier.' : ' rejected as courier.'));
}

// ---------- Vehicle reviews ----------

// Documents expiring within this number of days are flagged as "expiring soon".
const staffExpiryWarningDays = 30;

// Return how many whole days remain until a YYYY-MM-DD date (negative if it has passed).
function staffDaysUntil(value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((staffParseDate(value) - today) / millisecondsPerDay);
}

// Classify an insurance or inspection expiry date as missing, expired, expiring or valid.
function staffDocumentStatus(expiryDate) {
    if (!expiryDate) {
        return { key: 'missing', label: 'Missing', style: 'cms-badge-danger' };
    }
    const days = staffDaysUntil(expiryDate);
    if (days < 0) {
        return { key: 'expired', label: 'Expired', style: 'cms-badge-danger' };
    }
    if (days <= staffExpiryWarningDays) {
        const label = days === 0 ? 'Expires today' : 'Expires in ' + days + (days === 1 ? ' day' : ' days');
        return { key: 'expiring', label: label, style: 'cms-badge-warning' };
    }
    return { key: 'valid', label: 'Valid', style: 'cms-badge-success' };
}

// Build a table cell with the document alert badge and the expiry date underneath.
function staffDocumentCell(expiryDate) {
    const cell = document.createElement('td');
    const status = staffDocumentStatus(expiryDate);

    const badge = document.createElement('span');
    badge.className = 'cms-badge ' + status.style;
    badge.textContent = status.label;
    cell.appendChild(badge);

    if (expiryDate) {
        const date = document.createElement('small');
        date.className = 'd-block text-muted mt-1';
        date.textContent = staffFormatFullDate(expiryDate);
        cell.appendChild(date);
    }
    return cell;
}

// Return the reason a vehicle cannot be approved, or an empty string if it can.
// Business rule: a vehicle needs valid insurance and inspection before it can be used.
function staffVehicleApprovalBlock(vehicle) {
    const problems = [];
    const insurance = staffDocumentStatus(vehicle.insurance_expiry_date).key;
    const inspection = staffDocumentStatus(vehicle.inspection_expiry_date).key;

    if (insurance === 'expired' || insurance === 'missing') {
        problems.push('insurance ' + insurance);
    }
    if (inspection === 'expired' || inspection === 'missing') {
        problems.push('inspection ' + inspection);
    }
    if (problems.length === 0) {
        return '';
    }
    return 'Cannot approve: ' + problems.join(', ') + '.';
}

// Return the type name (Bike, Moto, Van, Truck) for a vehicle_type_id.
function staffVehicleTypeName(typeId) {
    const type = movioData.vehicleTypes.find(item => item.vehicle_type_id === typeId);
    return type ? type.type_name : '-';
}

// Render vehicles that are pending, plus the ones decided during this visit.
function staffRenderVehicleReviews() {
    const body = document.getElementById('vehicleReviewsBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';

    const vehicles = movioData.vehicles.filter(vehicle =>
        vehicle.approval_status === 'pending' || staffReviewedVehicleIds.includes(vehicle.vehicle_id)
    );

    if (vehicles.length === 0) {
        staffEmptyRow(body, 'No vehicles awaiting review.', 6);
        return;
    }

    vehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        row.appendChild(staffCell(vehicle.license_plate + ' - ' + vehicle.model));
        row.appendChild(staffCell(staffVehicleTypeName(vehicle.vehicle_type_id)));
        row.appendChild(staffDocumentCell(vehicle.insurance_expiry_date));
        row.appendChild(staffDocumentCell(vehicle.inspection_expiry_date));
        staffAppendDecisionCells(row, vehicle.approval_status, vehicle.vehicle_id, staffVehicleApprovalBlock(vehicle));
        body.appendChild(row);
    });
}

// Handle a click on Approve or Reject for one pending vehicle.
// Approve is refused when documents are invalid; Reject asks for a mandatory reason.
function staffDecideVehicle(vehicleId, action) {
    const vehicle = movioData.vehicles.find(item => item.vehicle_id === vehicleId);
    if (!vehicle || vehicle.approval_status !== 'pending') {
        return;
    }
    if (action === 'reject') {
        staffOpenRejectModal('vehicle', vehicleId, 'Vehicle: ' + vehicle.license_plate + ' - ' + vehicle.model);
        return;
    }
    // Check the rule again here, so approval is refused even if the button is enabled by hand.
    const blockReason = staffVehicleApprovalBlock(vehicle);
    if (blockReason) {
        cmsToast(blockReason);
        return;
    }
    staffApplyVehicleDecision(vehicle, 'approved', 'Insurance and inspection documents checked and valid.');
}

// Save the vehicle decision, record it in the audit history and refresh both tables.
function staffApplyVehicleDecision(vehicle, status, comment) {
    vehicle.approval_status = status;
    staffAddVehicleAudit(vehicle.vehicle_id, status, comment);
    staffReviewedVehicleIds.push(vehicle.vehicle_id);
    staffRenderVehicleReviews();
    staffRenderDecisionHistory();
    cmsToast(vehicle.license_plate + (status === 'approved' ? ' approved.' : ' rejected.'));
}

// ---------- Decision history (VEHICLE_AUDIT) ----------

// Identify the signed-in Staff member from the demo session kept by js/cms.js.
function staffCurrentReviewer() {
    let email = '';
    let name = '';
    try {
        email = sessionStorage.getItem('movioDemoEmail') || '';
        name = sessionStorage.getItem('movioDemoName') || '';
    } catch (error) {
        // Session storage can be blocked by the browser; the reviewer is then shown as "Staff".
    }
    const user = movioData.users.find(item =>
        item.role === 'staff' && item.email.toLowerCase() === email.toLowerCase()
    );
    return {
        user_id: user ? user.user_id : null,
        name: user ? user.name : (name || 'Staff')
    };
}

// Add one decision to the audit history: who decided, when, what and why.
function staffAddVehicleAudit(vehicleId, decision, comment) {
    const reviewer = staffCurrentReviewer();
    const lastId = movioData.vehicleAudit.reduce((max, item) => Math.max(max, item.audit_id), 0);
    movioData.vehicleAudit.push({
        audit_id: lastId + 1,
        vehicle_id: vehicleId,
        staff_user_id: reviewer.user_id,
        reviewer_name: reviewer.name,
        decision: decision,
        comment: comment,
        decided_at: movioDateFromToday(0)
    });
}

// Return the name shown in the "Reviewed by" column for an audit record.
function staffReviewerName(record) {
    const user = movioData.users.find(item => item.user_id === record.staff_user_id);
    if (user) {
        return user.name;
    }
    return record.reviewer_name || 'Staff';
}

// Render the audit history, newest decision first.
function staffRenderDecisionHistory() {
    const body = document.getElementById('decisionHistoryBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';

    const records = movioData.vehicleAudit.slice().sort((a, b) =>
        b.decided_at.localeCompare(a.decided_at) || b.audit_id - a.audit_id
    );

    if (records.length === 0) {
        staffEmptyRow(body, 'No vehicle decisions recorded yet.', 6);
        return;
    }

    records.forEach(record => {
        const vehicle = movioData.vehicles.find(item => item.vehicle_id === record.vehicle_id);
        const row = document.createElement('tr');
        row.appendChild(staffCell('#A-' + record.audit_id));
        row.appendChild(staffCell(vehicle ? vehicle.license_plate : '-'));
        row.appendChild(staffCell(staffReviewerName(record)));
        row.appendChild(staffCell(staffFormatDate(record.decided_at)));
        const decisionCell = document.createElement('td');
        decisionCell.appendChild(staffStatusBadge(record.decision));
        row.appendChild(decisionCell);
        row.appendChild(staffCell(record.comment));
        body.appendChild(row);
    });
}

// ---------- Rejection reason modal ----------

// Minimum length so the reason is a real explanation and not a single word.
const staffRejectReasonMinLength = 10;

// The record waiting for a rejection reason: { type: 'courier' or 'vehicle', id: number }.
let staffPendingReject = null;

// Open the modal for one courier or vehicle and clear any previous reason.
function staffOpenRejectModal(type, id, description) {
    staffPendingReject = { type: type, id: id };
    const input = document.getElementById('rejectReasonInput');
    input.value = '';
    input.classList.remove('is-invalid');
    document.getElementById('rejectReasonTarget').textContent = description;
    $('#rejectReasonModal').modal('show');
}

// Validate the reason and apply the rejection to the courier or vehicle waiting for it.
function staffSubmitRejectReason(event) {
    event.preventDefault();
    const input = document.getElementById('rejectReasonInput');
    const reason = input.value.trim();

    if (reason.length < staffRejectReasonMinLength) {
        input.classList.add('is-invalid');
        input.focus();
        return;
    }
    input.classList.remove('is-invalid');

    if (staffPendingReject && staffPendingReject.type === 'courier') {
        const user = movioData.users.find(item => item.user_id === staffPendingReject.id);
        if (user && user.approval_status === 'pending') {
            staffApplyCourierDecision(user, 'rejected', reason);
        }
    }
    if (staffPendingReject && staffPendingReject.type === 'vehicle') {
        const vehicle = movioData.vehicles.find(item => item.vehicle_id === staffPendingReject.id);
        if (vehicle && vehicle.approval_status === 'pending') {
            staffApplyVehicleDecision(vehicle, 'rejected', reason);
        }
    }

    staffPendingReject = null;
    $('#rejectReasonModal').modal('hide');
}
// ---------- Staff notifications ----------

// Ids of notifications marked as read during this visit, for example 'vehicle-2-insurance'.
const staffReadNotificationIds = [];

// Order used to show the most urgent notifications first.
const staffSeverityOrder = { danger: 0, warning: 1, success: 2 };

// Build the notification list from the vehicle data (NOTIFICATION entity in the ER).
// Rules: expired or missing document = danger, expiring soon = warning, new upload = success.
function staffBuildNotifications() {
    const notifications = [];

    movioData.vehicles.forEach(vehicle => {
        // Rejected vehicles are no longer in service, so they do not generate alerts.
        if (vehicle.approval_status === 'rejected') {
            return;
        }
        const vehicleLabel = vehicle.license_plate + ' - ' + vehicle.model;
        const documents = [
            { key: 'insurance', name: 'Insurance', date: vehicle.insurance_expiry_date },
            { key: 'inspection', name: 'Inspection', date: vehicle.inspection_expiry_date }
        ];

        documents.forEach(doc => {
            const status = staffDocumentStatus(doc.date);
            if (status.key === 'expired' || status.key === 'missing') {
                notifications.push({
                    id: 'vehicle-' + vehicle.vehicle_id + '-' + doc.key,
                    severity: 'danger',
                    title: doc.name + ' ' + status.key + ' - Vehicle ' + vehicleLabel,
                    message: 'Do not assign this vehicle until a valid ' + doc.key + ' certificate is provided.',
                    date: doc.date || vehicle.created_at
                });
            }
            if (status.key === 'expiring') {
                notifications.push({
                    id: 'vehicle-' + vehicle.vehicle_id + '-' + doc.key,
                    severity: 'warning',
                    title: doc.name + ' expiring soon - Vehicle ' + vehicleLabel,
                    message: status.label + '. Ask the courier to upload a renewed certificate.',
                    date: movioDateFromToday(0)
                });
            }
        });

        if (vehicle.documents_updated_at) {
            notifications.push({
                id: 'vehicle-' + vehicle.vehicle_id + '-upload',
                severity: 'success',
                title: 'New certificate uploaded - Vehicle ' + vehicleLabel,
                message: 'The courier uploaded updated documents. Review them in Courier and vehicle reviews.',
                date: vehicle.documents_updated_at
            });
        }
    });

    // Unread first, then the most urgent, then the most recent.
    return notifications.sort((a, b) => {
        const readA = staffReadNotificationIds.includes(a.id) ? 1 : 0;
        const readB = staffReadNotificationIds.includes(b.id) ? 1 : 0;
        return readA - readB ||
            staffSeverityOrder[a.severity] - staffSeverityOrder[b.severity] ||
            b.date.localeCompare(a.date);
    });
}

// Render the notification cards and the unread counter.
function staffRenderNotifications() {
    const list = document.getElementById('staffNotificationsList');
    if (!list) {
        return;
    }
    list.innerHTML = '';

    const notifications = staffBuildNotifications();
    const unreadCount = notifications.filter(item => !staffReadNotificationIds.includes(item.id)).length;
    document.getElementById('staffNotificationsSummary').textContent =
        unreadCount + (unreadCount === 1 ? ' unread alert' : ' unread alerts');
    document.getElementById('markAllNotificationsRead').disabled = unreadCount === 0;

    if (notifications.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'No alerts. All vehicle documents are valid.';
        list.appendChild(empty);
        return;
    }

    const severityLabels = { danger: 'Urgent', warning: 'Attention', success: 'Update' };

    notifications.forEach(item => {
        const isRead = staffReadNotificationIds.includes(item.id);
        const card = document.createElement('div');
        card.className = 'cms-notification ' + (isRead ? 'read' : 'unread');

        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between flex-wrap';
        const title = document.createElement('strong');
        const badge = document.createElement('span');
        badge.className = 'cms-badge cms-badge-' + item.severity + ' mr-2';
        badge.textContent = severityLabels[item.severity];
        title.appendChild(badge);
        title.appendChild(document.createTextNode(item.title));
        const date = document.createElement('small');
        date.textContent = staffFormatDate(item.date);
        header.appendChild(title);
        header.appendChild(date);
        card.appendChild(header);

        const message = document.createElement('p');
        message.className = isRead ? 'mb-0 mt-2' : 'mb-2 mt-2';
        message.textContent = item.message;
        card.appendChild(message);

        if (!isRead) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-sm btn-outline-primary';
            button.textContent = 'Mark as read';
            button.dataset.notificationId = item.id;
            card.appendChild(button);
        }
        list.appendChild(card);
    });
}

// Mark one notification as read and refresh the list.
function staffMarkNotificationRead(id) {
    if (!staffReadNotificationIds.includes(id)) {
        staffReadNotificationIds.push(id);
    }
    staffRenderNotifications();
    cmsToast('Notification marked as read.');
}

// Mark every current notification as read.
function staffMarkAllNotificationsRead() {
    staffBuildNotifications().forEach(item => {
        if (!staffReadNotificationIds.includes(item.id)) {
            staffReadNotificationIds.push(item.id);
        }
    });
    staffRenderNotifications();
    cmsToast('All notifications marked as read.');
}

// ---------- Staff dashboard ----------

// Number of alerts shown on the dashboard; the full list is on the Notifications page.
const staffDashboardAlertLimit = 3;

// Fill the four KPI cards and the latest alerts from the same data used by the other Staff pages.
function staffRenderDashboard() {
    const alertsList = document.getElementById('dashboardAlertsList');
    if (!alertsList) {
        return;
    }

    const pendingCouriers = movioData.users.filter(user =>
        user.role === 'courier' && user.approval_status === 'pending'
    ).length;
    const pendingVehicles = movioData.vehicles.filter(vehicle =>
        vehicle.approval_status === 'pending'
    ).length;

    // Count each expired or missing document, ignoring vehicles that were rejected.
    let invalidDocuments = 0;
    movioData.vehicles.forEach(vehicle => {
        if (vehicle.approval_status === 'rejected') {
            return;
        }
        [vehicle.insurance_expiry_date, vehicle.inspection_expiry_date].forEach(date => {
            const key = staffDocumentStatus(date).key;
            if (key === 'expired' || key === 'missing') {
                invalidDocuments++;
            }
        });
    });

    const notifications = staffBuildNotifications();
    const unread = notifications.filter(item => !staffReadNotificationIds.includes(item.id));

    document.getElementById('kpiPendingCouriers').textContent = pendingCouriers;
    document.getElementById('kpiPendingVehicles').textContent = pendingVehicles;
    document.getElementById('kpiInvalidDocuments').textContent = invalidDocuments;
    document.getElementById('kpiUnreadNotifications').textContent = unread.length;

    alertsList.innerHTML = '';
    if (unread.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'No alerts. All vehicle documents are valid.';
        alertsList.appendChild(empty);
        return;
    }

    // Reuse the shared cms-alert styles: red for danger, default for warning, green for updates.
    const alertStyles = { danger: 'cms-alert cms-alert-danger', warning: 'cms-alert', success: 'cms-alert cms-alert-success' };

    unread.slice(0, staffDashboardAlertLimit).forEach((item, index, shown) => {
        const alert = document.createElement('div');
        alert.className = alertStyles[item.severity] + (index === shown.length - 1 ? ' mb-0' : '');
        const title = document.createElement('strong');
        title.textContent = item.title;
        const details = document.createElement('small');
        details.textContent = item.message + ' (' + staffFormatDate(item.date) + ')';
        alert.appendChild(title);
        alert.appendChild(document.createElement('br'));
        alert.appendChild(details);
        alertsList.appendChild(alert);
    });
}
// ---------- Page start ----------

// Send clicks on Approve or Reject buttons inside a table body to the given handler.
function staffBindDecisionButtons(bodyId, handler) {
    const body = document.getElementById(bodyId);
    if (!body) {
        return;
    }
    // One listener on the table body handles every button, including rows rendered later.
    body.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }
        handler(Number(button.dataset.id), button.dataset.action);
    });
}

// Start the page once the HTML is loaded.
document.addEventListener('DOMContentLoaded', () => {
    staffRenderCourierApplications();
    staffRenderVehicleReviews();
    staffRenderDecisionHistory();
    staffRenderNotifications();
    staffRenderDashboard();
    staffBindDecisionButtons('courierApplicationsBody', staffDecideCourier);
    staffBindDecisionButtons('vehicleReviewsBody', staffDecideVehicle);

    const rejectForm = document.getElementById('rejectReasonForm');
    if (rejectForm) {
        rejectForm.addEventListener('submit', staffSubmitRejectReason);
        // Remove the error message as soon as the reason becomes long enough.
        document.getElementById('rejectReasonInput').addEventListener('input', event => {
            if (event.target.value.trim().length >= staffRejectReasonMinLength) {
                event.target.classList.remove('is-invalid');
            }
        });
    }

    const notificationsList = document.getElementById('staffNotificationsList');
    if (notificationsList) {
        // One listener handles the "Mark as read" button of every card.
        notificationsList.addEventListener('click', event => {
            const button = event.target.closest('button[data-notification-id]');
            if (button) {
                staffMarkNotificationRead(button.dataset.notificationId);
            }
        });
        document.getElementById('markAllNotificationsRead').addEventListener('click', staffMarkAllNotificationsRead);
    }
});