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
function staffAppendDecisionCells(row, status, id) {
    const statusCell = document.createElement('td');
    statusCell.appendChild(staffStatusBadge(status));
    row.appendChild(statusCell);

    const decisionCell = document.createElement('td');
    if (status === 'pending') {
        decisionCell.appendChild(staffDecisionButton('approve', id));
        decisionCell.appendChild(staffDecisionButton('reject', id));
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
        row.appendChild(staffCell(staffFormatFullDate(vehicle.insurance_expiry_date)));
        row.appendChild(staffCell(staffFormatFullDate(vehicle.inspection_expiry_date)));
        staffAppendDecisionCells(row, vehicle.approval_status, vehicle.vehicle_id);
        body.appendChild(row);
    });
}

// Apply an approve or reject decision to one pending vehicle and refresh the table.
function staffDecideVehicle(vehicleId, action) {
    const vehicle = movioData.vehicles.find(item => item.vehicle_id === vehicleId);
    if (!vehicle || vehicle.approval_status !== 'pending') {
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