async function stopMeasurment() {
    await browser.runtime.sendMessage({"cmd": "update_time"});
    await browser.runtime.sendMessage({"cmd": "stop"});
    return new Promise((resolve, _) => {resolve(null)});
}

// Handlers for detecting browser lose or get focus
var focus_detection = true;
browser.storage.local.get('settings').then(async (storage) => {
    focus_detection = storage?.settings?.focusDetection;
    if (focus_detection == undefined) {focus_detection = true}; 
});
window.addEventListener("blur", async () => {
    if (focus_detection == false) {return;}
    await stopMeasurment();
    console.log("[WINDOW UNFOCUSED] Updated and Stopped!");
})
window.addEventListener("focus", async () => {
    if (focus_detection == false) {return;}
    await browser.runtime.sendMessage({"cmd": "update_active"});
    console.log("[WINDOW FOCUSED] Started and Updated!");
})

// Handlers for detecting user is absent
var absent_detection, inactivityTimeout, user_status, timeout;
browser.storage.local.get('settings').then(async (storage) => {
    absent_detection = storage?.settings?.absentDetection;
    if (absent_detection == undefined) {absent_detection = true}; 

    inactivityTimeout = storage?.settings?.inactivityTimeout;
    if (inactivityTimeout == undefined) {inactivityTimeout = 2 * 60}; // Default to 2 min

    user_status = "present";
    timeout = absent_detection ? createAbsentTimeout() : null;
    
    if (absent_detection) {
        document.addEventListener("mousemove", resetTimeout);
        document.addEventListener("wheel", resetTimeout);
        document.addEventListener("click", resetTimeout);
        document.addEventListener("keydown", resetTimeout);
        document.addEventListener("touchstart", resetTimeout);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {clearTimeout(timeout);}
            else {resetTimeout();}
        });
    }
});

function createAbsentTimeout() {
    return setTimeout(async () => {
        await stopMeasurment();
        user_status = "absent";
        console.log("[USER IS ABSENT] Updated and Stopped!");
    }, inactivityTimeout*1000);
}

async function resetTimeout() {
    if (absent_detection == false) {return;}
    if (user_status == "absent") {
        await browser.runtime.sendMessage({"cmd": "update_active"});
        user_status = "present";
        console.log("[USER IS PRESENT] Updated!");
    }
    clearTimeout(timeout);
    timeout = createAbsentTimeout();
}

// Function to check for changes in browser.storage -> update variables
browser.storage.onChanged.addListener(async (changes, area) => {
    if (area == "local" && changes?.settings) {
        focus_detection = changes.settings.newValue?.focusDetection;
        absent_detection = changes.settings.newValue?.absentDetection;
        inactivityTimeout = changes.settings.newValue?.inactivityTimeout;
        if (focus_detection == undefined) {focus_detection = true};
        if (absent_detection == undefined) {absent_detection = true}; 
        if (inactivityTimeout == undefined) {inactivityTimeout = 2 * 60}; // Default to 2 min
        user_status = "present";
        timeout = absent_detection ? createAbsentTimeout() : null;
        console.log("[SETTINGS CHANGED] Updated!");
    }
});