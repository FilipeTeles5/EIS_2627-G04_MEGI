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

To try the account flow, import the schema and seed, sign in with the demo Admin account below, and open **Users and staff** to review Staff applications. Submitting `client-order.html` creates an order and its products through the PHP API, then starts the MockGateway checkout. **My Orders** loads the signed-in Client's orders and latest payment statuses from the database. Courier available orders and assignment are also database-backed; route progress, route history, vehicle registration, document uploads and the remaining dashboards are still browser demonstrations. If checkout cannot be started, the order remains pending and can be retried from **My Orders**. Client-side page checks are for navigation only—the PHP APIs enforce roles for backend operations.

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

Courier order listings must use the `courier_available_orders` view (or apply its confirmed-payment condition) so pending or failed payments never expose an order to a courier. `GET api/courier/orders.php` lists eligible orders for the signed-in Courier; `POST` with an `order_id` assigns one transactionally to the Courier's planning route, creating one with the first approved vehicle when needed. Assignment is blocked during an active route and checked against vehicle capacity. `POST api/pricing/quote.php` accepts pickup/delivery coordinates and product weights/volumes and returns a quote using the PDF formula: `Fee_base + (OSRM distance in km × Rate_km) + (max(total actual kg, total volume in m³ × 200) × Rate_kg)`. The seed rates match the PDF example; order totals and payment amounts are sample records.

Serve the site through XAMPP Apache (or another PHP server) to use the live quote on `client-order.html`; opening the HTML directly with `file://` cannot call the PHP endpoint. PHP's cURL extension is required for OSRM routing. Set `OSRM_BASE_URL` to override the default public OSRM endpoint.

`POST api/auth/login.php` authenticates by email/password and sets the PHP session fields `user_id` and `role` from the database record. `POST api/auth/register.php` creates Client/Courier accounts and Staff applications; `GET api/auth/session.php` restores the current session and `POST api/auth/logout.php` ends it. New Staff applications must be approved in **Users and staff**. The account list and approvals use `GET`/`PUT api/admin/users.php`, restricted to Admin sessions.

The Admin pricing form uses `GET`/`PUT api/admin/pricing.php` and requires the PHP session role `admin`. Client order creation (`POST api/orders/create.php`), order history (`GET api/orders/mine.php`) and payment endpoints use the same session contract with role `client`.

#### MockGateway test gateway

The payment client uses MockGateway's generic gateway API: `POST /api/base/{slug}/init` and `GET /api/base/{slug}/verify/{payment_id}`. Create a custom gateway from scratch rather than a provider template, whose API paths and request formats differ. The [MockGateway creation guide](https://mockgateway.com/guide/create-payment-gateway) describes the setup; its **Integration** tab provides the gateway slug, test API key and base URL.

Configure the gateway currency as `EUR` and its request fields as follows:

- `amount`: numeric value that accepts decimals
- `currency`: string with three characters
- `order_ref`: string
- `success_redirect`: URL

Map `amount` as the gateway's amount field and `success_redirect` as its return URL field. Use these response templates so they match the PHP client:

Init response:

```json
{
  "txn_id": "{{payment_id}}",
  "txn_status": "{{status}}",
  "payment_url": "{{payment_url}}",
  "amount_charged": "{{amount}}",
  "currency": "{{currency}}"
}
```

Verify response:

```json
{
  "txn_id": "{{payment_id}}",
  "txn_status": "{{status}}",
  "amount_charged": "{{amount}}",
  "currency": "{{currency}}"
}
```

Set `MOCKGATEWAY_SLUG`, `MOCKGATEWAY_API_KEY` and `APP_BASE_URL` in the PHP environment used by Apache. The default API base is `https://mockgateway.com/api/base`; set `MOCKGATEWAY_BASE_URL` only if MockGateway gives you a different base URL. For XAMPP, keep these `SetEnv` values in local Apache configuration outside the repository. Never commit the API key or send it in chat. Test the hosted checkout with the success, failed and canceled outcomes; the return endpoint verifies the transaction with MockGateway before updating the database. Payment start/return endpoints are `POST api/payments/start.php` and `GET api/payments/return.php`.

MockGateway gateways and their transactions belong to the account that created them; GitHub access does not grant MockGateway access. Shared workspaces are not currently available, and sharing an account login is the platform's only sharing option, which it discourages. For group work, each teammate and the professor should create their own test gateway using the same schema and response templates above, then set their own local slug and API key. The code and gateway contract are shared in this repository; credentials are not. See the [MockGateway FAQ](https://mockgateway.com/faq).

If you imported `database/schema.sql` before the `checkout_url` field was added to payments, run `database/migrations/001_add_payment_checkout_url.sql` once. Fresh installations should import only the current schema and seed files.
