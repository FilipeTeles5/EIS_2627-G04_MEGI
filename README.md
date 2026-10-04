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

Choose an account type on the login page to open its dashboard. Registration creates a temporary Client or Courier session. The selected role and email are kept in the current browser tab using `sessionStorage`; **Sign out** ends that session. Operational pages are grouped by role, and direct navigation to a page for another role redirects to the current role's dashboard.

This is a frontend demonstration, not authentication or security. Any valid email and non-empty password can be used to sign in. Account information, orders, approvals and other actions are not persisted. Browser-side role checks can be bypassed and must not protect real data. A production backend must authenticate users, authorize every request and enforce account approval and other business rules.

The public tracking page accepts the sample order references `1042`, `1031` and `1028`. It displays recorded example details only; it does not query live shipments or a backend. Other references return a not-found message.

The project uses the themed `css/style.css`, application styles in `css/cms.css` and the page interactions in `js/main.js` and `js/cms.js`.
