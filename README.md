# Movio - our company

Movio brings customers, couriers and delivery teams together to manage the delivery journey, from order creation to proof of delivery.

## Pages

- Public pages: `index.html`, `about.html`, `team.html` and `tracking.html`
- Account entry points: `login.html`, `register.html` and `profile.html`
- Client: `client.html`, `client-order.html` and `client-orders.html`
- Courier: `courier.html`, `courier-route.html` and `courier-vehicles.html`
- Staff: `staff.html`, `staff-approvals.html` and `staff-notifications.html`
- Admin: `admin.html` and `admin-users.html`

## Frontend preview

Login and registration use the PHP API and the MySQL/MariaDB `users` table. PHP keeps the authenticated `user_id` and `role` in a server-side session; the browser's `sessionStorage` only caches display details. Staff applications are saved with `approved_status = 'pending'`; an Admin can review them in **Users and staff**. Pending and rejected accounts cannot sign in.

To try the account flow, import the schema and seed, sign in with the demo Admin account below, and open **Users and staff** to review Staff applications. Submitting `client-order.html` creates an order and its products through the PHP API; the Client order history, profile edits, Courier route state, vehicle registration and document uploads remain demonstration features stored in the browser. Client-side page checks are for navigation only—the PHP APIs enforce roles for backend operations.

The public tracking page accepts the sample order references `1042`, `1031` and `1028`. It displays recorded example details only; it does not query live shipments or a backend. Other references return a not-found message.

The project uses the themed `css/style.css`, application styles in `css/cms.css` and the page interactions in `js/main.js` and `js/cms.js`.

## Backend setup (XAMPP)

The backend uses PHP with PDO and MySQL/MariaDB. Start Apache and MySQL in XAMPP, then import `database/schema.sql` followed by `database/seed.sql` using phpMyAdmin. The schema creates the `movio` database.

`config/database.php` returns a PDO connection and uses these defaults for a local XAMPP installation:

- Host: `127.0.0.1`
- Database: `movio`
- User: `root`
- Password: empty

Set `DB_HOST`, `DB_NAME`, `DB_USER` and `DB_PASS` in the PHP environment to override the local defaults. Do not commit real credentials. Approved seed accounts share this local-demo password:

- Admin: `rita.ferreira@example.test`
- Password: `MovioDemo2026!`

The seed password is public and must only be used with the illustrative local database. Change it or remove the seed accounts before deploying outside the project demonstration.

The seed accounts use fictional names, reserved `.test` email addresses, masked phone numbers and no NIFs. Vehicle registrations and proof-file paths are placeholders, not real documents or identifiers.

Courier order listings must use the `courier_available_orders` view (or apply its confirmed-payment condition) so pending or failed payments never expose an order to a courier. `POST api/pricing/quote.php` accepts pickup/delivery coordinates and product weights/volumes and returns a quote using the PDF formula: `Fee_base + (OSRM distance in km × Rate_km) + (max(total actual kg, total volume in m³ × 200) × Rate_kg)`. The seed rates match the PDF example; order totals and payment amounts are sample records.

Serve the site through XAMPP Apache (or another PHP server) to use the live quote on `client-order.html`; opening the HTML directly with `file://` cannot call the PHP endpoint. PHP's cURL extension is required for OSRM routing. Set `OSRM_BASE_URL` to override the default public OSRM endpoint.

`POST api/auth/login.php` authenticates by email/password and sets the PHP session fields `user_id` and `role` from the database record. `POST api/auth/register.php` creates Client/Courier accounts and Staff applications; `GET api/auth/session.php` restores the current session and `POST api/auth/logout.php` ends it. New Staff applications must be approved in **Users and staff**. The account list and approvals use `GET`/`PUT api/admin/users.php`, restricted to Admin sessions.

The Admin pricing form uses `GET`/`PUT api/admin/pricing.php` and requires the PHP session role `admin`. Client order creation and payment endpoints use the same session contract with role `client`.

For MockGateway, create a generic gateway with request fields `amount` (decimal number), `currency`, `order_ref` and `success_redirect`. Configure the init response fields `txn_id`, `txn_status`, `payment_url`, `amount_charged`, `currency` and the verify response fields `txn_id`, `txn_status`, `amount_charged`, `currency`. Set `MOCKGATEWAY_SLUG`, `MOCKGATEWAY_API_KEY` and `APP_BASE_URL` in the PHP environment; never put the API key in Git or send it in chat. Payment start/return endpoints are `POST api/payments/start.php` and `GET api/payments/return.php`.

If you imported `database/schema.sql` before the `checkout_url` field was added to payments, run `database/migrations/001_add_payment_checkout_url.sql` once. Fresh installations should import only the current schema and seed files.
