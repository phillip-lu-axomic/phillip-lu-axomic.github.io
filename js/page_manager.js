// Based on the current page name, get the A. title, B. prev and next page

var base_url = "/templating_tutorial/"

var url_name_to_page_name = {
    "populating_indesign_templates.html": "Populating InDesign Templates",
    "populating_powerpoint_templates.html": "Populating PowerPoint Templates",
    "populating_word_templates.html": "Populating W̠͜o͕r͏̙̥̹̮͖̭̹d̶͕͎̼͍̠̱͎ Templates",
    "grabbing_metadata.html": "Grabbing Metadata"
};

var page_ordering = [
    "populating_indesign_templates.html",
    "populating_powerpoint_templates.html",
    "populating_word_templates.html",
    "grabbing_metadata.html"
];

var current_filename = location.href.split("/").slice(-1).pop(); 

function get_current_page_name() {
    return url_name_to_page_name[current_filename];
}

function get_prev_page_name() {
    // getting previous page
    return url_name_to_page_name[get_prev_filename()];
}

function get_next_page_name() {
    return url_name_to_page_name[get_next_filename()];
}

function get_prev_filename() {
    current_index = page_ordering.indexOf(current_filename);

    return page_ordering[current_index - 1];
}

function get_next_filename() {
    current_index = page_ordering.indexOf(current_filename);
    next_filename = page_ordering[current_index + 1];

    return next_filename;
}

function populate_str_into_dom(str, dom_id) {
    document.getElementById(dom_id).innerHTML = str;
}

function update_href_of_dom(href, dom_id) {
    document.getElementById(dom_id).href = href;
}