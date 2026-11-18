# Movio - our company

Movio brings customers, couriers and delivery teams together to manage the delivery journey, from order creation to proof of delivery.

## Pages

- Public pages: `index.html`, `about.html`, `team.html` and `tracking.html`
- Account entry points: `login.html`, `register.html` and `profile.html`
- Client: `client.html`, `client-order.html` and `client-orders.html`
- Courier: `courier.html`, `courier-route.html` and `courier-vehicles.html`
- Staff: `staff.html`, `staff-approvals.html` and `staff-notifications.html`
- Admin: `admin.html` and `admin-users.html`

## Frontend demo

Choose an account type on the login page to open its dashboard. Client and Courier registration creates a temporary session. Staff registration submits an application for Admin review; a Staff session can only be opened after that application is approved. The account menu shows the user's name and provides role-specific shortcuts, workspace access, profile editing and sign out. Demo profiles, applications and their decisions are stored in the current browser's `localStorage`, while the active role, email and display name are kept in the current tab using `sessionStorage`; **Sign out** ends that session. Operational pages are grouped by role, and direct navigation to a page for another role redirects to the current role's dashboard.

To try the Staff flow, register with **Apply for Staff**, sign in as Admin, open **Users and staff** from the Admin dashboard and approve the application. Sign out, then sign in using the applicant's email and the Staff role. Rejected and pending applicants cannot enter the Staff area.

This is a frontend demonstration, not authentication or security. Client, Courier and Admin sign-in accept any valid email and non-empty password; Staff sign-in additionally checks the demo application status. Passwords and tax identifiers are not stored. Client demo orders and products are stored in the current browser's `localStorage`; Courier route state is stored there separately for each demo email and synchronized with the shared order preview. Vehicle registration and document uploads remain preview-only. Browser-side role checks and records can be changed or bypassed and must not protect real data. A production backend must authenticate users, authorize every request and enforce account approval and other business rules.

The public tracking page accepts the sample order references `1042`, `1031` and `1028`. It displays recorded example details only; it does not query live shipments or a backend. Other references return a not-found message.

The project uses the themed `css/style.css`, application styles in `css/cms.css` and the page interactions in `js/main.js` and `js/cms.js`.

## Backend setup (XAMPP)

The backend uses PHP with PDO and MySQL/MariaDB. Start Apache and MySQL in XAMPP, then import `database/schema.sql` followed by `database/seed.sql` using phpMyAdmin. The schema creates the `movio` database.

`config/database.php` returns a PDO connection and uses these defaults for a local XAMPP installation:

- Host: `127.0.0.1`
- Database: `movio`
- User: `root`
- Password: empty

Set `DB_HOST`, `DB_NAME`, `DB_USER` and `DB_PASS` in the PHP environment to override the local defaults. Do not commit real credentials. The seed data is illustrative; its user password hashes are intentionally random and cannot be used to sign in.

The seed accounts use fictional names, reserved `.test` email addresses, masked phone numbers and no NIFs. Vehicle registrations and proof-file paths are placeholders, not real documents or identifiers.

Courier order listings must use the `courier_available_orders` view (or apply its confirmed-payment condition) so pending or failed payments never expose an order to a courier. `POST api/pricing/quote.php` accepts pickup/delivery coordinates and product weights/volumes and returns a quote using the PDF formula: `Fee_base + (OSRM distance in km × Rate_km) + (max(total actual kg, total volume in m³ × 200) × Rate_kg)`. The seed rates match the PDF example; order totals and payment amounts are sample records.

Serve the site through XAMPP Apache (or another PHP server) to use the live quote on `client-order.html`; opening the HTML directly with `file://` cannot call the PHP endpoint. PHP's cURL extension is required for OSRM routing. Set `OSRM_BASE_URL` to override the default public OSRM endpoint.

The Admin pricing form uses `GET`/`PUT api/admin/pricing.php` and requires the PHP session fields `user_id` and `role` (`admin`). Client order creation and payment endpoints use the same session contract with role `client`. The login flow must establish these server-side session values before those operations are available.

For MockGateway, create a generic gateway with request fields `amount` (decimal number), `currency`, `order_ref` and `success_redirect`. Configure the init response fields `txn_id`, `txn_status`, `payment_url`, `amount_charged`, `currency` and the verify response fields `txn_id`, `txn_status`, `amount_charged`, `currency`. Set `MOCKGATEWAY_SLUG`, `MOCKGATEWAY_API_KEY` and `APP_BASE_URL` in the PHP environment; never put the API key in Git or send it in chat. Payment start/return endpoints are `POST api/payments/start.php` and `GET api/payments/return.php`.

If you imported `database/schema.sql` before the `checkout_url` field was added to payments, run `database/migrations/001_add_payment_checkout_url.sql` once. Fresh installations should import only the current schema and seed files.
