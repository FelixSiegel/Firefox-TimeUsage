/**
 * Script handling data visualization page in the popup-menu
 */


const mediaAllocation = {
    "Social Media": ["www.youtube.com", "www.reddit.com", "www.instagram.com", "de-de.facebook.com", "www.tiktok.com", "www.artstation.com"],
    "Work": ["github.com"],
    "Programming": ["developer.mozilla.org", "stackoverflow.com", "randomnerdtutorials.com", "realpython.com"],
    "Search Engines": ["www.google.com", "duckduckgo.com", "yandex.com", "www.seznam.cz", "www.bing.com"]
}

// Generate the static page (pie charts, infos, ...)
document.getElementById("chart_btn").addEventListener("click", async function() {
    // hide main page and show static page
    main_page.style.height = "0px";
    main_page.style.opacity = "0%";
    stats_page.style.height = "100%";
    stats_page.style.opacity = "100%";

    if (!changes) {return};

    // get stats of today
    let today = getToday();
    let items = await storageArea.get(today);

    // if no object of today exists -> hide chart-boxes and show no data-msg
    if (Object.entries(items) == 0) {
        if (document.getElementById("no_data")) {return;}
        // hide boxes
        let chart_boxes = document.getElementsByClassName("chart-box");
        for (const box of chart_boxes) {box.style.display = "none"}
        // add no data string to page content
        document.getElementById("stats_pagecontent").innerHTML += '<p id="no_data" class="no-data">No data for today!</p>';
        return;
    } else {
        // show boxes
        let chart_boxes = document.getElementsByClassName("chart-box");
        for (const box of chart_boxes) {box.style.display = "block"}
        // remove no data string from page content
        let no_data = document.getElementById("no_data");
        if (no_data) {no_data.remove()}
    }

    let webpages = Object.entries(items[today])
    .sort(([, a], [, b]) => b - a)
    .map(([page]) => page);

    let usages = Object.entries(items[today])
    .sort(([, a], [, b]) => b - a)
    .map(([, time]) => time);

    // set common infos
    document.getElementById("date_string").innerText = today;
    document.getElementById("page_amount").innerText = (webpages.length) ? webpages.length : 0;
    document.getElementById("time_spent").innerText = (usages) ? timeString(usages.reduce((c_sum, a) => c_sum + a, 0)) : "0sec";

    if (usages.reduce((c_sum, a) => c_sum + a, 0) == 0) {
        if (changes) {
            document.getElementById("generalOverview").remove();
            document.getElementById("mediaOverview").remove();
            changes = false;
        }
        return;
    }

    // set chart data
    let usetimes = usages;
    let page_names = webpages;

    // compress all data behind the 9th position
    if (usages.length > 10) {
        let sum = usages.slice(9).reduce((c_sum, a) => c_sum + a, 0);
        usetimes = usages.slice(0, 9).concat(sum)
        page_names = webpages.slice(0, 9).concat("Other")
    }

    // render general stats
    let barColors = [ "#7b1ff2", "#d6baf4", "#7ed1d6", "#fa7f43", "#6dd7a9", "#f372c2", "#8ee88c", "#d9b005", "#5fddcf", "#fbd9da"];

    let elmnt = document.getElementById("generalOverview");
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
    elmnt = document.getElementById("mediaOverview");
    if (elmnt) {elmnt.remove()};
    document.getElementById("media").innerHTML += `<canvas id="mediaOverview"></canvas>`

    let media_amounts = [["Social Media", 0, 0], ["Work", 0, 0], ["Programming", 0, 0], ["Search Engines", 0, 0], ["Other", 0, 0]];
    for (let i=0; i < webpages.length; i++) {
        let category = Object.keys(mediaAllocation).find(category => mediaAllocation[category].includes(webpages[i]));
        if (!category) {category = "Other"};

        let idx = media_amounts.findIndex(entry => entry[0] === category);
        media_amounts[idx][1] += 1; // Increase website count for this category
        media_amounts[idx][2] += usages[i] // add time of website to this category
    }

    let media_labels = media_amounts.map(entry => entry[0]);
    let page_count = media_amounts.map(entry => entry[1]);
    let page_times = media_amounts.map(entry => entry[2]);
    for (let i=0; i < page_count.length;i++) {
        if (page_count[i] === 0) {
            media_labels.splice(i, 1);
            page_count.splice(i, 1);
            page_times.splice(i, 1);
            i--; // decrease i by 1 to adjust for the removed element
        } else {
            media_labels[i] = media_labels[i] + ` (${page_count[i]} Pages)`
        }
    }

    new Chart("mediaOverview", {
        type: "pie",
        data: {
            labels: media_labels,
            datasets: [{
                backgroundColor: barColors,
                borderWidth: 0,
                data: page_times
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

// generate the calendar
const calendarHead = document.querySelector('#calendar_month');
const calendarBody = document.querySelector('.calendar-body');
let selected_timestamp = calendarHead.getAttribute('data-timestamp');

if (!selected_timestamp) {
    let timestamp = new Date().getTime();
    calendarHead.setAttribute('data-timestamp', timestamp);
    selected_timestamp = timestamp;
}

const selectedDate = new Date(Number(selected_timestamp));
const selectedDay = selectedDate.getDate();
const selectedMonth = selectedDate.getMonth();
const selectedYear = selectedDate.getFullYear();
const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
const currentDate = new Date(new Date().setHours(0, 0, 0, 0)).toString();

// generate calendar head with month and year
calendarHead.innerHTML = `${selectedDate.toLocaleString('default', { month: 'long' })} ${selectedYear}`;

// generate calendar body with days from selected month
for (let day = 1; day <= daysInMonth; day++) {
    let date = new Date(selectedYear, selectedMonth, day).toString();
    const value = (date === currentDate) ? document.createElement('a') : document.createElement('li');
    value.innerHTML = day;
    if (date === currentDate) {
        value.classList.add('active');
    }
    calendarBody.appendChild(value);
}
