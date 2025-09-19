# TODO: Implement CAM Status Leave Integration

## Information Gathered
- The server.js has a leaves API that supports month filtering, but not year filtering.
- The client-side code in index.html has renderCamStatusGrid() function that renders the CAM status grid.
- Leaves data is stored in the leaves array in the client.
- CAM status data is loaded separately.

## Plan
1. Modify the leaves API in server.js to support year filtering.
2. Modify the loadCamStatus function in index.html to also load leaves data for the selected year and month.
3. Modify the renderCamStatusGrid function to:
   - Check for leave of types "Sick Leave", "Emergency Leave", or "Planned Leave" for each resource and date.
   - If leave exists, do not render the checkbox for that resource on that date.
   - Adjust the total count to exclude days where leave is applied.
4. Ensure the save logic does not include days with leave.

## Dependent Files to be edited
- server.js: Add year filter to leaves API.
- index.html: Modify loadCamStatus and renderCamStatusGrid functions.

## Followup steps
- Test the CAM status view with leave data to confirm checkboxes are hidden and counts are accurate.
- Verify no regressions in leave application and CAM status save functionality.
