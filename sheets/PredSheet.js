function submitPrediction(row, date, sum, id, catsObject) {

  // accepts SIMPLE date
  const spreadsheet = getSpreadSheet(id);
  // const newDate = date.simpleToDate()
  const sheet = spreadsheet.getSheetByName(predSheetName);
  const predListLogHeaders = tryCache(predSheetName, "PredictionListLogHeaders", "", spreadsheet).flat();
  const currPred = sheet.getRange(row, 1, 1, predListLogHeaders.length);
  let currPredValues = currPred.getValues();

  const dateFactIndex = predListLogHeaders.indexOf("Date (fact.)");
  const sumFactIndex = predListLogHeaders.indexOf("Sum (fact.)");
  const statusIndex = predListLogHeaders.indexOf("Paid off?");
  const nameIndex = predListLogHeaders.indexOf("Name");
  const dateOrigIndex = predListLogHeaders.indexOf("Date");

  const predName = currPredValues[0][nameIndex];

  currPredValues[0][dateFactIndex] = date;
  currPredValues[0][sumFactIndex] = sum;
  currPredValues[0][statusIndex] = true;
  currPred.setValues(currPredValues);

  reBuildPredObject(id);
  const dateForReCalc = toUsersTimezone(currPredValues[0][dateOrigIndex], spreadsheet, "", "iso8601")
  addExpense("prediction", predName, sum, date, id, catsObject);
  reCalcByDateRange("prediction", new Date(dateForReCalc), "", "", spreadsheet, catsObject);
  // reCalcByDateRange("big_expense", new Date(date), "", "", spreadsheet, catsObject);
  if (!spreadsheet) { rebuildCache(predSheetName, "Predictions") };
  sortPredictions("", spreadsheet);


}

function predictionsRemove(name, values, timezone) {

  console.log("Removing all active predictions: " + name);
  const predictionsHeaders = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);

  if (values.length == 0) {
    console.log("There are no predictions. Halt");
    return values;
  }

  const valNameIndex = predictionsHeaders.indexOf("Name");
  const valDateIndex = predictionsHeaders.indexOf("Date");
  const valSumIndex = predictionsHeaders.indexOf("Sum");
  const valStatusIndex = predictionsHeaders.indexOf("Paid off?");
  //const rowOffset = tryCache(predSheetName, "Predictions", "getRow");
  //values.forEach(x => x[valDateIndex] = new Date(toUsersTimezone(x[valDateIndex], "", timezone, "iso8601")));
  const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))

  let delCounter = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if ((values[i][valNameIndex] == name) && !values[i][valStatusIndex] && diffInDays(values[i][valDateIndex], todayForUser) <= 0) {

      console.log("Deleting prediction: " + [values[i][valNameIndex], values[i][valDateIndex], values[i][valSumIndex]]);
      //sheet.deleteRow(rowOffset + i);
      values.splice(i, 1);
      delCounter++;

    }
  }
  delCounter ? console.log("Deleted " + delCounter + " predictions") : console.log("Nothing to delete");
  return values;
}

function predictionsFill(name, sum, type, category, date, period, values, oldValues, timezone, todayForUser) {

  // accepts true dates or ISO
  console.log("Filling predictions for: " + [name, sum, type, date, period]);
  date = new Date(date);
  let currDate = new Date(date);
  const firstDate = getSettingValue("First date").simpleToDate();
  const lastDate = getLastDate();
  const predictionsHeaders = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);
  //const values = sheet.getRange("Predictions").getValues();
  const valNameIndex = predictionsHeaders.indexOf("Name");
  const valCategoryIndex = predictionsHeaders.indexOf("Category");
  const valDateIndex = predictionsHeaders.indexOf("Date");
  const valSumIndex = predictionsHeaders.indexOf("Sum");
  const valStatusIndex = predictionsHeaders.indexOf("Paid off?");

  let predictionsValuesFiltered = [];
  let predictionsOldValuesFiltered = [];
  if (values.length > 0) {
    predictionsValuesFiltered = values.filter(x => x[valNameIndex] == name);
  } else { predictionsValuesFiltered = values };
  if (oldValues.length > 0) {
    predictionsOldValuesFiltered = oldValues.filter(x => x[valNameIndex] == name);
  } else { predictionsOldValuesFiltered = oldValues };
  //const valsToFillWith = [];
  let addCounter = 0;


  function addPred(dt) {

    dt = new Date(dt);
    if (predictionsValuesFiltered.length > 0) {
      // let predictionsSameDate = predictionsValuesFiltered.filter(x => x[valDateIndex].clearTime().valueOf() == dt.valueOf());
      let predictionsSameDate = predictionsValuesFiltered.filter(x => diffInDays(x[valDateIndex], dt) == 0);
      if (predictionsSameDate.length > 0) {
        console.log("Prediction not added: already exists " + predictionsSameDate);
        return;
      }
    }
    if (predictionsOldValuesFiltered.length > 0) {
      // let predictionsSameDate = predictionsOldValuesFiltered.filter(x => x[valDateIndex].clearTime().valueOf() == dt.valueOf());
      let predictionsSameDate = predictionsOldValuesFiltered.filter(x => diffInDays(x[valDateIndex], dt) == 0);
      if (predictionsSameDate.length > 0) {
        console.log("Prediction not added: already exists in old predictions " + predictionsSameDate);
        return;
      }
    }

    if ((dt.valueOf() < firstDate.valueOf()) || (dt.valueOf() > lastDate.valueOf())) {
      // console.log("Prediction not added: it's out of range " + [dt.simplify(), firstDate.simplify(), lastDate.simplify()]);
      console.log("Prediction not added: it's out of range " + [toUsersTimezone(dt, "", timezone), toUsersTimezone(firstDate, "", timezone), toUsersTimezone(lastDate, "", timezone)]);
      console.log([dt, firstDate])
      return;
    }
    // if (dt.valueOf() < today.clearTime().valueOf()) {
    //   console.log("Prediction not added: it's for the past " + [name, toUsersTimezone(dt, "", timezone)]);
    //   return "past";
    // }

    const currArr = [];
    currArr.length = predictionsHeaders.length;
    currArr.fill("");
    //currArr[valDateIndex] = toUsersTimezone(dt, "", timezone);
    currArr[valDateIndex] = dt;
    currArr[valNameIndex] = name;
    currArr[valSumIndex] = sum;
    currArr[valCategoryIndex] = category;
    currArr[valStatusIndex] = false;

    values.push(currArr);
    console.log("Prediction added: " + currArr);
    addCounter = addCounter + 1;

    if (dt.valueOf() < todayForUser.valueOf()) {
      console.log("Prediction not added: is for the past " + dt);
      return "past";
    }
    return;

  }

  switch (type) {

    case "Once":
      const result = addPred(date);
      if (result == "past") { changePredStatusByName(name, "paused", false) };
      break;

    case "Monthly":
      while (diffInDays(currDate, lastDate) >= 0) {
        let dt = new Date(currDate);
        addPred(dt);
        dt = new Date(dt.setMonth(dt.getMonth() + 1));
        currDate = new Date(dt);
      }
      break;

    case "Periodic":
      while (diffInDays(currDate, lastDate) >= 0) {
        let dt = new Date(currDate);
        addPred(dt);
        //dt = new Date(dt.setDate(dt.getDate() + period));
        currDate = new Date(dt).addDays(period);
      }
      break;

    case "Yearly":
      while (diffInDays(currDate, lastDate) >= 0) {
        let dt = new Date(currDate);
        addPred(dt);
        dt = new Date(dt.setFullYear(dt.getFullYear() + 1));
        currDate = new Date(dt);
      }
      break;
  }

  if (addCounter) {
    console.log("Added " + addCounter + " values");
  } else { console.log("Nothing to add") };
  //changePredStatusByName(name, "paused", false) };
  return values;

}

function reCalcPredictions(predName) {

  console.log("Recalculating predictions...")
  const ss = getSpreadSheet();
  const timezone = ss.getSpreadsheetTimeZone();
  const sheetId = ss.getId();
  const sheet = ss.getSheetByName(predSheetName);
  const settingsHeaders = transposeArray(tryCache(predSheetName, "PredictionSettingsHeaders")).flat().filter(Boolean);
  let settingsRange = sheet.getRange("PredictionSettingsValues");
  let settingsValues = transposeArray(settingsRange.getValues());
  settingsRange.clearNote();
  const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))

  const settNameIndex = settingsHeaders.indexOf("Name");
  const settSumIndex = settingsHeaders.indexOf("Sum");
  const settTypeIndex = settingsHeaders.indexOf("Type");
  const settStartDateIndex = settingsHeaders.indexOf("Start");
  const settPeriodIndex = settingsHeaders.indexOf("Period");
  const settCatIndex = settingsHeaders.indexOf("Category");
  const settStatusIndex = settingsHeaders.indexOf("Status");

  const predictionsHeaders = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);
  const valNameIndex = predictionsHeaders.indexOf("Name");
  const valDateIndex = predictionsHeaders.indexOf("Date");
  const valSumIndex = predictionsHeaders.indexOf("Sum");
  const valStatusIndex = predictionsHeaders.indexOf("Paid off?");

  const valuesRange = sortPredictions(true);
  const valRow = tryCache(predSheetName, "Predictions", "getRow");
  const valLastRow = sheet.getMaxRows();
  const initValues = valuesRange.getValues();
  initValues.forEach(x => { if (x[valDateIndex]) { x[valDateIndex] = new Date(toUsersTimezone(x[valDateIndex], "", timezone, "iso8601")) } });
  // const oldPredictions = initValues.filter(x => x[valStatusIndex] || diffInDays(new Date(x[valDateIndex]).clearTime(), today.clearTime()) > 0);
  const oldPredictions = initValues.filter(x => x[valStatusIndex] || diffInDays(x[valDateIndex], todayForUser) > 0);
  const newPredictions = initValues.filter(x => !x[valStatusIndex] && diffInDays(x[valDateIndex], todayForUser) <= 0);

  let valuesToWorkWith = newPredictions.slice();

  let settingsValuesFiltered = settingsValues.filter(x => !x.every(y => y == ""));
  if (settingsValuesFiltered.length == 0) {
    console.log("No planned expenses, removing all upcoming ones");
    cleanUp();
    return true;
  }

  function cleanUp() {

    if (newPredictions.length > 0) {
      console.log("Cleaning content of " + newPredictions.length + " rows starting from row " + (oldPredictions.length + valRow))
      valuesRange.offset(oldPredictions.length, 0, initValues.length - oldPredictions.length).clearContent();
    }

    const range = sortPredictions(true);
    const vals = range.getValues();
    const valsEmpty = vals.filter(x => !x[0]);
    const rowsToKeep = 2;

    if (vals.length > rowsToKeep) {
      let toDelete = valsEmpty.length;
      while ((vals.length - toDelete) < rowsToKeep) { toDelete = toDelete - 1 };
      //console.log("ToDelete debug: " + [vals.length, toDelete, rowsToKeep, valLastRow, valLastRow - toDelete + 1])
      if (toDelete > 0) { sheet.deleteRows(valLastRow - toDelete + 1, toDelete) };
    }
  }

  function checkPred(index) {

    const currPlanned = settingsValuesFiltered[index];
    const currName = currPlanned[settNameIndex];
    const currIndex = settingsValues.findIndex(x => x[settNameIndex] == currName);
    console.log("Checking prediction: " + currPlanned)

    if ((!currPlanned[settNameIndex] || !currPlanned[settSumIndex] || !currPlanned[settTypeIndex] || !currPlanned[settStartDateIndex] || !currPlanned[settCatIndex])
      && (currPlanned[settStatusIndex] == "active")) {
      addCommentToPredByIndex(currIndex, "Name", "Can't activate. Check that this planned expense is filled out in full.")
      console.log("Can't proceed: some information missing " + [currPlanned[settNameIndex], currPlanned[settSumIndex], currPlanned[settTypeIndex], currPlanned[settStartDateIndex], currPlanned[settCatIndex]])
      changePredStatusByIndex(currIndex, "");
      errorCounter = errorCounter + 1;
      return;
    }

    let samePreds = settingsValues.filter(x => (x[settNameIndex] == currName) && (x[settStatusIndex] == "active"));
    if (samePreds.length > 1) {

      addCommentToPredByIndex(currIndex, "Name", "This one exists already. A bit more creativity please!")
      console.log("Attempted to create duplicate planned expense " + currPlanned[settNameIndex]);
      changePredStatusByIndex(currIndex, "");
      errorCounter = errorCounter + 1;
      settingsValuesFiltered[index][settStatusIndex] = false;
      return;

    }

    if ((currPlanned[settTypeIndex] == "Periodic") && (!currPlanned[settPeriodIndex]) && (currPlanned[settStatusIndex] == "active")) {
      addCommentToPredByIndex(currIndex, "Name", "This doesn't look good without a period - just like this sentence")
      console.log("Can't add periodic prediction without a period " + currPlanned);
      changePredStatusByIndex(currIndex, "");
      errorCounter = errorCounter + 1;
      return;
    }

    const checkExistance = checkIfCatExists(currName, "prediction", true);
    console.log(checkExistance)
    if (checkExistance[0] == "other_exists") {
      addCommentToPredByIndex(currIndex, "Name", "Better choose some other name. This one exists somewhere else: " + checkExistance[1]);
      console.log("Tried to destroy the universe: " + [currPlanned, checkExistance[1]]);
      changePredStatusByIndex(currIndex, "");
      errorCounter = errorCounter + 1;
      return;
    }

    if (currPlanned[settNameIndex] && currPlanned[settSumIndex] && currPlanned[settTypeIndex] && currPlanned[settStartDateIndex] && currPlanned[settCatIndex] && currPlanned[settStatusIndex]) { // checking that all needed values are present
      return true;
    } else {
      console.log("Some data is missing. Not proceeding.");
      return;
      //changePredStatusByName(currPlanned[settNameIndex], "");
    }

  }

  if (predName) { settingsValuesFiltered = settingsValuesFiltered.filter(x => x[settNameIndex] == predName) };
  if (settingsValuesFiltered.length == 0) {
    console.log("Can't proceed: no applicable settings " + predName);
    return;
  }
  settingsValuesFiltered.forEach(x => {if (x[settStartDateIndex]) {x[settStartDateIndex] = new Date(toUsersTimezone(x[settStartDateIndex], ss, timezone, "iso8601"))}})

  
  let predNames = [];
  const oldCatalogueArr = tryCache(catSheetName, "CataloguePlannedSubs");
  predNames.length = oldCatalogueArr.length;
  predNames.fill([""]);
  //settingsValues.forEach((x, y) => predNames[y] = x[settNameIndex]);

  let errorCounter = 0;
  let predCounter = 0;
  for (let i = 0; i < settingsValuesFiltered.length; i++) {

    const currPlanned = settingsValuesFiltered[i];
    if (checkPred(i) == true) {

      predNames[predCounter] = [currPlanned[settNameIndex]];
      predCounter = predCounter + 1;

      switch (currPlanned[settStatusIndex]) {

        case "active":
          valuesToWorkWith = predictionsRemove(currPlanned[settNameIndex], valuesToWorkWith, timezone);
          valuesToWorkWith = predictionsFill(currPlanned[settNameIndex], currPlanned[settSumIndex], currPlanned[settTypeIndex], currPlanned[settCatIndex], currPlanned[settStartDateIndex], currPlanned[settPeriodIndex], valuesToWorkWith, oldPredictions, timezone, todayForUser)
          break;

        case "paused":
          valuesToWorkWith = predictionsRemove(currPlanned[settNameIndex], valuesToWorkWith, timezone);
          break;

        case "removed":
          valuesToWorkWith = predictionsRemove(currPlanned[settNameIndex], valuesToWorkWith, timezone);
          settingsRange.offset(0, currIndex, currPlanned.length, 1).clearContent();
          break;
      }
    }
  }

  applyNewSubCatsInCatalogue(predNames, "CataloguePlannedSubs");

  // valuesToWorkWith.forEach((x, y) => valuesToWorkWith[y][valDateIndex] = toUsersTimezone(x[valDateIndex], ss, timezone));


  cleanUp();
  let dateForReCalc;

  if (valuesToWorkWith.length > 0) {

    dateForReCalc = valuesToWorkWith[0][valDateIndex];
    valuesToWorkWith.forEach((x, y) => valuesToWorkWith[y][valDateIndex] = DateToValue(x[valDateIndex]));

    extendRangeByEmptyRows(predSheetName, "Predictions", valuesToWorkWith.length);
    let offset = oldPredictions.length;

    sheet.getRange(valRow + offset, 1, valuesToWorkWith.length, valuesToWorkWith[0].length).setValues(valuesToWorkWith);
    sortPredictions();
    rebuildCache(predSheetName, "PredictionSettingsValues");
  } else {
    dateForReCalc = getSettingValue("First date").simpleToDate();
    console.log("Suddenly there are no predictions!")
  }

  reBuildPredObject(sheetId);
  reCalcByDateRange("prediction", dateForReCalc, getLastDate());

  if (errorCounter) {
    displayError("Attention citizen! You have " + errorCounter + " errors in your predictions. Pay attention to the notes. They will be cleared when you fix the errors and re-apply.")
  }

  return true;
}

function reBuildPredObject(sheetId) {

  const predsObj = getAllActivePredsAsObj(sheetId);
  const userObj = JSON.parse(getUserScriptPropertyByValue("docId", sheetId));
  const email = userObj[0];
  setUserScriptPropertyValue(email, "predsObject", predsObj);

}


function processPredSheetChangesNew(changedRow, changedColumn, oldValue, newValue, sheet, id) {

  const settingsValues = transposeArray(sheet.getRange("PredictionSettingsValues").getValues());
  const predValuesRow = tryCache(predSheetName, "Predictions", "getRow");
  const spreadsheet = getSpreadSheet(id);
  const timezone = spreadsheet.getSpreadsheetTimeZone();

  if (changedRow <= settingsValues[0].length) { // settings were changed

    applyPredChangesSidebar();

  } else if (changedRow >= predValuesRow) { // values were changed

    //const predictionsHeaders = sheet.getRange("PredictionListLogHeaders").getValues().flat().filter(Boolean);
    const predictionsHeaders = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);

    const datePlannedCol = predictionsHeaders.indexOf("Date");
    const predNameCol = predictionsHeaders.indexOf("Name");
    const sumPlannedCol = predictionsHeaders.indexOf("Sum");
    const statusCol = predictionsHeaders.indexOf("Paid off?");
    const dateFactCol = predictionsHeaders.indexOf("Date (fact.)")
    const sumFactCol = predictionsHeaders.indexOf("Sum (fact.)")

    const changedLine = sheet.getRange(changedRow, 1, 1, predictionsHeaders.length);
    let changedLineValues = changedLine.getValues()[0];

    if (changedColumn == statusCol + 1) { //changed status

      reBuildPredObject(id);

      if (newValue == "TRUE") {

        const todayForUser = new Date(toUsersTimezone(today, spreadsheet, timezone, "iso8601"))
        if (!changedLineValues[dateFactCol]) { changedLineValues[dateFactCol] = toUsersTimezone(today, spreadsheet, timezone) }
        else { changedLineValues[dateFactCol] = toUsersTimezone(changedLineValues[dateFactCol], spreadsheet, timezone) };
        if (!changedLineValues[sumFactCol]) { changedLineValues[sumFactCol] = changedLineValues[sumPlannedCol] };
        changedLine.setValues([changedLineValues]);

        const dateForReCalc = toUsersTimezone(changedLineValues[datePlannedCol], spreadsheet, timezone, "iso8601")
        reCalcByDateRange(["prediction"], new Date(dateForReCalc), "", "", spreadsheet);
        addExpense("prediction", changedLineValues[predNameCol], changedLineValues[sumFactCol], changedLineValues[dateFactCol], spreadsheet)
        rebuildCache(predSheetName, "Predictions")

      } else if (newValue == "FALSE") {

        const tempDate = changedLineValues[dateFactCol];
        const dateForReCalcBig = toUsersTimezone(tempDate, spreadsheet, timezone, "iso8601");
        const tempSum = changedLineValues[sumFactCol];
        SpreadsheetApp.flush();

        const catsObject = tryCache("CategoryObjects");
        const fullName = catsObject.prediction.fullName;
        const row = findLogRow(dateForReCalcBig, fullName, changedLineValues[predNameCol], tempSum, spreadsheet).getRow();
        spreadsheet.getSheetByName(logSheetName).deleteRow(row);
        console.log("Removed log sheet entry")

        const dateForReCalcPred = toUsersTimezone(changedLineValues[datePlannedCol], spreadsheet, timezone, "iso8601");
        reCalcByDateRange(["prediction"], new Date(dateForReCalcPred), "", "", spreadsheet);
        reCalcByDateRange(["big_expense"], new Date(dateForReCalcBig), "", "", spreadsheet); // expense or earning - doesn't matter, function recalculates for all case
      }
      return;
    }

    if ((changedColumn == dateFactCol + 1) || (changedColumn == sumFactCol + 1)) { // changed factual date or sum

      if (!changedLineValues[statusCol]) { return }

      displayError("I mean you can change both factual date and a sum. But please, mark this prediction as 'not paid off' first!")
      console.log("Tried to change factual date or sum in a submitted prediction. Abort")
      if (changedColumn == dateFactCol + 1) {
        sheet.getRange(changedRow, changedColumn).setValue(new Date(ValueToDate(oldValue)));
      } else {
        sheet.getRange(changedRow, changedColumn).setValue(oldValue);
      }
      return; // decided I didn't want to support this case - too much trouble for little value
    }


    // changed anything else = we don't like that
    console.log("Tried to change what shouldn't be changed " + [changedRow, changedColumn])
    return;
  }
}

function sortPredictions(skipCache, spreadSheet) {

  const ss = spreadSheet ? spreadSheet : getSpreadSheet();
  const predSheet = ss.getSheetByName(predSheetName);
  const allPredLogsFresh = predSheet.getRange("Predictions");

  let predictionsHeaders = spreadSheet ? spreadSheet.getSheetByName(predSheetName).getRange("PredictionListLogHeaders").getValues() : tryCache(predSheetName, "PredictionListLogHeaders");
  predictionsHeaders = predictionsHeaders.flat().filter(Boolean);
  const statusPlannedCol = predictionsHeaders.indexOf("Paid off?") + 1;
  const datePlannedCol = predictionsHeaders.indexOf("Date") + 1;
  const namePlannedCol = predictionsHeaders.indexOf("Name") + 1;

  // allPredLogsFresh.sort([{ column: datePlannedCol, ascending: true }, { column: namePlannedCol, ascending: true }]);
  allPredLogsFresh.sort([{ column: statusPlannedCol, ascending: false }, { column: datePlannedCol, ascending: true }, { column: namePlannedCol, ascending: true }]);

  if (!skipCache && !spreadSheet) { rebuildCache(predSheetName, "Predictions") };
  return allPredLogsFresh;

}

function getAllPredTypesAsObj(ss) {

  if (!ss) { ss = getSpreadSheet() }
  const predSheet = ss.getSheetByName(predSheetName);
  const predValsArr = predSheet.getRange("PredictionSettingsValuesAndHeadings").getValues();
  //const predValsArr = tryCache(predSheetName, "PredictionSettingsValuesAndHeadings");
  let allPreds = [];
  let headNames = [];
  for (i in predValsArr) {
    const headName = predValsArr[i][0];
    headNames.push(headName)
    predValsArr[i].shift();
  };
  // const arrTrans = predValsArr[0].map((_, colIndex) => predValsArr.map(row => row[colIndex]));
  const arrTrans = transposeArray(predValsArr);

  for (i in arrTrans) {
    const currPred = arrTrans[i];
    const obj = {};
    for (x in currPred) {
      const name = headNames[x];
      const val = currPred[x];
      obj[name] = val;
    }
    allPreds.push(obj);
  }

  return allPreds;
}

function getPredInfoByName(nm, info, ss) {

  const predSettingsObj = getAllPredTypesAsObj(ss);
  let val;
  for (i in predSettingsObj) {
    if (predSettingsObj[i].Name == nm) { val = predSettingsObj[i][info] }
  }
  return val;
}


function changePredStatusByName(nm, status, reCalc) {

  const ss = getSpreadSheet();
  const range = ss.getRange(makeRangeName(predSheetName, "PredictionSettingsValues"));
  const rangeValues = transposeArray(range.getValues());
  const settNames = tryCache(predSheetName, "PredictionSettingsHeaders").flat();
  const settNameIndex = settNames.indexOf("Name");
  const settStatusIndex = settNames.indexOf("Status");

  for (let i = 0; i < rangeValues.length; i++) {
    if (rangeValues[i][settNameIndex] == nm) {
      range.offset(settStatusIndex, i, 1, 1).setValue(status);
      if (reCalc) { reCalcPredictions(nm) };
      return;
    }
  }
  console.log("Error! Couldn't set prediction " + nm + " to status " + status + ": prediction not found")

}

function changePredStatusByIndex(index, status, reCalc) {

  const ss = getSpreadSheet();
  const range = ss.getRange(makeRangeName(predSheetName, "PredictionSettingsValues"));
  const rangeValues = transposeArray(range.getValues());
  const settNames = tryCache(predSheetName, "PredictionSettingsHeaders").flat();
  const settStatusIndex = settNames.indexOf("Status");
  const settNameIndex = settNames.indexOf("Name");

  if (rangeValues[index]) {
    range.offset(settStatusIndex, index, 1, 1).setValue(status);
    if (reCalc && rangeValues[index][settNameIndex]) { reCalcPredictions(rangeValues[i][settNameIndex]) };
    return;
  }
  console.log("Error! Couldn't set prediction with index " + index + " to status " + status + ": index not found");
}

function addCommentToPredByIndex(index, rowName, comment) {

  const ss = getSpreadSheet();
  const range = ss.getRange(makeRangeName(predSheetName, "PredictionSettingsValues"));
  const rangeValues = transposeArray(range.getValues());
  const settNames = tryCache(predSheetName, "PredictionSettingsHeaders").flat();
  const rowIndex = settNames.indexOf(rowName);

  if (rowIndex == -1) { console.log("Error! Can't add comment:  setting row " + rowName + " not found"); return false };
  if (rangeValues[index]) {
    range.offset(rowIndex, index, 1, 1).setNote(comment);
    return;
  }
  console.log("Error! Can't add comment: index" + index + " not found")
}

function getActualPreds(predsObj, timezone) {

  if (predsObj) {

    const values = Object.values(predsObj)
    const keys = Object.keys(predsObj)
    // const thisDate = toUsersTimezone(today, "", timezone).simpleToDate();
    const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))

    const todayObj = {};
    const overdueObj = {};

    for (let i = 0; i < values.length; i++) {

      const currKey = keys[i];
      const currDate = predsObj[currKey].dateForm.simpleToDate();

      let currObj;
      if (diffInDays(currDate, todayForUser) == 0) {
        currObj = todayObj
      } else if (diffInDays(currDate, todayForUser) > 0) {
        currObj = overdueObj
      }

      if (!currObj) { continue };

      const currIndex = Object.values(currObj).length;
      currObj[currIndex] = {};
      currObj[currIndex].date = predsObj[currKey].dateForm;
      currObj[currIndex].status = false;
      currObj[currIndex].name = predsObj[currKey].shortName;
      currObj[currIndex].sum = predsObj[currKey].sum;

    }

    return [todayObj, overdueObj];

  } else {

    function makeObj(arr) {
      const obj = {};
      if (arr.length > 0) {
        arr.forEach((x, i) => {
          obj[i] = {};
          obj[i].date = x[dateIndex];
          obj[i].status = x[statusIndex];
          obj[i].name = x[nameIndex];
          obj[i].sum = x[sumIndex];
        })
      }
      return obj;
    }

    // const currPreds = tryCache(predSheetName, "Predictions").filter(Boolean);
    const currPreds = getSpreadSheet().getRange(makeRangeName(predSheetName, "Predictions")).getValues().filter(Boolean);
    // const todayDate = new Date(today.clearTime());
    const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))
    const headers = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);
    const dateIndex = headers.indexOf("Date");
    const statusIndex = headers.indexOf("Paid off?");
    const nameIndex = headers.indexOf("Name");
    const sumIndex = headers.indexOf("Sum");

    let todayPreds = currPreds.filter(x => !x[statusIndex] && diffInDays(x[dateIndex], todayForUser) == 0);
    let overduePreds = currPreds.filter(x => !x[statusIndex] && diffInDays(x[dateIndex], todayForUser) > 0);

    const todayObj = makeObj(todayPreds);
    const overdueObj = makeObj(overduePreds);

    return [todayObj, overdueObj];
  }
}
