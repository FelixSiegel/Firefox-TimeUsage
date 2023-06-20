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
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
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

document.getElementById('focus_detection').onclick = async (e) => {
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