/**
 * Script handling settings page in the popup-menu
 */

const root = document.querySelector(':root');

document.getElementById('settings_btn').addEventListener('click', () => {
    // hide main page and show settings page
    main_page.style.height = '0px';
    main_page.style.opacity = "0%";
    settings_page.style.height = '100%';
    settings_page.style.opacity = "100%";
})

// Click-Handler for open/close settings-box
var settings_boxes = document.querySelectorAll('.box-title');
settings_boxes.forEach(box => {
    box.addEventListener('click', (e) => {
        e.target.classList.toggle('box-active');
        var content = e.target.parentElement.children[1];
        window.getComputedStyle(content).maxHeight == "0px" ? content.style.maxHeight = "500px" : content.style.maxHeight = "0px";
    })
})

// handling color change from color input
document.getElementById('primary-input').oninput = (e) => {
    // change the color of the primary button
    root.style.setProperty('--primary-color', e.target.value);
    // save to localStorage
    let newData = {'settings': {'primaryColor': e.target.value}};
    // change placeholder when color is changed
    document.getElementById('primary-input').placeholder = getComputedStyle(root).getPropertyValue("--primary-color");

    storageArea.get(null, (currentData) => {
        let new_settings = Object.assign({}, currentData?.settings, newData.settings);
        currentData.settings = new_settings;
        storageArea.set(currentData);
        console.log("New primary color saved!")
    })
}

document.getElementById('secondary-input').oninput = (e) => {
    // change the color of the primary button
    root.style.setProperty('--secondary-color', e.target.value);
    // save to localStorage
    let newData = {'settings': {'secondaryColor': e.target.value}};
    // change placeholder when color is changed
    document.getElementById('secondary-input').placeholder = getComputedStyle(root).getPropertyValue("--secondary-color");

    storageArea.get(null, (currentData) => {
        let new_settings = Object.assign({}, currentData?.settings, newData.settings);
        currentData.settings = new_settings;
        storageArea.set(currentData);
        console.log("New secondary color saved!")
    })
}

// handling checkboxes
function enable_checkbox(id) {
    var box = document.getElementById(id);
    box.style.backgroundColor = '#5865f2';
    box.style.borderColor = '#5865f2';
    box.innerHTML = '&check;';
}

function disable_checkbox(id) {
    var box = document.getElementById(id);
    box.style.backgroundColor = '#0000';
    box.style.borderColor = '#747f8d';
    box.innerHTML = '';
}

document.getElementById('focus_detection').onclick = async () => {
    storageArea.get(null, (currentData) => {
        let focus_detection = currentData?.settings?.focusDetection;
        if (focus_detection == undefined) { focus_detection = true; } // default value
        console.log(`Settings focus_detection changed from ${focus_detection} to ${!focus_detection}`);
        currentData.settings = Object.assign({}, currentData?.settings, {'focusDetection': !focus_detection});
        storageArea.set(currentData);
        !focus_detection ? enable_checkbox('focus_detection') : disable_checkbox('focus_detection');
    })
}

document.getElementById('absent_detection').onclick = async () => {
    storageArea.get(null, (currentData) => {
        // set new date to browser.storage.local
        let absent_detection = currentData?.settings?.absentDetection;
        if (absent_detection == undefined) { absent_detection = true; } // default value
        console.log(`Settings absent_detection changed from ${absent_detection} to ${!absent_detection}`);
        currentData.settings = Object.assign({}, currentData?.settings, {'absentDetection': !absent_detection});
        storageArea.set(currentData);
        // enable/disable checkbox
        !absent_detection ? enable_checkbox('absent_detection') : disable_checkbox('absent_detection');
        // show/hide settings for activity timeout if absent_detection is enabled/disabled
        var timeout_set = document.getElementById("timeout_set");
        !absent_detection ? timeout_set.style.display = "block" : timeout_set.style.display = "none";
    })

}

// handling timer input
function getTimeoutInput() {
    let hour = document.getElementById("hour_inp").value || "0";
    let min = document.getElementById("min_inp").value || "0";
    let sec = document.getElementById("sec_inp").value || "0";
    return parseInt(hour) * 3600 + parseInt(min) * 60 + parseInt(sec);
}

function updateTimeout() {
    let timeout = getTimeoutInput();
    storageArea.get(null, (currentData) => {
        let new_settings = Object.assign({}, currentData?.settings, {'inactivityTimeout': timeout});
        currentData.settings = new_settings;
        storageArea.set(currentData);
    })
}

function checkTimeInp(target, min, max) {
    if (isNaN(target.value) || !(min <= parseInt(target.value) < max)) { target.setCustomValidity("invalid"); return }
    target.setCustomValidity("");
    updateTimeout();
}

document.getElementById("hour_inp").oninput = (e) => { checkTimeInp(e.target, 0, 24); }
document.getElementById("min_inp").oninput = (e) => { checkTimeInp(e.target, 0, 60); }
document.getElementById("sec_inp").oninput = (e) => { checkTimeInp(e.target, 0, 60); }

// Function to add new entry to ignore list in settings page
function add_ignore_entry(host) {
    var item = document.createElement("div");
    item.classList.add("value-listitem");
    item.dataset.value = host;
    document.getElementById("ignore_list").appendChild(item);

    var item_content = document.createElement("p");
    item_content.setAttribute("contenteditable", "true");
    item_content.setAttribute("aria-multiline", "false");
    item_content.setAttribute("spellcheck", "false");
    item_content.innerHTML = host;
    // add event listener for editing the host/content
    item_content.oninput = async (e) => {
        let entry = e.target.parentElement;
        var ignored = (await storageArea.get('ignored'))?.ignored;
        if (!ignored) { return };
        idx = ignored.indexOf(entry.dataset.value);
        if (idx !== -1) { ignored[idx] = e.target.innerText; entry.dataset.value = e.target.innerText; }
        storageArea.set({'ignored': ignored});
    };    
    item.appendChild(item_content);

    var delete_btn = document.createElement("div");
    delete_btn.classList.add("item-delete");
    delete_btn.innerHTML = "&times";
    delete_btn.onclick = async (e) => {
        let entry = e.target.parentElement;
        var ignored = (await storageArea.get('ignored'))?.ignored;
        if (!ignored) { return };
        ignored = ignored.filter(i => i != entry.dataset.value);
        await storageArea.set({'ignored': ignored});
        entry.remove();
        console.log("Entry removed from ignore list!");
    };
    item.appendChild(delete_btn);
}

// Load settings to init page
async function loadSettings() {
    var settings = (await storageArea.get('settings'))?.settings;
    if (!settings) { console.log("No settings found") }
    else { console.log("Settings loaded: ", settings) }

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

    // load ignore list
    var ignore_list = (await storageArea.get('ignored'))?.ignored;
    if (!ignore_list) { console.log("No ignore list found"); }
    else { ignore_list.forEach(element => {add_ignore_entry(element)}) }
}

loadSettings();