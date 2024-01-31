/**
 * Script handling data visualization page in the popup-menu
 */


// generate the calendar
const dateSelector = document.querySelector('#date_selector');
const startDate = document.querySelector('#start_date');
const endDate = document.querySelector('#end_date');
const calendarHead = document.querySelector('#calendar_month');
const calendarBody = document.querySelector('.calendar-body');
generateCalender();

function generateCalender() {
    // get timestamps of selected time period
    let start_timestamp = startDate.getAttribute('data-timestamp');
    let end_timestamp = endDate.getAttribute('data-timestamp');
    let selected_timestamp = calendarHead.getAttribute('data-timestamp');

    let current_date = new Date();
    if (!start_timestamp) {
        start_timestamp = current_date.setHours(0, 0, 0, 0);
        startDate.setAttribute('data-timestamp', start_timestamp);
    }

    if (!end_timestamp) {
        end_timestamp = current_date.setHours(0, 0, 0, 0);
        endDate.setAttribute('data-timestamp', end_timestamp);
    }

    if (!selected_timestamp) {
        selected_timestamp = new Date(current_date).setDate(1);
        calendarHead.setAttribute('data-timestamp', selected_timestamp);
    }

    let start_date = new Date(Number(start_timestamp));
    let end_date = new Date(Number(end_timestamp));
    let selectedDate = new Date(Number(selected_timestamp));
    let selectedMonth = selectedDate.getMonth();
    let selectedYear = selectedDate.getFullYear();
    let daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // generate calendar head with month and year
    calendarHead.innerHTML = `${selectedDate.toLocaleString('default', { month: 'long' })} ${selectedYear}`;

    // generate calendar body with days from selected month
    calendarBody.innerHTML = '';
    // add placeholder days for first week
    for (let day = 1; day < new Date(selectedYear, selectedMonth, 1).getDay(); day++) {
        calendarBody.appendChild(document.createElement('li'));
    }
    // add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        // create element
        let date = new Date(selectedYear, selectedMonth, day);
        const value = document.createElement('li');
        value.innerHTML = day;
        // add event listener
        value.onmousedown = (e) => {
            if (e.shiftKey) { updateTimeperiod(null, date) }
            else {
                updateTimeperiod(date, date);
                updateActive();
            }
        };
        value.addEventListener('mouseenter', (e) => {
            if (e.buttons == 1) {
                updateTimeperiod(null, date);
                updateActive();
            }
            // remove event listener to prevent multiple calls
            value.removeEventListener('mouseenter', arguments.callee);
        });

        value.addEventListener('mouseleave', () => {
            value.addEventListener('mouseenter', arguments.callee );
        });

        value.onmouseup = () =>{
            buildStats();
        }

        calendarBody.appendChild(value);
    }
    function updateActive(start, end) {
        if (!start) {
            start = startDate.getAttribute('data-timestamp');
            start = new Date(Number(start));
        }

        if (!end) {
            end = endDate.getAttribute('data-timestamp');
            end = new Date(Number(end));
        }

        // make start always the earlier date
        if (end.getTime() < start.getTime()) { start = [end, end=start][0]; };

        let active = document.querySelectorAll('.active');
        for (const day of active) { day.classList.remove('active', 'first-date', 'last-date') }

        let days = document.querySelectorAll('.calendar-body li');
        for (let i = 0; i < days.length; i++) {
            if (days[i].innerHTML == '') { continue; }
            let date = new Date(selectedYear, selectedMonth, days[i].innerHTML);
            if (start.getTime() <= date.getTime() && date.getTime() <= end.getTime()) {
                days[i].classList.add('active');
            }
        }
        active = document.querySelectorAll('.active');
        if (active.length == 0) { return; }
        active[0].classList.add('first-date');
        active[active.length - 1].classList.add('last-date');
    }
    updateTimeperiod(start_date, end_date);
    updateActive();
}

// event listener for calendar month change buttons
const prev_month = document.getElementById("calendar_prev_month");
prev_month.addEventListener('click', () => {
    console.log("Go to previous month...")
    let timestamp = calendarHead.getAttribute('data-timestamp');
    let date = new Date(Number(timestamp));
    date.setMonth(date.getMonth() - 1);
    calendarHead.setAttribute('data-timestamp', date.getTime());
    generateCalender();
});

const next_month = document.getElementById("calendar_next_month");
next_month.addEventListener('click', () => {
    console.log("Go to next month...")
    let timestamp = calendarHead.getAttribute('data-timestamp');
    let date = new Date(Number(timestamp));
    date.setMonth(date.getMonth() + 1);
    calendarHead.setAttribute('data-timestamp', date.getTime());
    generateCalender();
});

// function updating the time period for the statistic
function updateTimeperiod(start, end) {
    // start could be null or date, end needs to be always date
    if (!start) {
        start = startDate.getAttribute('data-timestamp');
        start = new Date(Number(start));
    }

    // if start is higher then the given end -> swap values and set end to actual end of period
    // this case happens if the user selects backwards and the given end value is actually the
    // start of the period
    if (start.getTime() > end.getTime()) {
        // swap values
        start = [end, end=start][0];
        // set end to actual end of period
        end = endDate.getAttribute('data-timestamp');
        end = new Date(Number(end));
    }

    startDate.setAttribute('data-timestamp', start.getTime());
    endDate.setAttribute('data-timestamp', end.getTime());

    if (start.getTime() === end.getTime()) {
        dateSelector.innerText = `${start.toLocaleDateString()}`;
    } else { dateSelector.innerText = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` }
    document.getElementById("statistic_page").setAttribute("data-changes", "true");
}


const mediaAllocation = {
    "Social Media": ["www.youtube.com", "www.reddit.com", "www.instagram.com", "de-de.facebook.com", "www.tiktok.com", "www.artstation.com"],
    "Work": ["github.com"],
    "Programming": ["developer.mozilla.org", "stackoverflow.com", "randomnerdtutorials.com", "realpython.com"],
    "Search Engines": ["www.google.com", "duckduckgo.com", "yandex.com", "www.seznam.cz", "www.bing.com"]
}

// Generate the statistic page (pie charts, infos, ...)
document.getElementById("chart_btn").addEventListener("click", buildStats)

async function buildStats() {
    // hide main page and show statistic page
    main_page.style.height = "0px";
    main_page.style.opacity = "0%";
    stats_page.style.height = "100%";
    stats_page.style.opacity = "100%";

    let changes = document.getElementById("statistic_page").getAttribute("data-changes");
    changes = (changes == "true") ? true : false;

    if (!changes) {return};

    // get stats of selected day
    // TODO: change to selected time period instead of only start day
    let day = getToday(new Date(Number(startDate.getAttribute('data-timestamp'))));
    let items = await storageArea.get(day);

    // if no object of today exists -> hide chart-boxes and show no data-msg
    if (Object.entries(items) == 0) {
        if (document.getElementById("no_data")) {return;}
        // hide boxes
        let chart_boxes = document.getElementsByClassName("chart-box");
        for (const box of chart_boxes) { box.style.display = "none" }
        // add no data string to page content
        let no_data = document.createElement("p");
        no_data.id = "no_data";
        no_data.classList.add("no-data");
        no_data.innerText = "No data for that day!";
        document.getElementById("stats_pagecontent").appendChild(no_data);
        document.getElementById("statistic_page").setAttribute("data-changes", "false");
        return;
    } else {
        // show boxes
        let chart_boxes = document.getElementsByClassName("chart-box");
        for (const box of chart_boxes) {box.style.display = "block"}
        // remove no data string from page content
        let no_data = document.getElementById("no_data");
        if (no_data) {no_data.remove()}
    }

    let webpages = Object.entries(items[day])
    .sort(([, a], [, b]) => b - a)
    .map(([page]) => page);

    let usages = Object.entries(items[day])
    .sort(([, a], [, b]) => b - a)
    .map(([, time]) => time);

    // set common infos
    document.getElementById("date_string").innerText = day;
    document.getElementById("page_amount").innerText = (webpages.length) ? webpages.length : 0;
    document.getElementById("time_spent").innerText = (usages) ? timeString(usages.reduce((c_sum, a) => c_sum + a, 0)) : "0sec";

    if (usages.reduce((c_sum, a) => c_sum + a, 0) == 0) {
        if (changes) {
            document.getElementById("generalOverview").remove();
            document.getElementById("mediaOverview").remove();
            document.getElementById("statistic_page").setAttribute("data-changes", "false");
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
    let canvas = document.createElement("canvas");
    canvas.id = "generalOverview";
    document.getElementById("general").appendChild(canvas);

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
    canvas = document.createElement("canvas");
    canvas.id = "mediaOverview";
    document.getElementById("media").appendChild(canvas);

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

    document.getElementById("statistic_page").setAttribute("data-changes", "false");
}