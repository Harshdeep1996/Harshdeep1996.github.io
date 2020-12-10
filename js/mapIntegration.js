// Global latitude and longiitude
const globalLat = 43;
const globalLong = 11;

//Data is usable here
var max_year = -Number.MAX_VALUE;
var min_year = Number.MAX_VALUE;

// Index containing the year, and maps the value selected on the slider 
var dictYearsObj = {};
var global_results = null;
var composer_links = null;
var latLongMap = {};
var markersCurrently = [];
var zoomClick = false;
var lastCityClicked = null;
var yearSelected = null;
var grouped_titles = null;
var grouped_composers = null;

// Indexes for array to trace in the data we retrieve from CSV
const TITLE_INDEX = 16;
const YEAR_INDEX = 3;
const CITY_INDEX = 6;
const LAT_INDEX = 7;
const LONG_INDEX = 8;
const COMPOSER_INDEX = 10;
const THEATER_NAME = 15;
const THEATER_LAT = 13;
const THEATER_LONG = 14;
const GENRE_INDEX = 19;
const OCCASION_INDEX = 20;
const TITLE_MW_INDEX = 17;
const COMPOSER_MW_INDEX = 18;
const ORIGINAL_SOURCE_INDEX = 21;

var mymap = L.map('mapid').setView([globalLat, globalLong], 6);

// Stop the map from moving on left and right, by user input
// mymap.dragging.disable();

var tileLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    subdomains: 'abcd',
    // Fix the zoom, so that users cannot move the zoom
    minZoom: 5,
    maxZoom: 15
}).addTo(mymap);
tileLayer.setOpacity(0.7);

// Adding leaf icon for marker
var LeafIcon = L.Icon.extend({
    options: {
        iconSize: [28, 75],
        // iconAnchor:   [22, 94],
        // popupAnchor:  [-3, -76]
    }
});

// Adding icon for libretto
var librettoIcon = new LeafIcon({
    iconUrl: '../images/book-solid.svg'
});
// Adding icon for theatre
var theatreIcon = new LeafIcon({
    iconUrl: '../images/landmark-solid.svg'
});

function doStuff(data) {
    //Data is usable here
    var years = [];

    data.forEach(function(o) {
        if (typeof o[YEAR_INDEX] !== 'string') {
            years.push(parseInt(o[YEAR_INDEX], 10));
        }
    });

    years = years.slice(0, 629);
    min_year = Math.min(...years);
    max_year = Math.max(...years);

    // Taking the range for every 22 years
    var ranges = _.range(min_year, max_year, 22);
    var total_ranges = ranges.length;

    // Setting the range of the slider and setting the half value
    document.getElementById('myRange').max = (total_ranges - 1) * 10;
    document.getElementById('myRange').value = (parseInt(total_ranges / 2, 10) + 3) * 10;

    // get the wrapper element for adding the ticks
    var step_list = document.getElementsByClassName('menuwrapper')[0];
    var step_list_two = document.getElementsByClassName('menuwrapper2')[0];

    // Adding years with marking on the slider as p tags
    for (var index = 0; index <= total_ranges - 1; index++) {
        dictYearsObj[index] = ranges[index];
        var span = document.createElement("span");
        span.style.marginTop = "-14px";
        span.style.marginLeft = "2px";
        span.innerHTML = '|';
        step_list.appendChild(span);

        // for the labels
        var span_two = document.createElement("span");
        span_two.innerHTML = ranges[index];
        span_two.style.marginTop = "-14px";
        step_list_two.appendChild(span_two);
    }
}

// Parse data from papa parse CSV
function parseData(url, callBack) {
    Papa.parse(url, {
        download: true,
        dynamicTyping: true,
        complete: function(results) {
            // Assigning the results so that we can play with it
            global_results = results.data;
            callBack(results.data);
        }
    });
}

parseData("../data/get_librettos_dummies.csv", doStuff);
// Create a promise to load the file or throw an error
// Load composer links
dfd.read_csv("../data/composer_links.csv")
    .then(df => {
        composer_links = df;
        grouped_composers = composer_links.groupby(['lower_bounds', 'inferred_composer']);
        console.log("Loaded the composer links");
    }).catch(err => {
        console.log(err);
    })
// Load titles links
dfd.read_csv("../data/titles_links.csv")
    .then(df_t => {
        titles_links = df_t;
        grouped_titles = titles_links.groupby(['lower_bounds', 'inferred_title']);
        console.log("Loaded the titles links");
    }).catch(err => {
        console.log(err);
    })


function insertDropdown(name, year, type) {
    // Make dropdown menu
    var div = document.createElement("select");
    div.id = "div-" + name + "-" + year;
    div.setAttribute("name", "platform");
    // This will not work for more than 2 sequences
    var option = document.createElement("option");
    option.setAttribute("value", 0);
    option.innerHTML = "Original Map sequence";
    div.appendChild(option);
    var option_two = document.createElement("option");
    option_two.setAttribute("value", 1);
    if (type !== 1) {
        option_two.innerHTML = "Cities composer played";
    } else {
        option_two.innerHTML = "Titles played; different cities";
    }
    div.appendChild(option_two);
    return div
}

function createLinks(isTitleLinks, dropdownDiv) {
    var same_year = null;
    var cred_selected = null;
    var sameYearCreds = null;
    var titles_list = null;
    var city_list = null;
    var years_list = null;
    cred_selected = dropdownDiv.id.split('-')[1];
    if (!isTitleLinks) {
        sameYearCreds = composer_links.query({
            column: "inferred_composer",
            is: "==",
            to: cred_selected
        }, {
            column: "lower_bounds",
            is: "==",
            to: String(yearSelected)
        });
    } else {
        sameYearCreds = titles_links.query({
            column: "inferred_title",
            is: "==",
            to: cred_selected
        }, {
            column: "lower_bounds",
            is: "==",
            to: String(yearSelected)
        });
        sameYearCreds = sameYearCreds.query({
            column: "lower_bounds",
            is: "==",
            to: String(yearSelected)
        });
    }
    var allCitiesLabels = [];
    var pointList = [];
    for (let i = 0; i < sameYearCreds.shape[0]; i++) {
        if (!isTitleLinks) {
            city_list = sameYearCreds['cities'].data[i].replace(
                '}', '').replace('{', '').replace(/'/g, '').split(', ');
            titles_list = sameYearCreds['titles'].data[i].replace(
                '}', '').replace('{', '').replace(/'/g, '').split('\t\t');
        } else {
            titles_list = sameYearCreds['cities'].data[i].replace(
                ']', '').replace('[', '').replace(/'/g, '').split(', ');
            city_list = titles_list;
            years_list = sameYearCreds['years'].data[i].replace(
                ']', '').replace('[', '').replace(/'/g, '').split(', ');
        }
        city_list.forEach(function(item, index) {
            allCitiesLabels.push('cityMarker-' + item);
            if (city_list.length - 1 !== index) {
                pointList.push([latLongMap[city_list[index]], latLongMap[city_list[index + 1]]]);
            } else {
                pointList.push([latLongMap[city_list[index]], latLongMap[city_list[0]]])
            }
        });

        // From src to the destination
        var link_path = new L.Polyline(pointList, {
            color: 'red',
            weight: 10,
            opacity: 0.5,
            smoothFactor: 1,
            className: 'linkLine'
        });
        var all_title_string = '';
        titles_list.forEach(function(item, index) {
            if (!isTitleLinks) {
                all_title_string += (index + 1) + ". " + item;
            } else {
                all_title_string += (index + 1) + ". " + item + " in the year " + years_list[index];
            }
            all_title_string += "<br><br>";
        });
        if (!isTitleLinks) {
            link_path.bindTooltip("Composers played for titles: " + "<br>" + all_title_string, {
                permanent: false,
                className: "my-link-label",
                noWrap: true,
                offset: [0, 0]
            });
        } else {
            link_path.bindTooltip("Play: " + cred_selected + " played in different cities: " + "<br>" + all_title_string, {
                permanent: false,
                className: "my-link-label",
                noWrap: true,
                offset: [0, 0]
            });
        }
        link_path.addTo(mymap);
    }
    document.querySelectorAll("[id^='cityMarker-']").forEach(function(o) {
        if (allCitiesLabels.includes(o.id)) {
            o.style.display = 'initial';
        } else {
            o.style.display = 'none';
        }
    })
}

function deleteLinks() {
    document.querySelectorAll("[id^='cityMarker-']").forEach(function(o) {
        o.style.display = 'initial';
    });
    var allLinkLines = document.getElementsByClassName("linkLine");
    // pop off each of the theatre markers
    while (allLinkLines.length > 0) {
        allLinkLines[0].parentNode.removeChild(allLinkLines[0]);
    }
}

function checkPartofDF(year_sel, title, is_title) {
    var grouped_links = is_title ? grouped_titles : grouped_composers;
    var year_present = year_sel in grouped_links.col_dict;
    if (!year_present) {
        return false;
    } else {
        var titles_present = title in grouped_links.col_dict[year_sel];
        if (titles_present) {
            return true;
        } else {
            return false;
        }
    }
}

function hoverAndDoThings(mouseObj) {
    // Make a textual pane when we find the city and click on the point
    // and then we remove it, when we click on soething else
    var scrollTextPane = document.getElementById("scrollText");
    var city_name = mouseObj._tooltip._content.split(":")[2].replace(/\s+/, '');

    // Remove the panel cards if some of them exists already
    if (scrollTextPane.children.length !== 0) {
        var panels = document.getElementsByClassName("w3-panel w3-blue w3-card-4");
        // pop off each of the panels
        while (panels.length > 0) {
            panels[0].parentNode.removeChild(panels[0]);
        }
        var heading = document.getElementsByClassName("headingFDHPanel")[0];
        heading.parentNode.removeChild(heading);
    }

    // Changing the length of the map and the slider container
    var slidecontainer = document.getElementsByClassName("slidecontainer")[0];
    slidecontainer.style.width = "76%";
    // Changing specifically for map and the Information box
    var map_id = document.getElementById("mapid");
    map_id.style.width = "76%";
    var scroll_text_id = document.getElementById("scrollText");
    scroll_text_id.style.width = "24%";

    // Adding heading for the right bar
    var h3 = document.createElement("h3");
    h3.setAttribute("class", "headingFDHPanel");
    h3.innerHTML = "List of Libretti for years: " + "<b>" + yearSelected + "-" + (yearSelected + 22) + "</b>" + " in city: " + "<b>" + city_name + "</b>";
    h3.style.textAlign = "center";
    h3.style.fontFamily = "Quattrocento";
    h3.style.fontWeight = "bold";
    scrollTextPane.appendChild(h3);

    global_results.forEach(function(o) {
        if ((typeof o[YEAR_INDEX] !== "string") &&
            ((o[YEAR_INDEX] >= yearSelected &&
                (o[YEAR_INDEX] < yearSelected + 22))) &&
            (o[CITY_INDEX] === city_name)) {
            var div = document.createElement("div");
            div.setAttribute("class", "w3-panel w3-blue w3-card-4");

            // Adding title pane
            var dropdown_title_div = null;
            var title_pane_div = null;
            if (checkPartofDF(yearSelected, o[TITLE_INDEX], true)) {
                title_pane_div = document.createElement("div");
                var p_title = document.createElement("p");
                p_title.innerHTML = "Title  ";
                p_title.style.fontSize = "15px";
                p_title.style.display = "inline";
                var a_original_source = document.createElement("a");
                a_original_source.innerHTML = "[ORIGINAL SOURCE]";
                a_original_source.href = o[ORIGINAL_SOURCE_INDEX]
                a_original_source.style.fontSize = "13px";
                a_original_source.target = "_blank";
                p_title.appendChild(a_original_source);
                dropdown_title_div = insertDropdown(o[TITLE_INDEX], yearSelected, 1);
                dropdown_title_div.onchange = function() {
                    if (dropdown_title_div.selectedIndex == 0) {
                        tileLayer.setOpacity(0.7);
                        deleteLinks();
                    } else {
                        tileLayer.setOpacity(0.4);
                        createLinks(true, this);
                    }
                };
                dropdown_title_div.style.marginLeft = "5px";
                dropdown_title_div.style.display = "inline";
                title_pane_div.style.marginTop = "1rem";
                title_pane_div.style.marginBottom = "1rem";
                title_pane_div.style.width = "100%";
                title_pane_div.appendChild(p_title);
                title_pane_div.appendChild(dropdown_title_div);
                div.appendChild(title_pane_div);
            } else {
                var p_title = document.createElement("p");
                p_title.innerHTML = "Title  ";
                p_title.style.fontSize = "15px";
                var a_original_source = document.createElement("a");
                a_original_source.innerHTML = "[ORIGINAL SOURCE]";
                a_original_source.style.fontSize = "13px";
                a_original_source.href = o[ORIGINAL_SOURCE_INDEX]
                a_original_source.target = "_blank";
                p_title.appendChild(a_original_source);
                div.appendChild(p_title);
            }

            var a_title_text = document.createElement("a");
            a_title_text.innerHTML = o[TITLE_INDEX];
            if (o[TITLE_MW_INDEX] !== 'Not found') {
                a_title_text.href = 'https://it.wikipedia.org/?curid=' + o[TITLE_MW_INDEX];
                a_title_text.target = "_blank";
            } else {
                a_title_text.href = '';
                a_title_text.style.pointerEvents = "none";
            }
            a_title_text.style.fontSize = "10px";

            // Adding year pane
            var p_title_year = document.createElement("p");
            p_title_year.innerHTML = "Year";
            p_title_year.style.fontSize = "15px";

            var p_title_year_text = document.createElement("p");
            p_title_year_text.innerHTML = o[YEAR_INDEX];
            p_title_year_text.style.fontSize = "10px";

            // Adding the paras to each child
            div.appendChild(a_title_text);
            div.appendChild(p_title_year);
            div.appendChild(p_title_year_text);

            // Adding theatre pane
            if ((o[THEATER_NAME] !== 'Not found') && (o[THEATER_NAME] !== null)) {
                var p_title_theatre = document.createElement("p");
                p_title_theatre.innerHTML = "Theatre";
                p_title_theatre.style.fontSize = "15px";

                var p_title_theatre_text = document.createElement("p");
                p_title_theatre_text.innerHTML = o[THEATER_NAME];
                p_title_theatre_text.style.fontSize = "10px";

                div.appendChild(p_title_theatre);
                div.appendChild(p_title_theatre_text);
            }

            // Add composer information to the information pane
            var p_title_composer = null;
            var p_title_composer_text = null;
            var dropdown_div = null;
            var composer_div = null;
            if ((o[COMPOSER_INDEX] !== null) && (o[COMPOSER_INDEX] !== 'Not found')) {
                p_title_composer = document.createElement("p");
                p_title_composer.innerHTML = "Composer";
                p_title_composer.style.fontSize = "15px";
                p_title_composer.style.display = "inline";
            }

            if (p_title_composer != null) {
                // Create only dropdowns where we can see the multiple links
                if (checkPartofDF(yearSelected, o[COMPOSER_INDEX], false)) {
                    composer_div = document.createElement("div");
                    composer_div.appendChild(p_title_composer);
                    dropdown_div = insertDropdown(o[COMPOSER_INDEX], yearSelected);
                    dropdown_div.style.display = "inline";
                    dropdown_div.style.marginLeft = "5px";

                    dropdown_div.onchange = function() {
                        if (dropdown_div.selectedIndex == 0) {
                            tileLayer.setOpacity(0.7);
                            deleteLinks();
                        } else {
                            tileLayer.setOpacity(0.4);
                            createLinks(false, this);
                        }
                    };
                    composer_div.appendChild(dropdown_div);
                    composer_div.style.width = "100%";
                    div.appendChild(composer_div);
                } else {
                    div.appendChild(p_title_composer);
                }

                a_title_composer_text = document.createElement("a");
                a_title_composer_text.innerHTML = o[COMPOSER_INDEX];
                if ((o[COMPOSER_MW_INDEX] === 'Not found') || (String(o[COMPOSER_MW_INDEX]) === '505340')) {
                    a_title_composer_text.href = '';
                    a_title_composer_text.style.pointerEvents = "none";
                } else {
                    a_title_composer_text.href = 'https://it.wikipedia.org/?curid=' + o[COMPOSER_MW_INDEX];
                    a_title_composer_text.target = "_blank";
                }
                a_title_composer_text.style.fontSize = "10px";
                a_title_composer_text.style.display = "flex";
                a_title_composer_text.style.marginTop = "0.9rem";
                div.appendChild(a_title_composer_text);
            }

            // Adding genre to the pane
            if (o[GENRE_INDEX] !== 'Not found') {
                var p_genre = document.createElement("p");
                p_genre.innerHTML = "Genre";
                p_genre.style.fontSize = "15px";

                var p_genre_text = document.createElement("p");
                p_genre_text.innerHTML = o[GENRE_INDEX];
                p_genre_text.style.fontSize = "10px";
                div.appendChild(p_genre);
                div.appendChild(p_genre_text);
            }

            // Adding occasion to the pane
            if (o[OCCASION_INDEX] !== 'Not found') {
                var p_occasion = document.createElement("p");
                p_occasion.innerHTML = "Occasion";
                p_occasion.style.fontSize = "15px";

                var p_occasion_text = document.createElement("p");
                p_occasion_text.innerHTML = o[OCCASION_INDEX];
                p_occasion_text.style.fontSize = "10px";
                div.appendChild(p_occasion);
                div.appendChild(p_occasion_text);
            }

            // Add composer to the pane
            scrollTextPane.appendChild(div);
        }
    });
}

function plotIntensityMap(cityCount, subTheatres, totalLibrettoCount) {
    var allCityMarkers = []
    Object.keys(cityCount).forEach(function(o) {
        var lat = latLongMap[o][0];
        var long = latLongMap[o][1];
        // Adding a marker and an associated popup
        // Use circle marker to get the right radius
        var int_rad = (cityCount[o] / (totalLibrettoCount * 1.0)) * 100;
        // [0,1] => [2,25]
        if (int_rad <= 15) {
            int_rad = int_rad + 15;
        }
        var marker = L.marker(
            [lat, long], {
                icon: librettoIcon
            }).addTo(mymap);
        // color: 'grey', fillColor: 'rgb(123,61,63)', 
        // fillOpacity: 0.9, radius: map_int_rad})
        librettoIcon = marker.options.icon;
        librettoIcon.options.iconSize = [int_rad, int_rad];
        marker.setIcon(librettoIcon);
        marker._icon.id = "cityMarker-" + o;
        marker.bindTooltip("Number of librettos: " + cityCount[o] + " (" + ((cityCount[o] / (totalLibrettoCount * 1.0)) * 100).toFixed(2) + "%)" + " in city of: " + o, {
            permanent: false,
            className: "my-label",
            offset: [0, 0]
        });

        // Get all the city markers
        allCityMarkers.push(marker.getElement());

        marker.on('click', function() {
            var temp_city_name = this._tooltip._content.split(":")[2].replace(/\s+/, "");
            if (!zoomClick && ((temp_city_name !== lastCityClicked) || (lastCityClicked === null))) {
                hoverAndDoThings(this);
                lastCityClicked = temp_city_name;
            } else {
                // Zoom in into the point if you click again
                // and if some theatres labels are available
                if (Object.keys(subTheatres).some(th_ => th_.includes(temp_city_name))) {
                    for (var key in subTheatres) {
                        var key_list = key.split(',');
                        var key_city_name = key_list[0];
                        var key_lat = key_list[1];
                        var key_long = key_list[2];
                        if (temp_city_name === key_city_name) {
                            var theatre_marker = L.marker(
                                [key_lat, key_long], {
                                    icon: theatreIcon
                                }
                                // {color: 'skyblue', fillColor: 'black', fillOpacity: 0.2, radius: 10}
                            ).addTo(mymap);
                            theatre_marker._icon.classList.add("theatreMarker");

                            // Adding comment for the subtheaters
                            var city_string = '';
                            city_string += "<br>";
                            var old_element = '';
                            for (const [index, element] of subTheatres[key].entries()) {
                                if (old_element === element.toLowerCase()) {
                                    continue;
                                } else {
                                    city_string += (index + 1) + ". " + element;
                                    city_string += "<br>";
                                    // Updating old element to check
                                    old_element = element.toLowerCase();
                                }
                            }
                            theatre_marker.bindTooltip("For theaters: " + city_string + " in city of: " + temp_city_name, {
                                permanent: false,
                                className: "my-theater-label",
                                offset: [0, 0]
                            });
                            theatre_marker.on('click', function() {
                                revertBackToCityView(allCityMarkers);
                                lastCityClicked = null;
                            });
                        }
                    }

                    // Remove all the city markers since we are zoomed into a region
                    for (i = 0; i < allCityMarkers.length; i++) {
                        allCityMarkers[i].style.display = 'none';
                    }
                    mymap.flyTo([latLongMap[temp_city_name][0], latLongMap[temp_city_name][1]], 14);
                    lastCityClicked = temp_city_name;
                    zoomClick = false;
                } else {
                    alert('No theaters could be extracted here, sorry!')
                }
            }
        });
        mymap.addLayer(marker);
        markersCurrently.push(marker);
    });
}

function revertBackToCityView(allCityMarkers) {
    // Check if you are zoomed in or not, if you are zoom out
    var allTheatreMarkers = document.getElementsByClassName("theatreMarker");
    var allTheatreLabels = document.getElementsByClassName("my-theater-label");
    // pop off each of the theatre markers
    while (allTheatreMarkers.length > 0) {
        allTheatreMarkers[0].parentNode.removeChild(allTheatreMarkers[0]);
    }

    while (allTheatreLabels.length > 0) {
        allTheatreLabels[0].parentNode.removeChild(allTheatreLabels[0]);
    }

    // Set the display back for all the city markers
    for (i = 0; i < allCityMarkers.length; i++) {
        allCityMarkers[i].style.display = 'initial';
    }
    mymap.flyTo([globalLat, globalLong], 6);
    zoomClick = false;
}

// Detecting the slider in HTML
var slider = document.getElementById("myRange");

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
    // Remove any exists markers which might be present on the map
    if (markersCurrently.length !== 0) {
        for (var index = 0; index < markersCurrently.length; index++) {
            mymap.removeLayer(markersCurrently[index]);
        }
        markersCurrently = [];
    }

    var value_selected = slider.value / 10;
    yearSelected = dictYearsObj[value_selected];

    var getIntensityCount = {};
    var getSubTheatres = {};
    var totalLibrettoCount = 0;
    global_results.forEach(function(o) {
        if ((typeof o[YEAR_INDEX] !== 'string') && ((o[YEAR_INDEX] >= yearSelected) && (o[YEAR_INDEX] < yearSelected + 22))) {
            latLongMap[o[CITY_INDEX]] = [o[LAT_INDEX], o[LONG_INDEX]];
            getIntensityCount[o[CITY_INDEX]] = (getIntensityCount[o[CITY_INDEX]] || 0) + 1;

            var basic_key = o[CITY_INDEX] + ',' + o[THEATER_LAT] + ',' + o[THEATER_LONG];
            if ((o[THEATER_LAT] !== 'Not found') && (o[THEATER_LONG] !== 'Not found')) {
                getSubTheatres[basic_key] = getSubTheatres[basic_key] || [];
            }

            // Do not put in the sub theaters which have lat long and not found
            if ((o[THEATER_LAT] !== 'Not found') && (o[THEATER_LONG] !== 'Not found')) {
                if (basic_key in getSubTheatres) {
                    getSubTheatres[basic_key].push(o[THEATER_NAME]);
                }
            }
            totalLibrettoCount += 1
        }
    });

    plotIntensityMap(
        getIntensityCount, getSubTheatres, totalLibrettoCount);
}