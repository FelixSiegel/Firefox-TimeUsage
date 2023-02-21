console.log("Hello from the popup.js");

// Function to convert time in seconds to better readable string
function timeString(seconds) {
    // less the a minute
    if (seconds < 60) {return "a few seconds"}
    // less then a hour
    else if (seconds < 3600) {return `${Math.floor(seconds/60)}min`}
    // over a hour
    else { return `${Math.floor(seconds/3600)}h ${Math.floor(seconds/60)}min` }
}

// Function to add list entries with data from background.js
function generateHTML(items) {
    html = "";
    for (i=0; i < items.length; i++) {
        html += `
        <div class="list-item">
            <div class="grade">
                <p>#${i+1}</p>
            </div>
            <div class="web-info">
                <p class="web-name">${items[i][0]}</p>
                <p class="time-info">Time used: ${timeString(items[i][1])}</p>
            </div>
        </div>`
    }
    return html
}

// send update-request to background-script
browser.runtime.sendMessage({"cmd": "update_time"})
.then(
    (response) => {
        if (response.state == "updated") {
            browser.storage.local.get().then(
                (items) => {
                    list = []
                    for (var i = 0; i < Object.keys(items).length; i++) {
                        key = Object.keys(items)[i]
                        if (key == "c_url") {continue}
                        console.log(`Item ${key}: ${items[key]} seconds`)
                        list.push([key, items[key]])
                    }
                    // sort list by highest time to lowest time
                    list.sort((a, b) => b[1] - a[1])
                    // generate item-list for html
                    html = generateHTML(list)
                    document.getElementById("ranking_list").innerHTML += html;
                }
                )
        }
    },
    (err) => {console.error("Responsing from extension-script failed! ", err);}
)