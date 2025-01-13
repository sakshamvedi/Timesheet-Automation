const GEMINI_API_KEY = 'AIzaSyC1p_y_Ax7Eyqq4-d1wzYpzhPjW2fdKKkE';
const ACTIVITY_CHECK_INTERVAL = 5;
let lastActivity = null;


chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('activityCheck', { periodInMinutes: ACTIVITY_CHECK_INTERVAL });
});


chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        try {
            await trackActivity(tab);
        } catch (error) {
            console.error('Error tracking activity:', error);
        }
    }
});


chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await trackActivity(tab);
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});


chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'activityCheck') {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab) {
                await trackActivity(activeTab);
            }
        } catch (error) {
            console.error('Error in periodic activity check:', error);
        }
    }
});

async function trackActivity(tab) {
    if (!tab.url || !tab.title) {
        console.warn('Tab URL or title is missing, skipping activity tracking.');
        return;
    }

    const currentTime = new Date();
    const activity = {
        url: tab.url,
        title: tab.title,
        timestamp: currentTime.toISOString(),
        duration: 0
    };

    if (lastActivity) {
        const lastTimestamp = new Date(lastActivity.timestamp);
        if (!isNaN(lastTimestamp)) {
            const duration = (currentTime - lastTimestamp) / 1000 / 60; // in minutes
            lastActivity.duration = duration;
            await storeActivity(lastActivity);
        }
    }

    const analysis = await analyzeActivity(activity);
    activity.description = analysis;
    lastActivity = activity;
}

async function analyzeActivity(activity) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GEMINI_API_KEY}`
            },
            body: JSON.stringify({
                prompt: `Analyze this activity for timesheet entry:\nURL: ${activity.url}\nTitle: ${activity.title}\nPlease provide a brief, professional description of what this activity represents.`
            })
        });

        const data = await response.json();

        if (!data || !data.candidates || !data.candidates[0]?.content) {
            console.warn('Unexpected API response:', data);
            return `Activity on ${activity.title}`;
        }

        return data.candidates[0].content;
    } catch (error) {
        console.error('Error analyzing activity:', error);
        return `Working on ${activity.title || 'unknown activity'}`;
    }
}

async function storeActivity(activity) {
    try {
        const { activities = [] } = await chrome.storage.local.get('activities');
        const updatedActivities = [...activities, activity];
        await chrome.storage.local.set({ activities: updatedActivities });
    } catch (error) {
        console.error('Error storing activity:', error);
    }
}
