console.log("Request reached Google")

const today = new Date();
const budgetSheetName = "Budget";
const logSheetName = "Expense log";
const predSheetName = "Planned expenses";
const settSheetName = "Settings";
const catSheetName = "Catalogue";


function getSpreadSheet(id) {

  // console.log(getSpreadSheet.caller.name)
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const email = Session.getActiveUser().getEmail();

  let userObj;
  let idFromObj;
  if (email) {
    userObj = getUserScriptPropertyByValue("email", email);
    if (userObj) {userObj = JSON.parse(userObj)};
    if (userObj.docId) {idFromObj = userObj.docId};
  }

  const ssId = id ? id : idFromObj;
  // console.log(ssId)
  const ss = active ? active : SpreadsheetApp.openById(ssId);
  return ss;

}

function setUserScriptPropertyValue(email, name, value) {

  const scriptProps = PropertiesService.getScriptProperties();
  if (!email) {email = Session.getActiveUser().getEmail()};
  if (!email) {
    console.error("Can't setUserScriptPropertyValue: email not provided");
    return;
  }
  
  const propName = "user_" + email;
  let prop = scriptProps.getProperty(propName);
  if (!prop) {prop = {}} else {prop = JSON.parse(prop)}
  
  prop[name] = value;

  scriptProps.setProperty(propName, JSON.stringify(prop));

}

function getUserScriptPropertyByValue(criteriaName, criteriaValue) {

  const scriptProps = PropertiesService.getScriptProperties();
  const catalogue = JSON.parse(scriptProps.getProperty("userCatalogue"));

  for (let i = 0; i < catalogue.length; i++) {
    const currEmail = catalogue[i];
    let currObj = scriptProps.getProperty("user_" + currEmail);
    if (!currObj) {continue} else (currObj = JSON.parse(currObj));
    if (criteriaName == "email") {
      if (currEmail == criteriaValue) {return JSON.stringify(currObj)};
    } else {
      if (currObj[criteriaName] == criteriaValue) {return JSON.stringify([currEmail, currObj])};
    }
  }

  return false;

}

function setProperty(sheetName, range, func, props, stat) {

  const ss = getSpreadSheet();


  if (!props) {props = PropertiesService.getDocumentProperties()};
  let rangeName = makeRangeName(sheetName, range);

  let val;
  if (!func) {
    if (range == "Settings") { // to protect dates
      val = ss.getRange(rangeName).getDisplayValues()
    } else {val = ss.getRange(rangeName).getValues()}
    };

  if (func) {
    if (func == "getRow") {
      val = ss.getRange(rangeName).getRow();
    }
    if (func == "getColumn") {
      val = ss.getRange(rangeName).getColumn();
    }
    if (func == "getLastColumn") {
      val = ss.getRange(rangeName).getLastColumn();
    }
    rangeName = rangeName + "/" + func;
  }

  props.setProperty(rangeName, JSON.stringify(val));

  if (stat) {
    const scriptProps = PropertiesService.getScriptProperties();
    const prop = JSON.parse(scriptProps.getProperty("staticValues"));
    const fullName = func ? rangeName + "/" + func : rangeName;
    prop[fullName] = val;
    scriptProps.setProperty("staticValues", JSON.stringify(prop));
  } 
  
  if (!stat) {rebuildCache(sheetName, range, func)}

}

function setPropertyObject(name, obj, props) {

  if (!props) {props = PropertiesService.getDocumentProperties();} 
  props.setProperty(name, JSON.stringify(obj));

  rebuildCache(name);
}

function resetCatObject(anon, id) {

  const ss = getSpreadSheet(id);
  let catRange = anon ? ss.getRange(makeRangeName(catSheetName, "Categories")).getValues() : tryCache(catSheetName, "Categories");
  catRange = catRange.flat().filter(Boolean)
  
  const obj = fillCatArray(catRange, "category", ss);
  if (!anon) {setPropertyObject("CategoryObjects", obj)};

  // script props - to be removed
  //const scriptProps = PropertiesService.getScriptProperties();
  //const ssId = anon ? ss.getId() : SpreadsheetApp.getActiveSpreadsheet().getId();
  //console.log("Setting common cat object: " + ssId + "_" + "CategoryObjects")
  //scriptProps.setProperty(ssId + "_" + "CategoryObjects", JSON.stringify(obj));

  //actual script props
  const ssId = anon ? id : SpreadsheetApp.getActiveSpreadsheet().getId();
  let currObj = getUserScriptPropertyByValue("docId", ssId);
  if (!currObj) {return} else {currObj = JSON.parse(currObj)}
  const currEmail = currObj[0];
  setUserScriptPropertyValue(currEmail, "catsObject", obj);

  return obj;

}

function setProperties() {

  console.log("Rebuilding properties...")
  clearAllCache()

  const props = PropertiesService.getDocumentProperties();

  // const version = JSON.parse(props.getProperty("version"));
  const settsApplied = JSON.parse(props.getProperty("launchSettingsApplied"));

  props.deleteAllProperties();
  //props.setProperty("ssId", ssId);

  // catalogue
  setProperty(catSheetName, "Categories", "", props);
  setProperty(catSheetName, "CatalogueDailySubs", "", props);

  console.log("Catalogue properties rebuilt")


  //budget
  setProperty(budgetSheetName, "BigExpensesVisualsCol", "getColumn", props);
  setProperty(budgetSheetName, "BigsSumHiddenCol", "getColumn", props);
  setProperty(budgetSheetName, "BudgetPredictions", "getColumn", props);
  setProperty(budgetSheetName, "BudgetPredictionsSum", "getColumn", props);
  setProperty(budgetSheetName, "DailyExpenses", "getColumn", props);
  setProperty(budgetSheetName, "DateColumn", "getRow", props);
  setProperty(budgetSheetName, "DateColumnWithCheckboxes", "getLastColumn", props);
  setProperty(budgetSheetName, "DailyHeaders", "", props);

  console.log("Budget properties rebuilt")


  //log sheet
  setProperty(logSheetName, "LogSheetHeaders", "", props);

  console.log("Log properties rebuilt")

  // predictions sheet
  setProperty(predSheetName, "PredictionSettingsHeaders", "", props);
  setProperty(predSheetName, "PredictionListLogHeaders", "", props);
  setProperty(predSheetName, "Predictions", "getRow", props);

  console.log("Prediction properties rebuilt")


  // settings sheet
  setProperty(settSheetName, "Settings", "", props);

  console.log("Settings properties rebuilt")


  // objects
  resetCatObject();
  // const predsAsObjects = getAllActivePredsAsObj();
  // setPropertyObject("predsAsObjects", predsAsObjects, props);
  // console.log(version)
  // setPropertyObject("version", version, props);
  setPropertyObject("launchSettingsApplied", settsApplied, props);

  console.log("Object properties rebuilt")
  console.log("All properties rebuilt")


}

function tryCache(sheet, range, func, ss) {

  console.log("Call for cache: [" + [sheet, range, func] + "] by: " + tryCache.caller.name)
  const cache = CacheService.getDocumentCache();
  let cachedName = sheet;
  if (range) { cachedName = makeRangeName(sheet, range) }
  if (func) { cachedName = cachedName + "/" + func }

  if (!cache) { // probably calling from outside

    const rangeName = makeRangeName(sheet, range);
    const rangeVals = ss.getRange(rangeName);
    let final = rangeVals.getValues();
    if (func == "getRow") {
      final = rangeVals.getRow();
    } else if (func == "getColumn") {
      final = rangeVals.getColumn();
    } else if (func == "getLastColumn") {
      final = rangeVals.getLastColumn();
    }
    console.log("Returning without cache: " + [sheet, range, func]);
    return final;
  }

  const cached = cache.get(cachedName);

  if (cached) {
    console.log("Returning from cache: " + cachedName)
    console.log(cached)
    //console.log(JSON.parse(cached))
    addToCacheJournal(cachedName)
    return JSON.parse(cached);
  }

  return rebuildCache(sheet, range, func);

}

function clearAllCache() {
  const scriptProps = PropertiesService.getScriptProperties();
  const cacheJournal = JSON.parse(scriptProps.getProperty("cacheJournal"));
  const cache = CacheService.getDocumentCache();

  cache.removeAll(cacheJournal);
}

function addToCacheJournal(obj) {

  // console.log("addToCacheJournal received " + obj)

  const scriptProps = PropertiesService.getScriptProperties();

  let cacheJournal = JSON.parse(scriptProps.getProperty("cacheJournal"));
  scriptProps.deleteProperty("cacheJournal");
  if (!cacheJournal) {
    cacheJournal = [];
  }
  if (cacheJournal.includes(obj)) {
    // console.log("No need to add it")
    // console.log(cacheJournal)
    scriptProps.setProperty("cacheJournal", JSON.stringify(cacheJournal));
    return;
  }
  cacheJournal.push(obj);
  console.log("Adding new cache item to the journal")
  console.log(cacheJournal)
  scriptProps.setProperty("cacheJournal", JSON.stringify(cacheJournal));
  return;
  
}

function clearCacheJournal() {
  const scriptProps = PropertiesService.getScriptProperties();
  scriptProps.deleteProperty("cacheJournal");
}

function rebuildCache(sheet, range, func) {

  const ss = getSpreadSheet();
  const cache = CacheService.getDocumentCache();
  const props = PropertiesService.getDocumentProperties();
 // const scriptProps = PropertiesService.getScriptProperties();
  const rangeName = makeRangeName(sheet, range)

  let cachedName = sheet;

  function getFromProps(name) {
    const prop = props.getProperty(name);
    if (prop) {
      console.log("Property not cached yet, caching and returning: " + name);
      cache.put(cachedName, prop, 21600);
      return JSON.parse(prop);
    }
    //console.log("Property does not exist: " + name);
    return null;
  }

  if (!range && !func) { // definitely an object property
    const prop = getFromProps(sheet);
    cache.put(sheet, JSON.stringify(prop), 21600);
    console.log("Caching and returning object property: " + sheet);
    addToCacheJournal(sheet);
    return prop;
  }

  if (range) { cachedName = rangeName };
  if (func) { cachedName = cachedName + "/" + func };

  const prop = getFromProps(cachedName);
  addToCacheJournal(cachedName);

  if (!prop) {

    const rangeVals = ss.getRange(rangeName);
    let final = rangeVals.getValues();
    if (func == "getRow") {
      final = rangeVals.getRow();
    } else if (func == "getColumn") {
      final = rangeVals.getColumn();
    } else if (func == "getLastColumn") {
      final = rangeVals.getLastColumn();
    }
    console.log("Caching and returning: " + cachedName);
    cache.put(cachedName, JSON.stringify(final), 21600);
    return final;

  } else { 
    return prop;
  };
}