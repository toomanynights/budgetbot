// const latestVersion = "1.0";
const template = "1Gf1TQk8UrQ9NsalvafNXALaphcrZBBHoxyaQLHPBWXw";

/**
 * @NotOnlyCurrentDoc
 */



function onOpen(e) {

  // if (e) {console.log(e.authMode.toString())} else {console.log("No parameters supplied")}
  var menu = SpreadsheetApp.getUi().createAddonMenu();

  if (e && e.authMode == ScriptApp.AuthMode.NONE) {

    menu.addItem('Start workflow', 'startWorkflow');
    // menu.addItem('debugSetInitialSettingsApplied', 'debugSetInitialSettingsApplied');
    console.log("ScriptApp.AuthMode.NONE scenario")

  } else {

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getUserProperties();
    const docProps = PropertiesService.getDocumentProperties();
    const id = ss.getId();
    // const idStored = props.getProperty("docId");

    let userObj = getUserScriptPropertyByValue("docId", id)
    if (userObj) {userObj = JSON.parse(userObj)[1]};
    let appMarker = JSON.parse(docProps.getProperty("launchSettingsApplied"));
    appMarker = appMarker == null ? false : typeof appMarker == "boolean" ? appMarker : appMarker.includes("true") ? true : false;

    if (!userObj || !userObj.docId || !appMarker) {

      menu.addItem('Start workflow', 'startWorkflow');
      //console.log("Reattach scenario")

    } else {

      //console.log("Normal scenario")

      menu.addItem('Re-calculate predictions', 'reCalcPredictions');
      menu.addItem('Re-calculate budget sheet', 'reCalcAllBudget');
      menu.addItem('Edit categories', 'uiCatJunctionFormLaunch');
      menu.addItem('Clear all caches', 'setProperties');
      menu.addSeparator();
      menu.addItem('Settings', 'openSettingsPage');
      menu.addItem('Forget this sheet', 'getDetached');

      // menu.addItem('Set my object', 'debugSetMyProperty');

      if (userObj.service == 1) {
        menu.addSubMenu(SpreadsheetApp.getUi().createMenu('Debug menu')
          .addItem('Process time trigger', 'processTimedTrigger')
          .addItem('Kill timed triggers', 'killTimedTriggers')
          .addItem('Delete all triggers', 'debugDeleteTriggers')
          .addItem('Rebuild triggers', 'debugAddTriggers')
          .addItem('Set additional parameters to object', 'debugSetAdditionalParameters')
          .addItem('Sort predictions', 'sortPredictions')
          .addSubMenu(SpreadsheetApp.getUi().createMenu('Maintenance functions')
            .addItem('hideRows', 'hideRows')
            .addItem('addNewDates', 'addNewDates')
            .addItem('nightlyMaintenance', 'nightlyMaintenance')
          )
        )
      }
    }
  }
  menu.addToUi();

}

function onInstall(e) {
  onOpen(e);
}

function copyWithProtection(name, source, current) {

  const p = source.getSheetByName(name).getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];

  // Output sheet, and protect the sheet by default
  var sheet2 = source.getSheetByName(name).copyTo(current).setName(name);
  if (p) {

    var p2 = sheet2.protect();

    // Copy protection properties
    p2.setDescription(p.getDescription());
    p2.setWarningOnly(p.isWarningOnly());
  
    if (!p.isWarningOnly()) {
      // Copy editors
      p2.removeEditors(p2.getEditors());
      p2.addEditors(p.getEditors());
    }
  
    // Get all unprotected ranges on template
    var ranges = p.getUnprotectedRanges();
    var newRanges = [];
    for (var x = 0; x < ranges.length; x++) {
      newRanges.push(sheet2.getRange(ranges[x].getA1Notation()));
    }
  
    // Unprotect them in output
    p2.setUnprotectedRanges(newRanges);
  }
}

function copyFromTemplate(override) {

  const sheetNamesArr = [settSheetName, catSheetName, budgetSheetName, logSheetName, predSheetName]
  const source = SpreadsheetApp.openById(template);
  const current = SpreadsheetApp.getActiveSpreadsheet();

  for (let i = 0; i < sheetNamesArr.length; i++) {
    const currSheetName = sheetNamesArr[i];
    const currSheet = current.getSheetByName(currSheetName);
    if (override) {
      if (currSheet) {
        current.deleteSheet(currSheet);
      }
      copyWithProtection(currSheetName, source, current);
    } else {
      if (!currSheet) {
        copyWithProtection(currSheetName, source, current);
      }
    }
  }
}

function createTriggers(sheet, type) {

  const triggers = ScriptApp.getProjectTriggers();

  if (!type || type == "remove") {
    triggers.forEach(x => {
      console.log("Killed trigger " + x.getHandlerFunction())
      ScriptApp.deleteTrigger(x)
    });
    console.log("No triggers left");
  }

  if (!type || type == "create") {

    console.log("Creating triggers")
  
    ScriptApp.newTrigger("processTimedTrigger")
    .timeBased()
    .everyHours(1)
    .create();

    ScriptApp.newTrigger("onSheetEdit")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();

    console.log("Triggers created")

  }

}

function addEmailToCatalogue(email) {

      const scriptProps = PropertiesService.getScriptProperties();

      let catalogue = scriptProps.getProperty("userCatalogue");
      if (!email) {email = Session.getActiveUser().getEmail()};
      if (!catalogue) {catalogue = []} else {catalogue = JSON.parse(catalogue)};
      if (!catalogue.includes(email)) {catalogue.push(email)};

      scriptProps.setProperty("userCatalogue", JSON.stringify(catalogue));

}

function setUsersScriptProperty(email, id) {

  const scriptProps = PropertiesService.getScriptProperties();
  if (!email) {email = Session.getActiveUser().getEmail()};
  const propName = "user_" + email;
  let prop = scriptProps.getProperty(propName);

  prop = {};
  prop.docId = id;
  prop.timezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();

  scriptProps.setProperty(propName, JSON.stringify(prop));

}

function startWorkflow(e) {

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const docProps = PropertiesService.getDocumentProperties();
  docProps.setProperty("launchSettingsApplied", false);

  if (sheet && sheet.authMode != ScriptApp.AuthMode.NONE) {

    const email = Session.getActiveUser().getEmail();
    let userObj = getUserScriptPropertyByValue("email", email);
    console.log(userObj)
    let idStored;
    if (userObj) {
      userObj = JSON.parse(userObj);
      idStored = userObj.docId;
    };

    const docProps = PropertiesService.getDocumentProperties();
    const props = PropertiesService.getUserProperties();
    const scriptProps = PropertiesService.getScriptProperties();
    const id = sheet.getId();
    // const idStored = props.getProperty("docId");
    const ui = SpreadsheetApp.getUi();

    if (idStored && (idStored != id)) { // this is reattachment, have to remove connection with TG
      // console.log("Reattachment scenario")
      const response = ui.alert('You already have Predictive Budget attached to another spreadsheet: \n\nhttps://docs.google.com/spreadsheets/d/' + idStored + '\n\nThe script\'s connection to that spreadsheet will be lost; the script will be reattached to this spreadsheet.\n\nWould you like to keep your current sheets? Select "Yes" to keep, "No" to override, "Cancel" to back down.', ui.ButtonSet.YES_NO_CANCEL);
      if (response != ui.Button.CANCEL) {
        removeOldTokenAttachment(idStored);
        const override = response == ui.Button.NO ? true : false;
        getAttached(override);
      } 
    } else if (!idStored) {
      // console.log("Creation scenario")
      const response = ui.alert('Welcome to Predictive Budget! Let\'s get you set up now.\nWould you like to keep your current sheets? Select "Yes" to keep, "No" to override, "Cancel" to back down.', ui.ButtonSet.YES_NO_CANCEL);
      if (response != ui.Button.CANCEL) {
        const override = response == ui.Button.NO ? true : false;
        getAttached(override);
      } 
    } else { // some shenanigans happening, let's just try to reattach again
      // console.log("Shenanigans scenario")
      const sheetText = "\n" + (idStored ? "You are attached to a spreadsheet:\nhttps://docs.google.com/spreadsheets/d/'" + idStored : "Not attached to a spreadsheet") + "\n"
      const response = ui.alert('Some shenanigans happen here.' + sheetText + '.\n\nWould you like to keep your current sheets? Select "Yes" to keep, "No" to override, "Cancel" to back down.', ui.ButtonSet.YES_NO_CANCEL);

      if (response != ui.Button.CANCEL) {
        removeOldTokenAttachment(idStored);
        const override = response == ui.Button.NO ? true : false;
        getAttached(override);
      } 
    }

    function getAttached(override) {

      copyFromTemplate(override);

      const email = Session.getActiveUser().getEmail();
      addEmailToCatalogue(email);
      setUsersScriptProperty(email, id);

      // props.setProperty("docId", id); 
      // if (!docProps.getProperty("version")) {
      //   docProps.setProperty("version", latestVersion);
      // }
      setProperties(); 
      createTriggers(sheet);
      processTimedTrigger(); 
      openSettingsPage();

      if (!override) {

        let isNotFirst = docProps.getProperty("launchSettingsApplied");
        isNotFirst = typeof isNotFirst == "boolean" ? isNotFirst : isNotFirst == "true" ? true : false;
        if (!isNotFirst) {docProps.setProperty("launchSettingsApplied", true)};

      }
      onOpen(e);
    }
  }
}

function getDetached() {

  const docProps = PropertiesService.getDocumentProperties();
  const userProps = PropertiesService.getUserProperties();

  debugDeleteTriggers();
  clearAllCache();
  docProps.deleteAllProperties();
  userProps.deleteAllProperties();

  const email = Session.getActiveUser().getEmail();
  let userObj = getUserScriptPropertyByValue("email", email);
  if (userObj) {
    userObj = JSON.parse(userObj)[1];

    const scriptProps = PropertiesService.getScriptProperties();
    const propName = "user_" + email;  
    prop = {};
    scriptProps.setProperty(propName, JSON.stringify(prop));
  };

  onOpen();

}

function removeOldTokenAttachment(idStored) {

  console.log("Removing telegram token assignment to old spreadsheet: " + idStored)
  const oldSheete = SpreadsheetApp.openById(idStored);
  const vals = oldSheete.getSheetByName(settSheetName).getRange("Settings").getValues();
  const tgToken = vals.find(x => x[0] == "Telegram chat ID")[1];
  const scriptProps =  PropertiesService.getScriptProperties();

  let telegramIds = JSON.parse(scriptProps.getProperty("telegramIds"));
  if (!telegramIds) {telegramIds = {}};

  if (telegramIds[tgToken]) {
    telegramIds[tgToken] = '';
    scriptProps.setProperty("telegramIds", JSON.stringify(telegramIds));
    console.log("Removed assignment to TG token " + tgToken)
  };
}