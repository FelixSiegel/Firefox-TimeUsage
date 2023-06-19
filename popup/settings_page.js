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

    let storageArea = browser.storage.local;
    storageArea.get(null, (currentData) => {
        let new_settings = Object.assign({}, currentData?.settings, newData.settings);
        currentData.settings = new_settings;
        storageArea.set(currentData);
        console.log("New secondary color saved!")
    })
}
