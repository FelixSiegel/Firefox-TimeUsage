console.log("Hello from the popup.js");

const mediaAllocation = {
    "Social Media": ["www.youtube.com", "www.reddit.com", "www.instagram.com", "de-de.facebook.com", "www.tiktok.com", "www.artstation.com"],
    "Work": ["github.com"], 
    "Programming": ["developer.mozilla.org", "stackoverflow.com", "randomnerdtutorials.com", "realpython.com"],
    "Search Engines": ["www.google.com", "duckduckgo.com", "yandex.com", "www.seznam.cz", "www.bing.com"]
}

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
async function updateList() {
    var today = getToday();
    var items = await browser.storage.local.get(today);
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

// Function for delete time of list entry
function deleteEntry(entry) {
    changes = true;
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
    changes = true;
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

// click handlers for buttons of action row and page navigation
const main_page = document.getElementById("main_page");
const static_page = document.getElementById("static_page");
// const settings_page = document.getElementById("settings_page");

document.getElementById("chart_btn").addEventListener("click", async function() {
    // hide main page and show static page
    main_page.style.height = "0px";
    main_page.style.opacity = "0%";
    static_page.style.height = "100%";
    static_page.style.opacity = "100%";

    if (!changes) {return};

    // get stats of today
    var today = getToday();
    var items = await browser.storage.local.get(today);

    var webpages = Object.entries(items[today])
    .sort(([, a], [, b]) => b - a)
    .map(([page]) => page);

    var usages = Object.entries(items[today])
    .sort(([, a], [, b]) => b - a)
    .map(([, time]) => time);

    // set common infos
    document.getElementById("date_string").innerText = today;
    document.getElementById("page_amount").innerText = webpages.length;
    document.getElementById("time_spent").innerText = timeString(usages.reduce((c_sum, a) => c_sum + a, 0));

    // set chart data
    var usetimes = usages;
    var page_names = webpages;

    // compress all data behind the 9th position
    if (usages.length > 10) {
        var sum = usages.slice(9).reduce((c_sum, a) => c_sum + a, 0);
        usetimes = usages.slice(0, 9).concat(sum)
        page_names = webpages.slice(0, 9).concat("Other")
    }

    // render general stats
    var barColors = [ "#7b1ff2", "#d6baf4", "#7ed1d6", "#fa7f43", "#6dd7a9", "#f372c2", "#8ee88c", "#d9b005", "#5fddcf", "#fbd9da"];

    var elmnt = document.getElementById("generalOverview");
    if (elmnt) {elmnt.remove()};
    document.getElementById("general").innerHTML += `<canvas id="generalOverview"></canvas>`

	new Chart("generalOverview", {
        type: "pie",
        data: {
            labels: page_names,
            datasets: [{
                backgroundColor: barColors,
                borderWidth: 0,
                data: usetimes
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        color: '#fff'
                    }
                },
                tooltip: {
                    bodyColor: '#fff'
                }
            }
        }
    })

    // render media stats
    var elmnt = document.getElementById("mediaOverview");
    if (elmnt) {elmnt.remove()};
    document.getElementById("media").innerHTML += `<canvas id="mediaOverview"></canvas>`

    var media_amounts = [["Social Media", 0, 0], ["Work", 0, 0], ["Programming", 0, 0], ["Search Engines", 0, 0], ["Other", 0, 0]];
    for (var i=0; i < webpages.length; i++) {
        var category = Object.keys(mediaAllocation).find(category => mediaAllocation[category].includes(webpages[i]));
        if (!category) {category = "Other"};

        var idx = media_amounts.findIndex(entry => entry[0] === category);
        media_amounts[idx][1] += 1; // Increase website count for this category
        media_amounts[idx][2] += usages[i] // add time of website to this category
    }

    var media_labels = media_amounts.map(entry => entry[0]);
    var page_count = media_amounts.map(entry => entry[1]);
    for (var i=0; i < page_count.length;i++) {media_labels[i] = media_labels[i] + ` (${page_count[i]} Pages)`}

    new Chart("mediaOverview", {
        type: "pie",
        data: {
            labels: media_labels,
            datasets: [{
                backgroundColor: barColors,
                borderWidth: 0,
                data: media_amounts.map(entry => entry[2])
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        color: '#fff'
                    }
                },
                tooltip: {
                    bodyColor: '#fff'
                }
            }
        }
    })

    changes = false;
})

document.getElementById("arrow_back").addEventListener("click", function(event) {
    // show main page and ihde static page
    main_page.style.height = "100%";
    main_page.style.opacity = "100%";
    static_page.style.height = "0px";
    static_page.style.opacity = "0%";
})

window.onload = ()=>{updateList()}