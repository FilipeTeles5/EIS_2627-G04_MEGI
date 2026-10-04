# Movio

Movio brings customers, couriers and delivery teams together to manage the delivery journey, from order creation to proof of delivery.

## Pages

- Public pages: `index.html`, `about.html`, `team.html` and `tracking.html`
- Account entry points: `login.html` and `register.html`
- Client: `client.html`, `client-order.html` and `client-orders.html`
- Courier: `courier.html`, `courier-route.html` and `courier-vehicles.html`
- Staff: `staff.html`, `staff-approvals.html` and `staff-notifications.html`
- Admin: `admin.html` and `admin-users.html`

## Frontend demo

Choose an account type on the login page to open its dashboard. Client and Courier registration creates a temporary session. Staff registration submits an application for Admin review; a Staff session can only be opened after that application is approved. Demo applications and their decisions are stored in the current browser's `localStorage`, while the active role and email are kept in the current tab using `sessionStorage`; **Sign out** ends that session. Operational pages are grouped by role, and direct navigation to a page for another role redirects to the current role's dashboard.

To try the Staff flow, register with **Apply for Staff**, sign in as Admin, open **Users and staff** from the Admin dashboard and approve the application. Sign out, then sign in using the applicant's email and the Staff role. Rejected and pending applicants cannot enter the Staff area.

This is a frontend demonstration, not authentication or security. Client, Courier and Admin sign-in accept any valid email and non-empty password; Staff sign-in additionally checks the demo application status. Client demo orders and products are stored in the current browser's `localStorage`; Courier route state is stored there separately for each demo email and synchronized with the shared order preview. Vehicle registration and document uploads remain preview-only. Browser-side role checks and records can be changed or bypassed and must not protect real data. A production backend must authenticate users, authorize every request and enforce account approval and other business rules.

The public tracking page accepts the sample order references `1042`, `1031` and `1028`. It displays recorded example details only; it does not query live shipments or a backend. Other references return a not-found message.

The project uses the themed `css/style.css`, application styles in `css/cms.css` and the page interactions in `js/main.js` and `js/cms.js`.
