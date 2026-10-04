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

function cmsValidate(form) {
    form.classList.add('was-validated');
    return form.checkValidity();
}

function cmsDemoTrack() {
    const input = document.getElementById('trackingId');
    const result = document.getElementById('trackingResult');
    if (!input || !result) return;
    const value = input.value.trim().replace(/[^a-zA-Z0-9-]/g, '');
    if (!value) {
        result.textContent = 'Enter an order reference to see a tracking preview.';
        return;
    }
    result.textContent = 'Sample tracking result for order #' + value +
        ': In progress. Live tracking is not available in this preview.';
}

function cmsCreateMap(id, points, options = {}) {
    const node = document.getElementById(id);
    if (!node || !window.L) return null;

    const map = L.map(id);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
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
    return map;
}

function cmsReadCoordinate(form, name, min, max) {
    const el = form.elements[name];
    const n = Number(el?.value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

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
    row.querySelector('.cms-remove-product').addEventListener('click', () => {
        row.remove();
        cmsUpdateProductTotals();
    });
    row.querySelectorAll('input').forEach(i => i.addEventListener('input', cmsUpdateProductTotals));
    cmsUpdateProductTotals();
}

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

function cmsInitSignature() {
    const canvas = document.getElementById('signaturePad');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;

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

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return {x: p.clientX - r.left, y: p.clientY - r.top};
    }
    function start(e) {
        drawing = true;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }
    function move(e) {
        if (!drawing) return;
        e.preventDefault();
        const p = pos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }
    function stop() { drawing = false; }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start, {passive:false});
    canvas.addEventListener('touchmove', move, {passive:false});
    canvas.addEventListener('touchend', stop);

    document.getElementById('clearSignature')?.addEventListener('click', () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
    });
}

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
const cmsRoleKey = 'movioDemoRole';
const cmsEmailKey = 'movioDemoEmail';

function cmsPageName() {
    return window.location.pathname.split('/').pop().toLowerCase();
}

function cmsGetRole() {
    const role = sessionStorage.getItem(cmsRoleKey);
    if (!Object.prototype.hasOwnProperty.call(cmsRoles, role)) {
        sessionStorage.removeItem(cmsRoleKey);
        sessionStorage.removeItem(cmsEmailKey);
        return null;
    }
    return role;
}

function cmsSetRole(role, email) {
    if (!Object.prototype.hasOwnProperty.call(cmsRoles, role)) {
        cmsToast('Choose a valid account type.');
        return false;
    }
    sessionStorage.setItem(cmsRoleKey, role);
    sessionStorage.setItem(cmsEmailKey, email.trim());
    return true;
}

function cmsRoleHome(role) {
    return cmsRoles[role].home;
}

function cmsInitRoleAccess() {
    const role = cmsGetRole();
    const page = cmsPageName();
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
            notice.textContent = 'Preview mode: this page uses sample data, and your changes are not saved.';
            hero.appendChild(notice);
        }
    }

    return true;
}

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
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            if (!cmsValidate(loginForm)) return;
            const role = roleSelect.value;
            const email = loginForm.elements.email.value;
            if (cmsSetRole(role, email)) window.location.assign(cmsRoleHome(role));
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            if (!cmsValidate(registerForm)) return;
            const role = registerForm.elements['role'].value;
            const email = registerForm.elements.email.value;
            if (cmsSetRole(role, email)) window.location.assign(cmsRoleHome(role));
        });
    }

    // Home tracking
    document.getElementById('trackButton')?.addEventListener('click', cmsDemoTrack);

    // Client dashboard preview map (required Client area map)
    if (document.getElementById('clientDashboardMap')) {
        cmsCreateMap('clientDashboardMap', [
            {coords:[41.1779,-8.5980], label:'FEUP marker'}
        ], {zoom:14});
    }

    // Client order creation
    if (document.getElementById('clientOrderMap')) {
        const orderMap = L.map('clientOrderMap').setView([41.1779,-8.5980], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
        }).addTo(orderMap);

        let overlays = [];
        function drawRoute(a,b) {
            overlays.forEach(x => orderMap.removeLayer(x));
            overlays = [
                L.marker(a).addTo(orderMap).bindPopup('Origin'),
                L.marker(b).addTo(orderMap).bindPopup('Destination'),
                L.polyline([a,b], {color:'#FF4800',weight:5,opacity:.85}).addTo(orderMap)
            ];
            orderMap.fitBounds([a,b], {padding:[30,30]});
        }
        drawRoute([41.1779,-8.5980], [41.1579,-8.6291]);

        const orderForm = document.getElementById('createOrderForm');
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
            drawRoute([olat,olng],[dlat,dlng]);
            cmsToast('Delivery order created in this preview. No data has been saved.');
        });

        document.getElementById('previewRoute')?.addEventListener('click', () => {
            const olat = Number(orderForm.elements['originLat'].value);
            const olng = Number(orderForm.elements['originLng'].value);
            const dlat = Number(orderForm.elements['destLat'].value);
            const dlng = Number(orderForm.elements['destLng'].value);
            if ([olat,olng,dlat,dlng].every(Number.isFinite)) drawRoute([olat,olng],[dlat,dlng]);
        });
    }

    // Dynamic products
    document.getElementById('addProduct')?.addEventListener('click', cmsAddProductRow);
    document.querySelectorAll('.cms-remove-product').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.cms-product-row')?.remove();
            cmsUpdateProductTotals();
        });
    });
    document.querySelectorAll('.product-weight,.product-volume').forEach(i => i.addEventListener('input', cmsUpdateProductTotals));
    cmsUpdateProductTotals();

    // Courier maps
    if (document.getElementById('courierDashboardMap')) {
        cmsCreateMap('courierDashboardMap', [
            {coords:[41.1779,-8.5980], label:'Origin · FEUP'},
            {coords:[41.1579,-8.6291], label:'Destination · Matosinhos'}
        ]);
    }
    if (document.getElementById('courierRouteMap')) {
        cmsCreateMap('courierRouteMap', [
            {coords:[41.1779,-8.5980], label:'Route origin · FEUP'},
            {coords:[41.1655,-8.6209], label:'Order #1042'},
            {coords:[41.1579,-8.6291], label:'Order #1043'}
        ]);
    }

    // Courier status transitions
    const advance = document.getElementById('advanceStatus');
    const cancel = document.getElementById('cancelDelivery');
    const status = document.getElementById('orderStatus');
    const proof = document.getElementById('proofPanel');

    if (advance && status) {
        const statuses = ['Initiated','In Progress','Completed'];
        let index = statuses.indexOf(status.dataset.status || 'Initiated');
        if (index < 0) index = 0;

        advance.addEventListener('click', () => {
            if (index >= statuses.length - 1) return;
            index++;
            status.textContent = statuses[index];
            status.dataset.status = statuses[index];
            status.className = 'cms-badge ' + (index === 2 ? 'cms-badge-success' : 'cms-badge-info');
            cmsToast('Order status changed to ' + statuses[index] + '.');

            if (index === 2) {
                proof?.classList.remove('d-none');
                advance.disabled = true;
            }
        });
    }
    cancel?.addEventListener('click', () => {
        if (status) {
            status.textContent = 'Cancelled';
            status.className = 'cms-badge cms-badge-danger';
        }
        if (advance) advance.disabled = true;
        cmsToast('Delivery cancelled in this preview. No data has been saved.');
    });

    cmsInitSignature();

    document.getElementById('submitProof')?.addEventListener('click', () => {
        const photo = document.getElementById('deliveryPhoto');
        const hasPhoto = photo?.files?.length > 0;
        if (!hasPhoto) {
            cmsToast('Delivery confirmation submitted in this preview. No data has been saved.');
        } else {
            cmsToast('Delivery photo submitted in this preview. No data has been saved.');
        }
    });

    // Generic approvals / rejections
    document.querySelectorAll('[data-approve]').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const cell = row?.querySelector('.decision-cell');
            if (cell) cell.innerHTML = '<span class="cms-badge cms-badge-success">Approved</span>';
            cmsToast(btn.dataset.approve || 'Approval recorded.');
        });
    });
    document.querySelectorAll('[data-reject]').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const cell = row?.querySelector('.decision-cell');
            if (cell) cell.innerHTML = '<span class="cms-badge cms-badge-danger">Rejected</span>';
            cmsToast(btn.dataset.reject || 'Rejection recorded.');
        });
    });

    // Notifications
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
    vehicleForm?.addEventListener('submit', e => {
        e.preventDefault();
        if (!cmsValidate(vehicleForm)) return;
        cmsToast('Vehicle details submitted for review in this preview. No data has been saved.');
    });

    // Admin profile
    const profileForm = document.getElementById('adminProfileForm');
    profileForm?.addEventListener('submit', e => {
        e.preventDefault();
        if (!cmsValidate(profileForm)) return;
        cmsToast('Account details updated in this preview. No data has been saved.');
    });
});
