// Request an authoritative price quote from the PHP backend as order details change.
(() => {
    const form = document.getElementById('createOrderForm');
    const amount = document.getElementById('orderPriceAmount');
    const details = document.getElementById('orderPriceDetails');
    const error = document.getElementById('orderPriceError');
    if (!form || !amount || !details || !error) return;

    let debounceTimer = null;
    let activeRequest = null;

    function clearQuote(message) {
        if (activeRequest) {
            activeRequest.abort();
            activeRequest = null;
        }
        amount.textContent = message;
        details.textContent = '';
        error.textContent = '';
    }

    function readPositiveNumber(input) {
        if (!input || input.value.trim() === '') return null;
        const value = Number(input.value);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    async function requestQuote() {
        const originLat = Number(form.elements.originLat.value);
        const originLong = Number(form.elements.originLng.value);
        const destLat = Number(form.elements.destLat.value);
        const destLong = Number(form.elements.destLng.value);
        const coordinateValues = [originLat, originLong, destLat, destLong];
        const coordinatesAreValid = coordinateValues.every(Number.isFinite)
            && originLat >= -90 && originLat <= 90
            && destLat >= -90 && destLat <= 90
            && originLong >= -180 && originLong <= 180
            && destLong >= -180 && destLong <= 180
            && form.elements.originLat.value.trim() !== ''
            && form.elements.originLng.value.trim() !== ''
            && form.elements.destLat.value.trim() !== ''
            && form.elements.destLng.value.trim() !== '';

        const products = [...form.querySelectorAll('.cms-product-row')].map(row => ({
            weight_kg: readPositiveNumber(row.querySelector('.product-weight')),
            volume_m3: readPositiveNumber(row.querySelector('.product-volume'))
        }));
        if (!coordinatesAreValid || products.length === 0
            || products.some(product => product.weight_kg === null || product.volume_m3 === null)) {
            clearQuote('Complete locations and product measurements to get a quote.');
            return;
        }

        if (activeRequest) activeRequest.abort();
        activeRequest = new AbortController();
        amount.textContent = 'Calculating…';
        details.textContent = '';
        error.textContent = '';

        try {
            const response = await fetch('api/pricing/quote.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    origin_lat: originLat,
                    origin_long: originLong,
                    dest_lat: destLat,
                    dest_long: destLong,
                    products
                }),
                signal: activeRequest.signal
            });
            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                if (parseError.name === 'AbortError') throw parseError;
                throw new Error('The pricing service returned an invalid response.');
            }
            if (!response.ok) {
                throw new Error((result && result.error) || 'Could not calculate the order price.');
            }
            if (
                !result.quote
                || !Number.isFinite(Number(result.quote.total_price))
                || !Number.isFinite(Number(result.quote.distance_km))
                || !Number.isFinite(Number(result.quote.chargeable_weight_kg))
            ) {
                throw new Error('The pricing service did not return a valid quote.');
            }

            amount.textContent = new Intl.NumberFormat('pt-PT', {
                style: 'currency',
                currency: result.currency || 'EUR'
            }).format(Number(result.quote.total_price));
            details.textContent = Number(result.quote.distance_km).toFixed(2) + ' km road distance · '
                + Number(result.quote.chargeable_weight_kg).toFixed(2) + ' kg chargeable weight';
        } catch (requestError) {
            if (requestError.name === 'AbortError') return;
            amount.textContent = 'Price unavailable.';
            details.textContent = '';
            error.textContent = requestError.message || 'Could not calculate the order price.';
        }
    }

    function scheduleQuote() {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(requestQuote, 500);
    }

    form.addEventListener('input', scheduleQuote);
    form.addEventListener('change', scheduleQuote);
})();
