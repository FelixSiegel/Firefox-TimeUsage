console.log("Hello from background!");

// storage area represents local browser storage
const storageArea = browser.storage.local;

// Function for better logging
function log(type, msg, color = "LawnGreen") {
    console.log(`%c[${type}]: `, `color: ${color};font-weight:bold;`, msg);
}
// Function that returns actualy date in forman mm/dd/yy
function getToday() {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();

    return (mm + '/' + dd + '/' + yyyy)
}

function check_url(url, ignore_list = []) {
    // check if url matches to url-patterns
    let patterns = [/https:\/\/.*\/.*/gm, /http:\/\/.*\/.*/gm]
    for (let i = 0; i < patterns.length; i++) {
        let match = url.match(patterns[i])
        if (match !== null && match[0] === url) {
            // check url whether is beeing in ignore-list
            if (ignore_list.includes(extract_hostname(url))) { return false }
            return true;
        }
    }
    return false
}

function extract_hostname(url) {
    // extract only the hostname of an url
    let idx = url.indexOf("://") + 3;
    if (idx < 0) { return url }
    let host = "";
    for (let i = idx; i < url.length; i++) {
        if (url[i] != "/") {
            host = host + url[i]
        } else { break }
    }
    return host
}

async function createNewSign() {
    log("FUNC", "Called createNewSign", "DodgerBlue")
    let today = getToday();

    let s_c_url, item
    try {
        s_c_url = await storageArea.get("c_url");
        item = await storageArea.get(today);
    } catch (error) {
        log("ERROR", `Failed to get data from ${today} in browser.storage.local within createNewSign-Function. Error: \n ${error}`, "red")
        return;
    }

    // prepare new object-sign
    let obj = {}; obj[today] = {};
    let url = s_c_url.c_url[0];
    // if already values of today exists
    if (item[today] != undefined) {
        obj[today] = item[today];
    }
    // finally add new value
    obj[today][url] = 0;
    // add new sign to local-storage
    await storageArea.set(obj);
    log("INFO", `New sign created! Url: ${url}`)
}

async function deleteTime(url) {
    log("FUNC", "Called deleteTime", "DodgerBlue")
    let today = getToday();
    let item = await storageArea.get(today);
    let obj = {}; obj[today] = item[today];
    // delete entry
    delete obj[today][url]
    await storageArea.set(obj);

    log("INFO", `Time successfully deleted for ${today}! Url: ${url}`)
}

async function addTime(url, time, day = null, storage_obj = null) {
    if (!day) { day = getToday() };
    let item = storage_obj ? storage_obj : await storageArea.get(day);

    let obj = {};
    obj[day] = item[day] || { [day]: {} };
    obj[day][url] = (item[day][url] ?? 0) + time;

    if (!storage_obj) {
        await storageArea.set(obj);
        log("INFO", `Time successfully added! \nUrl: ${url} | Date: ${day} | Time-added: ${time} | Storage: browser.storage.local`);
        return new Promise((resolve, _) => { resolve(null) });
    } else {
        for (const key in obj) { item[key] = obj[key] };
        log("INFO", `Time successfully added! \nUrl: ${url} | Date: ${day} | Time-added: ${time} | Storage: given storage-object ${storage_obj}`);
        return new Promise((resolve, _) => { resolve(item) });
    }
}

async function addIgnore(url) {
    log("FUNC", "Called addIgnore", "DodgerBlue")
    // first delete entry from today's records
    // TODO: delete entry from all days -> currently it will only deleted from current day
    await deleteTime(url);
    // add it to ignore list in local-storage
    let ignore_list = await storageArea.get("ignored");
    let list = (Object.keys(ignore_list).length >= 1) ? ignore_list["ignored"] : [];
    list.push(url);
    await storageArea.set({ "ignored": list });
    log("INFO", `Url to ignore was added: ${url}`)
}

async function updateTime(storage_obj = null) {
    log("FUNC", "Called updateTime", "DodgerBlue")
    // if c_url is defined -> calculate passed time -> sum to sign in local-storage
    let item = await storageArea.get("c_url");
    if (!item?.c_url) {
        log("WARN", "Can't update time! Current url (c_url) is undefined!", "orange");
        return new Promise((resolve, _) => { resolve(storage_obj) });
    }

    log("INFO", `Updating time for c_url = ${item.c_url}`);

    let url = item.c_url[0];
    let startTime = item.c_url[1];

    let startDate = new Date(startTime * 1000);
    let curDate = new Date();

    function clearDate(date) {
        // clear time from date
        let clear = new Date(date)
        clear.setHours(0, 0, 0, 0);
        return clear;
    }

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    // If the start date is not today, add times to all days behind the current day
    if (!isSameDay(startDate, curDate)) {
        log(
            "WARN",
            `Start date (${startDate.toLocaleDateString("en-US")}) is not today`
            `(${curDate.toLocaleDateString("en-US")}). Adding time to all days behind the current day.`,
            "orange"
        );
        let nextDate = new Date(clearDate(startDate));

        while (!isSameDay(nextDate, curDate)) {
            // increase date by one day
            nextDate.setDate(nextDate.getDate() + 1);

            // get time elapsed in seconds from startDate to nextDate
            let passedTime = (nextDate.getTime() - startDate.getTime()) / 1000 | 0;

            let dd = String(startDate.getDate()).padStart(2, '0');
            let mm = String(startDate.getMonth() + 1).padStart(2, '0');
            let yyyy = startDate.getFullYear();

            storage_obj = await addTime(url, passedTime, `${mm}/${dd}/${yyyy}`, storage_obj);

            // increase startDate with passed time to subtract this day = start of next day
            startDate = clearDate(startDate.setDate(startDate.getDate() + 1));
        }
    }
    let elapsedTime = (curDate.getTime() - startDate.getTime()) / 1000 | 0;
    storage_obj = await addTime(url, elapsedTime, null, storage_obj);
    return new Promise((resolve, _) => { resolve(storage_obj) });
}

async function updateActive() {
    log("FUNC", "Called updateActive", "DodgerBlue")

    // update time from c_url to sign in storage
    await updateTime();

    // get current active tab of active window
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    let url = tabs[0].url;

    // get current ignore-list
    let ignore_list = await storageArea.get("ignored");
    let check = check_url(url, ignore_list["ignored"] || []);

    // If url is not in whitelist -> return
    if (check === false) {
        await storageArea.remove("c_url");
        return;
    }

    // set current url to storage
    await storageArea.set({
        "c_url": [extract_hostname(url), Date.now() / 1000 | 0]
    });
    log("INFO", `Current url (c_url) updated to: ${url}`);

    // check if already list assignment exist
    let today = getToday()
    let item = await storageArea.get(today);

    // if no sign of that url in current date exist -> create new sign
    if (!item || !item[today] || !item[today][extract_hostname(url)]) {
        await createNewSign();
        return;
    }

    // else log simple info that already sign exist
    log("INFO", `Item ${Object.keys(item)[0]} in browser.storage.local already exists! No new sign was created.`)
}

browser.tabs.onActivated.addListener(updateActive);
browser.tabs.onUpdated.addListener(updateActive);

// wait for messages of popup.js or main.js
browser.runtime.onMessage.addListener(async (data, _sender, _sendResponse) => {
    if (data.cmd == 'update_time') {
        // update times in storage
        log("MESSAGE", "update-time-Request received.", "orchid");
        await updateTime();
        return new Promise((resolve) => { resolve({ state: "updated" }) });
    }
    else if (data.cmd == 'update_active') {
        // update active tab and time
        log("MESSAGE", "update-active-Request received.", "orchid");
        await updateActive();
        return new Promise((resolve) => { resolve({ state: "updated" }) });
    }
    else if (data.cmd == 'stop') {
        // stop time adding by clearing current url
        log("MESSAGE", "Stop-Request received.", "orchid");
        try {
            await storageArea.remove("c_url");
            log("WARN", "Current url (c_url) was deleted after Stop-Request...");
        } catch (err) {
            log("ERROR", `Error occurred when deleting c_url from storage after Stop-Request. Error: \n${err}`);
        }
    }
    else if (data.cmd == 'delete_entry') {
        // delete time of entry in browser.storage.local
        log("MESSAGE", "delete-entry-Request received.", "orchid");
        await deleteTime(data.url);
        return new Promise((resolve) => { resolve({ state: "successful" }) });
    }
    else if (data.cmd == 'ignore_entry') {
        // add url to ignore_list array in local storage
        log("MESSAGE", "ignore-entry-Request received.", "orchid");
        console.log("Add url to ignore-list: ", data.url);
        await addIgnore(data.url);;
        return new Promise((resolve) => { resolve({ state: "successful" }) });
    }
    else if (data.cmd == 'get_storage') {
        // get current storage update it locally and send this new object (it will not be saved in localStorage)
        log("MESSAGE", "get-storage-Request received.", "orchid");
        let storage_obj = await storageArea.get();
        storage_obj = await updateTime(storage_obj);
        return new Promise((resolve) => { resolve(storage_obj) });
    }
});