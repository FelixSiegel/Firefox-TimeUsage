window.addEventListener("blur", async () => {
    let storage = await browser.storage.local.get('settings');
    if (storage?.settings?.focusDetection == false) return;
    await browser.runtime.sendMessage({"cmd": "update_time"});
    await browser.runtime.sendMessage({"cmd": "stop"});
    console.log("[WINDOW UNFOCUSED] Updated and Stopped!");
})
window.addEventListener("focus", async () => {
    let storage = await browser.storage.local.get('settings');
    if (storage?.settings?.focusDetection == false) return;
    await browser.runtime.sendMessage({"cmd": "update_active"});
    console.log("[WINDOW FOCUSED] Started and Updated!");
})