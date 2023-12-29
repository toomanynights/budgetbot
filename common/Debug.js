function debugHelloWorld() {
  console.log("Hello World");
  return "Hello World"
}

function datesYetAgain() {

  const ss = getSpreadSheet("1FABBcbrJTt7QI5SulcLO1BVFZF9T9Tw8yjFydRCCcaA");
  const range1 = ss.getSheetByName("test").getRange("A1");
  const value1 = range1.getDisplayValue();
  console.log(value1)
  
  console.log(today)
  console.log(toUsersTimezone(today, ss, "Etc/GMT+12", true))
  console.log(toUsersTimezone(today, ss, "Etc/GMT+12", "iso8601"))
  console.log(new Date(toUsersTimezone(today, ss, "Etc/GMT+12", "iso8601")))

  console.log(getSettingValue("First date", ss))
  console.log(getSettingValue("First date", ss).simpleToDate())
  console.log(toUsersTimezone(getSettingValue("First date", ss).simpleToDate(), ss, "", true))
  console.log(DateToValue(getSettingValue("First date", ss).simpleToDate()))
  range1.setValue(DateToValue(getSettingValue("First date", ss).simpleToDate()))
  console.log(range1.getValue())

  let cutOffDate = today.clearTime();
  const dateRange = ss.getRange(makeRangeName(budgetSheetName, "DateColumn")).getDisplayValues();
  const dateOffset = tryCache(budgetSheetName, "DateColumn", "getRow", ss);
  // dateRange.forEach(x => {
  //   console.log([x, x[0].simpleToDate(), cutOffDate, diffInDays(cutOffDate, x[0].simpleToDate())])
  // })
  const dateCol = dateRange.findIndex(x => diffInDays(cutOffDate, x[0].simpleToDate()) == 0)

  console.log(Number(dateOffset))
  console.log(Number(dateCol))

}

function debugTextSearch() {
  console.log(getCellCoordinatesByContent(predListLogHeaders, "Paid off?"))
}

function debugSubmitPred() {
  submitPrediction(10, today, 999)
}

function debugGetPredType() {
  const ss = SpreadsheetApp.openById("1BYJqvWmT0lLqnaiT7nbAZeAHEYTPFvSEMzP77nR9AXo")
  console.log(getAllPredTypesAsObj(ss))
}

function debugPausePred() {
  changePredStatusByName("Check5", "paused")
}

function debugReCalcByDate() {
  reCalcByDateRange("all", new Date(getSettingValue("First date")), new Date(getLastDate()))
}

function debugPredFill() {
  let range = getSpreadSheet().getSheetByName(predSheetName).getRange("Predictions").getValues();
  range = predictionsFill("megatest", 69, "Periodic", new Date("2023-10-05"), 5, range);
  console.log(range.filter(x => x[1] == "megatest"))
}

function debugPredDel() {
  let range = getSpreadSheet().getSheetByName(predSheetName).getRange("Predictions").getValues();
  range = predictionsRemove("Check5", range);
  console.log(range);
}

function debugGetPredsObj() {
  console.log(getAllPredTypesAsObj())
}

function debugCache() {
    console.log(tryCache("CategoryObjects"))
}

function debugSortLogs() {
  sortLogs("default");
}

function debugGetDefaultSetting() {
  return getDefaultSettingValue("Days to generate")
}


function debugKb() {
  const kb = fillKbWithSortedSubCats("big_expense")
  console.log(kb)
  const predictionsPredListKeyboard = fillKb(getAllActivePredsAsObj());
  console.log(predictionsPredListKeyboard)
}

function debugClearCache() {
  setProperty(settSheetName, "Settings")
  rebuildCache(settSheetName, "Settings")
}

function debugFillCat() {
  const catRange = getSpreadSheet().getSheetByName(catSheetName).getRange("Categories").getValues().flat().filter(Boolean);
  const catArr = fillCatArray(catRange, "category");
  console.log(catArr);
  console.log(catArr.daily.subCats)
  console.log(catArr.big_expense.subCats)
  console.log(catArr.big_earning.subCats)
  console.log(catArr.prediction.subCats)
}

function debugSendMessage() {
  const cats = tryCache("CategoryObjects")
  const kb = fillKb(cats)
  sendText(569019831, 'kek?', kb)
}

function debugCatInfoSuperNew() {
  console.log(getCatInfoByFullName("🚗 Transportation", "daily_subcat", "shortName"))
}

function debugExtend() {
 extendRangeByEmptyRows(logSheetName, "LogSheetLogValues", 20);
}

function debugAddExpense() {
  addExpense("daily", "other", Math.floor(Math.random() * 40) + 1, today)
}

function debugClearValidation() {
  clearDataValidation(106)
}

function debugGetLastDate() {
  console.log(new Date(getLastDate()))
}

function debugOmit() {
  const cats = tryCache("CategoryObjects")
  console.log(omit(["subCats", "emoji"], cats.daily))
}

function debugPredReCals() {
  reCalcPredictions("kik")
}

function debugCatRename() {
  renameDailyCat("😈 Sodomia" , "🕺 Entertainment")
}

function debugAddCat() {
  addNewCat("😌 keks")
}

function debugFindLogs() {
  console.log(findLogRowsQBySubCat("🕺 Entertainment"))
}

function debugCatRemove() {
  uiCatRemoveFormLaunch("😌 keks")
}

function debugAddNote() {
  addCommentToPredByIndex(1, "Sum", "lil")
}

function debugGetMostUsedSubCats() {
  console.log(getMostUsedSubCats("big_expense", 5, 5))
}

function debugRangeName() {
  return makeRangeName("Budget", "Kekers")
}

function debugAddSubCat() {
  removeSubCatFromCatalogue("CatalogueBigExpSubs", "уку")
}

function debugExpandFormulas() {
  const formulasRange = getSpreadSheet().getRange(makeRangeName(budgetSheetName, "DailyStats"));
  const rows = formulasRange.getNumRows();
  formulasRange.offset(0, 0, rows, 1).copyTo(formulasRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false)
}

const getDeployments = (options = {}) => {
  const {
    version = 1,
    id = ScriptApp.getScriptId(),
    token = ScriptApp.getOAuthToken(),
    page = "",
    size = 50,
    type = "WEB_APP",
  } = options;

  const uri = `https://script.googleapis.com/v${version}/projects/${id}/deployments`;

  const fullURI = `${uri}?pageSize=${size}${page ? `&pageToken=${page}` : ""}`;

  const params = {
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    muteHttpExceptions: true,
    method: "get",
  };

  const deps = [];

  const response = UrlFetchApp.fetch(fullURI, params);

  if (response.getResponseCode() !== 200) {
    console.log(response.getContentText());
    return deps;
  }

  const { deployments, nextPageToken } = JSON.parse(response.getContentText());

  const requested = deployments.filter(({ entryPoints }) =>
    entryPoints.some(({ entryPointType }) => entryPointType === type)
  );

  deps.push(...requested);

  if (nextPageToken) {
    deps.push(...getDeployments(options));
  }

  return deps;
};

function debugTriggers() {

  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(x => console.log(x.getHandlerFunction()));

}

function debugPredTypes() {
  const predName = "ACF"
  console.log(getPredInfoByName(predName, "Category"))
}

function debugDeleteUserProps() {
  const props = PropertiesService.getUserProperties();
  props.deleteAllProperties()
}
function debugDeleteScriptProps() {
  const props = PropertiesService.getScriptProperties();
  const id = "1PIvqAwzBImzU7IUfAo5qF8vLr6zE3f4DdWAxYqvTXoI"
  const propName = id + "_CategoryObjects"
  console.log(props.getProperty(propName))
  props.deleteProperty(propName)
}


function debugDetachToken() {
  let telegramIds = JSON.parse(scriptProps.getProperty("telegramIds"));
  if (!telegramIds) {telegramIds = {}};
  const tgToken = 569019831;

  if (telegramIds[tgToken]) {
    telegramIds[tgToken] = '';
    scriptProps.setProperty("telegramIds", JSON.stringify(telegramIds));
    console.log("Removed assignment to TG token " + tgToken)
  };
}

function debugCheckSubCat() {

  const subcat = "test"
  const cat = "big_expense"
  const sheetId = "1CcVwLC4ISupc5m-AYk2A6hTYcFm78oQ0MVkk4oVrD04"
  const ss = SpreadsheetApp.openById(sheetId)
  const scriptProps = PropertiesService.getScriptProperties();
  const catsObject = JSON.parse(scriptProps.getProperty(sheetId + "_" + "CategoryObjects"));
  const val = checkIfCatExists(subcat, cat, true, catsObject, ss)

  console.log(val)
}

/**
 * Use the Search Console API to list the URLs of all the sites you have setup.
 * @see {@link https://developers.google.com/webmaster-tools/}
 */




function debugFuckingTimeZones() {

  function formatTime(dt) {
    const timezone = ss.getSpreadsheetTimeZone();
    dt = new Date(dt).clearTime()
    const dateString = Utilities.formatDate(dt, timezone, 'dd/MM/yyyy');
    return dateString
  }

  function inputToDate(str) {
    const newStr = str.split("-")
    const newDate = new Date(newStr[0], newStr[1] - 1, newStr[2])
    return newDate
  }

  const date = "2023-12-13"
  console.log(date)
  console.log(inputToDate(date))
  console.log(formatTime(inputToDate(date)))

}

function debugSetInitialSettingsApplied() {
  const docProps = PropertiesService.getDocumentProperties();
  docProps.setProperty("launchSettingsApplied", true)
  onOpen()
}

function TimeZonesExtended() {

  console.log(today)

  const test1 = toUsersTimezone(today, "", "Europe/Moscow", true)
  console.log(test1, typeof test1)
  const test2 = toUsersTimezone(today, "", "Europe/Moscow")
  console.log(test2, typeof test1)

  console.log(today.getTimezoneOffset())
  console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

  SpreadsheetApp.openById("1DP3XzjReFDMISvxl87uZwVgAcQJCmsPjV1TY9HY_Fyk").getActiveSheet().getRange("A1").setValue(test1)

}





function debugGetId(test, test2) {
  
  return test + " " + SpreadsheetApp.openById("1BYJqvWmT0lLqnaiT7nbAZeAHEYTPFvSEMzP77nR9AXo").getName() + " " + test2
}

function debugTestExec() {

  var obj = JSON.parse(getUserScriptPropertyByValue("docId", "1BYJqvWmT0lLqnaiT7nbAZeAHEYTPFvSEMzP77nR9AXo"))[1]
  const token = obj.accessToken
  var options = {
    "method": "POST",
    "headers": { "Authorization": "Bearer " + token },
    "contentType": "application/json",
    "payload": JSON.stringify({
      "function": "debugGetId",
      'parameters': ["lewl", "lwel"],
      "devMode": "true"
    }),
    "muteHttpExceptions": true
  }
  var rest = UrlFetchApp.fetch("URL", options)
  console.log(rest.getContentText())
  return rest.getContentText()

}

 function saveTestToken() {

  // var token = "ya29.a0AfB_byDxkD-IiZI2mFzPqEPM0Q_I0eLm7K2j6HxPIr_zUQea30tL0EDO8mbhCnT7KNWaaq5cnUhJF5Y7IDhwVZjiADMh5SVjRGjjnuRFTKxSiHP4pDqXmQ-pylUhPcRMeqPIxrKMkyry4HzNvUQoXr8KhTrgTesFmfj7S5qwCfOkUgRVYEfhaCgYKAeASARISFQHGX2MiQhFhwQEYDAea5FCpNrvIHA0187";
  var token = ScriptApp.getOAuthToken();
  console.log("Token updated: " + token)
  PropertiesService.getScriptProperties().setProperty("testAccessToken", token);

}

function authorizeBot() {

  const token = PropertiesService.getScriptProperties().getProperty("testAccessToken")
  const authUrl = "https://www.googleapis.com/auth/spreadsheets";
  var params = {
    method: "GET",
    headers: {"Authorization": "Bearer " + token},
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(authUrl, params).getContentText();
  console.log(res)
}

function killTimedTriggers() {

  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getTriggerSource() == ScriptApp.TriggerSource.CLOCK) {
      console.log("Killed trigger " + triggers[i].getHandlerFunction())
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
    ScriptApp.newTrigger("processTimedTrigger")
    .timeBased()
    .everyHours(1)
    .create();

    // var trigger = ScriptApp
    // .newTrigger('processTimedTrigger')
    // .timeBased()
    // .after(1)
    // .create();    

    console.log("Successfully created timed trigger")
}

function debugSetMyProperty() {
  setUsersScriptProperty(Session.getActiveUser().getEmail(), SpreadsheetApp.getActive().getId())
}

function debugDeleteTriggers() {

  const sheet = getSpreadSheet()
  createTriggers(sheet, "remove")
  
}

function debugAddTriggers() {

  const sheet = getSpreadSheet()
  createTriggers(sheet, "create")

}

function debugSetAdditionalParameters() {
  const email = Session.getActiveUser().getEmail();
  setUserScriptPropertyValue(email, "timezone", SpreadsheetApp.getActive().getSpreadsheetTimeZone())
}

function debugNewPredObj() {
  const obj = {
  "9": {
        "date": "20/12/2023",
        "dateForm": "20/12/2023",
        "sum": 10,
        "id": 9,
        "shortName": "testio",
        "fullName": "01/01/1970, testio, 10",
        "type": "prediction"
      }
	}
  const timezone = "Europe/Moscow"
  console.log(getActualPreds(obj, timezone))
}

function debugFilteringCats() {
  const scriptProps = PropertiesService.getScriptProperties();
  let obj = scriptProps.getProperty("user_oldcap9703@gmail.com");
  obj = JSON.parse(obj).catsObject;
  const arr = []

  Object.values(obj).forEach(function (item) {
    arr.push(item.fullName);
    const subcats = Object.values(item.subCats);
    subcats.forEach(function(i) {
      arr.push(i.fullName);
    })
  });
  console.log(arr)
}