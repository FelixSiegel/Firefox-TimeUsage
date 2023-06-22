console.log("Hello from the popup.js");

// const var represents the local browser storage
const storageArea = browser.storage.local; 

// variable indicate if changes to list (like deleting entry...) was made -> essential for chart rendering
// initial to true that charts rendered at first time
var changes = true;

// Function that returns actualy date in the format mm/dd/yy
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
    var item_list = document.getElementById("list_body");

    var total_time = 0;
    var total_pages = 0;

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
    var today = getToday();
    var storage = await browser.runtime.sendMessage({cmd: "get_storage"});

    if (!storage) { console.log("Error when getting storage"); return }
    if (storage[today] == undefined) { console.log("No data for today"); return }

    var list_data = [];
    for (var key in storage[today]) {
        // console.log(`Item ${key}: ${storage[today][key]} seconds`);
        list_data.push([key, storage[today][key]]);
    }

    // sort list by highest time to lowest time
    list_data.sort((a, b) => b[1] - a[1]);

    // generate item-list for html
    html = generateHTML(list_data);
    document.getElementById("list_body").innerHTML = html;
    console.log("HTML-List updated!");
    update_commonInfos();
}

// Function for delete time of list entry
function deleteEntry(entry) {
    changes = true;
    var hostname = entry.children[0].children[0].innerText;
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
    changes = true;
    var hostname = entry.children[0].children[0].innerText;
    console.log("Detected host to add ignore: ", hostname);

    browser.runtime.sendMessage({cmd: "ignore_entry", url: hostname}).then(
        (response) => {
            // if it wasnt successful -> log error
            if (response.state != "successful") {
                console.error(`Error when adding entry (${hostname})to ignore list`)
            } else {
                entry.remove();
                update_commonInfos()
            }
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

window.onload = updateList;

// page handling of popup
const main_page = document.getElementById("main_page");
const stats_page = document.getElementById("static_page");
const settings_page = document.getElementById("settings_page");

function backToMainPage() {
    // show main page and hide static page
    main_page.style.height = "100%";
    main_page.style.opacity = "100%";
    stats_page.style.height = "0px";
    stats_page.style.opacity = "0%";
    settings_page.style.height = "0px";
    settings_page.style.opacity = "0%";
}

document.querySelectorAll('.arrow_back').forEach(item => {item.onclick = backToMainPage})

// load page settings
async function loadSettings() {
    var settings = (await storageArea.get('settings'))?.settings;
    if (!settings) { console.log("No settings found"); return };

    console.log("Settings loaded: ", settings);

    var primaryColor = settings?.primaryColor;
    var secondaryColor = settings?.secondaryColor;
    
    if (primaryColor) {
        document.querySelector(':root')
        .style.setProperty('--primary-color', primaryColor);
        document.getElementById("primary-input").placeholder = primaryColor;
    }
    if (secondaryColor) {
        document.querySelector(':root')
        .style.setProperty('--secondary-color', secondaryColor);
        document.getElementById("secondary-input").placeholder = secondaryColor;
    }

    var focus_detection = settings?.focusDetection;
    if (focus_detection == undefined) { focus_detection = true }; // default is true/activated
    focus_detection ? enable_checkbox('focus_detection') : disable_checkbox('focus_detection');

    var absent_detection = settings?.absentDetection;
    if (absent_detection == undefined) { absent_detection = true }; // default is true/activated
    absent_detection ? enable_checkbox('absent_detection') : disable_checkbox('absent_detection');

    // show/hide settings for activity timeout if absent_detection is enabled/disabled
    var timeout_set = document.getElementById("timeout_set");
    absent_detection ? timeout_set.style.display = "block" : timeout_set.style.display = "none";

    var inactivity_timeout = settings?.inactivityTimeout;
    if (inactivity_timeout == undefined) { inactivity_timeout = 2 * 60 }; // default is 2 min
    document.getElementById("hour_inp").value = Math.floor(inactivity_timeout / 3600);
    document.getElementById("min_inp").value = Math.floor((inactivity_timeout % 3600) / 60);
    document.getElementById("sec_inp").value = Math.floor((inactivity_timeout % 3600) % 60);
}

loadSettings();