console.log("Hello from the popup.js");

// const var represents the local browser storage
const storageArea = browser.storage.local;
// const vars representing the pages of popup
const main_page = document.getElementById("main_page");
const stats_page = document.getElementById("statistic_page");
const settings_page = document.getElementById("settings_page");

// data attribute indicate if changes to list (like deleting entry...) was made -> essential for chart rendering
// initial set to true to first time render charts
stats_page.setAttribute("data-changes", "true");

// Function that returns actualy date in the format mm/dd/yy
function getToday(date=new Date()) {
    let today = date;
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();

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
function generateRankingList(items) {
    html = "";
    for (i=0; i < items.length; i++) {
        html += `
        <div class="list-item" data-time="${items[i][1]}">
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
function update_commonInfos() {
    let item_list = document.getElementById("list_body");

    let total_time = 0;
    let total_pages = 0;

    for (const item of item_list.children) {
        total_time += parseInt(item.dataset.time);
        total_pages++;
    }

    document.getElementById("date").innerText = getToday();
    document.getElementById("totaltime").innerText = timeString(total_time);
    document.getElementById("pagestotal").innerText = total_pages + " Pages";
    console.log("Common infos updated");
}

// send update-request to background-script and add values to list -> render as html
async function updateList() {
    // get latest data
    let today = getToday();
    let storage = await browser.runtime.sendMessage({cmd: "get_storage"});

    if (!storage) { console.log("Error when getting storage"); return }
    if (storage[today] == undefined) {
        console.log("No data for today");
        update_commonInfos();
        document.getElementById("list_body").innerHTML = `<p class="no-data">No data for today</p>`;
        return;
    }

    let list_data = [];
    for (const key in storage[today]) {
        // console.log(`Item ${key}: ${storage[today][key]} seconds`);
        list_data.push([key, storage[today][key]]);
    }

    // sort list by highest time to lowest time
    list_data.sort((a, b) => b[1] - a[1]);

    // generate item-list for html
    let html = generateRankingList(list_data);
    document.getElementById("list_body").innerHTML = html;
    console.log("HTML-List updated!");
    update_commonInfos();
}

// Function for delete time of list entry
function deleteEntry(entry) {
    stats_page.setAttribute("data-changes", "true");
    let hostname = entry.children[0].children[0].innerText;
    console.log("Detected host to delete: ", hostname);

    browser.runtime.sendMessage({cmd: "delete_entry", url: hostname}).then(
        (response) => {
            // if it wasnt successful -> log error
            if (response.state != "successful") {
                console.error("Error when deleting time for " + hostname)
            } else {
                entry.remove();
                update_commonInfos()
            }
        }
    )
}

// Function to ignore entry in list from timing
function addIgnorelist(entry) {
    stats_page.setAttribute("data-changes", "true");
    let hostname = entry.children[0].children[0].innerText;
    console.log("Detected host to add ignore: ", hostname);

    browser.runtime.sendMessage({cmd: "ignore_entry", url: hostname}).then(
        (response) => {
            // if it wasnt successful -> log error
            if (response.state != "successful") {
                console.error(`Error when adding entry (${hostname})to ignore list`)
            } else {
                entry.remove();
                update_commonInfos()
                add_ignore_entry(hostname);
            }
        }
    )
}

// Function closing Optionmenu
function closeAllOptionmenus() {
    let length = document.getElementsByClassName("opened").length;
    for (let i=0; i < length; i++) {
        document.getElementsByClassName("opened")[0].classList.remove("opened")
    }
}

function toggleOptionsMenu(elmnt) {
    elmnt.classList.toggle('opened');
    let menu = elmnt.parentElement.children[1];
    menu.classList.toggle('opened')

    // check if menu oerflows in list-body
    let bottom_max = document.getElementById("list_body").getBoundingClientRect().bottom
    // if overlows -> make up-menu
    if (menu.getBoundingClientRect().bottom > bottom_max) {menu.classList.add("up-menu")}
    // else make default down-menu
    else {menu.classList.remove("up-menu")}

}

// generall click handling for list body
document.getElementById("list_body").addEventListener("click", function(event) {
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

// go back arrow handling in popup
function backToMainPage() {
    // show main page and hide statistic page
    main_page.style.height = "100%";
    main_page.style.opacity = "100%";
    stats_page.style.height = "0px";
    stats_page.style.opacity = "0%";
    settings_page.style.height = "0px";
    settings_page.style.opacity = "0%";
}
document.querySelectorAll('.arrow_back').forEach(item => {item.onclick = backToMainPage})

window.onload = updateList;
