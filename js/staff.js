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

// Apply an approve or reject decision to one pending courier and refresh the table.
function staffDecideCourier(userId, action) {
    const user = movioData.users.find(item => item.user_id === userId);
    if (!user || user.approval_status !== 'pending') {
        return;
    }
    user.approval_status = action === 'approve' ? 'approved' : 'rejected';
    staffReviewedCourierIds.push(userId);
    staffRenderCourierApplications();
    cmsToast(user.name + (action === 'approve' ? ' approved as courier.' : ' rejected as courier.'));
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

// Apply an approve or reject decision to one pending vehicle and refresh the table.
function staffDecideVehicle(vehicleId, action) {
    const vehicle = movioData.vehicles.find(item => item.vehicle_id === vehicleId);
    if (!vehicle || vehicle.approval_status !== 'pending') {
        return;
    }
    // Check the rule again here, so approval is refused even if the button is enabled by hand.
    const blockReason = staffVehicleApprovalBlock(vehicle);
    if (action === 'approve' && blockReason) {
        cmsToast(blockReason);
        return;
    }
    vehicle.approval_status = action === 'approve' ? 'approved' : 'rejected';
    staffReviewedVehicleIds.push(vehicleId);
    staffRenderVehicleReviews();
    cmsToast(vehicle.license_plate + (action === 'approve' ? ' approved.' : ' rejected.'));
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
    staffBindDecisionButtons('courierApplicationsBody', staffDecideCourier);
    staffBindDecisionButtons('vehicleReviewsBody', staffDecideVehicle);
});