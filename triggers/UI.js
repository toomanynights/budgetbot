function applyPredChangesSidebar() {

  console.log(CacheService.getUserCache().get("sidebarOpened"))
  if (CacheService.getUserCache().get("sidebarOpened")) {return};

  const html = HtmlService
    .createTemplateFromFile('forms/Sidebar')
    .evaluate()
    .setTitle('Predictive Budget');
  SpreadsheetApp.getUi().showSidebar(html)
  console.log("Sidebar opened");

  addToCacheJournal("sidebarOpened");
  CacheService.getUserCache().put("sidebarOpened", true, 300);

}

function openSettingsPage() {

  const ss = getSpreadSheet();
  const timezone = ss.getSpreadsheetTimeZone();
  const html = HtmlService.createTemplateFromFile('forms/Settings');
  const setts = ss.getRange(makeRangeName(settSheetName, "Settings")).getValues();
  const applied = PropertiesService.getDocumentProperties().getProperty("launchSettingsApplied");
  html.setts = setts;
  html.timezone = timezone;
  html.applied = applied;
  
  var htmlOutput = html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(450)
    .setHeight(550);

    SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, 'Settings');

}

function uiCatJunctionFormLaunch() {

  const cats = tryCache(catSheetName, "CatalogueDailySubs").flat().filter(Boolean);
  const html = HtmlService.createTemplateFromFile('forms/CatJunction');
  html.cats = cats;

  var htmlOutput = html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(500)
    .setHeight(300);

  SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, 'Choose your adventure');

}

function uiCategoriesEditFormLaunch(mode) {

  const cats = tryCache(catSheetName, "CatalogueDailySubs").flat().filter(Boolean);
  const html = HtmlService.createTemplateFromFile('forms/CatList');
  html.cats = JSON.stringify(cats);
  html.mode = mode;


  let title;
  if (mode == "remove") { title = "Removing a category" }
  else if (mode == "rename") { title = "Renaming a category" }
  else if (mode == "reorder") { title = "Changing the order of categories" }

  var htmlOutput = html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(350)
    .setHeight(400);

  SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, title);

}

function uiNameChangeFormLaunch(oldName) {

  const html = HtmlService.createTemplateFromFile('forms/CatChangeName');
  if (!oldName) { oldName = null }; // otherwise it is considered "undefined" and everything breaks
  html.oldName = oldName;

  var htmlOutput = html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(310)
    .setHeight(400);

  SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, 'Give it a good name');

}

function uiCatRemoveFormLaunch(cat) {

  cat = JSON.parse(cat)
  const html = HtmlService.createTemplateFromFile('forms/CatRemove');
  let cats = tryCache(catSheetName, "CatalogueDailySubs").flat().filter(Boolean);
  cats = cats.filter(x => x != cat);
  html.cat = cat;
  html.quantity = findLogRowsQBySubCat(cat);
  html.cats = cats;

  var htmlOutput = html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(300)
    .setHeight(400);

  SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, 'Careful now');

}

function toggleSidebarOpened() {
  const state = CacheService.getUserCache().get("sidebarOpened");
  if (state) {
    CacheService.getUserCache().remove("sidebarOpened");
    console.log("Sidebar status set to CLOSED")
  } else {
    CacheService.getUserCache().put("sidebarOpened", true, 300);
    console.log("Sidebar status set to OPENED")
  }
  return true;
}



function displayStartToast() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Changes are being applied...', 'Wait a bit', 3);
}

function displayFinishToast() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Thanks for your patience', 'Done', 3);
}

function displayToast(title, text, delay) {
  SpreadsheetApp.getActiveSpreadsheet().toast(text, title, delay);
}

function displayError(text) {
  SpreadsheetApp.getUi().alert(text);
}



/*
function closeSidebar() {
    var html = HtmlService.createHtmlOutput("<script>google.script.host.close();</script>");
    SpreadsheetApp.getUi().showSidebar(html);
}
*/