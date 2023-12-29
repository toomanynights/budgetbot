/*

function replaceTimedTriggers(oldFunction, newFunction, newHour) {

  console.log("Replacing trigger: " + oldFunction + " with: " + [newFunction, newHour])
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(x => {if (x.getHandlerFunction() == oldFunction) {ScriptApp.deleteTrigger(x)}});
  
  ScriptApp.newTrigger(newFunction)
  .timeBased()
  .atHour(newHour)
  .everyDays(1)
  .create();

}


function getCellCoordinatesByContent(range, text) {
  const found = range.createTextFinder(text).matchEntireCell(true).findNext();
  return [found.getRow(), found.getColumn()]
}

function bulkReNameSubCatInLogs(subCat) {

  const logsRange = sortLogs("subcat");
  const logsValues = logsRange.getValues();
  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat();
  const subCatIndex = logHeaders.indexOf("Subcategory");

  const firstIndex = logsValues.findIndex(x => x)
  applyDataValidationByCat(cat, range)
}


function reApplyDataValidationToAll() { // startRow doesn't work, and the whole function is very suboptimal

  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat();
  const catIndex = logHeaders.indexOf("Category");
  const subCatIndex = logHeaders.indexOf("Subcategory");

  const logSheet = ss.getSheetByName(logSheetName);
  const range = logSheet.getRange("LogSheetLogValues");

  const vals = range.getValues();

  let i;
  for (i = 0; i < vals.length; i++) {
    const catCell = logSheet.getRange("LogSheetLogValues").getCell(i + 1, catIndex + 1);
    const subCatCell = logSheet.getRange("LogSheetLogValues").getCell(i + 1, subCatIndex + 1);
    if (catCell.getValue()) {
      const catCellShortName = getCatInfoByFullName(catCell.getValue(), "category", "shortName");
      applyDataValidationByCat(catCellShortName, subCatCell);
    }
  }
  console.log("Validation re-applied for " + i + "rows")
}

function replaceSubCatInAllLogs(oldSub, newSub, skipReCalc) {

  console.log("Starting replaceSubCatInAllLogs " + [oldSub, newSub])
  const logsRangeValues = tryCache(logSheetName, "LogSheetLogValues");
  const logsHeaders = tryCache(logSheetName, "LogSheetHeaders").flat().filter(Boolean);
  const subCatIndex = logsHeaders.indexOf("Subcategory");
  const dateIndex = logsHeaders.indexOf("Date");
  const appliedIndex = logsHeaders.indexOf("Applied");
  const newVals = logsRangeValues;

  let counter = 0;
  for (let i = 0; i < logsRangeValues.length; i++) {
    const newVal = logsRangeValues[i];
    if (newVal[dateIndex]) {newVal[dateIndex] = new Date(newVal[dateIndex])}; 
    if (newVal[appliedIndex]) {newVal[appliedIndex] = new Date(newVal[appliedIndex])}; 
    //console.log(newVal[subCatIndex])
    if (logsRangeValues[i][subCatIndex] == oldSub) {
      newVal[subCatIndex] = newSub;
      counter = counter + 1;
    }
    newVals[i] = newVal;
  }
  console.log(counter + " logs to rename")
  ss.getRange("LogSheetLogValues").setValues(newVals);
  rebuildCache(logSheetName, "LogSheetLogValues"); 
  if (!skipReCalc) {reCalcAllBudget("daily")};

  return true;

}

function removeTimeFromDate(dt) {
  dt = new Date(dt);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

  let settingsCached = CacheService.getUserCache().get(predSheetName + "/" + "PredictionSettingsValues");

  if (settingsCached) {
    settingsCached = transposeArray(JSON.parse(settingsCached));
    console.log("Cached: ")
    console.log(JSON.parse(settingsCached))

    settingsNew = transposeArray(rebuildCache(predSheetName, "PredictionSettingsValues"));
    console.log("Actual: ")
    console.log(settingsNew)

    if (settingsCached == settingsNew) {
      console.log("Settings were not changed, nothing to recalculate");
      return false;
    }
  }

*/
/*

function simplifyDateFormat(date) {
  return Utilities.formatDate(date, 'GMT+3', 'dd/MM/yyyy');
}

function test() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('ssId', ssId);
  Logger.log(userProperties.getProperties())
}
*/

/*

function appendRowWithNamedRange(rangeName, howMany) { // todo: deprecate. just add row BEFORE the last

  console.log("Starting appendRowWithNamedRange")
  if (!howMany) { howMany = 1 };
  const namedRanges = ss.getNamedRanges();
  for (i in namedRanges) {
    if (namedRanges[i].getName() == rangeName) {
      break;
    }
  }
  const oldRange = namedRanges[i];

  const range = oldRange.getRange();
  const sheet = range.getSheet();
  const startRow = range.getRow();
  const startCol = range.getColumn();
  const lastCol = range.getNumColumns();
  const rowsNum = range.getNumRows();
  const lastRow = range.getLastRow();

  sheet.insertRowsAfter(lastRow, howMany);
  console.log([startRow, startCol, Number(rowsNum) + howMany, Number(lastCol)])
  const newRange = sheet.getRange(startRow, startCol, Number(rowsNum) + howMany, Number(lastCol))
  oldRange.setRange(newRange);

  console.log("Finishing appendRowWithNamedRange")
  return sheet.getRange(startRow + Number(rowsNum), 1, howMany, lastCol) // TODO: this won't work if there are no checkboxes)

}

function getAllPredsByDateRange(dtStart, dtEnd) {
  if (!dtEnd) { dtEnd = dtStart };
  const predSheet = ss.getSheetByName(predSheetName);
  const predRange = predSheet.getRange("Predictions").getValues();
  const startDateSimple = removeTimeFromDate(dtStart);
  const endDateSimple = removeTimeFromDate(dtEnd);
  const predRangeFiltered = predRange.filter(x => (removeTimeFromDate(new Date(x[0])).valueOf() >= startDateSimple.valueOf()) && (removeTimeFromDate(new Date(x[0])).valueOf() <= endDateSimple.valueOf()))
  return predRangeFiltered;
}

function getActivePredByName(name) {

  const activePredictions = getAllActivePredsAsObj()
  for (const key in activePredictions) {
    if (activePredictions[key].name == name) {
      return activePredictions[key];
    }
  }
}

function protect() {
  budgetSheet.getRange('C:C').activate();
  var protection = budgetSheet.getRange('C:C').protect();
  protection.setDescription('test');

  var me = Session.getEffectiveUser();
  protection.addEditor(me);
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
};
*/

/*


function getFirstDateRow(sheet) {

  const getSheet = ss.getSheetByName(sheet);
  const lastRow = getSheet.getLastRow();
  const dateRange = getSheet.getRange(1, 1, lastRow);

  for (var i = 0; i < dateRange.getValues().length; i++) {
    const parsedDate = Date.parse(dateRange.getValues()[i]);
    if (!isNaN(parsedDate)) {
      break;
    }
  }
  return i + 1;

}

function getDateRange() {

  const startRow = getRowByDate(getSettingValue("First date"));
  const endRow = getRowByDate(new Date(getLastDate()));
  const endRowRel = endRow - startRow + 1;

  const budgetSheet = ss.getSheetByName(budgetSheetName);
  const dateRange = budgetSheet.getRange(startRow, 1, endRowRel, 1).getValues();
  return dateRange;

}

function getRowByDate(date) {

  const budgetSheet = ss.getSheetByName(budgetSheetName);
  date = date.simplify();
  const rowNum = budgetSheet.getRange("DateColumn").createTextFinder(date).matchEntireCell(true).findNext().getRow();

  return rowNum;

}


function removeLastLine(text) {
  return text.replace(/\r?\n?[^\r\n]*$/, "");
}

function getCatInfoNew(input, output) { // TODO: deprecate

  //console.log("Received request for cat info: " + [input, output])
  //const cats = tryCache(catSheetName, "Categories").flat().filter(Boolean);
  const expenseTypesObj = tryCache("CategoryObjects");
  //console.log("Array for cats built")
  const dailyCats = tryCache(catSheetName, "CatalogueDailySubs").flat().filter(Boolean);
  const dailyCatsObj = fillCatArray(dailyCats, "daily_subcat");
  //console.log("Array for subcats built")
  
  const mergedArr = [...expenseTypesObj, ...dailyCatsObj]
  let stuffToReturn = "";
  mergedArr.forEach(function (arrayItem) {
    if (Object.values(arrayItem).includes(input)) {
      //console.log("Found object: " + JSON.stringify(arrayItem))
      stuffToReturn = arrayItem[output];
    }
  });
  //stuffToReturn ? console.log("Returned " + stuffToReturn) : console.log("Nothing to return");
  return stuffToReturn;

}

function removeBigExpFromCell(cellValue, text) {

  const arr = cellValue.split(" | ");

  if (cellValue == text) {
    return "";
  } else if (!arr[1]) {
    return "ERROR!";
  } else {
    const index = arr.indexOf(text);
    if (index > -1) {
      arr.splice(index, 1);
      const arrNew = arr.join(" | ");
      return arrNew;
    } else {
      return "ERROR!"
    }
  }
}

function processPredSheetChanges(changedRow, changedColumn, oldValue, newValue) {

  const settingsValuesRange = predSheet.getRange("PredictionSettingsValues");
  const predictionsValuesRange = predSheet.getRange("Predictions");
  const predictionsHeaders = predSheet.getRange("PredictionSettingsHeaders");

  if (changedRow <= settingsValuesRange.getLastRow()) { // settings were changed

    const changedRowValues = predSheet.getRange(1, changedColumn, settingsValuesRange.getLastRow(), 1).getValues();
    const changedCell = predSheet.getRange(changedRow, changedColumn);

    const chName = changedRowValues[0][0]; // todo: replace ALL with variables
    const chSum = changedRowValues[1][0];
    const chType = changedRowValues[2][0];
    const chStartDate = new Date(changedRowValues[3][0]);
    const chPeriod = Number(changedRowValues[4][0]);
    const chStatus = changedRowValues[6][0];

    const statusRow = getCellCoordinatesByContent(predictionsHeaders, "Status")[0];

    if (changedRow == statusRow) { // status was changed

      if (chName && chSum && chType && chStartDate) { // TODO: add logic of toggling prediciton status

        const predNamesRange = predSheet.getRange("PredictionListLogHeaders");
        const nameCol = getCellCoordinatesByContent(predNamesRange, "Paid off?")[1];

        switch (newValue) {

          case "active": // prediction got activated
            const dateRange = getDateRange();
            const sameNamedPreds = predSheet.getRange("PredictionsNamesList").getValues()[0].filter(x => x == chName).length;

            if (sameNamedPreds > 1) {
              displayToast("Hold on!", "This one exists already. A bit more creativity please!", 5)
              predSheet.getRange(changedRow, changedColumn).setValue(oldValue);
            } else {

              for (var i = 0; i < dateRange.length; i++) {

                const currDate = new Date(dateRange[i]);
                switch (chType) { // these cases differ not in the actions, but in conditions

                  case "Once":
                    if (currDate.valueOf() == chStartDate.valueOf()) {
                      appendRowWithNamedRange("Predictions").setValues([[currDate, chName, chSum, "FALSE", "", ""]]);
                    };
                    break;

                  case "Monthly":
                    if (chStartDate.getDate() == currDate.getDate() && (chStartDate.valueOf() <= currDate.valueOf())) { // protection from creating predictions before their start time
                      appendRowWithNamedRange("Predictions").setValues([[currDate, chName, chSum, "FALSE", "", ""]]);
                    };
                    break;

                  case "Periodic":
                    if (chPeriod && (typeof chPeriod == "number") && chPeriod > 0) {
                      if (currDate.valueOf() == chStartDate.valueOf()) { // creating first prediction at starting day
                        appendRowWithNamedRange("Predictions").setValues([[currDate, chName, chSum, "FALSE", "", ""]]);

                      } else if (currDate.valueOf() > chStartDate.valueOf()) { // protection from creating predictions before their start time; strict because equality was processed already
                        const dateDiff = Math.abs(diffInDays(chStartDate, currDate));
                        const remainder = dateDiff % chPeriod;
                        if (remainder == 0) {
                          appendRowWithNamedRange("Predictions").setValues([[currDate, chName, chSum, "FALSE", "", ""]]);
                        }
                      }

                    } else {
                      changedCell.setValue(oldValue);
                      displayToast("Pun time", "This doesn't look good without a correct period - just like this sentence", 7)
                    }
                    break;

                  default:
                    changedCell.setValue(oldValue);
                    displayToast("That's a no", "Inventive, but let's stick with existing types.", 5);
                }
              }
              reCalcByDateRange("prediction", chStartDate, getLastDate());
            }

            break; // this works; now pausing and removing, auto-pause when existing prediction is changed, and extra function to recalculate the list
          case "paused":
            const preds = predSheet.getRange("Predictions");
            const predsValues = preds.getValues();
            const offset = Number(predNamesRange.getRow());

            for (i = predsValues.length - 1; i >= 0; i--) { // WORKS. But I also need to recalculate predictions on Budget sheet when they get removed

              if ((predsValues[i].includes(chName)) && !predsValues[i][nameCol - 1]) {
                predSheet.deleteRow(Number(i) + offset + 1);
              }
            }
          case "removed":

        }
        sortPredictions();

      } else {
        console.log("Some data is missing. Not proceeding.");
        predSheet.getRange(statusRow, changedColumn).setValue("paused"); // todo: add notification
      }


    } else if (chStatus == "active") { // something else was changed while status wasn't paused

      const dateRow = getCellCoordinatesByContent(predictionsHeaders, "Start")[0];
      if (changedRow == dateRow) {
        changedCell.setValue(ValueToDate(oldValue)); // it doesn't work straight away due to validation rules
      } else {
        changedCell.setValue(oldValue);
      }
      //changedCell.setValue(oldValue); // it doesn't work straight away due to validation rules
      predSheet.getRange(statusRow, changedColumn).setValue("paused"); // like this for now. should launch the whole pausing process instead...

    }

  } else if (changedRow >= predictionsValuesRange.getRow()) { //prediction logs were changed

    const headers = predSheet.getRange("PredictionListLogHeaders").getValues().flat().filter(Boolean);
    const datePlannedCol = headers.indexOf("Date");
    const predNameCol = headers.indexOf("Name");
    const sumPlannedCol = headers.indexOf("Sum");
    const statusCol = headers.indexOf("Paid off?");
    const dateFactCol = headers.indexOf("Date (fact.)")
    const sumFactCol = headers.indexOf("Sum (fact.)")

    if (changedColumn == statusCol + 1) {
      const changedLine = predSheet.getRange(changedRow, 1, 1, headers.length + 1);
      let changedLineValues = changedLine.getValues()[0];

      if (newValue == "TRUE") {

        if (!changedLineValues[dateFactCol]) { changedLineValues[dateFactCol] = today.simplify() };
        if (!changedLineValues[sumFactCol]) { changedLineValues[sumFactCol] = changedLineValues[sumPlannedCol] };

      } else if (newValue == "FALSE") {

        changedLineValues[dateFactCol] = "";
        changedLineValues[sumFactCol] = "";

      }
      changedLine.setValues([changedLineValues]);

      // also need to add actual adding / removing of the expense

    }
  }
}

function processPredSheetChangesNew(changedRow, changedColumn, oldValue, newValue) {

  const settingsHeaders = transposeArray(predSheet.getRange("PredictionSettingsHeaders").getValues()).flat().filter(Boolean);
  const settingsValues = transposeArray(predSheet.getRange("PredictionSettingsValues").getValues());
  const predictionsHeaders = predSheet.getRange("PredictionListLogHeaders").getValues().flat().filter(Boolean);
  const predictionsValues = predSheet.getRange("Predictions").getValues();

  if (changedRow <= settingsValues[0].length) { // settings were changed

    const changedRowValues = settingsValues[changedColumn - 2];

    const nameIndex = settingsHeaders.indexOf("Name");
    const sumIndex = settingsHeaders.indexOf("Sum");
    const typeIndex = settingsHeaders.indexOf("Type");
    const startDateIndex = settingsHeaders.indexOf("Start");
    const periodIndex = settingsHeaders.indexOf("Period");
    const catIndex = settingsHeaders.indexOf("Category");
    const statusIndex = settingsHeaders.indexOf("Status");

    if (changedRow == statusIndex + 1) { // status was changed
      if (changedRowValues[nameIndex] && changedRowValues[sumIndex] && changedRowValues[typeIndex] && changedRowValues[startDateIndex] && changedRowValues[catIndex]) {
        switch (newValue) {

          case "active":
            const dateRange = getDateRange();
            const samePreds = settingsValues.filter(x => x[nameIndex] == changedRowValues[nameIndex]).length;

            if (samePreds > 1) {
              displayToast("Hold on!", "This one exists already. A bit more creativity please!", 5)
              predSheet.getRange(changedRow, changedColumn).setValue(oldValue);

            } else {
              dateLoop: for (var i = 0; i < dateRange.length; i++) {
                const currDate = new Date(dateRange[i]);
                switch (changedRowValues[typeIndex]) { // these cases differ not in the actions, but in conditions

                  case "Once":
                    if (currDate.valueOf() == changedRowValues[startDateIndex].valueOf()) {
                      appendRowWithNamedRange("Predictions").setValues([[currDate.simplify(), changedRowValues[nameIndex], changedRowValues[sumIndex], "FALSE", "", ""]]);
                    };
                    break;

                  case "Monthly":
                    if (changedRowValues[startDateIndex].getDate() == currDate.getDate() && (changedRowValues[startDateIndex].valueOf() <= currDate.valueOf())) { // protection from creating predictions before their start time
                      appendRowWithNamedRange("Predictions").setValues([[currDate.simplify(), changedRowValues[nameIndex], changedRowValues[sumIndex], "FALSE", "", ""]]);
                    };
                    break;

                  case "Periodic":
                    periodIndex
                    if ((changedRowValues[periodIndex]) && typeof (changedRowValues[periodIndex]) == "number" && (changedRowValues[periodIndex] > 0)) {
                      if (currDate.valueOf() == changedRowValues[startDateIndex].valueOf()) { // creating first prediction at starting day
                        appendRowWithNamedRange("Predictions").setValues([[currDate.simplify(), changedRowValues[nameIndex], changedRowValues[sumIndex], "FALSE", "", ""]]);

                      } else if (currDate.valueOf() > changedRowValues[startDateIndex].valueOf()) { // protection from creating predictions before their start time; strict because equality was processed already
                        const dateDiff = Math.abs(diffInDays(changedRowValues[startDateIndex], currDate));
                        const remainder = dateDiff % chPeriod;
                        if (remainder == 0) {
                          appendRowWithNamedRange("Predictions").setValues([[currDate.simplify(), changedRowValues[nameIndex], changedRowValues[sumIndex], "FALSE", "", ""]]);
                        }
                      }

                    } else {
                      predSheet.getRange(changedRow, changedColumn).setValue(oldValue);
                      displayToast("Pun time", "This doesn't look good without a correct period - just like this sentence", 7);
                      break dateLoop;
                    }
                    break;
                }
              }
            }
            break;
          case "paused":
          case "removed":

        }
        sortPredictions();
      }

    }

  }
}

function reCalcMain(dt, dtFin) {

    const startDateRow = getRowByDate(dt);
    const rowsToProcess = getRowByDate(dtFin) - startDateRow + 1; // to make start and end dates inclusive
    const mainRangeValues = budgetSheet.getRange(startDateRow, 1, rowsToProcess, bigStartCol).getValues();
    const logRangeValues = expenseLogs.getValues();
  
    budgetSheet.getRange(startDateRow, dailyStartCol, rowsToProcess, dailyCats.length).clearContent(); // daily expenses
    budgetSheet.getRange(startDateRow, bigStartCol, rowsToProcess).clearContent();  // bigs
    budgetSheet.getRange(startDateRow, budgetPredCol, rowsToProcess).clearContent();; // preds
    budgetSheet.getRange(startDateRow, bigsSumCol, rowsToProcess).clearContent();; // bigs sum
    budgetSheet.getRange(startDateRow, predsSumCol, rowsToProcess).clearContent();; // preds sum
  
  
    for (i in mainRangeValues) {
  
      const currDate = removeTimeFromDate(new Date(mainRangeValues[i][0]));
      const predRow = Number(i) + startDateRow;
      const predCell = budgetSheet.getRange(predRow, budgetPredictionsRange.getColumn())
      console.log("Checking date: " + currDate + " with prediction row: " + predRow);
  
      //adding everything from bot log
      const logsFiltered = logRangeValues.filter(x => removeTimeFromDate(new Date(x[0])).valueOf() == currDate.valueOf())
      for (x in logsFiltered) { // TODO: maybe make updateCellValue accept arrays instead?
  
        const currCat = logsFiltered[x][1]; // TODO: replace with variables
        const currSubCat = logsFiltered[x][2];
        const currVal = logsFiltered[x][3];
        const currStatus = logsFiltered[x][6];
  
        const currCatShort = getCatInfoNew(currCat, "shortName")
        const currSubCatShort = getCatInfoNew(currSubCat, "shortName") || currSubCat;
  
        if (!currStatus) {
          updateCellValue(currCatShort, currSubCatShort, currVal, currDate, "add");
        }
      }
  
      // adding only active predictions
      const predictionsByDate = getAllPredsByDateRange(currDate);
      const predictionStatusCol = getCellCoordinatesByContent(predListLogHeaders, "Paid off?")[1];
      const predictionNameCol = getCellCoordinatesByContent(predListLogHeaders, "Name")[1];
      const predictionSumCol = getCellCoordinatesByContent(predListLogHeaders, "Sum")[1];
      const predictionDateCol = getCellCoordinatesByContent(predListLogHeaders, "Date")[1];
      const predictionFactDateCol = getCellCoordinatesByContent(predListLogHeaders, "Date (fact.)")[1];
      const predictionFactSumCol = getCellCoordinatesByContent(predListLogHeaders, "Sum (fact.)")[1];
  
      for (a in predictionsByDate) {
  
        if (predictionsByDate[a][predictionStatusCol - 1]) { // this prediction is resolved
          const predType = getPredInfoByName(predictionsByDate[a][predictionNameCol - 1], "Category");
          switch (predType) {
            case "Income":
              updateCellValue("prediction", null, predictionsByDate[a][predictionFactSumCol - 1], predictionsByDate[a][predictionFactDateCol - 1], "add");
              break;
            case "Expense":
              updateCellValue("prediction", null, predictionsByDate[a][predictionFactSumCol - 1], predictionsByDate[a][predictionFactDateCol - 1], "sub");
          }
  
        } else { // this prediction is unresolved
          updateCellValue("prediction", predictionsByDate[a][predictionNameCol - 1], predictionsByDate[a][predictionSumCol - 1], predictionsByDate[a][predictionDateCol - 1], "add");
        }
      }
  
      // applying prediction rich value
      predCell.setRichTextValue(buildRichTextPredictionsByDate(currDate))
  
    }
  }
  
  function updateCellValue(cat, subCat, val, date, type) {
  
      // It accepts SHORT cat names!
      val = Number(val)
      const rowNum = getRowByDate(date);
      const colNum = getCatInfoNew(cat, "column") || getCatInfoNew(subCat, "column");
      console.log("Updating cell value: " + [rowNum, colNum, cat, subCat, val, date])
      const cell = budgetSheet.getRange(rowNum, colNum);
      const cellValue = cell.getValue();
      const subCatFullName = getCatInfoNew(subCat, "fullName");
      const expText = getCatInfoNew(cat, "emoji") + " " + subCat + ": " + val; // only needed for bigs
      const currBigsRange = budgetSheet.getRange(rowNum, budgetBigsSum.getColumn());
      const currBigsVal = Number(currBigsRange.getValue());
      const currPredsRange = budgetSheet.getRange(rowNum, budgetPredsSum.getColumn());
      const currPredsVal = Number(currPredsRange.getValue());
      const currPredVisual = budgetSheet.getRange(rowNum, budgetPredictionsRange.getColumn())
    
      switch (type) {
    
        case "add": // adding
    
          if (cat.startsWith("big")) { // same operation for both big types
    
            if (cellValue) {
              cell.setValue(cellValue + " | " + expText);
            } else {
              cell.setValue(expText);
            };
    
            if (cat == "big_expense") {
              currBigsRange.setValue(currBigsVal - val)
            } else if (cat == "big_earning") {
              currBigsRange.setValue(currBigsVal + val)
            }
          } else if (cat == "daily") {
    
            cell.setValue(Number(cellValue) + val);
    
          } else if (cat == "prediction") {
    
            if (subCat) { // there is subcategory = treat it as prediction
              const predType = getPredInfoByName(subCat, "Category");
              switch (predType) {
                case "Income":
                  currPredsRange.setValue(currPredsVal + val);
                  currPredVisual.setRichTextValue(buildRichTextPredictionsByDate(date));
                  break;
                case "Expense":
                  currPredsRange.setValue(currPredsVal - val);
                  currPredVisual.setRichTextValue(buildRichTextPredictionsByDate(date));
              }
            } else { // there is NO subcategory - treat it as big!
              currBigsRange.setValue(currBigsVal + val);
            }
          }
          break;
    
        case "sub": //subsctracting
          if (cat.startsWith("big")) { // same operation for both big types
    
            cell.setValue(removeBigExpFromCell(cellValue, expText));
    
            if (cat == "big_expense") {
              currBigsRange.setValue(currBigsVal + val)
            } else if (cat == "big_earning") {
              currBigsRange.setValue(currBigsVal - val)
            }
    
          } else if (cat == "daily") {
    
            cell.setValue(Number(cellValue) - val);
    
          } else if (cat == "prediction") {
    
            if (subCat) { // there is subcategory = treat it as prediction
              const predType = getPredInfoByName(subCat, "Category");
              switch (predType) {
                case "Income":
                  currPredsRange.setValue(currPredsVal - val);
                  currPredVisual.setRichTextValue(buildRichTextPredictionsByDate(date));
                  break;
                case "Expense":
                  currPredsRange.setValue(currPredsVal + val);
                  currPredVisual.setRichTextValue(buildRichTextPredictionsByDate(date));
              }
            } else { // there is NO subcategory - treat it as big!
              currBigsRange.setValue(currBigsVal - val);
            }
          }
      }
    
    }
  
    function buildRichTextPredictionsByDate(dt) { 
  
      const predArr = predSheet.getRange("Predictions").getValues();
      const dtSimple = removeTimeFromDate(dt);
      const currentPreds = predArr.filter(x => diffInDays(x[0], dtSimple) == 0);
    
      const predUnresolved = SpreadsheetApp.newTextStyle().setStrikethrough(false).setFontSize(9).build();
      const predResolved = SpreadsheetApp.newTextStyle().setStrikethrough(true).setFontSize(9).build();
      let richText = SpreadsheetApp.newRichTextValue();
      let textArr = [];
    
      for (i in currentPreds) { // building array of predictions
    
        const emoji = getCatInfoNew("prediction", "emoji");
        const text = currentPreds[i][1]; //todo: replace with variable
        const sum = currentPreds[i][2]; //todo: replace with variable
        const preppedValue = emoji + " " + text + ": " + sum;
        textArr.push(preppedValue);
      }
    
      richText = richText.setText(textArr.join(" | "));
      let currOffset = 0;
    
      for (i in textArr) {
    
        const status = currentPreds[i][3]; //todo: replace with variable
        const itemText = textArr[i];
        const textLength = itemText.length;
        const offsetBefore = (i == 0) ? 0 : 3;
        const offsetAfter = (i == (textArr.length - 1)) ? 0 : 3;
    
        richText = richText.setTextStyle(currOffset + offsetBefore, textLength + offsetBefore + currOffset, (status ? predResolved : predUnresolved));
        currOffset = currOffset + textLength + offsetBefore;
      }
    
      richText = richText.build();
      return richText;
    }
    */
    