const adminOrderStatuses = [
    { key: 'pending', label: 'Pending (no courier yet)' },
    { key: 'initiated', label: 'Initiated' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' }
];

const adminPaymentStatuses = [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'failed', label: 'Failed' },
    { key: 'cancelled', label: 'Cancelled' }
];

// Build one progress bar row: label, "count (percentage)" and a bar with that width.
function adminOverviewRow(label, count, total, isLast) {
    const percentage = total === 0 ? 0 : Math.round((count / total) * 100);

    const row = document.createElement('div');
    row.className = isLast ? '' : 'mb-4';

    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('strong');
    value.textContent = count + ' (' + percentage + '%)';
    header.appendChild(name);
    header.appendChild(value);

    const bar = document.createElement('div');
    bar.className = 'cms-capacity';
    const fill = document.createElement('span');
    fill.style.width = percentage + '%';
    bar.appendChild(fill);

    row.appendChild(header);
    row.appendChild(bar);
    return row;
}

function adminRenderStatusOverview(container, statuses, counts, total) {
    container.replaceChildren();
    if (total === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'No records yet.';
        container.appendChild(empty);
        return;
    }

    statuses.forEach((status, index) => {
        container.appendChild(adminOverviewRow(
            status.label,
            counts[status.key] || 0,
            total,
            index === statuses.length - 1
        ));
    });
}

function adminStatusCounts(statuses, response) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
        throw new Error('The server returned invalid dashboard counts.');
    }
    const counts = {};
    let total = 0;
    statuses.forEach(status => {
        const rawCount = response[status.key];
        const count = rawCount === undefined ? 0 : rawCount;
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('The server returned invalid dashboard counts.');
        }
        counts[status.key] = count;
        total += count;
    });
    return {counts, total};
}

function adminRenderDashboardError(error) {
    const message = document.createElement('p');
    message.className = 'text-danger mb-0';
    message.textContent = error.message || 'Please refresh the page and try again.';
    const routeCount = document.getElementById('kpiActiveRoutes');
    if (routeCount) routeCount.textContent = '—';
    ['deliveryOverview', 'paymentOverview'].forEach(id => {
        const container = document.getElementById(id);
        if (container) container.replaceChildren(message.cloneNode(true));
    });
    ['deliveryOverviewTotal', 'paymentOverviewTotal'].forEach(id => {
        const total = document.getElementById(id);
        if (total) total.textContent = 'Unable to load dashboard data';
    });
}

let adminDashboardRefreshInProgress = false;

async function adminRefreshDashboard() {
    if (adminDashboardRefreshInProgress) return;
    adminDashboardRefreshInProgress = true;
    try {
        const result = await cmsAuthRequest('api/admin/dashboard.php', 'GET');
        const openRoutes = result.open_routes;
        if (!Number.isInteger(openRoutes) || openRoutes < 0) {
            throw new Error('The server returned invalid route counts.');
        }
        const orders = adminStatusCounts(adminOrderStatuses, result.orders_by_status);
        const payments = adminStatusCounts(adminPaymentStatuses, result.payments_by_status);
        document.getElementById('kpiActiveRoutes').textContent = String(openRoutes);
        document.getElementById('deliveryOverviewTotal').textContent =
            orders.total + (orders.total === 1 ? ' order' : ' orders') + ' by status';
        document.getElementById('paymentOverviewTotal').textContent =
            payments.total + (payments.total === 1 ? ' payment' : ' payments') + ' by status';
        adminRenderStatusOverview(
            document.getElementById('deliveryOverview'),
            adminOrderStatuses,
            orders.counts,
            orders.total
        );
        adminRenderStatusOverview(
            document.getElementById('paymentOverview'),
            adminPaymentStatuses,
            payments.counts,
            payments.total
        );
    } catch (error) {
        console.error('Could not load Admin dashboard data.', error);
        adminRenderDashboardError(error);
    } finally {
        adminDashboardRefreshInProgress = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('deliveryOverview')) return;
    adminRefreshDashboard();
    window.addEventListener('focus', () => {
        adminRefreshDashboard();
        cmsRefreshAdminUsers().catch(error => {
            console.error('Could not refresh Admin account metrics.', error);
            cmsToast(error.message || 'Could not refresh account metrics.');
        });
    });
});