// Staff pages: courier and vehicle reviews.
// Sprint 1 prototype: reads and updates the sample data in js/data.js (no backend).

// Courier ids decided during this visit, kept visible so Staff can see the result.
const staffReviewedCourierIds = [];

// Format a YYYY-MM-DD date as a short label such as "03 Oct".
function staffFormatDate(value) {
    if (!value) {
        return '-';
    }
    const parts = value.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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

// Build an Approve or Reject button that remembers which user it belongs to.
function staffDecisionButton(action, userId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action === 'approve' ? 'btn btn-sm btn-success mr-1' : 'btn btn-sm btn-danger';
    button.textContent = action === 'approve' ? 'Approve' : 'Reject';
    button.dataset.action = action;
    button.dataset.userId = userId;
    return button;
}

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
        const row = document.createElement('tr');
        const cell = staffCell('No courier applications awaiting review.');
        cell.colSpan = 6;
        cell.className = 'text-center text-muted';
        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    couriers.forEach(user => {
        const row = document.createElement('tr');
        row.appendChild(staffCell(user.name));
        row.appendChild(staffCell(user.email));
        row.appendChild(staffCell(staffMaskNif(user.nif)));
        row.appendChild(staffCell(staffFormatDate(user.created_at)));

        const statusCell = document.createElement('td');
        statusCell.appendChild(staffStatusBadge(user.approval_status));
        row.appendChild(statusCell);

        const decisionCell = document.createElement('td');
        if (user.approval_status === 'pending') {
            decisionCell.appendChild(staffDecisionButton('approve', user.user_id));
            decisionCell.appendChild(staffDecisionButton('reject', user.user_id));
        } else {
            decisionCell.textContent = '-';
        }
        row.appendChild(decisionCell);

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

// Start the page once the HTML is loaded.
document.addEventListener('DOMContentLoaded', () => {
    staffRenderCourierApplications();

    // One listener on the table body handles every button, including rows rendered later.
    const body = document.getElementById('courierApplicationsBody');
    if (body) {
        body.addEventListener('click', event => {
            const button = event.target.closest('button[data-action]');
            if (!button) {
                return;
            }
            staffDecideCourier(Number(button.dataset.userId), button.dataset.action);
        });
    }
});
