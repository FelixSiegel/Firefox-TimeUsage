/**
 * This script is responsible for handling users focus and inactivity detection on a webpage.
 * It will use the blur and focus events to detect when the user is not focused on the webpage and
 * will use the inactivity timeout to detect when the user is inactive. The user's status will be
 * updated accordingly and the background script will be notified of the changes.
 * The behaviour of the script can be controlled by the user through the settings page in the popup.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/focus_event
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
 */

/**
 * The SettingsManager class is responsible for loading, managing,
 * and applying the extension's settings. It retrieves settings from
 * the browser's local storage, uses default values when necessary,
 * updates internal configuration properties, and triggers updates
 * to the event listeners whenever changes occur.
 */
class SettingsManager {
    static DEFAULT_FOCUS_DETECTION = true;
    static DEFAULT_ABSENT_DETECTION = true;
    static DEFAULT_INACTIVITY_TIMEOUT = 2 * 60; // Default to 2 min

    static focus_detection = SettingsManager.DEFAULT_FOCUS_DETECTION;
    static absent_detection = SettingsManager.DEFAULT_ABSENT_DETECTION;
    static inactivityTimeout = SettingsManager.DEFAULT_INACTIVITY_TIMEOUT;
    static user_status = "present";
    static timeout;

    /**
     * Loads settings from the browser's local storage and updates the SettingsManager with the retrieved values.
     * If the settings are not found, default values are used.
     * Also updates event listeners after loading the settings.
     *
     * @returns {Promise<void>} A promise that resolves when the settings have been loaded and applied.
     * @throws Will log an error message to the console if loading the settings fails.
     */
    static async loadSettings() {
        try {
            const { settings } = await browser.storage.local.get('settings');
            SettingsManager.focus_detection = settings?.focusDetection
                ?? SettingsManager.DEFAULT_FOCUS_DETECTION;
            SettingsManager.absent_detection = settings?.absentDetection
                ?? SettingsManager.DEFAULT_ABSENT_DETECTION;
            SettingsManager.inactivityTimeout = settings?.inactivityTimeout
                ?? SettingsManager.DEFAULT_INACTIVITY_TIMEOUT;

            EventManager.updateEventListeners();
            console.log("[SETTINGS LOADED] Event Listeners Updated!");
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
    }

    /**
     * Handles changes to the settings.
     *
     * @param {Object} changes - The changes made to the settings.
     * @param {Object} changes.settings - The new settings values.
     * @param {Object} [changes.settings.newValue] - The new settings values.
     * @param {boolean} [changes.settings.newValue.focusDetection] - The new focus detection setting.
     * @param {boolean} [changes.settings.newValue.absentDetection] - The new absent detection setting.
     * @param {number} [changes.settings.newValue.inactivityTimeout] - The new inactivity timeout setting.
     * @param {string} area - The area where the changes were made.
     *
     * @returns {Promise<void>} A promise that resolves when the settings have been handled.
     */
    static async handleSettingsChange(changes, area) {
        if (area === "local" && changes?.settings) {
            const { newValue } = changes.settings;
            SettingsManager.focus_detection = newValue?.focusDetection
                ?? SettingsManager.DEFAULT_FOCUS_DETECTION;
            SettingsManager.absent_detection = newValue?.absentDetection
                ?? SettingsManager.DEFAULT_ABSENT_DETECTION;
            SettingsManager.inactivityTimeout = newValue?.inactivityTimeout
                ?? SettingsManager.DEFAULT_INACTIVITY_TIMEOUT;
            SettingsManager.user_status = "present";

            EventManager.updateEventListeners();
            console.log("[SETTINGS CHANGED] Updated!");
        }
    }
}

/**
 * The EventManager class is responsible for adding and removing event listeners
 * for focus and absent detection. It also handles the logic for resetting the
 * inactivity timeout and updating the user's status when the window is focused
 * or blurred.
 */
class EventManager {
    static addFocusListeners() {
        window.addEventListener("blur", EventManager.handleBlur);
        window.addEventListener("focus", EventManager.handleFocus);
    }

    static removeFocusListeners() {
        window.removeEventListener("blur", EventManager.handleBlur);
        window.removeEventListener("focus", EventManager.handleFocus);
    }

    static addAbsentListeners() {
        const resetEvents = ["mousemove", "wheel", "click", "keydown", "touchstart"];
        resetEvents.forEach(event =>
            document.addEventListener(event, EventManager.resetTimeout)
        );
        document.addEventListener("visibilitychange", EventManager.handleVisibilityChange);
    }

    static removeAbsentListeners() {
        const resetEvents = ["mousemove", "wheel", "click", "keydown", "touchstart"];
        resetEvents.forEach(event =>
            document.removeEventListener(event, EventManager.resetTimeout)
        );
        document.removeEventListener("visibilitychange", EventManager.handleVisibilityChange);
    }

    static updateEventListeners() {
        if (SettingsManager.focus_detection) {
            EventManager.addFocusListeners();
        } else {
            EventManager.removeFocusListeners();
        }

        if (SettingsManager.absent_detection) {
            SettingsManager.timeout = EventManager.createAbsentTimeout();
            EventManager.addAbsentListeners();
        } else {
            EventManager.removeAbsentListeners();
            if (SettingsManager.timeout) {
                clearTimeout(SettingsManager.timeout);
                SettingsManager.timeout = null;
            }
        }
    }

    static async handleBlur() {
        if (!SettingsManager.focus_detection) return;
        await browser.runtime.sendMessage({ "cmd": "stop" });
        console.log("[WINDOW UNFOCUSED] Updated and Stopped!");
    }

    static async handleFocus() {
        if (!SettingsManager.focus_detection) return;
        await browser.runtime.sendMessage({ "cmd": "update_active" });
        console.log("[WINDOW FOCUSED] Started and Updated!");
    }

    static handleVisibilityChange() {
        if (document.hidden) {
            clearTimeout(SettingsManager.timeout);
        } else {
            EventManager.resetTimeout();
        }
    }

    static createAbsentTimeout() {
        return setTimeout(async () => {
            await browser.runtime.sendMessage({ "cmd": "stop" });
            SettingsManager.user_status = "absent";
            console.log("[USER IS ABSENT] Updated and Stopped!");
        }, SettingsManager.inactivityTimeout * 1000);
    }

    static async resetTimeout() {
        if (!SettingsManager.absent_detection) return;
        if (SettingsManager.user_status === "absent") {
            await browser.runtime.sendMessage({ "cmd": "update_active" });
            SettingsManager.user_status = "present";
            console.log("[USER IS PRESENT] Updated!");
        }
        if (SettingsManager.timeout) {
            clearTimeout(SettingsManager.timeout);
        }
        SettingsManager.timeout = EventManager.createAbsentTimeout();
    }
}

SettingsManager.loadSettings();
browser.storage.onChanged.addListener(SettingsManager.handleSettingsChange);