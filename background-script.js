console.log("Hello from background!");

function check_url(url) {
    // check if url matches to url-patterns
    var patterns = [/https:\/\/.*\/.*/gm, /http:\/\/.*\/.*/gm]
    for (var i = 0; i < patterns.length; i++) {
        var match = url.match(patterns[i])
        if (match !== null && match[0] === url) {
            return true
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

function createNewSign() {
    // get current url
    browser.storage.local.get("c_url").then(
        (item) => {
            var url = item.c_url[0]
            var obj = {}; obj[url] = 0;
            // add new sign to local-storage
            browser.storage.local.set(obj)

            console.info("Created new sign to local-storage! Item: ", item.c_url);
        },
        (err) => {console.error(`Error occured when getting current url from local-storage! \n${err}`)}
    )
}

function addTime(url, time) {
    browser.storage.local.get(url).then(
        (item) => {
            var obj = {}; obj[url] = (item[url] + time);
            browser.storage.local.set(obj);

            console.info(`Time successfully added! Url: ${url}, Time-added: ${time}`);
        },
        (err) => {console.error("Error occured in addTime-Function! ", err)}
    )
}

function updateTime() {
    // if c_url is defined -> calculate passed time -> sum to sign in local-storage
    browser.storage.local.get("c_url").then(
        (item) => {
            if (item.c_url === undefined || item.c_url === null) {
                console.warn("c_url is currently undefined!"); return;
            }
            // get timestamp of tab getting active -> calculate passed time -> add to sign
            var sp = item.c_url[1]; var url = item.c_url[0]; // start point and url
            var time_passed = (Date.now() / 1000 | 0) - sp
            addTime(url, time_passed)

            console.info(`Added ${time_passed} seconds to value ${url}`)
        },
        (err) => {console.error(`Error occured when getting current url from local-storage! \n${err}`)}
    )
}

function updateActive() {
    console.log("Called updateActive-Function")

    // update time from c_url to sign in storage
    updateTime()

    // get current active tab of active window
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        // set current url to storage
        browser.storage.local.set({"c_url": [extract_hostname(tabs[0].url), Date.now()/1000 | 0]});
        console.info("Value of c_url was updated!")

        // check if already list assignment exist
        browser.storage.local.get(extract_hostname(tabs[0].url)).then(
            (item) => {
                // if not -> item is empty object -> create new sign
                if (Object.keys(item).length == 0){ createNewSign();return }
                // else log simple info that already sign exist
                console.info(`Url-Sign of ${item} in local-storage already exists!`)
            },
            (err) => {
                console.error(`Error occured when fetching tab in local-storage! \n${err}`);
            }
        )
    });
}

browser.tabs.onActivated.addListener(updateActive);
browser.tabs.onUpdated.addListener(updateActive);

// wait for messages of popup.js or main.js
browser.runtime.onMessage.addListener((data, _sender, sendResponse) => {
    if (data.cmd == 'update_time') {
        // update times in storage
        updateTime()
        sendResponse({state: "updated"});
    } 
    else if (data.cmd == 'update_active') {
        // update active tab and time
        updateActive()
        sendResponse({state: "updated"});
    }
    else if (data.cmd == 'stop') {
        // stop time adding by clearing current url
        browser.storage.local.remove("c_url").then(
            () => {console.info("c_url was deleted...")}, 
            (err) => {console.error("Error occured when deleting c_url from local-storage. ", err)}
        )
    }
});