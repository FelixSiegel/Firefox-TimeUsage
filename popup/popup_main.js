const storageArea = browser.storage.local;

const main_page = document.getElementById("main_page");
const stats_page = document.getElementById("statistic_page");
const settings_page = document.getElementById("settings_page");
const no_data_elmnt = document.getElementById("no_data");
const list_body = document.getElementById("list_body");

// The data attribute indicates if changes were made to the list (e.g., deleting an entry),
// which is essential for chart rendering.
// Initially set to true to render charts for the first time.
stats_page.setAttribute("data-changes", "true");

/**
 * Returns the current date formatted as MM/DD/YYYY.
 *
 * @returns {string} The formatted date string.
 */
function getToday() {
    return new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

/**
 * Converts a given time in seconds to a human-readable string format.
 *
 * @param {number} seconds - The time in seconds to be converted.
 * @returns {string} A human-readable string representing the time.
 * - "0 seconds" if the input is 0 or less.
 * - "a few seconds" if the input is less than 5 seconds.
 * - "{seconds} sec" if the input is less than 60 seconds.
 * - "{minutes} min {seconds} sec" if the input is less than 3600 seconds (1 hour).
 * - "{hours} h {minutes} min" if the input is 3600 seconds (1 hour) or more.
 */
function stringifyTime(seconds) {
    if (seconds <= 0) return "0 seconds";
    if (seconds < 5) return "a few seconds";
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
    return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}

/**
 * Generates a ranking list from an array of items and appends it to the list body.
 *
 * @param {Array.<[string, number]>} items - An array of items where each item is a tuple: the first element is the
 * hostname (string) and the second element is the time used (number).
 */
function generateRankingList(items) {
    document.querySelectorAll(".list-item").forEach(item => item.remove());

    items.forEach(item => {
        const list_item = document.createElement("div");
        list_item.classList.add("list-item");
        list_item.dataset.time = item[1];
        list_item.innerHTML = `
            <div class="item-values">
                <p class="host">${item[0]}</p>
                <p class="time">${stringifyTime(item[1])}</p>
            </div>
            <div class="item-settings">
                <img class="item-settings-dots" src="images/settings-dots.svg">
                <div class="item-optionsmenu">
                    <a class="option">Delete</a>
                    <a class="option">Add Ignorelist</a>
                </div>
            </div>`;
        list_body.appendChild(list_item);
    });
}

/**
 * Refreshes the summary information displayed in the popup.
 *
 * This function calculates the total time and total number of pages from the items
 * in the list with the ID "list_body". It then updates the elements with IDs "date",
 * "totaltime", and "pagestotal" with the current date, total time, and total number
 * of pages respectively.
 *
 * @returns {void}
 */
function refreshSummaryInfo() {
    const itemList = document.querySelectorAll(".list-item");

    const { totalTime, totalPages } = Array.from(itemList).reduce((acc, item) => {
        acc.totalTime += parseInt(item.dataset.time);
        acc.totalPages++;
        return acc;
    }, { totalTime: 0, totalPages: 0 });

    document.getElementById("date").innerText = getToday();
    document.getElementById("totaltime").innerText = stringifyTime(totalTime);
    document.getElementById("pagestotal").innerText = `${totalPages} Pages`;
    console.log("Common infos updated");
}

/**
 * Refreshes the start page by updating the displayed data.
 *
 * @returns {void}
 */
async function refreshStartpage() {
    const today = getToday();
    await browser.runtime.sendMessage({ cmd: "update_time" });
    const { [today]: todayData } = await browser.storage.local.get();

    if (!todayData || Object.keys(todayData).length === 0) {
        console.log("No data for today");
        no_data_elmnt.classList.remove("hidden");
        refreshSummaryInfo();
        return;
    }

    const listData = Object.entries(todayData).sort((a, b) => b[1] - a[1]);

    generateRankingList(listData);
    refreshSummaryInfo();
}

/**
 * Deletes an entry from the stats page and notifies the background script to delete the corresponding data.
 *
 * @param {HTMLElement} entry - The DOM element representing the entry to be deleted.
 * @returns {void}
 */
function deleteEntry(entry) {
    stats_page.setAttribute("data-changes", "true");
    const hostname = entry.children[0].children[0].innerText;
    console.log("Detected host to delete: ", hostname);

    browser.runtime.sendMessage({ cmd: "delete_entry", url: hostname }).then(response => {
        if (response.state !== "successful") {
            console.error(`Error when deleting time for ${hostname}`);
        } else {
            entry.remove();
            refreshSummaryInfo();
        }
    }).catch(err => {
        console.error(`Error when sending delete_entry message: ${err}`);
    });
}

/**
 * Adds an entry to the ignore list.
 *
 * @param {HTMLElement} entry - The DOM element representing the entry to be ignored.
 * @returns {void}
 */
function addIgnorelist(entry) {
    stats_page.setAttribute("data-changes", "true");
    const hostname = entry.children[0].children[0].innerText;
    console.log("Detected host to add ignore: ", hostname);

    browser.runtime.sendMessage({ cmd: "ignore_entry", url: hostname }).then(response => {
        if (response.state !== "successful") {
            console.error(`Error when adding entry (${hostname}) to ignore list`);
        } else {
            entry.remove();
            refreshSummaryInfo();
            add_ignore_entry(hostname);
        }
    }).catch(err => {
        console.error(`Error when sending ignore_entry message: ${err}`);
    });
}

/**
 * Collapses all menus by removing the "opened" class from all elements that have it.
 * This function selects all elements with the class "opened" and removes that class from each of them.
 *
 * @returns {void}
 */
function collapseAllMenus() {
    const openedMenus = document.querySelectorAll(".opened");
    openedMenus.forEach(menu => menu.classList.remove("opened"));
}

/**
 * Toggles the visibility of the options menu for a list entry.
 * This function toggles the "opened" class for the given element and its sibling.
 *
 * @param {HTMLElement} elmnt - The element whose options menu visibility should be toggled.
 * @returns {void}
 */
function toggleMenuVisibility(elmnt) {
    elmnt.classList.toggle('opened');
    const menu = elmnt.parentElement.children[1];
    menu.classList.toggle('opened');

    // Check if menu overflows in list-body
    const bottomMax = list_body.getBoundingClientRect().bottom;
    // If overflows -> make up-menu
    console.log(menu.getBoundingClientRect().bottom, bottomMax);
    if (menu.getBoundingClientRect().bottom > bottomMax) {
        menu.classList.add("flip");
    }
}

list_body.addEventListener("click", function (event) {
    const target = event.target;

    // If item of options menu was clicked -> do action
    if (target.classList.contains('option')) {
        const entry = target.closest('.list-item');
        if (target.innerText === 'Delete') {
            deleteEntry(entry);
        } else if (target.innerText === 'Add Ignorelist') {
            addIgnorelist(entry);
        }
    }

    // Close options menu of list entries when click elsewhere
    if (!target.classList.contains('opened')) {
        collapseAllMenus();
    }

    // If list-setting-icon clicked -> toggle visibility
    if (target.classList.contains('item-settings-dots')) {
        toggleMenuVisibility(target);
    }
});

/**
 * Function to toggle the visibility of a page.
 *
 * @param {HTMLElement} page - The page to toggle the visibility of.
 * @param {string} state - The state to set the page to. Either "visible" or "hidden".
 * @returns {void}
 */
function setPageVisibility(page, state) {
    switch (state) {
        case "visible":
            page.style.height = "100%";
            page.style.opacity = "100%";
            break;
        case "hidden":
            page.style.height = "0px";
            page.style.opacity = "0%";
            break;
    }
}

/**
 * Function to navigate to the main page. It hides all other pages and shows the main page.
 *
 * @returns {void}
 */
function navigateToMain() {
    main_page.classList.remove("closed");
    stats_page.classList.add("closed");
    settings_page.classList.add("closed");
}

document.querySelectorAll('.arrow_back').forEach(item => { item.onclick = navigateToMain })
window.onload = refreshStartpage;
