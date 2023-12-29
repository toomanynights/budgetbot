function addExpense(cat, subCat, val, date, id, obj) {

  // accepts SIMPLE date
  console.log("addExpense received: " + [cat, subCat, val, date])
  const newDate =  date.simpleToDate();
  const spreadsheet = getSpreadSheet(id);
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const scriptTimeZone = Session.getScriptTimeZone()
  // const simpleDate = toUsersTimezone(newDate, spreadsheet, timezone, true)
  const catsObject = obj ? obj : tryCache("CategoryObjects");
  const logSheet = spreadsheet.getSheetByName(logSheetName);
  let logsHeaders = id ? logSheet.getRange("LogSheetHeaders").getValues() : tryCache(logSheetName, "LogSheetHeaders");
  logsHeaders = logsHeaders.flat().filter(Boolean);
  const subCatIndex = logsHeaders.indexOf("Subcategory");
  const catFullName = catsObject[cat].fullName;
  const subCatFullName = catsObject[cat].subCats[subCat] ? catsObject[cat].subCats[subCat].fullName : subCat;
  
  const currLastRowRange = extendRangeByEmptyRows(logSheetName, "LogSheetLogValues", 11, spreadsheet); 
  const currLastRow = currLastRowRange.getRow();
  applyDataValidationByCat(cat, logSheet.getRange(currLastRow, subCatIndex + 1), spreadsheet, obj);
  clearDataValidation(currLastRow + 1, spreadsheet);
  currLastRowRange.setValues([[DateToValue(newDate), catFullName, subCatFullName, val, true, toUsersTimezone(today, spreadsheet, timezone, true), false]]);

  if (!id) {rebuildCache(logSheetName, "LogSheetLogValues")};
  if (cat == "prediction") {reCalcByDateRange("big_expense", newDate, "", "", spreadsheet, obj)}  // no need to recalc prediction here - already done in submitPrediction
  else {reCalcByDateRange(cat, newDate, "", "", spreadsheet, obj)};

}

function processLogChanges(changedRow, changedColumn, oldValue, newValue, changedSheet) {

  const ss = changedSheet;
  const logSheet = ss.getSheetByName(logSheetName);
  const changedRowRange = logSheet.getRange(changedRow, 1, 1, logSheet.getLastColumn());
  const changedRowValues = changedRowRange.getValues().flat();
  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat();

  const chDateIndex = logHeaders.indexOf("Date");
  const chCatIndex = logHeaders.indexOf("Category");
  const chSubcatIndex = logHeaders.indexOf("Subcategory");
  const chValueIndex = logHeaders.indexOf("Sum");
  const chStatusIndex = logHeaders.indexOf("Delete");
  const catObjects = tryCache("CategoryObjects");
  //const catShort = getCatInfoByFullName(changedRowValues[chCatIndex], "category", "shortName");


  if (changedColumn == logHeaders.indexOf("Category") + 1) { // change of cat

    if (newValue == catObjects.prediction.fullName) {
      const changedRange = logSheet.getRange(changedRow, changedColumn);
      changedRange.setValue(oldValue);
      displayError("I won't be able to connect this expense with a predicton from here. Go ahead and add it from 'Planned expenses' sheet!");
      return;
    }

    const subCatCell = changedRowRange.getCell(1, logHeaders.indexOf("Subcategory") + 1);
    subCatCell.clearContent();
    const catShort = getCatInfoByFullName(changedRowValues[chCatIndex], "category", "shortName");
    applyDataValidationByCat(catShort, subCatCell);

    const oldCat = getCatInfoByFullName(oldValue, "category", "shortName");
    if (changedRowValues[chDateIndex] && changedRowValues[chCatIndex] && changedRowValues[chSubcatIndex] && changedRowValues[chValueIndex]) {
      refreshAppliedDate(changedRow);
      reCalcByDateRange([oldCat], changedRowValues[chDateIndex]); // this is needed - otherwie old cat is not recalculated
    }

  }

  if (changedRowValues[chDateIndex] && changedRowValues[chCatIndex] && changedRowValues[chSubcatIndex] && changedRowValues[chValueIndex]) { // making sure all necessary data is present

    const predFullName = catObjects.prediction.fullName;
    const subCatCell = changedRowRange.getCell(1, logHeaders.indexOf("Subcategory") + 1);

    if ((changedRowValues[chCatIndex] == predFullName) && (changedRowValues[chStatusIndex])) {
      const changedRange = logSheet.getRange(changedRow, changedColumn);
      changedRange.setValue(oldValue);
      displayError("Predictions should only go into the log, not out. Remove it from 'Planned expenses' sheet!");
      return;
    }
    
    const catShort = getCatInfoByFullName(changedRowValues[chCatIndex], "category", "shortName");
    applyDataValidationByCat(catShort, subCatCell);
    
    refreshAppliedDate(changedRow);
    if (changedColumn == chDateIndex + 1) { 
      reCalcByDateRange([catShort], changedRowValues[chDateIndex], ValueToDate(oldValue), true);
    } else {
      reCalcByDateRange([catShort], changedRowValues[chDateIndex], new Date(toUsersTimezone(changedRowValues[chDateIndex], ss, "", "iso8601")), true);
    }
    //sortLogs();

    const checkExistance = checkIfFullSubCatExistsInObject(changedRowValues[chSubcatIndex]);
    if (!checkExistance) {
      console.log(changedRowValues[chSubcatIndex] + " seems to be a new subcat! Adding to catalogue")
      addSubCatToCatalogue("", subCat, catShort)
      //resetCatObject();
    } else {console.log(changedRowValues[chSubcatIndex] + " exists in " + checkExistance)}

  } else {
    Logger.log("Some data is missing. Not proceeding.")
  }
}

function clearDataValidation(startRow, spreadsheet) {

  const ss = spreadsheet ? spreadsheet : getSpreadSheet();
  const logSheet = ss.getSheetByName(logSheetName);
  let logsHeaders = spreadsheet ? logSheet.getRange("LogSheetHeaders").getValues() : tryCache(logSheetName, "LogSheetHeaders");
  logsHeaders = logsHeaders.flat().filter(Boolean);
  const subCatCol = logsHeaders.indexOf("Subcategory");
  const rows = logSheet.getMaxRows();

  const rowsToProcess = rows - startRow + 1;
  const range = logSheet.getRange(startRow, subCatCol + 1, rowsToProcess, 1);
  range.clear({validationsOnly: true});

}

function applyDataValidationByCat(cat, range, spreadsheet, obj) {

  const ss = spreadsheet ? spreadsheet : SpreadsheetApp.getActiveSpreadsheet();
  const catSheet = ss.getSheetByName(catSheetName);
  const catsObject = obj ? obj : tryCache("CategoryObjects");
  const cats = Object.keys(catsObject);
  const catFullName = catsObject[cat].fullName;
  const catRowNum = catsObject[cat].listPosition + 2; 
  const validDonor = catSheet.getRange(catRowNum, 2);

  console.log("applyDataValidationByCat: " + [catRowNum, catFullName, cats])

  validDonor.copyTo(range, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  if (!spreadsheet) {rebuildCache(logSheetName, "LogSheetLogValues")};
}

function refreshAppliedDate(row) {

  const ss = getSpreadSheet();
  const logSheet = ss.getSheetByName(logSheetName);
  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat();
  const appliedDateIndex = logHeaders.indexOf("Applied");

  logSheet.getRange(row, appliedDateIndex + 1).setValue(today);
}

function sortLogs(type, spreadsheet) {

  const ss = spreadsheet ? spreadsheet : getSpreadSheet();
  const logHeaders = spreadsheet ? spreadsheet.getRange(makeRangeName(logSheetName, "LogSheetHeaders")).getValues().flat() : tryCache(logSheetName, "LogSheetHeaders").flat();
  const sortFirstIndex = logHeaders.indexOf("Date");
  const sortSecondIndex = logHeaders.indexOf("Applied");
  const subCatIndex = logHeaders.indexOf("Subcategory");
  
  const logSheet = ss.getSheetByName(logSheetName);
  const logs = logSheet.getRange("LogSheetLogValues");
  if (!type || type == "default") {
    logs.sort([{ column: sortFirstIndex + 1, ascending: true }, { column: sortSecondIndex + 1, ascending: true }]);
  }
  if (type == "subcat") {
    logs.sort([{ column: subCatIndex + 1, ascending: true }]);
  }

  if (!spreadsheet) {rebuildCache(logSheetName, "LogSheetLogValues")};
  return logs;

}

function findLogRow(date, type, subtype, sum, spreadsheet) {

  // ISO dates
  date = new Date(date);
  const ss = spreadsheet ? spreadsheet : getSpreadSheet();
  const timezone = ss.getSpreadsheetTimeZone();
  const logsRange = ss.getRange(makeRangeName(logSheetName, "LogSheetLogValues"));
  const logsRangeValues = logsRange.getValues();
  let logsHeaders = spreadsheet ? spreadsheet.getRange(makeRangeName(logSheetName, "LogSheetHeaders")).getValues() : tryCache(logSheetName, "LogSheetHeaders");
  logsHeaders = logsHeaders.flat().filter(Boolean);

  const dateIndex = logsHeaders.indexOf("Date");
  const catIndex = logsHeaders.indexOf("Category");
  const subCatIndex = logsHeaders.indexOf("Subcategory");
  const sumIndex = logsHeaders.indexOf("Sum");
  logsRangeValues.forEach((x, i) => logsRangeValues[i][dateIndex] = new Date(toUsersTimezone(x[dateIndex], ss, timezone, "iso8601")))
  console.log(logsRangeValues)

  for (i = 0; i < logsRangeValues.length; i++) {
    const currDate = logsRangeValues[i][dateIndex];
    if ((diffInDays(currDate, date) == 0) && (logsRangeValues[i][catIndex] == type) && (logsRangeValues[i][subCatIndex] == subtype) && (logsRangeValues[i][sumIndex] == sum)) {
      console.log(logsRange.offset(i, 0, 1).getValues())
      return logsRange.offset(i, 0, 1);
    }
  }
  console.error("Log row not found! " + [date, type, subtype, sum])
  return null;
}

function findLogRowsQBySubCat(subCat) {

  const logVals = tryCache(logSheetName, "LogSheetLogValues");
  const logsHeaders = tryCache(logSheetName, "LogSheetHeaders").flat().filter(Boolean);
  const catIndex = logsHeaders.indexOf("Category");
  const subCatIndex = logsHeaders.indexOf("Subcategory");
  const catsObject = tryCache("CategoryObjects");
  const dailyFull = catsObject.daily.fullName;

  let counter = 0;

    for (let i = 0; i < logVals.length; i++) {
      const currLog = logVals[i];
      if ((currLog[catIndex] == dailyFull) && (currLog[subCatIndex] == subCat)) {
        counter = counter + 1;
      }
    }
    return counter;
}



function replaceSubCatInAllLogs(oldSub, newSub, skipReCalc) {

  console.log("Starting replaceSubCatInAllLogs " + [oldSub, newSub])
  const logsRange = sortLogs("subcat");
  const logsRangeValues = logsRange.getValues();
  const logsHeaders = tryCache(logSheetName, "LogSheetHeaders").flat().filter(Boolean);
  const subCatIndex = logsHeaders.indexOf("Subcategory");

  const firstIndex = logsRangeValues.findIndex(x => x[subCatIndex] == oldSub);
  const lastIndex = logsRangeValues.findLastIndex(x => x[subCatIndex] == oldSub);
  const shiftedRange = logsRange.offset(firstIndex, subCatIndex, lastIndex - firstIndex + 1, 1);
  
  const newValues = shiftedRange.getValues();
  newValues.fill([newSub]);
  shiftedRange.clearContent();
  applyDataValidationByCat("daily", shiftedRange);
  shiftedRange.setValues(newValues);

  sortLogs();
  rebuildCache(logSheetName, "LogSheetLogValues"); 
  if (!skipReCalc) {reCalcAllBudget("daily")};
  return true;

}

function getSubCatsUsage(cat, ss) {

  //console.log("getSubCatsUsage received: " + cat )

  const allLogs = tryCache(logSheetName, "LogSheetLogValues", "", ss);
  //const catShortName = getCatInfoByFullName(cat, "Category", "shortName");
  const logsHeaders = tryCache(logSheetName, "LogSheetHeaders", "", ss).flat().filter(Boolean);
  const catIndex = logsHeaders.indexOf("Category");
  const subCatIndex = logsHeaders.indexOf("Subcategory");
  const statusIndex = logsHeaders.indexOf("Delete");
  const dateIndex = logsHeaders.indexOf("Date");

  const allLogsFilteredByCat = allLogs.filter(x => x[catIndex] == cat && !x[statusIndex]);
  let mostUsedObj = {};

  allLogsFilteredByCat.map(processLogs);
  function processLogs(item) {
    const subCat = item[subCatIndex];
    const subCatInObj = mostUsedObj[subCat];
    if (subCatInObj) {
      subCatInObj.amount = subCatInObj.amount + 1;
      if (diffInDays(new Date(subCatInObj.lastUsed), new Date(item[dateIndex])) > 0) {
        subCatInObj.lastUsed = new Date(item[dateIndex]);
      }
    } else {
      mostUsedObj[subCat] = {amount: 1, lastUsed: new Date(item[dateIndex])};
    }
  }

  return mostUsedObj;
}

function getMostUsedSubCats(cat, q, offset, obj) {

  const catsObject = obj ? obj : tryCache("CategoryObjects");
  const subCats = catsObject[cat].subCats;
  let arr = [];
  for (i in subCats) {
    arr.push(subCats[i]);
  }
  if (arr) {

    arr.sort((x, y) => y.amount - x.amount ? y.amount - x.amount : y.lastUsed - x.lastUsed);

    if (!q) {q = arr.length};
    if (!offset) {offset = 0};
    if (offset) {q = q + offset};
    if (q > arr.length) {q = arr.length}
    const remaining = arr.length - q;
  
    return [arr.slice(offset, q), remaining]
  }
  return [null, 0]
}