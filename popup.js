document.addEventListener('DOMContentLoaded', async () => {
    await displayActivities();
    setupEventListeners();
});

async function displayActivities() {
    const { activities = [] } = await chrome.storage.local.get('activities');
    const activityList = document.getElementById('activityList');

    activityList.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div><strong>Time:</strong> ${new Date(activity.timestamp).toLocaleTimeString()}</div>
      <div><strong>Duration:</strong> ${activity.duration.toFixed(2)} minutes</div>
      <div><strong>Description:</strong> ${activity.description}</div>
    </div>
  `).join('');
}

function setupEventListeners() {
    document.getElementById('exportTimesheet').addEventListener('click', exportTimesheet);
    document.getElementById('clearData').addEventListener('click', clearData);
}

async function exportTimesheet() {
    const { activities = [] } = await chrome.storage.local.get('activities');

    const groupedActivities = activities.reduce((acc, activity) => {
        const date = new Date(activity.timestamp).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(activity);
        return acc;
    }, {});


    let csv = 'Date,Time,Duration (minutes),Description\n';

    Object.entries(groupedActivities).forEach(([date, activities]) => {
        activities.forEach(activity => {
            csv += `${date},${new Date(activity.timestamp).toLocaleTimeString()},${activity.duration.toFixed(2)},"${activity.description}"\n`;
        });
    });


    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function clearData() {
    if (confirm('Are you sure you want to clear all activity data?')) {
        await chrome.storage.local.set({ activities: [] });
        await displayActivities();
    }
}