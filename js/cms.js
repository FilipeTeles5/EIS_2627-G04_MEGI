// Display a temporary message in the shared preview notification area.
function cmsToast(message) {
    let t = document.getElementById('cmsToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'cmsToast';
        document.body.appendChild(t);
    }
    t.textContent = message;
    t.style.display = 'block';
    clearTimeout(window.cmsToastTimer);
    window.cmsToastTimer = setTimeout(() => t.style.display = 'none', 2600);
}

// Apply browser-native form validation styling and report whether the form passes.
function cmsValidate(form) {
    form.classList.add('was-validated');
    return form.checkValidity();
}

// Sample delivery records used to populate the tracking preview by reference.
const cmsTrackingOrders = {
    '1042': {
        status: 'In progress',
        statusClass: 'cms-badge-info',
        route: '#R-88',
        attempt: '1',
        pickup: 'FEUP, Porto',
        destination: 'Porto, Portugal',
        lastUpdate: '03 Oct · 14:42',
        itemCount: '2 items',
        items: [
            {name: 'Laptop', category: 'Electronics', weight: '2.40 kg', volume: '0.030 m³'},
            {name: 'Documents', category: 'Documents', weight: '0.60 kg', volume: '0.004 m³'}
        ],
        timeline: [
            {title: 'Order placed', detail: '03 Oct · 14:20 · Courier #14', state: 'done'},
            {title: 'In progress', detail: '03 Oct · 14:42 · Courier #14', state: 'current'},
            {title: 'Delivered', detail: 'Waiting for delivery confirmation', state: ''}
        ],
        activeStep: 1
    },
    '1031': {
        status: 'Delivered',
        statusClass: 'cms-badge-success',
        route: '#R-81',
        attempt: '1',
        pickup: 'Not available in this preview',
        destination: 'Not available in this preview',
        lastUpdate: 'Delivery confirmed',
        itemCount: '1 item',
        items: [{name: 'Parcel', category: 'General', weight: 'Not provided', volume: 'Not provided'}],
        timeline: [
            {title: 'Order placed', detail: 'Recorded', state: 'done'},
            {title: 'In progress', detail: 'Delivery route #R-81', state: 'done'},
            {title: 'Delivered', detail: 'Delivery photo recorded', state: 'current'}
        ],
        activeStep: 2,
        proof: 'Photo'
    },
    '1028': {
        status: 'Awaiting courier assignment',
        statusClass: 'cms-badge-warning',
        route: 'Not assigned',
        attempt: '0',
        pickup: 'Provided with the order',
        destination: 'Provided with the order',
        lastUpdate: 'Awaiting route assignment',
        itemCount: '1 item',
        items: [{name: 'Parcel', category: 'General', weight: 'Not provided', volume: 'Not provided'}],
        timeline: [
            {title: 'Order placed', detail: 'Order received', state: 'current'},
            {title: 'Courier assigned', detail: 'Waiting for assignment', state: ''},
            {title: 'Delivered', detail: 'Not yet delivered', state: ''}
        ],
        activeStep: 0
    }
};

// Shared browser-only order records keep client order, courier, and tracking previews consistent.
const cmsDemoOrdersKey = 'movioDemoOrders';

// Seed sample orders with their products; created_at is stored but not shown to users.
function cmsDefaultDemoOrders() {
    return [
        {
            id:'1042', status:'in-progress', routeId:'R-88', destination:'Boavista', pickup:'FEUP', attempt:1,
            products:[
                {description:'Laptop', category:'Electronics', weight_kg:2.4, volume_m3:0.03, created_at:'2026-10-03T14:20:00Z'},
                {description:'Documents', category:'Documents', weight_kg:0.6, volume_m3:0.004, created_at:'2026-10-03T14:20:00Z'}
            ]
        },
        {
            id:'1043', status:'initiated', routeId:'R-88', destination:'Matosinhos', pickup:'FEUP', attempt:0,
            products:[{description:'Parcel', category:'General', weight_kg:83, volume_m3:1.366, created_at:'2026-10-03T14:25:00Z'}]
        },
        {
            id:'1031', status:'completed', routeId:'R-81', destination:'Porto', pickup:'Not provided', attempt:1,
            products:[{description:'Parcel', category:'General', weight_kg:1, volume_m3:0.01, created_at:'2026-10-02T10:00:00Z'}],
            proofFile:'order-1031.jpg'
        },
        {
            id:'1028', status:'pending', routeId:null, destination:'Not provided', pickup:'Not provided', attempt:0,
            products:[{description:'Parcel', category:'General', weight_kg:1, volume_m3:0.01, created_at:'2026-10-04T09:00:00Z'}]
        }
    ];
}

// Load shared demo orders and seed the browser once when no records exist yet.
function cmsLoadDemoOrders() {
    try {
        const stored = localStorage.getItem(cmsDemoOrdersKey);
        if (stored === null) {
            const initial = cmsDefaultDemoOrders();
            localStorage.setItem(cmsDemoOrdersKey, JSON.stringify(initial));
            return initial;
        }
        const orders = JSON.parse(stored);
        if (!Array.isArray(orders) || !orders.every(order =>
            order && typeof order.id === 'string' && Array.isArray(order.products)
        )) throw new Error('Stored demo orders have an invalid format.');
        return orders;
    } catch (error) {
        console.error('Could not load demo orders.', error);
        cmsToast('Could not load order data from this browser. Check browser storage and try again.');
        return null;
    }
}

// Return the shared demo orders that are still active in the delivery workflow.
function cmsGetActiveOrders(orders) {
    return orders.filter(order => order.status === 'initiated' || order.status === 'in-progress');
}

// Save shared browser-only demo orders without uploading product files or data to a server.
function cmsSaveDemoOrders(orders) {
    try {
        localStorage.setItem(cmsDemoOrdersKey, JSON.stringify(orders));
        return true;
    } catch (error) {
        console.error('Could not save demo orders.', error);
        cmsToast('Could not save order data in this browser.');
        return false;
    }
}

// Synchronize courier order status and product details into the shared client/tracking preview.
function cmsSyncCourierOrders(operations) {
    const sharedOrders = cmsLoadDemoOrders();
    if (!sharedOrders) return;
    operations.orders.forEach(order => {
        let sharedOrder = sharedOrders.find(item => item.id === order.id);
        if (!sharedOrder) {
            sharedOrder = {
                id:order.id,
                destination:order.destination || 'Not provided',
                pickup:'FEUP',
                attempt:order.attempt || 1,
                products:Array.isArray(order.products) ? order.products : []
            };
            sharedOrders.push(sharedOrder);
        }
        sharedOrder.status = order.status;
        sharedOrder.routeId = order.routeId || null;
        sharedOrder.destination = order.destination || sharedOrder.destination;
        sharedOrder.products = Array.isArray(order.products) ? order.products : sharedOrder.products;
        if (order.proofFile) sharedOrder.proofFile = order.proofFile;
        if (order.completedOn) sharedOrder.completedOn = order.completedOn;
    });
    cmsSaveDemoOrders(sharedOrders);
}

// Format numeric product measurements for the client, courier, and tracking views.
function cmsFormatProductMeasurement(value, unit, digits) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) + ' ' + unit : 'Not provided';
}

// Render one table body with the visible product attributes for an order.
function cmsRenderProductRows(body, products) {
    body.replaceChildren();
    (products || []).forEach(product => {
        const row = document.createElement('tr');
        [
            product.description || 'Not provided',
            product.category || 'Not provided',
            cmsFormatProductMeasurement(product.weight_kg, 'kg', 2),
            cmsFormatProductMeasurement(product.volume_m3, 'm³', 3)
        ].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        body.appendChild(row);
    });
    if (!(products || []).length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No product details recorded.';
        row.appendChild(cell);
        body.appendChild(row);
    }
}

// Build a product table using the public product fields while keeping created_at internal.
function cmsBuildProductTable(products) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive';
    const table = document.createElement('table');
    table.className = 'table cms-table mb-0';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Description','Category','Weight','Volume'].forEach(label => {
        const cell = document.createElement('th');
        cell.textContent = label;
        headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    const body = document.createElement('tbody');
    cmsRenderProductRows(body, products);
    table.append(head, body);
    wrapper.appendChild(table);
    return wrapper;
}

// Add a collapsed, accessible product disclosure to a Courier order summary card.
function cmsAppendCourierProductDisclosure(card, order, scope) {
    const disclosureId = 'courier-products-' + scope + '-' + order.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-outline-dark d-block w-100 mt-3';
    button.dataset.courierProductToggle = disclosureId;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', disclosureId);
    button.textContent = 'View products (' + (order.products || []).length + ')';

    const panel = document.createElement('div');
    panel.id = disclosureId;
    panel.dataset.courierProductPanel = disclosureId;
    panel.className = 'd-none mt-2';
    panel.appendChild(cmsBuildProductTable(order.products));
    card.append(button, panel);
}

// Toggle one Courier product disclosure without navigating away from the order list.
function cmsToggleCourierProductDisclosure(container, button) {
    const panel = [...container.querySelectorAll('[data-courier-product-panel]')]
        .find(item => item.dataset.courierProductPanel === button.dataset.courierProductToggle);
    if (!panel) return;
    const expanded = panel.classList.toggle('d-none') === false;
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded
        ? 'Hide products'
        : 'View products (' + panel.querySelectorAll('tbody tr').length + ')';
}

// Render the full browser-local order list and its product details for the Client page.
function cmsRenderClientOrders() {
    const tableBody = document.getElementById('clientOrdersTableBody');
    const details = document.getElementById('clientOrderDetails');
    if (!tableBody || !details) return;
    const orders = cmsLoadDemoOrders();
    if (!orders) return;
    tableBody.replaceChildren();
    details.replaceChildren();

    orders.forEach(order => {
        const row = document.createElement('tr');
        const cells = [
            '#' + order.id,
            String((order.products || []).length),
            order.routeId ? '#' + order.routeId : 'Not assigned'
        ];
        cells.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        const statusCell = document.createElement('td');
        statusCell.appendChild(cmsCourierOrderBadge(order.status));
        row.appendChild(statusCell);
        const attemptsCell = document.createElement('td');
        attemptsCell.textContent = String(order.attempt || 0);
        row.appendChild(attemptsCell);
        const proofCell = document.createElement('td');
        proofCell.textContent = order.proofFile || '—';
        row.appendChild(proofCell);
        const actions = document.createElement('td');
        const productsButton = document.createElement('button');
        productsButton.type = 'button';
        productsButton.className = 'btn btn-sm btn-outline-secondary mr-1';
        productsButton.dataset.toggleClientProducts = order.id;
        productsButton.setAttribute('aria-expanded', 'false');
        productsButton.setAttribute('aria-controls', 'client-products-' + order.id);
        productsButton.textContent = 'View products (' + (order.products || []).length + ')';
        actions.appendChild(productsButton);
        const detailsLink = document.createElement('a');
        detailsLink.href = '#client-order-' + order.id;
        detailsLink.className = 'btn btn-sm btn-outline-primary mr-1';
        detailsLink.textContent = 'Details';
        actions.appendChild(detailsLink);
        if (order.status === 'pending' && !order.routeId) {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'btn btn-sm btn-outline-danger';
            cancelButton.dataset.cancelClientOrder = order.id;
            cancelButton.textContent = 'Cancel';
            actions.appendChild(cancelButton);
        }
        row.appendChild(actions);
        tableBody.appendChild(row);

        const productsRow = document.createElement('tr');
        productsRow.id = 'client-products-' + order.id;
        productsRow.dataset.clientProductsFor = order.id;
        productsRow.className = 'd-none';
        const productsCell = document.createElement('td');
        productsCell.colSpan = 7;
        productsCell.appendChild(cmsBuildProductTable(order.products));
        productsRow.appendChild(productsCell);
        tableBody.appendChild(productsRow);

        const section = document.createElement('section');
        section.id = 'client-order-' + order.id;
        section.className = 'cms-panel p-4 mb-4';
        const title = document.createElement('div');
        title.className = 'cms-panel-title';
        const titleGroup = document.createElement('div');
        const heading = document.createElement('h4');
        heading.textContent = 'Order #' + order.id;
        const subtitle = document.createElement('small');
        subtitle.textContent = 'Delivery details and associated products';
        titleGroup.append(heading, subtitle);
        title.append(titleGroup, cmsCourierOrderBadge(order.status));
        const meta = document.createElement('div');
        meta.className = 'cms-meta-grid mb-4';
        [
            ['Pickup location', order.pickup || 'Not provided'],
            ['Delivery location', order.destination || 'Not provided'],
            ['Route', order.routeId ? '#' + order.routeId : 'Not assigned'],
            ['Delivery attempts', String(order.attempt || 0)]
        ].forEach(([label, value]) => {
            const item = document.createElement('div');
            const name = document.createElement('span');
            name.className = 'cms-meta-label';
            name.textContent = label;
            const content = document.createElement('span');
            content.className = 'cms-meta-value';
            content.textContent = value;
            item.append(name, content);
            meta.appendChild(item);
        });
        const productsHeading = document.createElement('h6');
        productsHeading.textContent = 'Products in this order';
        section.append(title, meta, productsHeading, cmsBuildProductTable(order.products));
        details.appendChild(section);
    });
}

// Persist a client cancellation while keeping the cancelled order visible in the order list.
function cmsInitClientOrders() {
    const tableBody = document.getElementById('clientOrdersTableBody');
    if (!tableBody) return;
    cmsRenderClientOrders();
    tableBody.addEventListener('click', event => {
        const productsButton = event.target.closest('[data-toggle-client-products]');
        if (productsButton) {
            const productsRow = [...tableBody.querySelectorAll('[data-client-products-for]')]
                .find(row => row.dataset.clientProductsFor === productsButton.dataset.toggleClientProducts);
            if (!productsRow) return;
            const expanded = productsRow.classList.toggle('d-none') === false;
            productsButton.setAttribute('aria-expanded', String(expanded));
            productsButton.textContent = expanded ? 'Hide products' : 'View products (' +
                productsRow.querySelectorAll('tbody tr').length + ')';
            return;
        }
        const button = event.target.closest('[data-cancel-client-order]');
        if (!button) return;
        const orders = cmsLoadDemoOrders();
        const order = orders && orders.find(item => item.id === button.dataset.cancelClientOrder);
        if (!order || order.status !== 'pending' || order.routeId) return;
        order.status = 'cancelled';
        if (!cmsSaveDemoOrders(orders)) return;
        cmsRenderClientOrders();
        cmsToast('Order #' + order.id + ' was cancelled and remains in your order list.');
    });
    window.addEventListener('storage', event => {
        if (event.key === cmsDemoOrdersKey) cmsRenderClientOrders();
    });
}

// Keep the Client dashboard introduction synchronized with its active demo orders.
function cmsInitClientDashboard() {
    const description = document.getElementById('clientDashboardActiveOrdersDescription');
    if (!description) return;

    const updateDescription = () => {
        const orders = cmsLoadDemoOrders();
        if (!orders) return;
        const activeOrderCount = cmsGetActiveOrders(orders).length;
        description.textContent = activeOrderCount === 0
            ? 'You currently have no active orders. Create a new delivery when you\'re ready.'
            : activeOrderCount === 1
                ? 'You currently have 1 active order. Track its progress or create a new delivery.'
                : 'You currently have ' + activeOrderCount + ' active orders. Track their progress or create a new delivery.';
    };

    updateDescription();
    window.addEventListener('storage', event => {
        if (event.key === cmsDemoOrdersKey) updateDescription();
    });
}

// Read the requested sample order and render its status, route details, and timeline.
function cmsInitTrackingPage() {
    const content = document.getElementById('trackingDetails');
    if (!content) return;

    const params = new URLSearchParams(window.location.search);
    const rawReference = params.get('order') || '';
    const reference = rawReference.trim().replace(/^#/, '');
    const searchInput = document.getElementById('trackingSearch');
    if (searchInput) searchInput.value = reference ? '#' + reference : '';
    const sharedOrder = /^\d+$/.test(reference)
        ? (cmsLoadDemoOrders() || []).find(item => item.id === reference)
        : null;
    let order = /^\d+$/.test(reference) ? cmsTrackingOrders[reference] : null;
    if (sharedOrder) {
        const statusDetails = {
            pending: {label:'Awaiting courier assignment', badge:'cms-badge-warning', step:0},
            initiated: {label:'Initiated', badge:'cms-badge-warning', step:0},
            'in-progress': {label:'In progress', badge:'cms-badge-info', step:1},
            completed: {label:'Delivered', badge:'cms-badge-success', step:2},
            cancelled: {label:'Cancelled', badge:'cms-badge-danger', step:2}
        }[sharedOrder.status] || {label:'Unknown', badge:'cms-badge-warning', step:0};
        const statusDetail = statusDetails;
        order = {
            status:statusDetail.label,
            statusClass:statusDetail.badge,
            route:sharedOrder.routeId ? '#' + sharedOrder.routeId : 'Not assigned',
            attempt:String(sharedOrder.attempt || 0),
            pickup:sharedOrder.pickup || 'Not provided',
            destination:sharedOrder.destination || 'Not provided',
            lastUpdate:sharedOrder.completedOn ? 'Completed ' + sharedOrder.completedOn : 'Order status recorded',
            itemCount:(sharedOrder.products || []).length + ((sharedOrder.products || []).length === 1 ? ' item' : ' items'),
            items:(sharedOrder.products || []).map(product => ({
                name:product.description,
                category:product.category,
                weight:cmsFormatProductMeasurement(product.weight_kg, 'kg', 2),
                volume:cmsFormatProductMeasurement(product.volume_m3, 'm³', 3)
            })),
            timeline:[
                {title:'Order placed', detail:'Order #' + sharedOrder.id, state:statusDetail.step > 0 ? 'done' : 'current'},
                {title:'In progress', detail:statusDetail.step > 0 ? 'Courier is handling this order' : 'Waiting for courier', state:statusDetail.step === 1 ? 'current' : ''},
                {title:sharedOrder.status === 'cancelled' ? 'Cancelled' : 'Delivered', detail:sharedOrder.proofFile || 'Final order status', state:statusDetail.step === 2 ? 'current' : ''}
            ],
            activeStep:statusDetail.step,
            proof:sharedOrder.proofFile ? 'File' : undefined
        };
    }
    const notFound = document.getElementById('trackingNotFound');

    if (!order) {
        content.classList.add('d-none');
        notFound.classList.remove('d-none');
        document.getElementById('trackingMessageTitle').textContent = reference
            ? 'We couldn’t find that sample order'
            : 'Enter an order reference';
        document.getElementById('trackingMessageBody').textContent = reference
            ? 'No preview order matches #' + reference + '. Try one of the example references: 1042, 1031 or 1028.'
            : 'Use the search above to view a sample delivery order. Try 1042, 1031 or 1028.';
        return;
    }

    content.classList.remove('d-none');
    notFound.classList.add('d-none');
    document.getElementById('trackingOrderNumber').textContent = '#' + reference;
    const badge = document.getElementById('trackingStatus');
    badge.textContent = order.status;
    badge.className = 'cms-badge ' + order.statusClass;

    document.getElementById('trackingLastUpdate').textContent = order.lastUpdate;
    document.getElementById('trackingPickup').textContent = order.pickup;
    document.getElementById('trackingDestination').textContent = order.destination;
    document.getElementById('trackingRoute').textContent = order.route;
    document.getElementById('trackingAttempt').textContent = order.attempt;
    document.getElementById('trackingItemCount').textContent = order.itemCount;

    const timeline = document.getElementById('trackingTimeline');
    order.timeline.forEach((step, index) => {
        const item = document.createElement('li');
        item.className = step.state;
        if (index > order.activeStep) item.classList.add('upcoming');
        const title = document.createElement('strong');
        title.textContent = step.title;
        const detail = document.createElement('small');
        detail.textContent = step.detail;
        item.append(title, detail);
        timeline.appendChild(item);
    });

    const itemList = document.getElementById('trackingItems');
    order.items.forEach(parcel => {
        const row = document.createElement('tr');
        [parcel.name, parcel.category, parcel.weight, parcel.volume || 'Not provided'].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        itemList.appendChild(row);
    });

    const proof = document.getElementById('trackingProof');
    if (order.proof) {
        document.getElementById('trackingProofType').textContent = order.proof;
        proof.classList.remove('d-none');
    }
}

// Create a Leaflet map with valid markers and fit its view to the supplied points.
const cmsOsmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const cmsOsmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function cmsCreateMap(id, points, options = {}) {
    const node = document.getElementById(id);
    if (!node) return null;
    if (!window.L) {
        node.textContent = 'Map unavailable. Check the Leaflet library connection.';
        return null;
    }

    const map = L.map(node);
    L.tileLayer(cmsOsmTileUrl, {
        maxZoom: 19,
        attribution: cmsOsmAttribution,
        referrerPolicy: 'strict-origin-when-cross-origin'
    }).addTo(map);

    const valid = points.filter(p => Array.isArray(p.coords));
    valid.forEach((p, i) => {
        L.marker(p.coords).addTo(map).bindPopup(p.label || ('Point ' + (i + 1)));
    });

    if (valid.length > 1) {
        const line = valid.map(p => p.coords);
        L.polyline(line, { color: '#FF4800', weight: 5, opacity: .85 }).addTo(map);
        map.fitBounds(line, { padding: [30, 30] });
    } else {
        map.setView(valid[0]?.coords || [41.1779, -8.5980], options.zoom || 14);
    }
    const refreshMapSize = () => map.invalidateSize({pan:false});
    requestAnimationFrame(refreshMapSize);
    window.addEventListener('resize', refreshMapSize);
    return map;
}

// Parse a named form field only when its numeric value is within the given bounds.
function cmsReadCoordinate(form, name, min, max) {
    const el = form.elements[name];
    const n = Number(el?.value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// Add a product-entry row and connect its controls to removal and total updates.
function cmsAddProductRow() {
    const list = document.getElementById('productRows');
    if (!list) return;
    const index = list.querySelectorAll('.cms-product-row').length + 1;
    const row = document.createElement('div');
    row.className = 'cms-product-row';
    row.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>Item ${index}</strong>
        <button type="button" class="btn btn-sm btn-outline-danger cms-remove-product">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group col-md-5">
          <label>Description</label>
          <input class="form-control product-description" required placeholder="e.g. Laptop">
          <div class="invalid-feedback">Enter an item description.</div>
        </div>
        <div class="form-group col-md-3">
          <label>Category</label>
          <input class="form-control product-category" required placeholder="Electronics">
          <div class="invalid-feedback">Enter an item category.</div>
        </div>
        <div class="form-group col-md-2">
          <label>Weight (kg)</label>
          <input class="form-control product-weight" required type="number" min="0.01" step="0.01" value="1">
          <div class="invalid-feedback">Enter a weight greater than zero.</div>
        </div>
        <div class="form-group col-md-2">
          <label>Volume (m³)</label>
          <input class="form-control product-volume" required type="number" min="0.001" step="0.001" value="0.01">
          <div class="invalid-feedback">Enter a volume greater than zero.</div>
        </div>
      </div>`;
    list.appendChild(row);
    // Remove this row and recalculate the totals when its remove control is used.
    row.querySelector('.cms-remove-product').addEventListener('click', () => {
        row.remove();
        cmsUpdateProductTotals();
    });
    // Refresh totals as the user edits any field in the newly added row.
    row.querySelectorAll('input').forEach(i => i.addEventListener('input', cmsUpdateProductTotals));
    cmsUpdateProductTotals();
}

// Recalculate and display combined product weight and volume values.
function cmsUpdateProductTotals() {
    const weights = [...document.querySelectorAll('.product-weight')]
        .map(i => Number(i.value) || 0);
    const volumes = [...document.querySelectorAll('.product-volume')]
        .map(i => Number(i.value) || 0);
    const tw = document.getElementById('totalWeight');
    const tv = document.getElementById('totalVolume');
    if (tw) tw.textContent = weights.reduce((a,b) => a+b, 0).toFixed(2) + ' kg';
    if (tv) tv.textContent = volumes.reduce((a,b) => a+b, 0).toFixed(3) + ' m³';
}

// Configure the signature canvas for pointer and touch drawing.
function cmsInitSignature() {
    const canvas = document.getElementById('signaturePad');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;

    // Match the canvas backing resolution to its displayed size and device scale.
    function resize() {
        const r = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, r.width * ratio);
        canvas.height = Math.max(1, r.height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }
    resize();

    // Convert a mouse or touch position from viewport coordinates to canvas space.
    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return {x: p.clientX - r.left, y: p.clientY - r.top};
    }
    // Begin a new signature stroke at the pointer's current position.
    function start(e) {
        drawing = true;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }
    // Extend and render the active stroke while the pointer moves.
    function move(e) {
        if (!drawing) return;
        e.preventDefault();
        const p = pos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }
    // End the active stroke when the pointer is released.
    function stop() { drawing = false; }

    // Begin a signature stroke when the mouse button is pressed on the canvas.
    canvas.addEventListener('mousedown', start);
    // Extend the current signature stroke as the mouse moves over the canvas.
    canvas.addEventListener('mousemove', move);
    // Stop drawing when the mouse button is released anywhere in the window.
    window.addEventListener('mouseup', stop);
    // Begin a signature stroke when a finger touches the canvas.
    canvas.addEventListener('touchstart', start, {passive:false});
    // Extend the current signature stroke as a finger moves across the canvas.
    canvas.addEventListener('touchmove', move, {passive:false});
    // Stop drawing when the finger is lifted from the canvas.
    canvas.addEventListener('touchend', stop);

    // Clear the signature canvas when the user selects its clear control.
    document.getElementById('clearSignature')?.addEventListener('click', () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
    });
}

// Map each demo role to its landing page and the pages protected by that role.
const cmsRoles = {
    client: {
        label: 'Client',
        home: 'client.html',
        pages: ['client.html', 'client-order.html', 'client-orders.html']
    },
    courier: {
        label: 'Courier',
        home: 'courier.html',
        pages: ['courier.html', 'courier-route.html', 'courier-vehicles.html']
    },
    staff: {
        label: 'Staff',
        home: 'staff.html',
        pages: ['staff.html', 'staff-approvals.html', 'staff-notifications.html']
    },
    admin: {
        label: 'Admin',
        home: 'admin.html',
        pages: ['admin.html', 'admin-users.html']
    }
};
// Session-storage keys keep the active demo identity scoped to this browser tab.
const cmsRoleKey = 'movioDemoRole';
const cmsEmailKey = 'movioDemoEmail';
// Local-storage key and initial sample records for the Staff application workflow.
const cmsStaffApplicationsKey = 'movioDemoStaffApplications';
// Default applications used when this browser has no saved demo decisions yet.
const cmsDefaultStaffApplications = [
    {name:'Inês Martins', username:'ines.martins', email:'ines@example.com', phone:'+351 912 *** ***', created:'02 Oct', status:'pending'},
    {name:'Pedro Reis', username:'pedro.reis', email:'pedro@example.com', phone:'+351 914 *** ***', created:'01 Oct', status:'pending'},
    {name:'Carla Sousa', username:'csousa', email:'carla@example.com', phone:'+351 913 *** ***', created:'10 Sep', status:'approved'}
];

// Load and validate saved applications, seeding browser storage on first use.
function cmsLoadStaffApplications() {
    try {
        const stored = localStorage.getItem(cmsStaffApplicationsKey);
        if (stored === null) {
            localStorage.setItem(cmsStaffApplicationsKey, JSON.stringify(cmsDefaultStaffApplications));
            return cmsDefaultStaffApplications.map(application => ({...application}));
        }

        const applications = JSON.parse(stored);
        const valid = Array.isArray(applications) && applications.every(application =>
            application && typeof application.name === 'string' &&
            typeof application.email === 'string' &&
            ['pending', 'approved', 'rejected'].includes(application.status)
        );
        if (!valid) throw new Error('Stored Staff applications have an invalid format.');
        return applications;
    } catch (error) {
        console.error('Could not load demo Staff applications.', error);
        cmsToast('Could not load Staff applications from this browser. Check browser storage and try again.');
        return null;
    }
}

// Persist the current application list and surface storage failures to the user.
function cmsSaveStaffApplications(applications) {
    try {
        localStorage.setItem(cmsStaffApplicationsKey, JSON.stringify(applications));
        return true;
    } catch (error) {
        console.error('Could not save demo Staff applications.', error);
        cmsToast('Could not save the Staff application decision in this browser.');
        return false;
    }
}

// Find an applicant by email and return the current status or not-applied state.
function cmsStaffApplicationStatus(email) {
    const applications = cmsLoadStaffApplications();
    if (!applications) return null;
    const application = applications.find(item =>
        item.email.toLowerCase() === email.trim().toLowerCase()
    );
    return application ? application.status : 'not-applied';
}

// Build a status badge whose text and style reflect an application's decision.
function cmsStaffStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = 'cms-badge ' + (
        status === 'approved' ? 'cms-badge-success' :
        status === 'rejected' ? 'cms-badge-danger' : 'cms-badge-warning'
    );
    badge.textContent = status === 'approved' ? 'Approved' :
        status === 'rejected' ? 'Rejected' : 'Pending';
    return badge;
}

// Render application decisions and mirror eligible demo accounts in the admin table.
function cmsRenderStaffApplications() {
    const table = document.getElementById('staffApplicationsTable');
    const applications = cmsLoadStaffApplications();
    if (!table || !applications) return;

    table.replaceChildren();
    const pendingCount = applications.filter(application => application.status === 'pending').length;
    const countLabel = document.getElementById('staffApplicationsCount');
    if (countLabel) countLabel.textContent = pendingCount + (pendingCount === 1
        ? ' application awaiting your decision'
        : ' applications awaiting your decision');
    const dashboardCount = document.getElementById('pendingStaffApplicationCount');
    if (dashboardCount) dashboardCount.textContent = pendingCount;

    const accounts = document.getElementById('adminUserAccounts');
    if (accounts) accounts.querySelectorAll('[data-demo-staff-account]').forEach(row => row.remove());

    applications.forEach(application => {
        const row = document.createElement('tr');
        [application.name, application.email, application.phone || 'Not provided', application.created || 'Today'].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        statusCell.className = 'decision-cell';
        statusCell.appendChild(cmsStaffStatusBadge(application.status));
        row.appendChild(statusCell);

        const decisionCell = document.createElement('td');
        if (application.status === 'pending') {
            ['approve', 'reject'].forEach(action => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = action === 'approve'
                    ? 'btn btn-sm btn-success mr-1'
                    : 'btn btn-sm btn-danger';
                button.dataset.staffAction = action;
                button.dataset.email = application.email;
                button.textContent = action === 'approve' ? 'Approve' : 'Reject';
                decisionCell.appendChild(button);
            });
        } else {
            decisionCell.textContent = '—';
        }
        row.appendChild(decisionCell);
        table.appendChild(row);

        if (accounts && application.email.toLowerCase() !== 'carla@example.com') {
            const accountRow = document.createElement('tr');
            accountRow.dataset.demoStaffAccount = 'true';
            [
                application.name,
                application.username || '—',
                application.status === 'approved' ? 'Staff' : 'Staff applicant',
                application.email
            ].forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                accountRow.appendChild(cell);
            });
            const accountStatus = document.createElement('td');
            accountStatus.appendChild(cmsStaffStatusBadge(application.status));
            accountRow.appendChild(accountStatus);
            const createdCell = document.createElement('td');
            createdCell.textContent = application.created || 'Today';
            accountRow.appendChild(createdCell);
            accounts.appendChild(accountRow);
        }
    });
}

// Record an approval or rejection only while the application is still pending.
function cmsUpdateStaffApplication(email, status) {
    const applications = cmsLoadStaffApplications();
    if (!applications) return false;
    const application = applications.find(item =>
        item.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!application || application.status !== 'pending') {
        cmsToast('This Staff application is no longer awaiting a decision.');
        return false;
    }
    application.status = status;
    if (!cmsSaveStaffApplications(applications)) return false;
    cmsRenderStaffApplications();
    cmsToast(status === 'approved'
        ? 'Staff application approved. The applicant can now sign in as Staff.'
        : 'Staff application rejected. Staff access has not been granted.');
    return true;
}

// Normalize the current URL's final path segment for page access checks.
function cmsPageName() {
    return window.location.pathname.split('/').pop().toLowerCase();
}

// Read a recognized demo role and discard stale or unsupported session values.
function cmsGetRole() {
    const role = sessionStorage.getItem(cmsRoleKey);
    if (!Object.prototype.hasOwnProperty.call(cmsRoles, role)) {
        sessionStorage.removeItem(cmsRoleKey);
        sessionStorage.removeItem(cmsEmailKey);
        return null;
    }
    return role;
}

// Validate a role, enforce Staff approval, and store the temporary demo identity.
function cmsSetRole(role, email) {
    if (!Object.prototype.hasOwnProperty.call(cmsRoles, role)) {
        cmsToast('Choose a valid account type.');
        return false;
    }
    if (role === 'staff' && cmsStaffApplicationStatus(email) !== 'approved') {
        cmsToast('Staff access is available only after an Admin approves your application.');
        return false;
    }
    sessionStorage.setItem(cmsRoleKey, role);
    sessionStorage.setItem(cmsEmailKey, email.trim());
    return true;
}

// Return the landing page configured for a recognized demo role.
function cmsRoleHome(role) {
    return cmsRoles[role].home;
}

// Reveal the post-registration notice with a link back to sign-in.
function cmsShowRegisterMessage(message) {
    const notice = document.getElementById('registerMessage');
    if (!notice) return;
    notice.replaceChildren(document.createTextNode(message + ' '));
    const link = document.createElement('a');
    link.href = 'login.html';
    link.textContent = 'Go to sign in';
    notice.appendChild(link);
    notice.classList.remove('d-none');
}

// Enforce role-based page access and update navigation for the current session.
function cmsInitRoleAccess() {
    let role = cmsGetRole();
    const page = cmsPageName();
    if (role === 'staff') {
        const email = sessionStorage.getItem(cmsEmailKey) || '';
        if (cmsStaffApplicationStatus(email) !== 'approved') {
            sessionStorage.removeItem(cmsRoleKey);
            sessionStorage.removeItem(cmsEmailKey);
            role = null;
            if (cmsRoles.staff.pages.includes(page)) {
                window.location.replace('login.html?role=staff');
                return false;
            }
        }
    }
    const protectedRole = Object.keys(cmsRoles).find(key =>
        cmsRoles[key].pages.includes(page)
    );

    if (protectedRole && (!role || role !== protectedRole)) {
        const query = role ? '' : '?role=' + protectedRole;
        window.location.replace('login.html' + query);
        return false;
    }

    if (page === 'workspace.html') {
        window.location.replace(role ? cmsRoleHome(role) : 'login.html');
        return false;
    }

    if ((page === 'login.html' || page === 'register.html') && role) {
        window.location.replace(cmsRoleHome(role));
        return false;
    }

    document.querySelectorAll('[data-demo-logout]').forEach(button => {
        // Clear the temporary session and return to the public home page on logout.
        button.addEventListener('click', () => {
            sessionStorage.removeItem(cmsRoleKey);
            sessionStorage.removeItem(cmsEmailKey);
            window.location.assign('index.html');
        });
    });

    document.querySelectorAll('[data-demo-user]').forEach(label => {
        label.classList.toggle('d-none', !role);
        if (role) {
            const email = sessionStorage.getItem(cmsEmailKey);
            label.textContent = email ? email + ' · ' + cmsRoles[role].label : cmsRoles[role].label;
        }
    });
    document.querySelectorAll('[data-demo-logout]').forEach(button => {
        button.classList.toggle('d-none', !role);
    });

    document.querySelectorAll('.navbar [href="login.html"], .navbar [href="register.html"]').forEach(link => {
        link.classList.toggle('d-none', Boolean(role));
    });
    document.querySelectorAll('[data-workspace-link]').forEach(link => {
        link.classList.toggle('d-none', !role);
        if (role) link.href = cmsRoleHome(role);
    });
    document.querySelectorAll('.cms-hero-actions').forEach(actions => {
        actions.classList.toggle('d-none', Boolean(role));
    });
    document.querySelectorAll('[data-dashboard-link]').forEach(link => {
        if (role) {
            link.href = cmsRoleHome(role);
            link.innerHTML = '<i class="fa fa-angle-right"></i>My workspace';
        }
    });
    document.querySelectorAll('[data-get-started]').forEach(link => {
        if (role) {
            link.href = cmsRoleHome(role);
            link.innerHTML = 'My workspace<i class="fa fa-arrow-right ml-2"></i>';
        }
    });

    if (role) {
        document.querySelectorAll('[data-role-content]').forEach(card => {
            const visible = card.dataset.roleContent === role;
            card.classList.toggle('d-none', !visible);
            if (visible) {
                const link = card.querySelector('a');
                if (link) link.href = cmsRoleHome(role);
            }
        });
    }

    if (protectedRole) {
        const hero = document.querySelector('.cms-page-hero .container');
        if (hero) {
            const notice = document.createElement('p');
            notice.className = 'cms-demo-notice';
            // Client orders and Courier route changes persist only in this browser as demo data.
            notice.textContent = ['courier.html','courier-route.html','client-order.html','client-orders.html'].includes(page)
                ? 'Preview mode: sample orders are used, and order changes are saved in this browser only.'
                : 'Preview mode: this page uses sample data, and your changes are not saved.';
            hero.appendChild(notice);
        }
    }

    return true;
}

/*
 * Courier dashboard data and behavior:
 * - Each courier sees a separate set of assigned orders, stored under their session email.
 * - A courier can have only one route in preparation or execution at a time.
 * - Pending orders can join a route only during preparation and become Initiated when added.
 * - Starting a route locks its membership; another route can be created after all its orders are terminal.
 * - Completed orders appear in a separate history; Active Route handles transitions and proof submission.
 */
const cmsCourierOperationsKey = 'movioDemoCourierOperations:';

// Return a fresh sample dataset for a courier who has not used this dashboard before.
function cmsDefaultCourierOperations() {
    return {
        nextRouteNumber: 89,
        routes: [
            {id:'R-88', status:'planning', orderIds:['1042','1043']},
            {id:'R-87', status:'completed', orderIds:['1039']}
        ],
        orders: [
            {id:'1042', destination:'Boavista', parcels:2, status:'initiated', routeId:'R-88', products:[
                {description:'Laptop', category:'Electronics', weight_kg:2.4, volume_m3:0.03, created_at:'2026-10-03T14:20:00Z'},
                {description:'Documents', category:'Documents', weight_kg:0.6, volume_m3:0.004, created_at:'2026-10-03T14:20:00Z'}
            ]},
            {id:'1043', destination:'Matosinhos', parcels:1, status:'initiated', routeId:'R-88', products:[
                {description:'Parcel', category:'General', weight_kg:83, volume_m3:1.366, created_at:'2026-10-03T14:25:00Z'}
            ]},
            {id:'1044', destination:'Paranhos', parcels:1, status:'pending', routeId:null, products:[
                {description:'Parcel', category:'General', weight_kg:1, volume_m3:0.01, created_at:'2026-10-04T09:00:00Z'}
            ]},
            {id:'1039', destination:'Porto', parcels:1, status:'completed', routeId:'R-87', completedOn:'02 Oct', products:[
                {description:'Parcel', category:'General', weight_kg:1, volume_m3:0.01, created_at:'2026-10-02T10:00:00Z'}
            ]}
        ]
    };
}

// Scope each browser-stored courier workflow to the signed-in demo email.
function cmsCourierOperationsStorageKey() {
    const email = (sessionStorage.getItem(cmsEmailKey) || 'courier@example.com').trim().toLowerCase();
    return cmsCourierOperationsKey + encodeURIComponent(email);
}

// Load a courier's operational preview and seed it once with assigned sample orders.
function cmsLoadCourierOperations() {
    const key = cmsCourierOperationsStorageKey();
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) {
            const initial = cmsDefaultCourierOperations();
            localStorage.setItem(key, JSON.stringify(initial));
            cmsSyncCourierOrders(initial);
            return initial;
        }
        const operations = JSON.parse(stored);
        const valid = operations && Array.isArray(operations.routes) && Array.isArray(operations.orders) &&
            Number.isInteger(operations.nextRouteNumber) && operations.orders.every(order =>
                order && typeof order.id === 'string' &&
                ['pending','initiated','in-progress','completed','cancelled'].includes(order.status)
            );
        if (!valid) throw new Error('Stored Courier operations have an invalid format.');
        const sharedOrders = cmsLoadDemoOrders() || [];
        const sampleOrders = cmsDefaultCourierOperations().orders;
        operations.orders.forEach(order => {
            const sharedOrder = sharedOrders.find(item => item.id === order.id);
            const sampleOrder = sampleOrders.find(item => item.id === order.id);
            if (!Array.isArray(order.products) || !order.products.length) {
                order.products = sharedOrder?.products || sampleOrder?.products || [{
                    description:'Parcel', category:'General', weight_kg:1, volume_m3:0.01,
                    created_at:new Date().toISOString()
                }];
            }
            order.parcels = order.products.length;
        });
        return operations;
    } catch (error) {
        console.error('Could not load demo Courier operations.', error);
        cmsToast('Could not load courier orders from this browser. Check browser storage and try again.');
        return null;
    }
}

// Persist a courier's current route and orders in this browser only.
function cmsSaveCourierOperations(operations) {
    try {
        localStorage.setItem(cmsCourierOperationsStorageKey(), JSON.stringify(operations));
        cmsSyncCourierOrders(operations);
        return true;
    } catch (error) {
        console.error('Could not save demo Courier operations.', error);
        cmsToast('Could not save courier route changes in this browser.');
        return false;
    }
}

// Find the courier's one route that is still being prepared or executed.
function cmsCurrentCourierRoute(operations) {
    return operations.routes.find(route => ['planning','active'].includes(route.status)) || null;
}

// Return an order's visible status label and matching dashboard badge style.
function cmsCourierOrderBadge(status) {
    const labels = {
        pending: 'Pending',
        initiated: 'Initiated',
        'in-progress': 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled'
    };
    const styles = {
        pending: 'cms-badge-warning',
        initiated: 'cms-badge-warning',
        'in-progress': 'cms-badge-info',
        completed: 'cms-badge-success',
        cancelled: 'cms-badge-danger'
    };
    const badge = document.createElement('span');
    badge.className = 'cms-badge ' + (styles[status] || 'cms-badge-warning');
    badge.textContent = labels[status] || status;
    return badge;
}

// Close a route once every associated order is Completed or Cancelled.
function cmsCloseFinishedCourierRoutes(operations) {
    let changed = false;
    operations.routes.forEach(route => {
        const allOrdersAreFinal = route.orderIds.length > 0 && route.orderIds.every(id => {
            const order = operations.orders.find(item => item.id === id);
            return order && ['completed','cancelled'].includes(order.status);
        });
        if (['planning','active'].includes(route.status) && allOrdersAreFinal) {
            route.status = 'completed';
            changed = true;
        }
    });
    if (changed) cmsSaveCourierOperations(operations);
}

// Add selected Pending orders to a route and transition them to Initiated.
function cmsAddCourierOrdersToRoute(operations, route, orderIds) {
    if (!route || route.status !== 'planning') {
        cmsToast('Orders can only be added while the route is in preparation.');
        return false;
    }
    const orders = orderIds.map(id => operations.orders.find(order => order.id === id));
    if (!orders.length || orders.some(order => !order || order.status !== 'pending')) {
        cmsToast('Select one or more pending orders assigned to you.');
        return false;
    }
    orders.forEach(order => {
        order.status = 'initiated';
        order.routeId = route.id;
        route.orderIds.push(order.id);
    });
    if (!cmsSaveCourierOperations(operations)) return false;
    return true;
}

// Render route state, routed orders, pending assignments, summary counts, and completed history.
function cmsRenderCourierDashboard() {
    const pendingList = document.getElementById('courierPendingOrders');
    if (!pendingList) return;
    const operations = cmsLoadCourierOperations();
    if (!operations) return;
    cmsCloseFinishedCourierRoutes(operations);

    const route = cmsCurrentCourierRoute(operations);
    const routeOrders = route
        ? route.orderIds.map(id => operations.orders.find(order => order.id === id)).filter(Boolean)
        : [];
    const unroutedOrders = operations.orders.filter(order =>
        ['pending','cancelled'].includes(order.status) && !order.routeId
    );
    const routableOrders = unroutedOrders.filter(order => order.status === 'pending');
    const completedOrders = operations.orders.filter(order => order.status === 'completed');

    document.getElementById('courierActiveRouteCount').textContent = route ? '1' : '0';
    document.getElementById('courierRouteOrderCount').textContent = String(routeOrders.length);
    document.getElementById('courierCompletedOrderCount').textContent = String(completedOrders.length);

    const routeTitle = document.getElementById('courierRouteTitle');
    const routeReference = document.getElementById('courierRouteReference');
    const routeStatus = document.getElementById('courierRouteStatus');
    const routeDetails = document.getElementById('courierRouteDetails');
    const noRouteMessage = document.getElementById('courierNoRouteMessage');
    const routeReferences = document.getElementById('courierRouteOrderReferences');
    const routeRule = document.getElementById('courierRouteRule');
    const startRouteButton = document.getElementById('startCourierRoute');
    const createRouteButton = document.getElementById('createCourierRoute');

    if (route) {
        const preparing = route.status === 'planning';
        routeTitle.textContent = preparing ? 'Route in preparation' : 'Route in progress';
        routeReference.textContent = 'Route #' + route.id;
        routeStatus.textContent = preparing ? 'In preparation' : 'Active';
        routeStatus.className = 'cms-badge ' + (preparing ? 'cms-badge-warning' : 'cms-badge-info');
        routeStatus.classList.remove('d-none');
        routeDetails.classList.remove('d-none');
        noRouteMessage.classList.add('d-none');
        routeReferences.textContent = routeOrders.length
            ? routeOrders.map(order => '#' + order.id).join(' · ')
            : 'No orders yet';
        routeRule.textContent = preparing
            ? 'Orders can still be added'
            : 'Membership is locked during execution';
        startRouteButton.classList.toggle('d-none', !preparing);
        startRouteButton.disabled = routeOrders.length === 0;
    } else {
        routeTitle.textContent = 'No active route';
        routeReference.textContent = 'Create a route from pending orders';
        routeStatus.classList.add('d-none');
        routeDetails.classList.add('d-none');
        noRouteMessage.classList.remove('d-none');
        startRouteButton.classList.add('d-none');
    }

    const routeOrderList = document.getElementById('courierRouteOrders');
    routeOrderList.replaceChildren();
    if (!routeOrders.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = route ? 'No orders have been added to this route yet.' : 'There are no orders on a route.';
        routeOrderList.appendChild(empty);
    }
    routeOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'cms-order-card mb-3';
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center';
        const reference = document.createElement('strong');
        reference.textContent = '#' + order.id;
        header.append(reference, cmsCourierOrderBadge(order.status));
        const detail = document.createElement('small');
        detail.textContent = order.destination + ' · ' + order.parcels + (order.parcels === 1 ? ' parcel' : ' parcels');
        card.append(header, detail, cmsBuildProductTable(order.products));
        routeOrderList.appendChild(card);
    });

    pendingList.replaceChildren();
    if (!unroutedOrders.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'There are no pending or returned orders assigned to you.';
        pendingList.appendChild(empty);
    }
    unroutedOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'cms-order-card mb-3';
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center';
        const reference = document.createElement('strong');
        reference.textContent = '#' + order.id;
        header.append(reference, cmsCourierOrderBadge(order.status));
        const detail = document.createElement('small');
        detail.textContent = order.destination + ' · ' + order.parcels + (order.parcels === 1 ? ' parcel' : ' parcels');
        card.append(header, detail);

        if (order.status === 'cancelled') {
            const note = document.createElement('small');
            note.className = 'd-block text-muted mt-2';
            note.textContent = 'Cancelled and returned to your order list; it cannot be added to a route.';
            card.appendChild(note);
        } else if (route?.status === 'planning') {
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'btn btn-sm btn-outline-primary mt-2';
            addButton.dataset.addCourierOrder = order.id;
            addButton.textContent = 'Add to current route';
            card.appendChild(addButton);
        } else if (route?.status === 'active') {
            const note = document.createElement('small');
            note.className = 'd-block text-muted mt-2';
            note.textContent = 'Available for the next route';
            card.appendChild(note);
        } else {
            const label = document.createElement('label');
            label.className = 'd-flex align-items-center mt-2 mb-0';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'mr-2';
            checkbox.value = order.id;
            checkbox.dataset.createCourierRouteOrder = 'true';
            label.append(checkbox, document.createTextNode('Add to the next route'));
            card.appendChild(label);
        }
        cmsAppendCourierProductDisclosure(card, order, 'unrouted');
        pendingList.appendChild(card);
    });
    createRouteButton.classList.toggle('d-none', Boolean(route) || routableOrders.length === 0);

    const completedList = document.getElementById('courierCompletedOrders');
    completedList.replaceChildren();
    if (!completedOrders.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'No completed orders yet.';
        completedList.appendChild(empty);
    }
    completedOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'cms-order-card mb-3';
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center';
        const reference = document.createElement('strong');
        reference.textContent = '#' + order.id;
        header.append(reference, cmsCourierOrderBadge(order.status));
        const detail = document.createElement('small');
        detail.textContent = order.destination + (order.completedOn ? ' · Completed ' + order.completedOn : '');
        card.append(header, detail);
        cmsAppendCourierProductDisclosure(card, order, 'completed');
        completedList.appendChild(card);
    });
}

// Bind route creation and order association controls on the courier dashboard only.
function cmsInitCourierDashboard() {
    const pendingList = document.getElementById('courierPendingOrders');
    if (!pendingList) return;
    cmsRenderCourierDashboard();

    pendingList.addEventListener('click', event => {
        const productToggle = event.target.closest('[data-courier-product-toggle]');
        if (productToggle) {
            cmsToggleCourierProductDisclosure(pendingList, productToggle);
            return;
        }
        const button = event.target.closest('[data-add-courier-order]');
        if (!button) return;
        const operations = cmsLoadCourierOperations();
        const route = operations && cmsCurrentCourierRoute(operations);
        if (operations && cmsAddCourierOrdersToRoute(operations, route, [button.dataset.addCourierOrder])) {
            cmsRenderCourierDashboard();
            cmsToast('Order #' + button.dataset.addCourierOrder + ' added to the route as Initiated.');
        }
    });

    document.getElementById('courierCompletedOrders')?.addEventListener('click', event => {
        const productToggle = event.target.closest('[data-courier-product-toggle]');
        if (productToggle) cmsToggleCourierProductDisclosure(event.currentTarget, productToggle);
    });

    document.getElementById('createCourierRoute')?.addEventListener('click', () => {
        const operations = cmsLoadCourierOperations();
        if (!operations || cmsCurrentCourierRoute(operations)) return;
        const selectedIds = [...pendingList.querySelectorAll('[data-create-courier-route-order]:checked')]
            .map(checkbox => checkbox.value);
        if (!selectedIds.length) {
            cmsToast('Select at least one pending order to create a route.');
            return;
        }
        const routeId = 'R-' + operations.nextRouteNumber++;
        const route = {id:routeId, status:'planning', orderIds:[]};
        operations.routes.push(route);
        if (!cmsAddCourierOrdersToRoute(operations, route, selectedIds)) {
            operations.routes = operations.routes.filter(item => item !== route);
            return;
        }
        cmsRenderCourierDashboard();
        cmsToast('Route #' + routeId + ' created with the selected orders.');
    });

    document.getElementById('startCourierRoute')?.addEventListener('click', () => {
        const operations = cmsLoadCourierOperations();
        const route = operations && cmsCurrentCourierRoute(operations);
        if (!operations || !route || route.status !== 'planning' || !route.orderIds.length) return;
        route.status = 'active';
        if (!cmsSaveCourierOperations(operations)) return;
        cmsRenderCourierDashboard();
        cmsToast('Route started. No more orders can be added to it.');
    });

    // Keep this courier's dashboard current if another tab updates the same demo workflow.
    const storageKey = cmsCourierOperationsStorageKey();
    window.addEventListener('storage', event => {
        if (event.key === storageKey) cmsRenderCourierDashboard();
    });
}

/*
 * Active route interaction logic:
 * - The first non-final order in the active route is the order available for interaction.
 * - Order transitions and cancellation are stored in the same courier-scoped browser data as the dashboard.
 * - The order remains In Progress until a file is submitted as its simulated proof of delivery.
 * - Submitting any selected file completes that order and immediately selects the next non-final order.
 * - When every route order is Completed or Cancelled, the route closes and the dashboard can create another.
 */
function cmsCurrentCourierRouteOrder(operations, route) {
    if (!route) return null;
    return route.orderIds
        .map(id => operations.orders.find(order => order.id === id))
        .find(order => order && !['completed','cancelled'].includes(order.status)) || null;
}

// Render the current route, its order list, and controls for its first unfinished order.
function cmsRenderCourierRoute(operations) {
    const activeRoute = cmsCurrentCourierRoute(operations);
    const displayRoute = activeRoute || operations.routes[operations.routes.length - 1] || null;
    const routeOrders = displayRoute
        ? displayRoute.orderIds.map(id => operations.orders.find(order => order.id === id)).filter(Boolean)
        : [];
    const currentOrder = activeRoute?.status === 'active'
        ? cmsCurrentCourierRouteOrder(operations, activeRoute)
        : null;

    const title = document.getElementById('courierActiveRouteTitle');
    const stops = document.getElementById('courierRouteStops');
    const routeStatus = document.getElementById('courierActiveRouteStatus');
    const orderPanel = document.getElementById('activeOrderPanel');
    const unavailable = document.getElementById('courierRouteUnavailable');
    const proofPanel = document.getElementById('proofPanel');
    const advance = document.getElementById('advanceStatus');
    const cancel = document.getElementById('cancelDelivery');

    title.textContent = activeRoute ? 'Active Route #' + activeRoute.id : 'No active route';
    stops.textContent = displayRoute
        ? ['FEUP', ...routeOrders.map(order => 'Order #' + order.id)].join(' → ')
        : 'No route selected';
    if (activeRoute) {
        routeStatus.textContent = activeRoute.status === 'active' ? 'Active' : 'In preparation';
        routeStatus.className = 'cms-badge ' + (activeRoute.status === 'active' ? 'cms-badge-info' : 'cms-badge-warning');
        routeStatus.classList.remove('d-none');
    } else {
        routeStatus.classList.add('d-none');
    }

    const routeOrderList = document.getElementById('courierRouteOrderList');
    routeOrderList.replaceChildren();
    if (!routeOrders.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'There are no orders on this route.';
        routeOrderList.appendChild(empty);
    }
    routeOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'cms-order-card mb-3';
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center';
        const reference = document.createElement('strong');
        reference.textContent = '#' + order.id;
        header.append(reference, cmsCourierOrderBadge(order.status));
        const detail = document.createElement('small');
        detail.textContent = order.destination + ' · ' + order.parcels + (order.parcels === 1 ? ' parcel' : ' parcels');
        card.append(header, detail);
        cmsAppendCourierProductDisclosure(card, order, 'route');
        if (order.proofFile) {
            const proof = document.createElement('small');
            proof.className = 'd-block text-muted';
            proof.textContent = 'Proof file: ' + order.proofFile;
            card.appendChild(proof);
        }
        routeOrderList.appendChild(card);
    });

    if (!currentOrder) {
        orderPanel.classList.add('d-none');
        proofPanel.classList.add('d-none');
        unavailable.classList.remove('d-none');
        unavailable.textContent = activeRoute
            ? 'Start this route from the Courier Dashboard before updating its orders.'
            : 'There is no active route. Prepare and start a route from the Courier Dashboard.';
        return;
    }

    orderPanel.classList.remove('d-none');
    unavailable.classList.add('d-none');
    document.getElementById('currentOrderTitle').textContent = 'Current order #' + currentOrder.id;
    document.getElementById('currentOrderPickup').textContent = 'FEUP';
    document.getElementById('currentOrderDestination').textContent = currentOrder.destination;
    document.getElementById('currentOrderAttempt').textContent = String(currentOrder.attempt || 1);
    document.getElementById('currentOrderItems').textContent = String(currentOrder.parcels);
    cmsRenderProductRows(document.getElementById('currentOrderProducts'), currentOrder.products);

    const status = document.getElementById('orderStatus');
    const badge = cmsCourierOrderBadge(currentOrder.status);
    status.textContent = badge.textContent;
    status.className = badge.className;
    status.dataset.status = currentOrder.status;

    const proofRequired = Boolean(currentOrder.proofRequired);
    proofPanel.classList.toggle('d-none', !proofRequired);
    advance.disabled = proofRequired;
    advance.textContent = currentOrder.status === 'initiated'
        ? 'Start delivery'
        : proofRequired ? 'Proof required' : 'Request delivery proof';
    cancel.disabled = false;

    const currentStep = currentOrder.status === 'initiated' ? 0 : proofRequired ? 2 : 1;
    const timeline = document.getElementById('courierOrderTimeline');
    [...timeline.children].forEach((item, index) => {
        item.classList.toggle('current', index === currentStep);
        item.classList.toggle('upcoming', index > currentStep);
        item.classList.toggle('done', index < currentStep);
    });
}

// Attach persistent order controls and simulated proof submission on the Active Route page.
function cmsInitCourierRoute() {
    const advance = document.getElementById('advanceStatus');
    if (!advance) return;
    const operations = cmsLoadCourierOperations();
    if (!operations) return;
    cmsCloseFinishedCourierRoutes(operations);
    cmsRenderCourierRoute(operations);

    document.getElementById('courierRouteOrderList')?.addEventListener('click', event => {
        const productToggle = event.target.closest('[data-courier-product-toggle]');
        if (productToggle) cmsToggleCourierProductDisclosure(event.currentTarget, productToggle);
    });

    advance.addEventListener('click', () => {
        const currentOperations = cmsLoadCourierOperations();
        const route = currentOperations && cmsCurrentCourierRoute(currentOperations);
        const order = route && cmsCurrentCourierRouteOrder(currentOperations, route);
        if (!currentOperations || !route || route.status !== 'active' || !order) return;
        if (order.status === 'initiated') {
            order.status = 'in-progress';
            if (!cmsSaveCourierOperations(currentOperations)) return;
            cmsRenderCourierRoute(currentOperations);
            cmsToast('Order #' + order.id + ' is now In Progress.');
            return;
        }
        if (order.status === 'in-progress') {
            order.proofRequired = true;
            if (!cmsSaveCourierOperations(currentOperations)) return;
            cmsRenderCourierRoute(currentOperations);
            cmsToast('Select a file to complete order #' + order.id + '.');
        }
    });

    document.getElementById('cancelDelivery')?.addEventListener('click', () => {
        const currentOperations = cmsLoadCourierOperations();
        const route = currentOperations && cmsCurrentCourierRoute(currentOperations);
        const order = route && cmsCurrentCourierRouteOrder(currentOperations, route);
        if (!currentOperations || !route || route.status !== 'active' || !order) return;
        order.status = 'cancelled';
        order.routeId = null;
        route.orderIds = route.orderIds.filter(id => id !== order.id);
        if (!route.orderIds.length) route.status = 'completed';
        delete order.proofRequired;
        if (!cmsSaveCourierOperations(currentOperations)) return;
        cmsCloseFinishedCourierRoutes(currentOperations);
        cmsRenderCourierRoute(currentOperations);
        cmsToast('Order #' + order.id + ' was cancelled and returned to your order list.');
    });

    document.getElementById('submitProof')?.addEventListener('click', () => {
        const fileInput = document.getElementById('deliveryPhoto');
        const file = fileInput?.files?.[0];
        if (!file) {
            cmsToast('Choose a file before completing this order.');
            return;
        }
        const currentOperations = cmsLoadCourierOperations();
        const route = currentOperations && cmsCurrentCourierRoute(currentOperations);
        const order = route && cmsCurrentCourierRouteOrder(currentOperations, route);
        if (!currentOperations || !route || route.status !== 'active' || !order || !order.proofRequired) {
            cmsToast('The active order is not ready for proof submission.');
            return;
        }
        order.status = 'completed';
        order.proofFile = file.name;
        order.completedOn = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'short'});
        delete order.proofRequired;
        if (!cmsSaveCourierOperations(currentOperations)) return;
        cmsCloseFinishedCourierRoutes(currentOperations);
        fileInput.value = '';
        cmsRenderCourierRoute(currentOperations);
        cmsToast('Order #' + order.id + ' completed. The next route order is now active.');
    });

    // Synchronize route details if another browser tab updates the courier's demo orders.
    const storageKey = cmsCourierOperationsStorageKey();
    window.addEventListener('storage', event => {
        if (event.key !== storageKey) return;
        const updatedOperations = cmsLoadCourierOperations();
        if (updatedOperations) cmsRenderCourierRoute(updatedOperations);
    });
}

// Initialize access control, account flows, counters, and page-specific preview controls.
document.addEventListener('DOMContentLoaded', () => {
    if (!cmsInitRoleAccess()) return;

    // Public login/register flows
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const roleSelect = document.getElementById('roleSelect');
        const requestedRole = new URLSearchParams(window.location.search).get('role');
        if (roleSelect && Object.prototype.hasOwnProperty.call(cmsRoles, requestedRole)) {
            roleSelect.value = requestedRole;
        }
        // Validate credentials and require an approved application for Staff sign-in.
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            if (!cmsValidate(loginForm)) return;
            const role = roleSelect.value;
            const email = loginForm.elements.email.value.trim();
            if (role === 'staff') {
                const status = cmsStaffApplicationStatus(email);
                if (status === null) return;
                if (status !== 'approved') {
                    cmsToast(status === 'pending'
                        ? 'Your Staff application is awaiting Admin approval.'
                        : status === 'rejected'
                            ? 'Your Staff application was rejected. Staff access is unavailable.'
                            : 'No Staff application was found for this email. Apply through Register first.');
                    return;
                }
            }
            if (cmsSetRole(role, email)) window.location.assign(cmsRoleHome(role));
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const roleSelect = document.getElementById('registerRole');
        const roleHint = document.getElementById('registerRoleHint');
        const submitButton = registerForm.querySelector('button[type="submit"]');
        // Keep the registration guidance and submit label aligned with the chosen role.
        const updateRoleHint = () => {
            if (roleHint && roleSelect) {
                const applyingForStaff = roleSelect.value === 'staff';
                roleHint.textContent = applyingForStaff
                    ? 'Staff registration submits an application. An Admin must approve it before Staff sign-in is available.'
                    : 'Client and Courier registrations open a temporary demo session.';
                if (submitButton) {
                    submitButton.textContent = applyingForStaff ? 'Submit Staff Application' : 'Create Account';
                }
            }
        };
        // Update the registration guidance immediately when the role selection changes.
        roleSelect?.addEventListener('change', updateRoleHint);
        updateRoleHint();
        // Validate new accounts, submit Staff applications, or start client/courier sessions.
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            if (!cmsValidate(registerForm)) return;
            const role = registerForm.elements['role'].value;
            const email = registerForm.elements.email.value.trim();
            if (role === 'staff') {
                const applications = cmsLoadStaffApplications();
                if (!applications) return;
                const existing = applications.find(application =>
                    application.email.toLowerCase() === email.toLowerCase()
                );
                if (existing) {
                    cmsToast(existing.status === 'pending'
                        ? 'A Staff application for this email is already awaiting review.'
                        : existing.status === 'approved'
                            ? 'This email already has approved Staff access.'
                            : 'A previous application for this email was rejected. Contact an Admin for help.');
                    return;
                }
                applications.push({
                    name: registerForm.elements.name.value.trim(),
                    username: registerForm.elements.username.value.trim(),
                    email: email.toLowerCase(),
                    phone: registerForm.elements.phone.value.trim(),
                    created: new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'short'}),
                    status: 'pending'
                });
                if (!cmsSaveStaffApplications(applications)) return;
                cmsShowRegisterMessage('Your Staff application has been submitted and is awaiting Admin approval.');
                registerForm.classList.add('d-none');
                return;
            }
            if (cmsSetRole(role, email)) window.location.assign(cmsRoleHome(role));
        });
    }

    const staffApplicationsTable = document.getElementById('staffApplicationsTable');
    if (staffApplicationsTable) {
        cmsRenderStaffApplications();
        // Delegate decision-button clicks from the rendered applications table.
        staffApplicationsTable.addEventListener('click', event => {
            const button = event.target.closest('[data-staff-action]');
            if (!button) return;
            cmsUpdateStaffApplication(
                button.dataset.email,
                button.dataset.staffAction === 'approve' ? 'approved' : 'rejected'
            );
        });
        // Refresh the application table when another tab changes its saved records.
        window.addEventListener('storage', event => {
            if (event.key === cmsStaffApplicationsKey) cmsRenderStaffApplications();
        });
    } else if (document.getElementById('pendingStaffApplicationCount')) {
        const count = document.getElementById('pendingStaffApplicationCount');
        // Recompute the dashboard's pending count from the saved application list.
        const updatePendingCount = () => {
            const applications = cmsLoadStaffApplications();
            if (!applications || !count) return;
            count.textContent = applications.filter(application => application.status === 'pending').length;
        };
        updatePendingCount();
        // Keep the dashboard count synchronized with changes made in another tab.
        window.addEventListener('storage', event => {
            if (event.key === cmsStaffApplicationsKey) updatePendingCount();
        });
    }

    // Client dashboard preview map (required Client area map)
    cmsInitClientDashboard();
    // Add the sample FEUP marker when the Client dashboard contains its map element.
    if (document.getElementById('clientDashboardMap')) {
        cmsCreateMap('clientDashboardMap', [
            {coords:[41.1779,-8.5980], label:'FEUP marker'}
        ], {zoom:14});
    }

    // Client order creation
    // Render one movable pickup marker on the order form's OSM map for this sprint.
    if (document.getElementById('clientOrderMap')) {
        const orderMap = cmsCreateMap('clientOrderMap', [], {zoom:14});
        let pickupMarker = null;
        // Keep exactly one pickup marker and recenter it on the requested location.
        function showPickupMarker(coords, label) {
            if (!orderMap || !window.L) return;
            if (pickupMarker) orderMap.removeLayer(pickupMarker);
            pickupMarker = L.marker(coords).addTo(orderMap).bindPopup(label);
            orderMap.setView(coords, 14);
        }
        showPickupMarker([41.1779,-8.5980], 'FEUP pickup');

        const orderForm = document.getElementById('createOrderForm');
        // Validate locations and persist the order with every entered product field.
        orderForm?.addEventListener('submit', e => {
            e.preventDefault();
            if (!cmsValidate(orderForm)) return;

            const olat = cmsReadCoordinate(orderForm,'originLat',-90,90);
            const olng = cmsReadCoordinate(orderForm,'originLng',-180,180);
            const dlat = cmsReadCoordinate(orderForm,'destLat',-90,90);
            const dlng = cmsReadCoordinate(orderForm,'destLng',-180,180);

            if ([olat,olng,dlat,dlng].some(v => v === null)) {
                cmsToast('Check the pickup and delivery coordinates. Latitude must be between -90 and 90; longitude between -180 and 180.');
                return;
            }
            const createdAt = new Date().toISOString();
            const products = [...orderForm.querySelectorAll('.cms-product-row')].map(row => ({
                description:row.querySelector('.product-description').value.trim(),
                category:row.querySelector('.product-category').value.trim(),
                weight_kg:Number(row.querySelector('.product-weight').value),
                volume_m3:Number(row.querySelector('.product-volume').value),
                created_at:createdAt
            }));
            const orders = cmsLoadDemoOrders();
            if (!orders) return;
            const id = String(Date.now());
            orders.push({
                id,
                status:'pending',
                routeId:null,
                pickup:olat + ', ' + olng,
                destination:dlat + ', ' + dlng,
                attempt:0,
                products,
                created_at:createdAt
            });
            if (!cmsSaveDemoOrders(orders)) return;
            showPickupMarker([olat,olng], 'Pickup location');
            cmsToast('Order #' + id + ' was saved in this browser with ' + products.length + ' product(s).');
        });

        // Preview the pickup location with the same single marker, without creating an order.
        document.getElementById('previewRoute')?.addEventListener('click', () => {
            const olat = Number(orderForm.elements['originLat'].value);
            const olng = Number(orderForm.elements['originLng'].value);
            if (Number.isFinite(olat) && Number.isFinite(olng)) {
                showPickupMarker([olat,olng], 'Pickup location');
            }
        });
    }

    // Dynamic products
    // Add a product row when the user requests another order item.
    document.getElementById('addProduct')?.addEventListener('click', cmsAddProductRow);
    // Remove existing rows and recalculate totals after each removal.
    document.querySelectorAll('.cms-remove-product').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.cms-product-row')?.remove();
            cmsUpdateProductTotals();
        });
    });
    // Keep displayed totals current as existing product weights or volumes change.
    document.querySelectorAll('.product-weight,.product-volume').forEach(i => i.addEventListener('input', cmsUpdateProductTotals));
    cmsUpdateProductTotals();

    // Courier dashboard
    // Render this courier's route and orders, then show the sprint's single FEUP marker.
    cmsInitCourierDashboard();
    if (document.getElementById('courierDashboardMap')) {
        cmsCreateMap('courierDashboardMap', [
            {coords:[41.1779,-8.5980], label:'FEUP'}
        ], {zoom:14});
    }
    // Show the same single FEUP marker on the Courier Navigation Cockpit route page.
    if (document.getElementById('courierRouteMap')) {
        cmsCreateMap('courierRouteMap', [
            {coords:[41.1779,-8.5980], label:'FEUP'}
        ], {zoom:14});
    }

    // Courier active-route order handling and file-based proof simulation.
    cmsInitCourierRoute();
    cmsInitClientOrders();
    cmsInitSignature();

    // Generic approvals / rejections
    // Update the selected row to show an approval and acknowledge the action.
    document.querySelectorAll('[data-approve]').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const cell = row?.querySelector('.decision-cell');
            if (cell) cell.innerHTML = '<span class="cms-badge cms-badge-success">Approved</span>';
            cmsToast(btn.dataset.approve || 'Approval recorded.');
        });
    });
    // Update the selected row to show a rejection and acknowledge the action.
    document.querySelectorAll('[data-reject]').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const cell = row?.querySelector('.decision-cell');
            if (cell) cell.innerHTML = '<span class="cms-badge cms-badge-danger">Rejected</span>';
            cmsToast(btn.dataset.reject || 'Rejection recorded.');
        });
    });

    // Notifications
    // Mark the selected notification as read and disable its action control.
    document.querySelectorAll('[data-mark-read]').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.cms-notification');
            item?.classList.remove('unread');
            item?.classList.add('read');
            btn.textContent = 'Read';
            btn.disabled = true;
            cmsToast('Notification marked as read.');
        });
    });

    // Vehicle registration
    const vehicleForm = document.getElementById('vehicleForm');
    // Validate the vehicle form and show its preview-only review confirmation.
    vehicleForm?.addEventListener('submit', e => {
        e.preventDefault();
        if (!cmsValidate(vehicleForm)) return;
        cmsToast('Vehicle details submitted for review in this preview. No data has been saved.');
    });

    // Admin profile
    const profileForm = document.getElementById('adminProfileForm');
    // Validate profile fields and acknowledge the preview-only update.
    profileForm?.addEventListener('submit', e => {
        e.preventDefault();
        if (!cmsValidate(profileForm)) return;
        cmsToast('Account details updated in this preview. No data has been saved.');
    });
});

// Render a requested tracking order after the DOM is available, or immediately if ready.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cmsInitTrackingPage);
} else {
    cmsInitTrackingPage();
}
