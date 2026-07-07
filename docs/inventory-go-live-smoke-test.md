# Inventory Go-Live Smoke Test

Run this checklist against a seeded database before handing the Inventory module to users.

## Preconditions

- API is running and `/healthz` returns `ok`.
- Web app is running and the Inventory module loads.
- Database is migrated and seeded.
- Test user has an Inventory role with read/write access.
- Google Sheets credentials are either configured or intentionally disabled for local-only mode.

## 1. Login and navigation

- Sign in with a user who can access Inventory.
- Open Inventory and confirm the layout loads without console errors.
- Confirm the tabs shown match the user’s permissions.

## 2. Current Inventory list

- Open Current Inventory.
- Confirm rows load from the API.
- Search by SKU, source code, and item name.
- Filter by Healthy, Low Stock, and Out of Stock.
- Change page size and confirm pagination updates correctly.
- Export CSV and confirm the downloaded file matches the current filter.

Expected result: the grid reflects the selected filters and the export contains only matching rows.

## 3. Dashboard and analytics

- Open the Inventory dashboard.
- Confirm summary cards render.
- Confirm recent movements load.
- Confirm low-stock and out-of-stock indicators match the seeded data.

Expected result: the dashboard shows live inventory analytics without errors.

## 4. Check-in flow

- Open Check In.
- Select an existing item and add a positive quantity.
- Submit the check-in.
- Confirm the item quantity increases.
- Confirm a CHECK_IN movement appears in history.
- Create a new item through the check-in form if that workflow is enabled.

Expected result: stock quantity, totals, and movement history all update together.

## 5. Check-out flow

- Open Check Out.
- Select an item with sufficient stock.
- Add it to the cart.
- Submit a single checkout.
- Repeat with a batch of multiple items.
- Confirm the stock quantity decreases.
- Confirm CHECK_OUT movements appear in the movement history.

Expected result: direct checkout always creates approved stock movements and never overshoots available stock.

## 6. Request and approval flow

- Open Request/s.
- Create a request for one or more items.
- Confirm the request appears in pending requests.
- Open the decision modal as an admin.
- Approve one request fully, partially approve another, and reject one.
- Re-open a previously approved request and change it to pending or rejected.

Expected result: approved and partial approvals settle stock, rejection removes settlement, and reversal updates stock back correctly.

## 7. Master data and project list

- Open Master Data.
- Confirm projects and master data rows load.
- Add or edit a master-data record if your role allows it.
- Confirm the project list used by check-in, check-out, and requests reflects the seeded master data.

Expected result: project options stay aligned with master data.

## 8. Google Sheets sync

- If credentials are configured, run the Google Sheets sync from Current Inventory.
- Confirm the sync succeeds and returns a success message.
- Confirm the inventory list still loads after sync.
- If credentials are not configured, confirm the app degrades gracefully and stays usable.

Expected result: sync succeeds when configured and does not block local-only usage.

## 9. Permission checks

- Log in as a read-only inventory user.
- Confirm write actions are hidden or blocked.
- Log in as an admin.
- Confirm admin-only actions are visible, including sync and master data edits.

Expected result: UI visibility matches backend authorization.

## 10. Failure handling

- Stop the API and confirm the UI shows the failure state cleanly.
- Restore the API and confirm the UI recovers.
- Try an invalid checkout quantity greater than stock and confirm the server rejects it.

Expected result: error states are clear and recoverable.

## Go-live verdict

- Pass if all sections above behave as expected on a seeded environment.
- Block release if any of these fail: inventory quantity updates, request settlement, CSV export, or permission enforcement.
