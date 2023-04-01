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
    // 0 seconds
    if (seconds <= 0) {return "0 seconds"}
    // less then 10 seconds 
    if (seconds < 5) {return "a few seconds"}
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
                <img class="list-options-icon" src="images/settings-dots.svg">
                <div class="item-optionsmenu">
                    <a class="optionsmenu-item">Delete</a>
                    <a class="optionsmenu-item">Add Ignorelist</a>
                </div>
            </div>
        </div>`
    }
    return html
}

// Function for updating common infos of list
function update_commonInfos(url_list) {
    console.log("URL-List: ", url_list)
    var pages = url_list.length;
    var total_sec = 0;
    for (var i=0;i < pages; i++) {total_sec+=url_list[i][1]}
    document.getElementById("date").innerText = getToday();
    document.getElementById("totaltime").innerText = timeString(total_sec);
    document.getElementById("pagestotal").innerText = pages + " Pages"
}

// send update-request to background-script and add values to list -> render as html
function updateList() {
    var today = getToday();
    browser.storage.local.get(today).then(
        (items) => {
            if (items[today] == undefined) {console.log("No data for today"); return}
            var list = []
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

// Function for delete time of list entry
function deleteEntry(entry) {
    var hostname = entry.children[1].children[0].innerText;
    console.log("Detected host to delete: ", hostname);

    browser.runtime.sendMessage({cmd: "delete_entry", url: hostname}).then(
        (response) => {
            // if it wasnt successful -> log error
            if (response.state != "successful") {
                console.error("Error when deleting time for " + hostname)
            } else {updateList()}
        }
    )
}

// Function for delete time of list entry
function addIgnorelist(entry) {
    var hostname = entry.children[1].children[0].innerText;
    console.log("Detected host to add: ", hostname);

    browser.runtime.sendMessage({cmd: "ignore_entry", url: hostname}).then(
        (response) => {
            // if it wasnt successful -> log error
            if (response.state != "successful") {
                console.error(`Error when adding entry (${hostname})to ignore list`)
            } else {updateList()}
        }
    )
}

// Function closing Optionmenu
function closeAllOptionmenus() {
    var length = document.getElementsByClassName("opened").length;
    for (var i=0; i < length; i++) {
        document.getElementsByClassName("opened")[0].classList.remove("opened")
    }
}

function toggleOptionsMenu(elmnt) {
    elmnt.classList.toggle('opened');
    var menu = elmnt.parentElement.children[1];
    menu.classList.toggle('opened')

    // check if menu oerflows in list-body
    var bottom_max = document.getElementById("list_body").getBoundingClientRect().bottom
    // if overlows -> make up-menu
    if (menu.getBoundingClientRect().bottom > bottom_max) {menu.classList.add("up-menu")}
    // else make default down-menu
    else {menu.classList.remove("up-menu")}

}

window.addEventListener("click", function(event) {
    // if item of options menu was clicked -> do action
    if (event.target.classList.contains('optionsmenu-item')) {
        if (event.target.innerText == 'Delete') {
            deleteEntry(event.target.parentElement.parentElement.parentElement)
        } else if (event.target.innerText == 'Add Ignorelist') {
            addIgnorelist(event.target.parentElement.parentElement.parentElement)
        }
    }
    // close options menu of list entrys when click otherwhere
    if (!event.target.classList.contains('opened')) {
        closeAllOptionmenus()
    }
    // if list-setting-icon clicked -> toggle visiblity
    if (event.target.classList.contains('list-options-icon')) {
        toggleOptionsMenu(event.target);
    }
});

window.onload = ()=>{updateList()}