const storageArea = browser.storage.local;

/**
 * Logs a message to the console with a specified type and color.
 *
 * @param {string} type - The type of the log message (e.g., "INFO", "ERROR").
 * @param {string} msg - The message to log.
 * @param {string} [color="LawnGreen"] - The color of the log message. Defaults to "LawnGreen".
 */
function log(type, msg, color = "LawnGreen") {
    console.log(`%c[${type}]: `, `color: ${color};font-weight:bold;`, msg);
}

/**
 * Returns the current date formatted as MM/DD/YYYY.
 *
 * @returns {string} The formatted date string.
 */
function getToday() {
    return new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formats a Date object into a string of the format MM/DD/YYYY.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

/**
 * Function to check if url is valid and not in ignore-list
 *
 * @param {String} url - URL to check
 * @param {Array<String>} ignore_list - List of URLs to ignore
 * @returns {Boolean} Returns true if URL is valid
 */
function checkUrl(url, ignore_list = []) {
    const patterns = [/^https:\/\/.*\/.*/, /^http:\/\/.*\/.*/];

    // Check url whether is valid or not
    const isValid = patterns.some((pattern) => pattern.test(url));
    if (!isValid) { return false };

    // Check url whether is beeing in ignore-list or not
    const hostname = getHostname(url);
    return !ignore_list.includes(hostname);
}

/**
 * Function to get hostname part from URL
 *
 * @param {String} url - URL to get hostname from
 * @returns {String} Hostname of URL
 */
function getHostname(url) {
    const url_obj = new URL(url);
    return url_obj.hostname
}

/**
 * Adds a URL entry to the storage for the current day.
 * If no URL is provided, it attempts to retrieve the current URL from storage.
 * If the URL entry for the current day already exists, no new entry is created.
 *
 * @param {string|null} [url=null] - The URL to add. If null, the current URL from storage is used.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
async function addUrlEntry(url = null) {
    log("FUNC", "Called addUrlEntry", "DodgerBlue");
    let today = getToday();

    if (!url) {
        const storage = await storageArea.get("c_url");
        url = storage?.c_url;
    }

    if (!url) {
        log("WARN", "Can't create new entry! No URL provided and Current url (c_url) is undefined!", "orange");
        return;
    }

    const { [today]: dayStorage } = await storageArea.get(today);
    if (dayStorage?.[url]) {
        log("INFO", `Entry for ${url} on ${today} already exists! No new entry was created.`);
        return;
    }

    let obj = { [today]: { ...dayStorage, [url]: 0 } };

    await storageArea.set(obj);
    log("INFO", `New entry created for ${url} on ${today}`);
}

/**
 * Adds the specified time to the given URL for the current or specified day.
 *
 * @param {string} url - The URL to which the time should be added.
 * @param {number} time - The amount of time to add.
 * @param {string} [day=null] - The day for which the time should be added. Defaults to the current day if not provided.
 * @returns {Promise<void>} A promise that resolves when the time has been successfully added.
 */
async function addTime(url, time, day = null) {
    day = day || getToday();
    let item = await storageArea.get(day);

    let obj = item[day] || {};
    obj[url] = (obj[url] ?? 0) + time;

    await storageArea.set({ [day]: obj });
    log("INFO", `Time successfully added! \nUrl: ${url} | Date: ${day} | Time-added: ${time}`);
    return;
}

/**
 * Updates the time for the current URL based on the time elapsed since the URL was last set.
 * The time is split into days and added to the corresponding days. The timestamp of the current
 * URL will updated accordingly.
 *
 * @returns {Promise<void>} A promise that resolves when the time has been successfully updated.
 */
async function updateTime() {
    log("FUNC", "Called updateTime", "DodgerBlue")

    const item = await storageArea.get("c_url");
    if (!item?.c_url) {
        log("WARN", "Can't update time! Current url (c_url) is undefined!", "orange");
        return;
    }

    const [url, startTime] = item.c_url;
    const startDate = new Date(startTime * 1000);
    const now = new Date();

    let elapsedTime = (now - startDate) / 1000 | 0;

    // Split the elapsed time into appropriate days
    while (elapsedTime > 0) {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const timeUntilEndOfDay = (endOfDay - startDate) / 1000 | 0;

        if (elapsedTime <= timeUntilEndOfDay) {
            // All remaining time fits in the current day
            await addTime(url, elapsedTime, formatDate(startDate));
            elapsedTime = 0;
        } else {
            // Add time until the end of the current day
            await addTime(url, timeUntilEndOfDay, formatDate(startDate));
            elapsedTime -= timeUntilEndOfDay;
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
        }
    }

    await storageArea.set({ "c_url": [url, now / 1000 | 0] });
    log("INFO", `Updated time for ${url}`);
}

/**
 * Deletes the time entry for a given URL on a specified day from the storage.
 *
 * @param {string} url - The URL for which the time entry should be deleted.
 * @param {string} [day=null] - The day for which the time entry should be deleted. Defaults to the current day if not provided.
 * @returns {Promise<void>} A promise that resolves when the time entry has been deleted.
 */
async function deleteTime(url, day = null) {
    log("FUNC", "Called deleteTime", "DodgerBlue");
    day = day || getToday();
    const { [day]: dayStorage } = await storageArea.get(day);

    if (dayStorage?.[url]) {
        delete dayStorage[url];
        await storageArea.set({ [day]: dayStorage });
        log("INFO", `Time successfully deleted for ${day}! Url: ${url}`);
    } else {
        log("WARN", `No entry found for ${url} on ${day}`);
    }
}

/**
 * Adds a URL to the ignore list and deletes its entry from today's records.
 *
 * @param {string} url - The URL to be ignored.
 * @returns {Promise<void>} A promise that resolves when the URL has been added to the ignore list and its entry has been deleted from today's records.
 */
async function addIgnore(url) {
    log("FUNC", "Called addIgnore", "DodgerBlue");
    // First delete entry from today's records
    // TODO: delete entry from all days -> currently it will only be deleted from the current day
    await deleteTime(url);

    // Add it to ignore list in local-storage
    const { ignored: ignore_list = [] } = await storageArea.get("ignored");
    ignore_list.push(url);
    await storageArea.set({ "ignored": ignore_list });
    log("INFO", `Url to ignore was added: ${url}`);
}

/**
 * This function updates the time for the previous URL, retrieves the new active tab, checks if the URL is valid
 * and not in the ignore list and updates the current URL based on the result.
 *
 * @returns {Promise<void>} A promise that resolves when the function completes.
 */
async function updateActive() {
    log("EVENT", "Tab changed or updated!", "rgb(255, 153, 0)");

    await updateTime();

    // Get current active tab of active window
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url;

    if (!url) {
        log("WARN", "No URL found for the active tab.");
        await storageArea.remove("c_url");
        return;
    }

    // Get current ignore-list and validate url
    const { ignored: ignore_list = [] } = await storageArea.get("ignored");
    const valid = checkUrl(url, ignore_list);

    if (!valid) {
        await storageArea.remove("c_url");
        return;
    }

    // Update current url in storage
    await storageArea.set({
        "c_url": [getHostname(url), Date.now() / 1000 | 0]
    });
    log("INFO", `Current url (c_url) updated to: ${url}`);

    // Create new entry for new url (will be created only if not exists)
    await addUrlEntry(getHostname(url));
}

browser.tabs.onActivated.addListener(updateActive);
browser.tabs.onUpdated.addListener(updateActive);

// Wait for messages from popup.js and main.js
browser.runtime.onMessage.addListener(async (data, _sender, _sendResponse) => {
    log("MESSAGE", `${data.cmd}-Request received.`, "orchid");

    switch (data.cmd) {
        case 'update_time':
            await updateTime();
            return { state: "updated" };

        case 'update_active':
            await updateActive();
            return { state: "updated" };

        case 'stop':
            try {
                // TODO: Maybe update time for current url before deleting it???
                await storageArea.remove("c_url");
                log("WARN", "Current url (c_url) was deleted after Stop-Request...");
            } catch (err) {
                log("ERROR", `Error occurred when deleting c_url from storage after Stop-Request. Error: \n${err}`);
            }
            break;

        case 'delete_entry':
            await deleteTime(data.url);
            return { state: "successful" };

        case 'ignore_entry':
            await addIgnore(data.url);
            return { state: "successful" };

        default:
            log("WARN", `Unknown command received: ${data.cmd}`);
            break;
    }
});