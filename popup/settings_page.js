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
        if (window.getComputedStyle(content).maxHeight != "0px") {
            content.style.maxHeight = "0px";
            content.style.opacity = "0%";
        } else {
            content.style.maxHeight = "500px";
            content.style.opacity = "100%";
        }
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

    let storageArea = browser.storage.local;
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

    let storageArea = browser.storage.local;
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
    let storageArea = browser.storage.local;
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
    let storageArea = browser.storage.local;
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
    let storageArea = browser.storage.local;
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