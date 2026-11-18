// Admin dashboard: KPIs and delivery overview.
// Delivery metrics use the Sprint 1 route data and shared browser-demo orders.

// Order statuses shown in the delivery overview, in workflow order.
const adminOrderStatuses = [
    { key: 'pending', label: 'Pending (no courier yet)' },
    { key: 'initiated', label: 'Initiated' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' }
];

// Return the shared demo orders created by the Client and Courier pages, or an empty list.
function adminLoadOrders() {
    if (typeof cmsLoadDemoOrders !== 'function') {
        return [];
    }
    return cmsLoadDemoOrders() || [];
}

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

// Fill sample delivery KPIs and the delivery overview.
function adminRenderDashboard() {
    const overview = document.getElementById('deliveryOverview');
    if (!overview) {
        return;
    }

    const activeRoutes = movioData.routes.filter(route =>
        route.status === 'Initiated' || route.status === 'In Progress'
    ).length;

    document.getElementById('kpiActiveRoutes').textContent = activeRoutes;
    const orders = adminLoadOrders();
    document.getElementById('deliveryOverviewTotal').textContent =
        orders.length + (orders.length === 1 ? ' order' : ' orders') + ' by status';

    overview.innerHTML = '';
    if (orders.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'No orders recorded yet.';
        overview.appendChild(empty);
        return;
    }

    adminOrderStatuses.forEach((status, index) => {
        const count = orders.filter(order => order.status === status.key).length;
        overview.appendChild(adminOverviewRow(status.label, count, orders.length, index === adminOrderStatuses.length - 1));
    });
}

// Start the page once the HTML is loaded.
document.addEventListener('DOMContentLoaded', () => {
    adminRenderDashboard();
});