// backend responsible for the script maker.

function copy_text() {
    var export_dom = document.getElementById("code-export");
    var text_to_copy = clean_code_to_str(export_dom.innerHTML);

    // create a temporary <input> to copy from
    
    var temp = document.createElement("textarea");
    //temp.setAttribute("value", text_to_copy);
    temp.innerHTML = text_to_copy;

    var body = document.getElementsByTagName("BODY")[0];
    body.appendChild(temp);

    temp.select();
    temp.setSelectionRange(0, 99999); // for mobile devices

    document.execCommand("copy");
    // copied the text!

    temp.remove();

    //acknowledge the thing
    fade_out_effect("code-overlay", "Clicked!")
}

function clean_code_to_str(raw_string) {
    var output_str = raw_string.replace(/<br>/g, "\n");
    //output_str = output_str.replace(/   +/g, "\t");
    output_str = output_str.replace(/\n\n\n+/g, "\n\n");

    return output_str;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fade_out_effect(dom_id, text_to_show) {
    // applies an "active" effect as class, and then remove it after a bit.
    // stores the text in dom
    // switch text
    // animate to fade
    // switch text
    // animate to fade

    var dom_sub = document.getElementById(dom_id);
    var prev_text = dom_sub.textContent;

    dom_sub.style["z-index"] = "1";
    dom_sub.classList.remove("fadeout");

    dom_sub.classList.add("fadeout");
    await sleep(1000);
    dom_sub.classList.remove("fadeout");
    dom_sub.style["z-index"] = "-1";
}

function script_builder() {
    // takes the selections
    // builds the proper scripts
    // populates the code area with the thing

    // grab selections
    var metadata_type = document.querySelector('input[name="metadata-type"]:checked').value;
    var export_type = document.querySelector('input[name="export-type"]:checked').value;

    // build the script
    required_funcs = main_loop_req_funcs[metadata_type][export_type];
    func_script_string = get_functions_as_str(get_all_req_functions(required_funcs, functions), functions);
    // console.log(functions);

    var script = [
        json_requests[metadata_type],
        op_params[metadata_type][export_type],
        //generic_helper_functions,
        //specific_helper_functions[metadata_type],
        func_script_string,
        main_loop[metadata_type][export_type]
    ].join("\n");

    // console.log(main_loop[metadata_type][export_type]);

    // populate the code area

    var code_area = document.getElementById("code-export");

    code_area.innerHTML = clean_code_to_str(script);
}

function page_setup() {
    // setup listeners for each of the buttons to update the viewport
    var classname = document.getElementsByClassName("checkbox-container");

    for (var i=0; i < classname.length; i++) {
        classname[i].addEventListener('click', script_builder, false);
    }

    script_builder()
}

function replaceGlobally(original, searchTxt, replaceTxt) {
  // copied from https://stackoverflow.com/questions/542232/in-javascript-how-can-i-perform-a-global-replace-on-string-with-a-variable-insi
  const regex = new RegExp(searchTxt, 'g');
  return original.replace(regex, replaceTxt) ;
}

// okay this is going to be a lot:
// I've split the script into multiple "segments":
//  1. JSON REQUEST
//  2. OPTIONS
//  3. HELPER FUNCTIONS
//  4. MAIN LOOP

// The bulk of the work lies in 4: main loop
//  this is stored in var main_loop. We do text replacement here depending on which kind of export we're doing

// 3. Function is being grabbed recursively via a tree of pre-req'd funtions.
//    "root functions" should be var main_loop_req_funcs, which contains a list of functions that are present in 
//    the main loop (see 4.) 

// resources
var json_requests = {};

// proj-based
json_requests["project"] = `/*
// JSON request
{ 
  "projects": {
    "projectKeywords": 1,
    "fields": 1,
    "searches": [{
      "categoryCode": "Projects",
      "displayFields": 1,
      "imageSizes": "medium",
      "orderBy": "rank"
    }]
  }
}
*/
`;

json_requests["image"] = `/*
// JSON request
{
  "albums": {
    "imageSizes": [
      "medium"
    ],
    "projectFields": 1,
    "projectKeywords": 1,
    "displayFields": [
      "projectName",
      "projectCode",
      "filename",
      "caption",
      "photographer"
    ],
    "imageFields": [
      "DateOfConstruction"
    ]
  }
}
*/
`;

json_requests["employee"] = `/*
// JSON request

// you may need to edit the files.sizes number depending on which image size they want
// "7" should match up to "medium" by default.
{
  "employees": {
    "orderBy": "full_name",
    "withHeroImage": 1,
    "projects": {
      "gridLimit": 0,
      "roles": {
      "offset": 0
      }
    }
  },
  "fields": {
    "displayFields": ["id","code"]
  },
  "files": {
    "sizes": "7",
    "keywords": "all"
  },
  "projects": {
    "displayFields": "code,fields,name",
    "fields": "all",
    "projectKeywords": "all"
  }
}
*/
`;

var op_params = {"project": {}, "image": {}, "employee": {}};

op_params["project"]["indesign"] = `
// options
var uploaded_template_name = "highRiseExperience";
var pages_per_spread = 2;
var spreads_per_project = 1; // mutually exclusive with projects_per_spread (one of them must be 1)
var projects_per_spread = 2;
var images_per_project = 3;
var output_name = "project_sheet_spread";
var image_size = "medium";

var spread = 0; // spread of the start of current project
var page_start = 0; // where does the first page occur in the first spread, 0-indexed.
var page_count = 2; // page count of the document itself

var projects = data.projects;

var indesign = new InDesign(data.templates[uploaded_template_name]);
`;

op_params["project"]["powerpoint"] = `
// options

var template_name = "singleSlideTemplate";
var slides_per_project = 1;
var projects_per_slide = 1; // mutually exclusive with slides_per_project (one of them must nbe 1)
var images_per_project = 3;
var output_name = "Image-Based PowerPoint";
var image_size = "medium";

var image_fit_or_fill = "fit"; // "fit" letterboxes image to frame
// "fill" expands the image to fill all of the frame, crops the extras

var slide_width = 13.333; // in inches.
var slide_height = 7.5; 

var current_slide = 0; // slide index of the start of current project.

var projects = data.projects;

var powerpoint = new PowerPoint(data.templates[template_name]);
`;

op_params["image"]["indesign"] = `
// options
// Note: since this is an image/album-based template, the projects referred to in the options refer to "faux-projects".
//    These are simply collections of images collected as a "fake project" for the purposes of spread/slide population.
var template_name = "singleImageTemplate";
var pages_per_spread = 1;
var spreads_per_project = 1; // mutually exclusive with projectsPerSpreads (one of them must be 1)
var projects_per_spread = 1;
var images_per_project = 3;
var output_name = "Project Sheet";
var image_size = "medium";

var spread = 0; // spread of the start of current project
var page_start = 0; // where does the first page occur in the first spread, 0-indexed.
var page_count = 2; // page count of the document itself

var albums = data.albums;

var indesign = new InDesign(data.templates[template_name]);
`;

op_params["image"]["powerpoint"] = `
// options

// Note: since this is an image/album-based template, the projects referred to in the options refer to "faux-projects".
//    These are simply collections of images collected as a "fake project" for the purposes of spread/slide population.

var template_name = "singleSlideTemplate";
var slides_per_project = 1;
var projects_per_slide = 1; // mutually exclusive with slides_per_project (one of them must nbe 1)
var images_per_project = 3;
var output_name = "Image-Based PowerPoint";
var image_size = "medium";

var image_fit_or_fill = "fit"; // "fit" letterboxes image to frame
// "fill" expands the image to fill all of the frame, crops the extras

var slide_width = 13.333; // in inches.
var slide_height = 7.5; 

var current_slide = 0; // slide index of the start of current project.

var albums = data.albums;

var powerpoint = new PowerPoint(data.templates[template_name]);
`;

op_params["employee"]["indesign"] = `
// options
var uploaded_template_name = "resumeTemplate";
var pages_per_spread = 1;
var spreads_per_employee = 1; // mutually exclusive with employees_per_spread (one of them must be 1)
var employees_per_spread = 1;
//var images_per_employee = 1; // Don't think we can pull more than one image per employee tbh
var output_name = "Employee Resume";
var image_size = "medium";

var spread = 0; // spread of the start of current project
var page_start = 0; // where does the first page occur in the first spread, 0-indexed.
var page_count = 1; // page count of the document itself

var employees = data.employees;
var files = data.files;
var projects = data.projects;

var indesign = new InDesign(data.templates[uploaded_template_name]);
`;

op_params["employee"]["powerpoint"] = `
// options
var uploaded_template_name = "resumeTemplate";
var slides_per_employee = 1; // mutually exclusive with employees_per_slide (one of them must be 1);
var employees_per_slide = 1;
var output_name = "Employee Resume";
var image_size = "medium";

var image_fit_or_fill = "fit"; // "fit" letterboxes image to frame
// "fill" expands the image to fill all of the frame, crops the extras

var slide_width = 13.333; // in inches.
var slide_height = 7.5; 

var current_slide = 0; // slide index of the start of current project.

var employees = data.employees;
var files = data.files;
var projects = data.projects;

var powerpoint = new PowerPoint(data.templates[uploaded_template_name]);
`;

//op_params["image"]["indesign"];

// main_loop[metadata_type][export_type]
var main_loop = {
    "project": {},
    "image": {},
    "employee": {}
};

main_loop["project_raw"] = `
// image_mapping's key refers to the image index, value refers to the spread offset of the imagebox
// i.e. 1: 0 means the image at index 1 (2nd image) is at the same spread as the starting spread of the project
var image_mapping = {
  0: 0,
  1: 0
};

// main loop. LOOPING THROUGH PROJECTS.
for (var project_index = 0; project_index < projects.length; project_index++) {
  var project = projects[project_index];

  ### MANAGE DOCUMENT ###

  //populating images
  var images = project.searches[0].files;
  var images_used = 0;

  for (var image_index = 0; image_index < images.length && images_used < images_per_project; image_index++ ) {
    var image = images[image_index];
    var size = image.sizes[image_size];
    var image_spread = spread + image_mapping[images_used]; // which spread this image resides in

    var access_level = check_and_get_property_value(image, ["displayFields", "accessLevel"]);
    /*if (access_level && access_level !== "1") {
      continue;
    }
    else */
    if (images_used >= images_per_project) {
      break;
    }

    if (is_size_valid(size)) {
      ### POPULATE IMAGE SECTION ###
      images_used++;
    }
  }

  //metadata
  var name = check_and_get_property_value(project, ["name"]);
  ### POPULATE PROJECT METADATA ###

  if (projects_per_spread > 1 && spreads_per_project === 1) { // we in a multi-proj spread
    if (project_index % projects_per_spread === (projects_per_spread - 1) ) { // we in the last proj of this spread
        spread += spreads_per_project;
    }
  }
  else {
    spread += spreads_per_project;
  }
}

var nowTime = AwesomeHelpers.Generic.jsDateTo14DigitDate(new Date());
### EXPORT DOCUMENT ###
`;

main_loop["project"]["indesign"] = main_loop["project_raw"];

var proj_ppt_replacements = [
  [],
  [],
  []
];
main_loop["project"]["powerpoint"] = `
// image location def
var image_loc_and_size = {
  0: {"slide_index": 0, "loc": {"x": 0, "y": 0}, "size": {"width": 2.6, "height": 1.73}},
  1: {"slide_index": 0, "loc": {"x": 2.5, "y": 2.5}, "size": {"width": 2.6, "height": 1.73}},
  2: {"slide_index": 0, "loc": {"x": 5, "y": 5}, "size": {"width": 2.6, "height": 1.73}}
};

// main loop. LOOPING THROUGH PROJECTS.
for (var project_index = 0; project_index < projects.length; project_index++) {
  var project = projects[project_index];

  ### MANAGE DOCUMENT ###

  //populating images
  var images = project.searches[0].files;
  var images_used = 0;

  for (var image_index = 0; image_index < images.length && images_used < images_per_project; image_index++ ) {
    var image = images[image_index];
    var size = image.sizes[image_size];
    var image_slide = current_slide + image_loc_and_size[images_used].slide_index; // which slide this image resides in

    var access_level = check_and_get_property_value(image, ["displayFields", "accessLevel"]);
    /*if (access_level && access_level !== "1") {
      continue;
    } */

    if (is_size_valid(size)) {
      ### POPULATE IMAGE SECTION ###
      images_used++;
    }
  }

  ### POPULATE PROJECT METADATA ###

  if (projects_per_slide > 1 && slides_per_project === 1) { // we in a multi-proj slide
    if (project_index % projects_per_slide === (projects_per_slide - 1) ) { // we in the last proj of this slide
        current_slide += slides_per_project;
    }
  }
  else {
    current_slide += slides_per_project;
  }
}

var nowTime = AwesomeHelpers.Generic.jsDateTo14DigitDate(new Date());
### EXPORT DOCUMENT ###
`;

main_loop["project"]["word"] = main_loop["project_raw"];

main_loop["image_raw"] = `
var all_images = get_all_images(albums);

// amount of "faux projects" that the images can fill up
var faux_project_count = Math.ceil(all_images.length / images_per_project);

var image_index = 0; // the actual index that we're looping through in all_images.

// image_mapping's key refers to the image index, value refers to the spread offset of the imagebox
// i.e. 1: 0 means the image at index 1 (2nd image) is at the same spread as the starting spread of the project
var image_mapping = {
  0: 0, 1: 0, 2:0
};

for (var faux_project_index = 0; faux_project_index < faux_project_count; faux_project_index++) {
  ### MANAGE DOCUMENT ###

  var images_used = 0;
  var proj_metadata_populated = false;

  for (image_index; image_index < all_images.length && images_used < images_per_project; image_index++) {
    var image = all_images[image_index];
    var image_spread = spread + image_mapping[images_used]; // which spread is this image compared to the starting spread of the project
    var size = image.sizes[image_size];

    if (is_size_valid(size)) {
      ### POPULATE IMAGE SECTION ###

      if (!proj_metadata_populated) {
        ### POPULATE PROJECT METADATA ###
        proj_metadata_populated = true;
      }

      ### POPULATE IMAGE METADATA ###

      images_used++;
    }
  }

  // managing spread based on options
  if (projects_per_spread > 1 && spreads_per_project === 1) { // we in a multi-proj spread
    if (faux_project_index % projects_per_spread === (projects_per_spread - 1) ) { // we in the last proj of this spread
        spread += spreads_per_project;
    }
  }
  else {
    spread += spreads_per_project;
  }
}

var nowTime = AwesomeHelpers.Generic.jsDateTo14DigitDate(new Date());
### EXPORT DOCUMENT ###
`;

main_loop["image"]["indesign"] = main_loop["image_raw"];

// main_loop["image"]["powerpoint"] = main_loop["image_raw"];

main_loop["image"]["powerpoint"] = `
var all_images = get_all_images(albums);

// amount of "faux projects" that the images can fill up
var faux_project_count = Math.ceil(all_images.length / images_per_project);

var image_index = 0; // the actual index that we're looping through in all_images.

// image location def
var image_loc_and_size = {
  0: {"slide_index": 0, "loc": {"x": 0, "y": 0}, "size": {"width": 2.6, "height": 1.73}},
  1: {"slide_index": 0, "loc": {"x": 2.5, "y": 2.5}, "size": {"width": 2.6, "height": 1.73}},
  2: {"slide_index": 0, "loc": {"x": 5, "y": 5}, "size": {"width": 2.6, "height": 1.73}}
};

for (var faux_project_index = 0; faux_project_index < faux_project_count; faux_project_index++) {
  ### MANAGE DOCUMENT ###

  var images_used = 0;
  var proj_metadata_populated = false;

  for (image_index; image_index < all_images.length && images_used < images_per_project; image_index++) {
    var image = all_images[image_index];
    var image_slide = current_slide + image_loc_and_size[images_used].slide_index; // which slide is this image compared to the starting slide of the project
    var size = image.sizes[image_size];

    if (is_size_valid(size)) {
      ### POPULATE IMAGE SECTION ###

      if (!proj_metadata_populated) {
        ### POPULATE PROJECT METADATA ###
        proj_metadata_populated = true;
      }

      ### POPULATE IMAGE METADATA ###

      images_used++;
    }
  }

  // managing slide based on options
  if (projects_per_slide > 1 && slides_per_project === 1) { // we in a multi-proj slide
    if (faux_project_index % projects_per_slide === (projects_per_slide - 1) ) { // we in the last proj of this slide
        current_slide += slides_per_project;
    }
  }
  else {
    current_slide += slides_per_project;
  }
}

var nowTime = AwesomeHelpers.Generic.jsDateTo14DigitDate(new Date());
### EXPORT DOCUMENT ###
`;

main_loop["image"]["word"] = main_loop["image_raw"];

var image_mapping = {};

image_mapping["indesign"] = `
// image_mapping's key refers to the image index, value refers to the spread offset of the imagebox
// i.e. 1: 0 means the image at index 1 (2nd image) is at the same spread as the starting spread of the project
var image_mapping = {
  0: 0, 1: 0, 2:0
};
`;

image_mapping["powerpoint"] = `
// image location def
var image_loc_and_size = {
  0: {"slide_index": 0, "loc": {"x": 0, "y": 0}, "size": {"width": 2.6, "height": 1.73}},
  1: {"slide_index": 0, "loc": {"x": 2.5, "y": 2.5}, "size": {"width": 2.6, "height": 1.73}},
  2: {"slide_index": 0, "loc": {"x": 5, "y": 5}, "size": {"width": 2.6, "height": 1.73}}
};
`;

main_loop["employee_raw"] = `

### IMAGE MAPPING ###


for (var employee_index = 0; employee_index < employees.length; employee_index++) {
  var employee_index_in_spread = employee_index % employees_per_spread;

  ### MANAGE DOCUMENT ###

  var employee = employees[employee_index];
  var hero_image_id = employee.hero_image_id;
  var hero_image = files[hero_image_id];

  if (is_size_valid(hero_image.sizes[0])) {
    var image = hero_image;
    image.md5 = image.md5_at_upload;
    var image_link = "https:" + hero_image.sizes[0].http_root + hero_image.sizes[0].http_relative_path;
    var size = {"url": image_link};

    var images_used = employee_index_in_spread;
    var image_spread = spread + image_mapping[images_used];

    ### POPULATE IMAGE SECTION ###
  }

  ### POPULATE EMPLOYEE METADATA ###

  // managing spreads based on options
  if (employees_per_spread > 1 && spreads_per_employee === 1) { // we in a multi-emp per spread template
    if (employee_index_in_spread === (employees_per_spread - 1)) { // we in the last employee of this spread
      spread += spreads_per_employee;
    }
  }
  else {
    spread += spreads_per_employee;
  }
}

var nowTime = AwesomeHelpers.Generic.jsDateTo14DigitDate(new Date());
### EXPORT DOCUMENT ###
`;

main_loop["employee"]["indesign"] = main_loop["employee_raw"].replace(/ *### IMAGE MAPPING ###/, image_mapping["indesign"]);
main_loop["employee"]["powerpoint"] = main_loop["employee_raw"].replace(/ *### IMAGE MAPPING ###/, image_mapping["powerpoint"])
  .replace("var image_spread = spread + image_mapping[images_used]", "var image_slide = current_slide + image_loc_and_size[images_used].slide_index")
  .replace(/spread \+= spreads_per_employee/g, "current_slide += slides_per_employee")
  .replace(/spread/g, "slide");
main_loop["employee"]["word"] = main_loop["employee_raw"];


// in-loop stuff for dealing with spreads + pages / slides

// you know, this should really be in a function tbh.
var manage_document = {
  "project": {},
  "image": {},
  "employee": {}
};

manage_document["project"]["indesign"] = `
  // inserting new spreads if we need that.
  var master_page_indices = [0, 1];
  if (project_index !== 0) {
    if (projects_per_spread === 1 && spreads_per_project >= 1) { // one spread per project or multi-spread projects
      var pages_inserted = insert_spreads_and_pages(indesign, spreads_per_project, pages_per_spread, master_page_indices);
      page_count += pages_inserted;
    }
    else if (projects_per_spread > 1 && spreads_per_project === 1) { // multi-projects per spread
      if (project_index % projects_per_spread === 0 ) { // only populate if we're on the last obj of this spread
        var pages_inserted = insert_spreads_and_pages(indesign, spreads_per_project, pages_per_spread, master_page_indices);
        page_count += pages_inserted;
      }
    }
    else {
      // don't know what we're doing
      warning("Current projects_per_spread + spreads_per_project do not make sense.");
    }
  }
`;

manage_document["project"]["powerpoint"] = `
  // inserting new slides if we need that
  if (projects_per_slide === 1 && slides_per_project >= 1) { // one spread per project or multi-spread projects
    if (project_index < projects.length - 1) { // if there's more projects after this
      // copy the current slides to the end
      for (var add_slide_index = 0; add_slide_index < slides_per_project; add_slide_index++) {
        var slide_i_to_copy = current_slide + add_slide_index;
        var slide_i_to_paste = slide_i_to_copy + slides_per_project;
        powerpoint.copySlides(slide_i_to_copy, slide_i_to_paste);
      }
    }
  }
  else if (projects_per_slide > 1 && slides_per_project === 1) { // multi-projects per spread
    if (employee_index_in_slide % projects_per_slide === 0) { // start of the current slide
      // gotta figure out whether we want to copy the current slide later
      if (projects.length - project_index > projects_per_slide) { // if there's enough to fill this slide AND more?
        // add the slides
        for (var add_slide_index = 0; add_slide_index < slides_per_project; add_slide_index++) {
          var slide_i_to_copy = current_slide + add_slide_index;
          var slide_i_to_paste = slide_i_to_copy + slides_per_project;
          powerpoint.copySlides(slide_i_to_copy, slide_i_to_paste);
        }
      }
    }
  }

`;

manage_document["image"]["indesign"] = manage_document["project"]["indesign"].replace(/project_index/g, "faux_project_index");

manage_document["image"]["powerpoint"] = manage_document["project"]["powerpoint"].replace(/project_index/g, "faux_project_index")
  .replace("more projects after this", "more faux projects after this")
  .replace("projects.length", "faux_project_count");

manage_document["employee"]["indesign"] = manage_document["project"]["indesign"].replace(/spreads_per_project/g, "spreads_per_employee")
  .replace(/projects_per_spread/g, "employees_per_spread")
  .replace(/project_index/g, "employee_index")
  .replace(/projects\.length/g, "employees.length")
  .replace("one spread per project or multi-spread projects", "one spread per employee or multi-spread employees")
  .replace("multi-projects per spread", "multi-employees per spread");

manage_document["employee"]["powerpoint"] = manage_document["project"]["powerpoint"].replace(/slides_per_project/g, "slides_per_employee")
  .replace(/project_index/g, "employee_index")
  .replace(/projects_per_slide/g, "employees_per_slide")
  .replace("more projects after this", "more employees after this")
  .replace(/projects\.length/g, "employees.length");

var populate_image = {};
populate_image["indesign"] =`      
      var imagePlaceholder = where().pageItems('image_box_' + (images_used));
      indesign.overridePageItems(image_spread, imagePlaceholder);

      var imageLink = AwesomeHelpers.InDesign.generatePluginCompatibleFilePath(
        image.id,
        image.md5,
        size.url
      );

      indesign.setImage(imageLink, imagePlaceholder.spreads(image_spread));
`;

populate_image["powerpoint"] = `
      var requested_width = image_loc_and_size[images_used].size.width;
      var requested_height = image_loc_and_size[images_used].size.height;
      var x_offset = image_loc_and_size[images_used].loc.x;
      var y_offset = image_loc_and_size[images_used].loc.y;
      var image_aspect = size.width/size.height;
      
      if (image_fit_or_fill === "fit") {
        var result = get_fit_image_info(
          {"x": x_offset, "y": y_offset},
          {"width": requested_width, "height": requested_height},
          size
        );

        requested_width = result.width;
        requested_height = result.height;
        x_offset = result.x;
        y_offset = result.y;
        var options = {};
      }
      else if (image_fit_or_fill === "fill") {
        var options = get_crop_option(image_aspect, requested_width, requested_height);
      }
      else {
        warning("image_fit_or_fill not set!");
      }

      powerpoint.addImage(
        new Image(size.url),
        where(0).slides(image_slide).shapes(0),
        ((requested_width / slide_width) * 100) + "%",
        ((requested_height / slide_height) * 100) + "%",
        ((x_offset / slide_width) * 100) + "%",
        ((y_offset / slide_height) * 100) + "%",
        options
      );
`;

populate_image["word"] = `

`;

var populate_project_metadata = {"project": {}, "image": {}, "employee": {}};
populate_project_metadata["project"]["indesign"] = `
  //metadata
  var name = check_and_get_property_value(project, ["name"]);
  append_project_details(name, "project_name_box", "Section", spread);

  populate_project_infobox(project, spread);
`;

populate_project_metadata["project"]["powerpoint"] = `
        var metadata = [
          ["{Project Long Name}", ""],
          ["{Year Completed}", parse_date_to_string(get_image_project_field(image, "CompletionDate"))],
          ["{Client}", get_image_project_field(image, "Client")],
          ["{Type of Building}", get_image_project_keywords(image, "TypeofBuilding").join(", ")],
          ["{Project Background Paragraphs}", ""],
          ['{Site Description Paragraphs}', ""],
          ['{Role Paragraphs}', ""],
          ['{Bullet Text}', ""],
          ['{Crew Paragraph}', ""],
          ['{Results Paragraphs}', ""],
          ['{Health and Safety Requirements Paragraphs}', ""]
        ];

        for (var metadata_index = 0; metadata_index < metadata.length; metadata_index++) {
          var query = metadata[metadata_index][0];
          var replace = metadata[metadata_index][1];

          powerpoint.replaceText(query, replace, current_slide);
        }
`;

populate_project_metadata["image"]["indesign"] = `
        var metadata = [
          ["project_name_box", image.displayFields.projectName],
          ["year_completed_box", parse_date_to_string(get_image_project_field(image, "CompletionDate"))],
          ["client_box", get_image_project_field(image, "Client")],
          ["{Type of Building}", get_image_project_keywords(image, "TypeofBuilding").join(", ")],
          ["{Project Background Paragraphs}", ""],
          ['{Site Description Paragraphs}', ""],
          ['{Role Paragraphs}', ""],
          ['{Bullet Text}', ""],
          ['{Crew Paragraph}', ""],
          ['{Results Paragraphs}', ""],
          ['{Health and Safety Requirements Paragraphs}', ""]
        ];

        var city = get_image_project_keywords(image, "City")[0] || "";
        var state = get_image_project_keywords(image, "StateProvince")[0] || "";
        
        var location = array_reject_empty([
          city,
          state
        ]).join(", ");
        append_project_details(location, "bottom_text", "Project Subtitle", spread);

        for (var metadata_index = 0; metadata_index < metadata.length; metadata_index++) {
          var script_label = metadata[metadata_index][0];
          var value = metadata[metadata_index][1];

          append_project_details(value, script_label, "", spread);
        }
`;

populate_project_metadata["image"]["powerpoint"] = populate_project_metadata["project"]["powerpoint"];

var populate_image_metadata = {"project": {}, "image": {}, "employee": {}};
populate_image_metadata["project"]["indesign"] = "";

populate_image_metadata["project"]["powerpoint"] = `
      var name = get_image_display_field(image, "projectName");
      powerpoint.replaceText("project_name", name, current_slide);
`;

populate_image_metadata["image"]["indesign"] = `
        var name = get_image_display_field(image, "projectName");
        name = clean_string(name);
        append_project_details(name + "\\t", "caption_box", "Project Title", spread);
`;

populate_image_metadata["image"]["powerpoint"] = populate_image_metadata["project"]["powerpoint"];

var populate_emp_metadata = {"indesign": "", "powerpoint": "", "word": ""};

populate_emp_metadata["indesign"] = `
  // getting employee metadata

  var emp_name = array_reject_empty([
    clean_string(employee.first_name),
    clean_string(employee.last_name)
  ]).join(" ");

  var project_history = get_employee_project_history(data, employee);

  // populating employee metadata
  append_project_details(emp_name, "name_box", "Resume Full Name Bold", spread);

  for (var project_index=0; project_index < project_history.length; project_index++) {
    var project = project_history[project_index];
    var project_text = array_reject_empty([
      project.project_name,
      project.project_role,
      project.location,
      parse_date_to_string(project.start_date) + "-" + parse_date_to_string(project.end_date)
    ]).join(" | ");

    append_project_details(project_text + "\\n", "project_history_box", "Basic Paragraph", spread);
  }
`;

export_document = {
  "indesign": 'indesign.save(output_name + " - " + nowTime + ".idml");',
  "powerpoint": 'powerpoint.save(output_name + " - " + nowTime + ".pptx");',
  "word": ''
}

// replacing text for the main loop
var metadata_types = ["project", "image", "employee"];
var export_types = ["indesign", "powerpoint", "word"];
for (var metadata_index=0; metadata_index < metadata_types.length; metadata_index++) {
  var metadata_type = metadata_types[metadata_index];

  for (var export_index = 0; export_index < export_types.length; export_index++) {
    var export_type = export_types[export_index];


    // var raw_key = metadata_type + "_raw";
    // main_loop[metadata_type]["indesign"] = main_loop["project_raw"];
    // main_loop[metadata_type]["powerpoint"] = main_loop["project_raw"];

    var replacements = [ 
      [/(\n).*### POPULATE IMAGE SECTION ###/, populate_image[export_type]],
      [/(\n).*### MANAGE DOCUMENT ###/, manage_document[metadata_type][export_type]],
      [/(\n).*### POPULATE IMAGE METADATA ###/, populate_image_metadata[metadata_type][export_type]],
      [/(\n)### EXPORT DOCUMENT ###/, export_document[export_type]]
    ];

    if (metadata_type === "project") {
      replacements = replacements.concat([
        [/(\n).*### POPULATE PROJECT METADATA ###/, populate_project_metadata[metadata_type][export_type]],
        [/(\n).*### POPULATE IMAGE METADATA ###/, populate_image_metadata[metadata_type][export_type]]
      ]);
    }

    else if (metadata_type === "image") {
      replacements = replacements.concat([
        [/(\n).*### POPULATE PROJECT METADATA ###/, populate_project_metadata[metadata_type][export_type]]
      ]);
    }
    
    else if (metadata_type === "employee") {
      replacements = replacements.concat([
        [/(\n).*### POPULATE EMPLOYEE METADATA ###/, populate_emp_metadata[export_type]]
      ]);
    }

    for (var j=0; j<replacements.length; j++) {
        main_loop[metadata_type][export_type] = main_loop[metadata_type][export_type].replace(replacements[j][0], "$1" + replacements[j][1]);
    }
  }
}

var main_loop_req_funcs = {"project": {}, "image": {}, "employee": {}};

// useful functions for all templates
main_loop_req_funcs["generic"] = [
    "is_size_valid",
    "check_and_get_property_value",
    "clean_string",
    "get_formatted_cost",
    "parse_date_to_string",
    "array_reject_empty",
];

main_loop_req_funcs["project"]["indesign"] = main_loop_req_funcs["generic"].slice(0).concat([
    "append_project_details", "populate_project_infobox", "insert_spreads_and_pages"
]);

main_loop_req_funcs["project"]["powerpoint"] = main_loop_req_funcs["generic"].slice(0).concat([
    "get_crop_option", "get_fit_image_info", "get_project_field_value", "get_project_keywords",
    "parse_date_to_string", "get_formatted_cost"
]);

main_loop_req_funcs["project"]["word"] = [];

main_loop_req_funcs["image"]["indesign"] =  main_loop_req_funcs["generic"].slice(0).concat([
    "get_all_images", "append_project_details", "populate_image_infobox",
    "get_image_display_field", "get_image_custom_field",
    "get_image_project_field", "get_image_project_keywords",
    "insert_spreads_and_pages"
]);

main_loop_req_funcs["image"]["powerpoint"] = main_loop_req_funcs["generic"].slice(0).concat([
    "get_all_images", "get_crop_option", "get_fit_image_info", "get_image_display_field", 
    "get_image_project_field", "get_image_project_keywords", "parse_date_to_string"
]);

main_loop_req_funcs["image"]["word"] = [];

main_loop_req_funcs["employee"]["indesign"] = main_loop_req_funcs["generic"].slice(0).concat([
  "get_employee_project_history", "get_year_difference", "insert_spreads_and_pages",
  "append_project_details"
]);

main_loop_req_funcs["employee"]["powerpoint"] = main_loop_req_funcs["generic"].slice(0).concat([
  "get_employee_project_history", "get_year_difference", "get_crop_option",
  "get_fit_image_info"
]);

main_loop_req_funcs["employee"]["word"] = [];

// main_loop["project"]["indesign"] = main_loop["project_raw"].replace(/(?:\n).*### POPULATE IMAGE SECTION ###/, populate_image["indesign"]);
// main_loop["project"]["indesign"] = main_loop["project"]["indesign"].replace(/(?:\n).*  ### POPULATE METADATA ###/, project_populate_metadata["indesign"]);
// main_loop["project"]["indesign"] = main_loop["project"]["indesign"].replace(/sdfsfd/, "");

// going wild
// functions stores {"function_name" => {"code": "", "requirement": [], "type": []}}
var functions = {};

functions["append_project_details"] = {
    "code": `
function append_project_details(text, pageItem, characterStyle, page){
  var pageItemPlaceolder = where().pageItems(pageItem);
  indesign.overridePageItems(page, pageItemPlaceolder);
  indesign.appendText(text, pageItemPlaceolder.spreads(page), characterStyle);
}`,
    "requirements": [],
    "type": ["indesign"]
}

functions["check_property_exists"] = {
    "code": `
function check_property_exists(obj, array) {
  /*
    Ideally, check_property_exists(project, ["fields", "Description", "values", 0]) is equivalent to the following:
      project.fields &&
      project.fields.Description &&
      project.fields.Description.values[0] !== null &&
      project.fields.Description.values[0] !== ''
  */
  if ( typeof obj === 'undefined') {
    return false;
  }

  if ( Array.isArray(array) && array.length === 0) {
    if (obj !== null && obj !== '') {
      return true;
    }
  }
  else {
    // need to go further into the nested structure
    if (obj.hasOwnProperty(array[0])) {
      return check_property_exists(obj[array[0]], array.slice(1));
    }
    else {
      return false;
    }
  }
}`,
    "requirements": [],
    "type": ["generic"]
}

functions["get_property_value"] = {
    "code": `
function get_property_value(obj, array) {
  if (typeof obj === 'undefined') {
    return null;
  }

  if ( Array.isArray(array) && array.length === 0) {
    return obj;
  }
  else {
    // need to go deeper into nested structure
    return get_property_value(obj[array[0]], array.slice(1));
  }
}
`,
    "requirements": [],
    "type": ["generic"]
}

functions["check_and_get_property_value"] = {
    "code": `
function check_and_get_property_value(obj, array) {
  // if property exists, get it. Else, return '';
  if (check_property_exists(obj, array)) {
    var value = get_property_value(obj, array);
    if (typeof value === 'string') {
      value = value.replace(String.fromCharCode(151), "-");
    }
    return value;
  }
  else {
    return '';
  }
}
`,
    "requirements": ["get_property_value", "check_property_exists"],
    "type": ["generic"]
}

functions["populate_project_infobox"] = {
    "code": `
function populate_project_infobox(project, spread) {
  var infobox_tag = "infobox";
  append_project_details("", infobox_tag, "", spread); // Bio Paragraph
  
  var metadata = [
    ["Years of Experience", get_project_field_value(project, "years_of_experience")],
    ["Education", get_project_keywords(project, "education")],
    ["Start Date", parse_date_to_string(get_project_field_value(project, "StartDate"))]
  ];
  
  for (var i=0; i < metadata.length; i++) {
    var entry = metadata[i];
    var header = entry[0];
    var value = entry[1];

    populate_infobox_entry(
      header + "\\n",
      value,
      infobox_tag,
      spread
    );
  }
}
`,
    "requirements": ["get_project_field_value", "get_project_keywords", "parse_date_to_string", "populate_infobox_entry"],
    "type": ["project", "indesign"]
}

functions["get_project_field_value"] = {
    "code": `
function get_project_field_value(project, field) {
  return clean_string(check_and_get_property_value(project, ["fields", field, "values", 0]));
}
`,
    "requirements": ["clean_string", "check_and_get_property_value"],
    "type": ["project"]
}

functions["get_project_keywords"] = {
    "code": `
function get_project_keywords(project, category) {
  // flattens the keywords too
  var keyword_objs = check_and_get_property_value(project, ["projectKeywords", "categories", category, "keywords"]);
  if (keyword_objs && keyword_objs.length > 0) {
    var flattened_keywords = [];
    for (var i=0; i < keyword_objs.length; i++) {
      var this_keyword = keyword_objs[i];
      if (this_keyword.name) {
        flattened_keywords.push(clean_string(this_keyword.name));
      }
    }
    
    return flattened_keywords;
    
  }
  else {
    return [];
  }
}
`,
    "requirements": ["clean_string", "check_and_get_property_value"],
    "type": ["project"]
}

functions["clean_string"] = {
    "code": `
function clean_string(string) {
  var unicode_mapping = [
    ["\\u0080", String.fromCharCode(8364)],
    ["\\u0091", "'"],
    ["\\u0092", "'"],
    ["\\u0093", '"'],
    ["\\u0094", '"'],
    ["\\u0096", '-'],
    ["\\u0097", '-'],
    ["\\u0099", '™'],
    ["\\u2019", "'"]
  ];
  
  for (var regex_index = 0; regex_index < unicode_mapping.length; regex_index++) {
    var regex_to_match = new RegExp(unicode_mapping[regex_index][0], "g");
    var string_to_insert = unicode_mapping[regex_index][1];
    string = string.replace(regex_to_match, string_to_insert);
  }
  return string;
}
`,
    "requirements": [],
    "type": ["generic"]
}

functions["populate_infobox_entry"] = {
    "code": `
function populate_infobox_entry(header_text, value_text, script_tag, spread) {
  var header_cs = "Medium"; // header char style
  var text_cs = ""; // text char style
  
  if (value_text) {
    append_project_details(header_text, script_tag, header_cs, spread);
    append_project_details(value_text + "\\n", script_tag, text_cs, spread);
  }
  
  
  append_project_details("", script_tag, "", spread); // making sure the infobox is editable either way
}
`,
    "requirements": ["append_project_details"],
    "type": ["indesign"]
}

functions["parse_date_to_string"] = {
    "code": `
function parse_date_to_string(date_string) {
  // Really should be called "parse date string to human readable string"
  // TODO: properly do the comparisons
  var year, month, day, hour, minute, second = 0;

  if (date_string) {
    if (date_string.length === 14) {
      year = date_string.substring(0, 4);
      month = date_string.substring(4, 6);
      day = date_string.substring(6, 8);
      hour = date_string.substring(8, 10);
      minute = date_string.substring(10, 12);
      second = date_string.substring(12, 14);
    }
    if (date_string.length === 4) {
      year = date_string;
    }
  }

  //var output_date_string = "";
  var delimiter = "/";
  var date_arr = array_reject_empty([
    year,
    month,
    day
  ]);

  return date_arr.join(delimiter);
}
`,
    "requirements": ["array_reject_empty"],
    "type": ["generic"]
}

functions["is_size_valid"] = {
    "code": `
function is_size_valid(image_size) {
  return (image_size && image_size.width && image_size.height);
}
`,
    "requirements": [],
    "type": ["generic"]
}

functions["array_reject_empty"] = {
    "code": `
function array_reject_empty(array) {
  var new_array = [];
  for (var i=0; i < array.length; i++) {
    var item = array[i];
    if (item) {
      new_array.push(item);
    }
  }

  return new_array;
}
`,
    "requirements": [],
    "type": ["generic"]
}

functions["get_all_images"] = {
    "code": `
function get_all_images(albums) {
  var all_images = [];
  for (var album_index = 0; album_index < albums.length; album_index++) {
    var album = albums[album_index];
    var files = album.files;

    for (var file_index = 0; file_index < files.length; file_index++) {
      var file = files[file_index];
      if (file) {
        all_images.push(file);
      }
    }
  }
  
  return all_images;
}
`,
    requirements: [],
    "type": ["image"]
}

functions["get_image_display_field"] = {
    "code": `
function get_image_display_field(image, key) {
  return clean_string(check_and_get_property_value(image, ["displayFields", key]));
}
`,
    "requirements": ["clean_string"],
    "type": ["image"]
}

functions["get_image_project_field"] = {
    "code": `
function get_image_project_field(image, key) {
  return clean_string(check_and_get_property_value(image, ["projectFields", key, "values", 0]));
}
`,
    "requirements": ["clean_string"],
    "type": ["image"]
}

functions["get_image_custom_field"] = {
    "code": `
function get_image_custom_field(image, key) {
  return clean_string(check_and_get_property_value(image, ["imageFields", key]));
}
`,
    "requirements": ["clean_string"],
    "type": ["image"]
}

functions["get_image_project_keywords"] = {
    "code": `
function get_image_project_keywords(image, keyword_cat) {
  // gets a flat []
  var keywords = check_and_get_property_value(image, ["projectKeywords", "categories", keyword_cat, "keywords"]);
  if (Array.isArray(keywords)) {

    var flat_keywords = [];

    for (var i=0; i < keywords.length; i++) {
      var keyword_obj = keywords[i];
      if (keyword_obj && keyword_obj.name) {
        flat_keywords.push(clean_string(keyword_obj.name));
      }
    }

    return flat_keywords;
  } else {
    return [];
  }
}
`,
    "requirements": ["clean_string"],
    "type": ["image"]
}

functions["populate_image_infobox"] = {
    "code": `
function populate_image_infobox(image, spread) {
  var infobox_tag = "info_box";
  append_project_details("", infobox_tag, "", spread); // Activating info_box
  
  var location = array_reject_empty([
    get_image_project_keywords(image, "City")[0] || "",
    get_image_project_keywords(image, "State")[0] || ""
  ]).join(", ");
  
  var completion_date = parse_date_to_string(
    get_image_project_field(image, "CompletionMonthYear")
  );
  if (completion_date) {
    completion_date = "Completed " + completion_date;
  }
  
  var metadata = [
    location,
    get_image_project_keywords(image, "Services").join(", "),
    completion_date,
  get_formatted_cost(get_image_project_field(image, "Cost")),
    get_image_project_keywords(image, "Awards").join("\\n")
  ];
  
  for (var i=0; i < metadata.length; i++) {
    var value  = metadata[i];

    populate_infobox_entry(
      "",
      value + "\\n",
      infobox_tag,
      spread
    );
  }
}
`,
    "requirements": [
      "append_project_details", "get_image_project_keywords", "get_image_project_field",
       "array_reject_empty", "parse_date_to_string", "get_formatted_cost",
      "populate_infobox_entry"],
    "type": ["image"]
}

functions["get_formatted_cost"] = {
    "code": `
function get_formatted_cost(cost) {
  if (cost.includes("$")) {
    return cost;
  }
  else if (isNaN(cost) || cost === "") {
    return ""; // not a number
  }
  else {
    if (typeof cost === "string") {
      cost = parseFloat(cost);
    }
    cost = cost.toLocaleString(undefined, {maximumFractionDigits: 0});
    return "$" + cost;
  }
}
`,
    "requirements": [],
    "type": ["generic"]
}

functions["get_fit_image_info"] = {
  "code": `
function get_fit_image_info(startCoord, requestedSize, imageSize) {
  // get info (starting position + final size) of image after fitting content to frame proportionally
  // mimic InDesign's "Fit Content Proportionally"
  // returns values in inches
  
  // startCoord: coord of top left corner of full imageBox, in inches
  // requestedSize: full size of imageBox, in inches
  // imageSize: whatever image.size.medium gives;
  
  var requestedAspectRatio = requestedSize.width / requestedSize.height; 
  var imageAspectRatio = imageSize.width / imageSize.height;
  var expansionRatio = 1.0;
  var expandedSize = {"width": -1, "height": -1}; // size of image after fitting to frame proportionally
  var paddedCoord = {"x": -1, "y": -1}; // coord of top left corner of image after fitting to frame proportionally
  
  if (imageAspectRatio < requestedAspectRatio) {
    // if image is skinnier than image box aspect ratio
    // expand y to requested height and then pad x
    expansionRatio = requestedSize.height / imageSize.height;
    expandedSize.width = imageSize.width * expansionRatio;
    expandedSize.height = imageSize.height * expansionRatio;
    var widthPadding = (requestedSize.width - expandedSize.width) / 2; // We're centering the image
    paddedCoord.x = startCoord.x + widthPadding;
    paddedCoord.y = startCoord.y;
  }
  else if (imageAspectRatio > requestedAspectRatio) {
    // if image is wider than image box aspect ratio
    // expand x to requested width and then pad y
    expansionRatio = requestedSize.width / imageSize.width;

    expandedSize.width = imageSize.width * expansionRatio;
    expandedSize.height = imageSize.height * expansionRatio;
    var heightPadding = (requestedSize.height - expandedSize.height) / 2; //we're centering the image
    paddedCoord.x = startCoord.x;
    paddedCoord.y = startCoord.y + heightPadding;
  }
  else {
    // just expand image. no need to pad
    paddedCoord.x = startCoord.x;
    paddedCoord.y = startCoord.y;
    
  }
  
  return {
    "width": expandedSize.width,
    "height": expandedSize.height,
    "x": paddedCoord.x,
    "y": paddedCoord.y
  };
}  
`,
  "requirements": [],
  "type": ["image", "powerpoint"]
}

functions["get_crop_option"] = {
  "code": `
function get_crop_option(image_aspect, target_width, target_height) {
  var crop_percentage = get_crop_percentage(image_aspect, target_width, target_height);
  var target_aspect = target_width/target_height;
  var options;
  if (image_aspect < target_aspect) {
    options = {"crop": {"top": crop_percentage, "bottom": crop_percentage}};
  }
  else if (image_aspect > target_aspect) {
    options = {"crop": {"left": crop_percentage, "right": crop_percentage}};
  }
  
  return options;
}
`,
  "requirements": ["get_crop_percentage"],
  "type": ["powerpoint"]
}

functions["get_crop_percentage"] = {
  "code": `
function get_crop_percentage(image_aspect, target_width, target_height){
  var target_aspect = target_width / target_height;
  var percentage_to_crop;
  if (image_aspect < target_aspect) {
    // image is taller than target
  var new_height = target_width / image_aspect;
    percentage_to_crop = (new_height - target_height) / (2*new_height);
  }
  else if (image_aspect > target_aspect) {
    // image is wider than target
    var new_width = target_height * image_aspect;
    percentage_to_crop = (new_width - target_width) / (2*new_width);
  }
  else {
    percentage_to_crop = 0;
  }

  percentage_to_crop *= 100;

  return percentage_to_crop;
}
`,
  "requirements": [],
  "type": ["powerpoint"]
}

functions["get_fit_image_info"] = {
  "code": `
function get_fit_image_info(startCoord, requestedSize, imageSize) {
  // get info (starting position + final size) of image after fitting content to frame proportionally
  // mimic InDesign's "Fit Content Proportionally"
  // returns values in inches
  
  // startCoord: {"x": 0, "y", 0} 
  //    coord of top left corner of full imageBox, in inches
  // requestedSize: {"width": 0, "heigth": 0}
  //    full size of imageBox, in inches
  // imageSize: whatever image.size.medium gives;
  
  var requestedAspectRatio = requestedSize.width / requestedSize.height; 
  var imageAspectRatio = imageSize.width / imageSize.height;
  var expansionRatio = 1.0;
  var expandedSize = {"width": -1, "height": -1}; // size of image after fitting to frame proportionally
  var paddedCoord = {"x": -1, "y": -1}; // coord of top left corner of image after fitting to frame proportionally
  
  if (imageAspectRatio < requestedAspectRatio) {
    // if image is skinnier than image box aspect ratio
    // expand y to requested height and then pad x
    expansionRatio = requestedSize.height / imageSize.height;
   	expandedSize.width = imageSize.width * expansionRatio;
    expandedSize.height = imageSize.height * expansionRatio;
    var widthPadding = (requestedSize.width - expandedSize.width) / 2; // We're centering the image
    paddedCoord.x = startCoord.x + widthPadding;
    paddedCoord.y = startCoord.y;
  }
  else if (imageAspectRatio > requestedAspectRatio) {
    // if image is wider than image box aspect ratio
    // expand x to requested width and then pad y
    expansionRatio = requestedSize.width / imageSize.width;

    expandedSize.width = imageSize.width * expansionRatio;
    expandedSize.height = imageSize.height * expansionRatio;
    var heightPadding = (requestedSize.height - expandedSize.height) / 2; //we're centering the image
    paddedCoord.x = startCoord.x;
    paddedCoord.y = startCoord.y + heightPadding;
  }
  else {
    // just expand image. no need to pad
    paddedCoord.x = startCoord.x;
    paddedCoord.y = startCoord.y;
    
  }
  
  return {
    "width": expandedSize.width,
    "height": expandedSize.height,
    "x": paddedCoord.x,
    "y": paddedCoord.y
  };
}
`,
  "requirements": [],
  "type": ["powerpoint"]

}

functions["get_projects_metadata"] = {
  "code": `
function get_projects_metadata(data) {
  // build a dictionary of all projects
  // where keywords and fields can be accessed with names
  var projects = data.projects;
  var project_metadata = {}; // project_id to {"projectKeywords": {}, "fields": {}}
  
  //for (var project_index = 0; project_index < projects.length; project_index++) {
  //  var project = projects[project_index];
  for (var project_key in projects) {
    if (!projects.hasOwnProperty(project_key)) {
      continue;
    }
    var project = projects[project_key];

    var fields = project.fields;
    var projectKeywords = project.projectKeywords;
    project_metadata[project.id] = {"name": project.name, "fields": {}, "projectKeywords": {}};
  
    // inserting fields
    for (var field_index = 0; field_index < fields.length; field_index++) {
      var this_field = fields[field_index];
      if (this_field.id in data.fields) {
        var field_info = data.fields[this_field.id];
        project_metadata[project.id].fields[field_info.code] = this_field.values;
        //warning(this_field.id + ": " + this_field.values);
      }
    }
    // inserting keywords
    // structure of the projectKeywords is:
    // {"projectKeywords": {< keyword_category_id >: [< keyword1 >, < keyword2 >]}
    for (var keyword_index = 0; keyword_index < projectKeywords.length; keyword_index++) {
      var this_keyword = projectKeywords[keyword_index];
      if (this_keyword.id in data.projectKeywords) {
        var keyword_metadata = data.projectKeywords[this_keyword.id];
        var keyword_category_id = keyword_metadata.project_keyword_category_id;
        if (keyword_category_id in project_metadata[project.id].projectKeywords) {
          project_metadata[project.id].projectKeywords[keyword_category_id].push(keyword_metadata.name);
        }
        else {
          project_metadata[project.id].projectKeywords[keyword_category_id] = [keyword_metadata.name];
        }
      }
    }
  }
  
  return project_metadata;
}
`,
  "requirements": [],
  "type": ["employee"]
};

functions["get_employee_project_history"] = {
  "code": `
function get_employee_project_history(data, employee) {
  // returns full_project_list, which is a list of projects that look like this:
  // {"project_role": -, "project_name": -, "location": -, "start_date": -, "end_date": -}
  var projects = data.projects;
  
  var project_list = employee.projects || [];
  var project_metadata = get_projects_metadata(data);
  var full_project_list = [];
  for (var project_index = 0; project_index < project_list.length; project_index++) {
    var employee_project = project_list[project_index];

    // if empty, skip
    if (employee_project.roles.rows.length === 0) {
      continue;
    }

    var project_id = employee_project.id || "";
    if (!project_id || !(project_id in projects)) continue;
    var project_keywords = project_metadata[project_id].projectKeywords; // keyed by keyword category id
    // collecting all the metadata
    var project_name = project_metadata[project_id].name;
    var project_description = project_metadata[project_id].fields.Description[0] || "";
    var employee_role = employee_project.roles.rows[0].project_role; // assuming that there's only one role for this project.
    var start_date = employee_project.roles.rows[0].start_date;
    var end_date = employee_project.roles.rows[0].end_date;
    var role_desc = clean_string(employee_project.roles.rows[0].role_description);

    // these are literally all to get the  location
    var city_keyword_cat_id = "2"; // these are project keyword category IDs. Need to grab these via REST API
    var country_keyword_cat_id = "3";
    
    var city = "";
    if (city_keyword_cat_id in project_keywords) {
      if (project_keywords[city_keyword_cat_id].length > 0) {
        city = project_keywords[city_keyword_cat_id][0]; // assuming there's only one city
      }
    }
    var country = "";
    if (country_keyword_cat_id in project_keywords) {
      if (project_keywords[country_keyword_cat_id].length > 0) {
        country = project_keywords[country_keyword_cat_id][0];
      }
    }
    
    var location = [];
    if (city) {
      location.push(city);
    }
    if (country) {
      location.push(country);
    }
    
    // inserting the darn project
    var project_to_insert = {
      "project_name": clean_string(project_name),
      "project_role": clean_string(employee_role),
      "location": clean_string(location.join(", ")),
      "start_date": start_date,
      "end_date": end_date, 
      "description": clean_string(project_description),
      "role_description": role_desc
    };
    
    // going to insert based on end_date, reverse chronologically.
    for (var i=0; i <= full_project_list.length; i++) {
      if (i === full_project_list.length) {
        // reached the end and haven't inserted yet
        full_project_list.push(project_to_insert);
        break;
      }
      var compared_end_date = full_project_list[i].end_date;
      if (project_to_insert.end_date > compared_end_date) {
        full_project_list.splice(i, 0, project_to_insert);
        break;
      }
    }
  }
  return full_project_list;
}
`,
  "requirements": ["get_projects_metadata"],
  "type": ["employee"]
};

functions["get_year_difference"] = {
  "code": `
function get_year_difference(date_string) {
  var nowTime = AwesomeHelpers.Generic.jsDateTo14DigitDate(new Date());

  if (date_string && date_string.length === 14) {
    var then_str = parseInt(date_string, 10);
  var now_str = parseInt(nowTime, 10);
    var diff = Math.abs(now_str - then_str);
    return Math.floor(diff/10000000000);
  }
  else if (date_string && date_string.length > 4) {
    var then_year_str = parseInt(date_string.substring(0, 4), 10);
    var now_year_str = parseInt(nowTime.substring(0, 4), 10);
    return Math.abs(now_year_str - then_year_str) - 1;
  }
  else {
    return 0;
  }
}
`,
  "requirements": [],
  "type": ["employee"]
};

functions["insert_spreads_and_pages"] = {
  "code": `
function insert_spreads_and_pages(indesign, spread_count, pages_per_spread, master_page_indices) {
  // given an InDesign obj, how many spreads we want, how many pages per spread,
  //   and a list of master_page indices
  // populate those spreads + pages into the indesign object.

  // returned number of pages added.

  var pages_added = 0;

  // ensuring that the master_page_indices comes in as a list.
  if (typeof master_page_indices === 'number') {
    // if master_page_indices just comes in as a number instead of an array
    if (master_page_indices % 1 === 0) {
      // integer as index, good
      master_page_indices = [master_page_indices];
    }
    else {
      warning("Unknown Master Page Index format!!");
    }
  }

  for (var spread_index = 0; spread_index < spread_count; spread_index++) {
    indesign.addSpreads(1);
    
    for (var page_index = 0; page_index < pages_per_spread; page_index++) {
      indesign.addPages(1, master_page_indices[spread_index]);
      pages_added++;
    }
  }

  return pages_added;
}
`,
  "requirements": [],
  "type": ["indesign"]
}

// var loop_requirements = {};
// loop_requirements["project"] = {};
// loop_requirements["project"]["indesign"] = ["check_and_get_property_value", "append_project_details", "populate_project_infobox"];

function get_all_req_functions(base_functions, all_functions) {
    // given a list of functions as query
    // use the all_functions dict to tease through what other required functions are needed.
    var functions_to_query = base_functions.slice(0); // function names to check
    var required_functions = []; // functions we've confirmed need to be used

    console.log(functions_to_query);

    while (functions_to_query.length > 0) {
        this_func = functions_to_query.shift();
        reqs_for_this_func = all_functions[this_func].requirements.slice(0);

        if (!required_functions.includes(this_func)) {
            required_functions.push(this_func);
        }
        while (reqs_for_this_func.length > 0) {
            this_req_func = reqs_for_this_func.shift();
            if (!required_functions.includes(this_req_func) && !functions_to_query.includes(this_req_func)) {
                functions_to_query.push(this_req_func);
            }
        }
    }

    return required_functions.reverse(); // why reverse? all the basic functions are appended at the end,
    // the ones that do not have any required functions.
}

function get_functions_as_str(func_list, all_functions) {
    // given a list of function names
    // return the scripts as a string

    functions_to_populate = func_list.slice(0);
    script_strings = [];

    while (functions_to_populate.length > 0) {
        script_strings.push(all_functions[functions_to_populate.shift()].code);
    }

    return script_strings.join("\n");
}

req_funcs = get_all_req_functions(["append_project_details", "check_and_get_property_value", "populate_project_infobox"], functions)


// console.log(get_functions_as_str(req_funcs, functions));

var functions_to_use = {};
functions_to_use["projects"] = {};
functions_to_use[""]

// uwu