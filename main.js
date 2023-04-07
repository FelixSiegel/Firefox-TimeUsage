window.addEventListener("blur", async () => {
    await browser.runtime.sendMessage({"cmd": "update_time"});
    await browser.runtime.sendMessage({"cmd": "stop"});
    console.log("[WINDOW UNFOCUSED] Updated and Stopped!");
})
window.addEventListener("focus", async () => {
    await browser.runtime.sendMessage({"cmd": "update_active"});
    console.log("[WINDOW FOCUSED] Started and Updated!");
})