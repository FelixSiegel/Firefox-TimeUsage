console.log("Hello from the popup.js");

// Function that returns actualy date in forman mm/dd/yy
function getToday() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    return (mm + '/' + dd + '/' + yyyy)
}

// Function to convert time in seconds to better readable string
function timeString(seconds) {
    // less then 10 seconds 
    if (seconds < 10) {return "a few seconds"}
    // less then a minute
    else if (seconds < 60) {return `${seconds}sec`}
    // less then a hour
    else if (seconds < 3600) {return `${Math.floor(seconds/60)}min  ${(seconds%60)}sec`}
    // over a hour
    else { return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}min` }
}

// Function to add list entries with data from background.js
function generateHTML(items) {
    html = "";
    for (i=0; i < items.length; i++) {
        html += `
        <div class="list-item">
            <div class="list-grade">
                <p>#${i+1}</p>
            </div>
            <div class="list-info">
                <p class="hostname">${items[i][0]}</p>
                <p class="timeused">Time used: ${timeString(items[i][1])}</p>
            </div>
            <div class="list-setting">
                <img src="images/settings-dots.svg">
            </div>
        </div>`
    }
    return html
}

// send update-request to background-script
browser.runtime.sendMessage({"cmd": "update_time"}).then(
(response) => {
    if (response.state == "updated") {
        var today = getToday();
        browser.storage.local.get(today).then(
            (items) => {
                if (items[today] == undefined) {console.log("No data for today"); return}
                list = []
                for (var i = 0; i < Object.keys(items[today]).length; i++) {
                    var key = Object.keys(items[today])[i];
                    console.log(`Item ${key}: ${items[today][key]} seconds`)
                    list.push([key, items[today][key]])
                }
                // sort list by highest time to lowest time
                list.sort((a, b) => b[1] - a[1])
                // generate item-list for html
                html = generateHTML(list)
                document.getElementById("list_body").innerHTML = html;
                update_commonInfos(list)
            }
        )
    }
},
(err) => {console.error("Responsing from extension-script failed! ", err);}
)

function update_commonInfos(url_list) {
    var pages = url_list.length;
    var total_sec = 0;
    for (var i=0;i < pages; i++) {total_sec+=url_list[i][1]}
    document.getElementById("date").innerText = getToday();
    document.getElementById("totaltime").innerText = timeString(total_sec);
    document.getElementById("pagestotal").innerText = pages + " Pages"
}