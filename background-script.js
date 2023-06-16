console.log("Hello from background!");

// Function that returns actualy date in forman mm/dd/yy
function getToday() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    return (mm + '/' + dd + '/' + yyyy)
}

function check_url(url, ignore_list=[]) {
    // check if url matches to url-patterns
    var patterns = [/https:\/\/.*\/.*/gm, /http:\/\/.*\/.*/gm]
    for (var i = 0; i < patterns.length; i++) {
        var match = url.match(patterns[i])
        if (match !== null && match[0] === url) { 
            // check url whether is beeing in ignore-list
            if (ignore_list.includes(extract_hostname(url))) {return false}
            return true;
        }
    }
    return false
}

function extract_hostname(url) {
    // extract only the hostname of an url
    var idx = url.indexOf("://") + 3;
    if (idx < 0) {return url}
    var host = "";
    for (var i = idx; i < url.length; i++) {
        if (url[i] != "/") {
            host = host + url[i]
        } else {break}
    }
    return host
}

async function createNewSign() {
    var today = getToday();

    try {
        var s_c_url = await browser.storage.local.get("c_url");
        var item = await browser.storage.local.get(today);
    } catch (error) {
        console.error("[ERROR]: failed to get data from local storage", error);
        return;
    }

    // prepare new object-sign
    var obj = {}; obj[today] = {};
    var url = s_c_url.c_url[0];
    // if already values of today exists
    if (item[today] != undefined) {
        obj[today] = item[today];
    }
    // finally add new value
    obj[today][url] = 0;
    // add new sign to local-storage
    await browser.storage.local.set(obj);
    console.log("[INFO]: new value added: ", obj)
}

async function deleteTime(url) {
    var today = getToday();
    var item = await browser.storage.local.get(today);
    var obj = {}; obj[today] = item[today];
    // delete entry
    delete obj[today][url]
    await browser.storage.local.set(obj);

    console.info(`Time successfully deleted! Url: ${url}`);
}

async function addTime(url, time, day=null, storage_obj=null) {
    if (!day) {day = getToday()};
    var item = storage_obj ? storage_obj : await browser.storage.local.get(day);

    var obj = {}; 
    obj[day] = item[day] || { [day]: {} };
    obj[day][url] = (item[day][url] ?? 0) + time;

    if (!storage_obj) { 
        await browser.storage.local.set(obj); 
        console.info(`Time successfully added to localStorage! Url: ${url}, Time-added: ${time}`);
        return new Promise((resolve, _) => {resolve(null)});
    } else {
        for (var key in obj) { item[key] = obj[key] };
        console.log(`Time successfully added to given Storage! ${url}, Time-added: ${time}`);
        return new Promise((resolve, _) => {resolve(item)});
    }    
}

async function addIgnore(url) {
    // first delete entry from today's records
    // TODO: delete entry from all days -> currently it will only deleted from current day
    await deleteTime(url);
    // add it to ignore list in local-storage
    var ignore_list = await browser.storage.local.get("ignored");
    var list = (Object.keys(ignore_list).length >= 1) ? ignore_list["ignored"] : [];
    list.push(url);
    await browser.storage.local.set({"ignored": list});
}

async function updateTime(storage_obj = null) {
    // if c_url is defined -> calculate passed time -> sum to sign in local-storage
    var item = await browser.storage.local.get("c_url");
    console.log("[INFO]: Item-check: ", item, item.c_url)
    if (!item?.c_url) {
        console.warn("[WARN]: c_url is currently undefined!"); return new Promise((resolve, _) => {resolve(storage_obj)});
    }

    var url = item.c_url[0];
    var startTime = item.c_url[1]; 

    var startDate = new Date(startTime*1000); 
    var curDate = new Date(); 

    function clearDate(date) {
        // clear time from date
        clear = new Date(date)
        clear.setHours(0, 0, 0, 0);
        return clear;
    }

    // If the start date is not today, add times to all days behind the current day
    if (clearDate(startDate) !== clearDate(curDate)) {
        var nextDate = new Date(clearDate(startDate));

        while (nextDate < clearDate(curDate)) {
            // increment date by one day
            nextDate.setDate(nextDate.getDate() + 1);

            // get time elapsed in seconds from startDate to nextDate
            var passedTime = (nextDate - startDate) / 1000 | 0;
            console.log(`Time for ${startDate}: ${passedTime} seconds`);
            // add time to day
            var dd = String(startDate.getDate()).padStart(2, '0');
            var mm = String(startDate.getMonth() + 1).padStart(2, '0');
            var yyyy = startDate.getFullYear();

            storage_obj = await addTime(url, passedTime, (mm + '/' + dd + '/' + yyyy), storage_obj);

            // increase startDate with passed time to subtract this day
            startDate.setDate(clearDate(startDate).getDate() + 1);
        }
    } 
    var elapsedTime = (curDate.getTime() - startDate.getTime()) / 1000 | 0;
    storage_obj = await addTime(url, elapsedTime, null, storage_obj);
    return new Promise((resolve, _) => {resolve(storage_obj)});
}

async function updateActive() {
    console.log("Called updateActive-Function")

    // update time from c_url to sign in storage
    await updateTime();

    // get current active tab of active window
    var tabs = await browser.tabs.query({ active: true, currentWindow: true });
    var url = tabs[0].url;

    // get current ignore-list
    var ignore_list = await browser.storage.local.get("ignored");
    var check = check_url(url, ignore_list["ignored"] || []);

    // If url is not in whitelist -> return
    if (check === false) {
        await browser.storage.local.remove("c_url"); 
        return;
    }

    // set current url to storage
    await browser.storage.local.set({
        "c_url": [extract_hostname(url), Date.now()/1000 | 0]
    });
    console.info("[INFO]: c_url was updated!")

    // check if already list assignment exist
    var today = getToday()
    var item = await browser.storage.local.get(today);

    // if no sign of that url in current date exist -> create new sign
    if (!item || !item[today] || !item[today][extract_hostname(url)]) {
        await createNewSign();
        return;
    }

    // else log simple info that already sign exist
    console.info(`Url-Sign of ${Object.keys(item)[0]} in local-storage already exists!`)
}

browser.tabs.onActivated.addListener(updateActive);
browser.tabs.onUpdated.addListener(updateActive);

// wait for messages of popup.js or main.js
browser.runtime.onMessage.addListener(async (data, _sender, _sendResponse) => {
    if (data.cmd == 'update_time') {
        // update times in storage
        await updateTime();
        return new Promise((resolve) => { resolve({state: "updated"}) });
    } 
    else if (data.cmd == 'update_active') {
        // update active tab and time
        await updateActive();
        return new Promise((resolve) => { resolve({state: "updated"}) });
    }
    else if (data.cmd == 'stop') {
        // stop time adding by clearing current url
        try {
            await browser.storage.local.remove("c_url");
            console.info("c_url was deleted...");
        } catch (err) {
            console.error("Error occurred when deleting c_url from local storage. ", err);
        }
    }
    else if (data.cmd == 'delete_entry') {
        await deleteTime(data.url);
        return new Promise((resolve) => { resolve({state: "successful"}) });
    }
    else if (data.cmd == 'ignore_entry') {
        // add url to ignore_list array in local storage
        console.log("Add url to ignore-list: ", data.url);
        await addIgnore(data.url);;
        return new Promise((resolve) => { resolve({state: "successful"}) });
    }
    else if (data.cmd == 'get_storage') {
        // get current storage update it locally and send this new object (it will not be saved in localStorage)
        var storage_obj = await browser.storage.local.get();
        storage_obj = await updateTime(storage_obj);
        return new Promise((resolve) => { resolve(storage_obj) });
    }
});