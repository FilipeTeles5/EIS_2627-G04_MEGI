// Load and update server-side rates; the endpoint enforces the Admin session.
(() => {
    const form = document.getElementById('pricingConfigForm');
    const status = document.getElementById('pricingConfigStatus');
    if (!form || !status) return;

    const fields = {
        fee_base: form.elements.fee_base,
        rate_km: form.elements.rate_km,
        rate_kg: form.elements.rate_kg
    };

    if (window.location.protocol === 'file:') {
        status.textContent = 'Open this page through XAMPP Apache to manage server pricing.';
        return;
    }

    async function sendRequest(method, body) {
        const response = await fetch('api/admin/pricing.php', {
            method,
            headers: body ? {'Content-Type': 'application/json'} : {},
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'same-origin'
        });
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('The pricing service returned an invalid response.');
        }
        if (!response.ok) {
            throw new Error(result.error || 'Could not load pricing configuration.');
        }
        return result;
    }

    function showError(requestError) {
        status.textContent = requestError.message || 'Could not access pricing configuration.';
        status.classList.add('text-danger');
        status.classList.remove('text-success');
    }

    async function loadConfiguration() {
        status.textContent = 'Loading pricing configuration…';
        try {
            const result = await sendRequest('GET');
            fields.fee_base.value = result.pricing.fee_base;
            fields.rate_km.value = result.pricing.rate_km;
            fields.rate_kg.value = result.pricing.rate_kg;
            status.textContent = 'Current pricing loaded.';
            status.classList.remove('text-danger');
            status.classList.add('text-success');
        } catch (requestError) {
            showError(requestError);
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const pricing = Object.fromEntries(
            Object.entries(fields).map(([key, input]) => [key, Number(input.value)])
        );
        if (Object.values(pricing).some(value => !Number.isFinite(value) || value < 0)) {
            showError(new Error('Rates must be non-negative numbers.'));
            return;
        }

        status.textContent = 'Saving pricing…';
        try {
            const result = await sendRequest('PUT', pricing);
            fields.fee_base.value = result.pricing.fee_base;
            fields.rate_km.value = result.pricing.rate_km;
            fields.rate_kg.value = result.pricing.rate_kg;
            status.textContent = 'Pricing saved.';
            status.classList.remove('text-danger');
            status.classList.add('text-success');
        } catch (requestError) {
            showError(requestError);
        }
    });

    loadConfiguration();
})();
