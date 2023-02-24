console.log("Hello from background!");

// Function that returns actualy date in forman mm/dd/yy
function getToday() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    return (mm + '/' + dd + '/' + yyyy)
}

function check_url(url) {
    // check if url matches to url-patterns
    var patterns = [/https:\/\/.*\/.*/gm, /http:\/\/.*\/.*/gm]
    for (var i = 0; i < patterns.length; i++) {
        var match = url.match(patterns[i])
        if (match !== null && match[0] === url) { return true }
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
    var today = getToday();
    // get current url
    browser.storage.local.get("c_url").then(
        (storage) => {
            browser.storage.local.get(today).then(
                (item) => {
                    // prepare new object-sign
                    var obj = {}; obj[today] = {};
                    var url = storage.c_url[0]
                    // if already values of today exists
                    if (item[today] != undefined) {
                        obj[today] = item[today]
                    }
                    // finaly add new value
                    obj[today][url] = 0
                    // add new sign to local-storage
                    browser.storage.local.set(obj)
                    console.log("[INFO]: new value added: ", obj)
                    // console.info("Created new sign to local-storage! Item: ", item.c_url);
                },
                (error) => {console.error(`Error occured when getting todays value of local-storage! `, error)}
            )
        },
        (err) => {console.error(`Error occured when getting current url from local-storage! \n${err}`)}
    )
}

function addTime(url, time) {
    var today = getToday();
    browser.storage.local.get(today).then(
        (item) => {
            var obj = {}; 
            obj[today] = item[today];
            if (item[today][url] == undefined) {obj[today][url] = time}
            else {obj[today][url] = (item[today][url] + time)}
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
            console.log("Item-check: ", item, item.c_url)
            if (item.c_url == undefined) {
                console.warn("c_url is currently undefined!"); return;
            }
            // get timestamp of tab getting active -> calculate passed time -> add to sign
            var sp = item.c_url[1]; var url = item.c_url[0]; // start point and url
            var time_passed = (Date.now() / 1000 | 0) - sp
            addTime(url, time_passed)
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
        var url = tabs[0].url;

        // If url is not in whitelist -> return
        if (check_url(url) == false) {browser.storage.local.remove("c_url"); return}

        // set current url to storage
        browser.storage.local.set({"c_url": [extract_hostname(url), Date.now()/1000 | 0]});
        console.info("c_url was updated!")

        // check if already list assignment exist
        var today = getToday()
        browser.storage.local.get(today).then(
            (item) => {
                // if no sign of that url in current date exist -> create new sign
                if( item[today] == undefined || 
                    item[today][extract_hostname(url)] == undefined ) {
                    createNewSign();
                    return;
                }
                // else log simple info that already sign exist
                console.info(`Url-Sign of ${Object.keys(item)[0]} in local-storage already exists!`)
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