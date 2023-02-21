window.addEventListener("blur", () => {
    browser.runtime.sendMessage({"cmd": "update_time"})
    browser.runtime.sendMessage({"cmd": "stop"})
    console.log("[WINDOW UNFOCUSED] Updated and Stopped!")
})
window.addEventListener("focus", () => {
    browser.runtime.sendMessage({"cmd": "update_active"})
    console.log("[WINDOW FOCUSED] Started and Updated!")
})