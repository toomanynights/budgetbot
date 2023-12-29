function buildRichTextPredictions(data, obj) {

  let richText = SpreadsheetApp.newRichTextValue();
  if (data.length == 0) {
    richText = richText.setText("").build();
    return richText;
  }
  //console.log("Building rich prediction text from values: " + data)

  const predUnresolved = SpreadsheetApp.newTextStyle().setStrikethrough(false).setFontSize(9).build();
  const predResolved = SpreadsheetApp.newTextStyle().setStrikethrough(true).setFontSize(9).build();

  let textArr = [];
  const catsObject = obj ? obj : tryCache("CategoryObjects");
  const emoji = catsObject.prediction.emoji;

  for (i in data) { // building array of predictions
    const name = data[i][0]; 
    const sum = data[i][1];
    const currEmoji = getCatInfoByFullName(data[i][0], "pred_subcat", "emoji", obj) || emoji;
    const preppedValue = currEmoji + " " + removeEmoji(name)[0] + ": " + sum;
    textArr.push(preppedValue);
  }

  richText = richText.setText(textArr.join(" | "));
  let currOffset = 0;

  for (i in data) {

    const status = data[i][2];
    const itemText = textArr[i];
    const textLength = itemText.length;
    const offsetBefore = (i == 0) ? 0 : 3;
    const offsetAfter = (i == (textArr.length - 1)) ? 0 : 3;

    richText = richText.setTextStyle(currOffset + offsetBefore, textLength + offsetBefore + currOffset, (status ? predResolved : predUnresolved));
    currOffset = currOffset + textLength + offsetBefore;
  }

  richText = richText.build();
  //console.log("Returned rich text: " + textArr.join(" | "))
  return richText;
}

function getRowNumByDate(date) {

  const dateRange = getSpreadSheet().getRange(makeRangeName(budgetSheetName, "DateColumn")).getDisplayValues();
  const dateOffset = tryCache(budgetSheetName, "DateColumn", "getRow");
  const dateCol = dateRange.findIndex(x => diffInDays(date, x[0].simpleToDate()) == 0)

  return Number(dateCol) + Number(dateOffset);

}

function refreshStatStartDate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getRange(makeRangeName(budgetSheetName, "StatsStart")).setValue(getActualStatDate());
}

function addNewDates() {

  const ss = getSpreadSheet();
  const timezone = ss.getSpreadsheetTimeZone()
  console.log("Starting addNewDates")
  const sheet = ss.getSheetByName(budgetSheetName);
  const dateRange = ss.getRange(makeRangeName(budgetSheetName, "DateColumn"));
  const firstRow = dateRange.getRow();
  const lastRow = sheet.getMaxRows();
  const firstDate = getSettingValue("First date").simpleToDate();
  const lastDate = getLastDate(timezone);
  const finalColumn = sheet.getMaxColumns();

  const checkboxesRange = sheet.getRange("DateColumnWithCheckboxes");
  const checkboxesValues = checkboxesRange.getDisplayValues();
  //console.log(checkboxesValues);
  checkboxesValues.forEach(x => x[0] = x[0].simpleToDate());
  //console.log(checkboxesValues);

  let newDates = [];
  let currDate = firstDate;

  while (diffInDays(currDate, lastDate) >= 0) {
    
    //console.log([diffInDays(currDate, lastDate), currDate, lastDate, DateToValue(currDate)])
    const checkboxRow = checkboxesValues.find(x => diffInDays(x[0], currDate) == 0);
    //console.log(checkboxRow)
    if (checkboxRow && checkboxRow[1] == "TRUE") { // may be undefined, it's normal
      newDates.push([DateToValue(currDate), true]);
    } else {
      newDates.push([DateToValue(currDate), false]);
    }
    currDate = currDate.addDays(1);
  }

  const deleteOffset = 2;
  const autoFillOffset = deleteOffset - 1;
  if (lastRow >= firstRow + deleteOffset) {
    sheet.deleteRows(firstRow + deleteOffset, lastRow - firstRow - 1);
  }
  dateRange.offset(0, 0, 1, 1).setValue(DateToValue(firstDate));
  dateRange.offset(1, 0, 1, 1).setValue(DateToValue(firstDate.addDays(1)));
  if (newDates.length > deleteOffset) {extendRangeByEmptyRows(budgetSheetName, makeRangeName(budgetSheetName, "DateColumn"), newDates.length - deleteOffset)};
  const autoFillDonor = dateRange.offset(autoFillOffset, 0, 1, finalColumn);
  const destinationRange = sheet.getRange(firstRow + autoFillOffset, 1, newDates.length - autoFillOffset, finalColumn);
  autoFillDonor.autoFill(destinationRange, SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES);

  const checkboxesRangeNew = sheet.getRange("DateColumnWithCheckboxes");
  checkboxesRangeNew.setValues(newDates);

  reCalcPredictions();
  reCalcAllBudget();
}

function reCalcByDateRange(type, dateStart, dateEnd, skipSort, spreadSheet, obj) {

  // accepts true dates
  console.log("Received data for budget recalculation: " + [type, dateStart, dateEnd])
  const ss = spreadSheet ? spreadSheet : getSpreadSheet();
  const budgetSheet = ss.getSheetByName(budgetSheetName);
  const timezone = ss.getSpreadsheetTimeZone();
  
  const catsObject = obj ? obj : tryCache("CategoryObjects");
  const dailyCats = Object.keys(catsObject.daily.subCats);

  if (!dateEnd) { dateEnd = dateStart };
  dateStart = new Date(dateStart);
  dateEnd = new Date(dateEnd);
  let dateDiff = diffInDays(dateStart, dateEnd);
  if (dateDiff < 0) {
    let dateTemp = dateStart;
    dateStart = dateEnd;
    dateEnd = dateTemp;
    dateDiff = diffInDays(dateStart, dateEnd);
  }

  const firstDate = getSettingValue("First date", spreadSheet).simpleToDate();
  const startDateIndex = diffInDays(firstDate, dateStart);
  console.log("startDateIndex " + [startDateIndex, firstDate, dateStart])
  if (startDateIndex < 0 || startDateIndex === NaN) {
    console.error("Wrong starting date! " + [startDateIndex, firstDate, dateStart])
    return;
  }

  const logsRange = ss.getRange(makeRangeName(logSheetName, "LogSheetLogValues"))
  let logsArray = skipSort ? logsRange.getValues() : sortLogs("", spreadSheet).getValues();
  let headersArray = spreadSheet ? ss.getRange(makeRangeName(logSheetName, "LogSheetHeaders")).getValues() : tryCache(logSheetName, "LogSheetHeaders");
  headersArray = headersArray.flat().filter(Boolean);
  const dateIndex = headersArray.indexOf("Date");
  const catIndex = headersArray.indexOf("Category");
  const subCatIndex = headersArray.indexOf("Subcategory");
  const sumIndex = headersArray.indexOf("Sum");
  const statusIndex = headersArray.indexOf("Delete");
  logsArray.forEach((x, i) => logsArray[i][dateIndex] = new Date(toUsersTimezone(x[dateIndex], ss, timezone, "iso8601")));  
  // logsArray.forEach((x, i) => logsArray[i][dateIndex] = new Date(Date.parse(toUsersTimezone(x[dateIndex], ss, timezone, "iso8601"))));  

  console.log("Starting budget recalculation")

  if (type == "all" || type.includes("daily")) {

    console.log("Starting calculating daily expenses")
    const logsFiltered = logsArray.filter(x => (diffInDays(dateStart, x[dateIndex]) >= 0) && (diffInDays(dateEnd, x[dateIndex]) <= 0) && (!x[statusIndex])) // checks that dates are in range and that there are no deleted ones
    console.log(logsFiltered)

    const catName = catsObject.daily.fullName;
    const logsDailyArrayFilteredByCat = logsFiltered.filter(x => x[catIndex] == catName);
    // const dailyOffset = tryCache(budgetSheetName, "DailyExpenses", "getColumn");
    const dailyOffset = spreadSheet ? budgetSheet.getRange("DailyExpenses").getColumn() : tryCache(budgetSheetName, "DailyExpenses", "getColumn");
    let arrToFillWith = [];

    for (let y = 0; y <= dateDiff; y++) { // iterating through range dates

      const currDate = dateStart.addDays(y);
      let currDateArr = [];
      currDateArr.length = dailyCats.length;
      currDateArr.fill("");
      const logsDailyArrayFilteredByDate = logsDailyArrayFilteredByCat.filter(x => diffInDays(x[dateIndex], currDate) == 0);

      for (let i = 0; i < logsDailyArrayFilteredByDate.length; i++) { // iterating through entries of current date

        const currSubCatFull = logsDailyArrayFilteredByDate[i][subCatIndex];
        const currSubCatCol = getCatInfoByFullName(currSubCatFull, "daily_subcat", "column", catsObject);
        const currSubCatIndex = currSubCatCol - dailyOffset;
        currDateArr[currSubCatIndex] = Number(currDateArr[currSubCatIndex] + logsDailyArrayFilteredByDate[i][sumIndex]);

      }
      arrToFillWith.push(currDateArr);
    }
    console.log("Applying daily values")
    console.log(arrToFillWith)
    budgetSheet.getRange("DailyExpenses").offset(startDateIndex, 0, dateDiff + 1).setValues(arrToFillWith);
    //console.log("Daily values applied")
    if (!spreadSheet) {rebuildCache(budgetSheetName, "DailyExpenses")};
    SpreadsheetApp.flush();

  }

  if (type == "all" || type.includes("big_expense") || type.includes("big_earning")) {

    console.log("Starting calculating big expenses")
    const logsFiltered = logsArray.filter(x => (diffInDays(dateStart, x[dateIndex]) >= 0) && (diffInDays(dateEnd, x[dateIndex]) <= 0) && (!x[statusIndex])) // checks that dates are in range and that there are no deleted ones

    const catNames = [catsObject.big_expense.fullName, catsObject.big_earning.fullName, catsObject.prediction.fullName];
    const logsArrayFilteredByCat = logsFiltered.filter(x => catNames.includes(x[catIndex]));


    let sumsToFillWith = [];
    sumsToFillWith.length = dateDiff + 1;
    sumsToFillWith.fill("");
    let visualsToFillWith = [];
    visualsToFillWith.length = dateDiff + 1;
    visualsToFillWith.fill("");

    const bigExpEmoji = catsObject.big_expense.emoji;
    const bigExpFullName = catsObject.big_expense.fullName;
    const bigEarnEmoji = catsObject.big_earning.emoji;
    const bigEarnFullName = catsObject.big_earning.fullName;
    const predFullName = catsObject.prediction.fullName;

    for (let y = 0; y <= dateDiff; y++) { // iterating through range dates
      const currDate = dateStart.addDays(y);
      // let currDateVisual = [];
      let currDateObj = {};
      let currDateSum = "";

      const logsDailyArrayFilteredByDate = logsArrayFilteredByCat.filter(x => diffInDays(x[dateIndex], currDate) == 0);

      for (let x = 0; x < logsDailyArrayFilteredByDate.length; x++) { // lastly, iterating through log entries

        const currLogSum = logsDailyArrayFilteredByDate[x][sumIndex];
        const currCat = logsDailyArrayFilteredByDate[x][catIndex];
        const currSubCat = logsDailyArrayFilteredByDate[x][subCatIndex];

        if (currCat == bigExpFullName) {

          const currSubCatEmoji = getCatInfoByFullName(currSubCat, "bigexp_subcat", "emoji", catsObject) || bigExpEmoji;
          currDateSum = Number(currDateSum - currLogSum); // removing because it's expense

          const currSubCatShort = removeEmoji(currSubCat)[0]
          const currSubCatFull = currSubCatEmoji + " " + currSubCatShort;
          if (!currDateObj[currSubCatFull]) {currDateObj[currSubCatFull] = logsDailyArrayFilteredByDate[x][sumIndex]}
          else {currDateObj[currSubCatFull] = currDateObj[currSubCatFull] + logsDailyArrayFilteredByDate[x][sumIndex]}

          // const currVisual = currSubCatEmoji + " " + currSubCatShort + ": " + logsDailyArrayFilteredByDate[x][sumIndex];
          // currDateVisual.push(currVisual);

        } else if (currCat == bigEarnFullName) {

          const currSubCatEmoji = getCatInfoByFullName(currSubCat, "bigearn_subcat", "emoji", catsObject) || bigEarnEmoji;
          currDateSum = Number(currDateSum + currLogSum); // added numbers to sum

          const currSubCatShort = removeEmoji(currSubCat)[0]
          const currSubCatFull = currSubCatEmoji + " " + currSubCatShort;
          if (!currDateObj[currSubCatFull]) {currDateObj[currSubCatFull] = logsDailyArrayFilteredByDate[x][sumIndex]}
          else {currDateObj[currSubCatFull] = currDateObj[currSubCatFull] + logsDailyArrayFilteredByDate[x][sumIndex]}

          // const currVisual = currSubCatEmoji + " " + removeEmoji(currSubCat)[0] + ": " + logsDailyArrayFilteredByDate[x][sumIndex];
          // currDateVisual.push(currVisual);

        } else if (currCat == predFullName) {
          const predName = logsDailyArrayFilteredByDate[x][subCatIndex];
          const predType = getPredInfoByName(predName, "Category", spreadSheet);
          if (predType == "Expense") {
            currDateSum = Number(currDateSum - currLogSum);
          } else if (predType == "Income") {
            currDateSum = Number(currDateSum + currLogSum);
          }
          console.log([currLogSum, currCat, currSubCat, predName, predType, currDateSum])
        }
      }
      sumsToFillWith[y] = [currDateSum];

      const currDateVisual = [];
      for (const [key, value] of Object.entries(currDateObj)) {
        currDateVisual.push(`${key}: ${value}`);
      }
      visualsToFillWith[y] = [currDateVisual.join(" | ")];
    }

    console.log("Applying big expenses")
    ss.getRange(makeRangeName(budgetSheetName, "BigsSumHiddenCol")).offset(startDateIndex, 0, dateDiff + 1).setValues(sumsToFillWith);
    ss.getRange(makeRangeName(budgetSheetName, "BigExpensesVisualsCol")).offset(startDateIndex, 0, dateDiff + 1).setValues(visualsToFillWith);
    console.log("Big expenses applied")
    if (!spreadSheet) { 
      rebuildCache(budgetSheetName, "BigsSumHiddenCol");
      rebuildCache(budgetSheetName, "BigExpensesVisualsCol");
    }

  }

  if (type == "all" || type.includes("prediction")) {

    console.log("Starting calculating predictions")
    sortPredictions("", spreadSheet);

    let predSheet;
    if (spreadSheet) {predSheet = spreadSheet.getSheetByName(predSheetName)};
    const plannedSettingsHeadersRaw = spreadSheet ? predSheet.getRange("PredictionSettingsHeaders").getValues() : tryCache(predSheetName, "PredictionSettingsHeaders");
    const plannedSettingsHeaders = transposeArray(plannedSettingsHeadersRaw).flat().filter(Boolean);
    const predSettingsCatIndex = plannedSettingsHeaders.indexOf("Category");
    const predSettingsNameIndex = plannedSettingsHeaders.indexOf("Name");
    const plannedSettingsValuesRaw = spreadSheet ? predSheet.getRange("PredictionSettingsValues").getValues() : tryCache(predSheetName, "PredictionSettingsValues");
    let plannedSettingsValues = transposeArray(plannedSettingsValuesRaw);

    const predLogsArray = spreadSheet ? predSheet.getRange("Predictions").getValues() : tryCache(predSheetName, "Predictions");
    let predHeaders = spreadSheet ? predSheet.getRange("PredictionListLogHeaders").getValues() : tryCache(predSheetName, "PredictionListLogHeaders");
    predHeaders = predHeaders.flat().filter(Boolean);
    const predNameIndex = predHeaders.indexOf("Name")
    const predSumIndex = predHeaders.indexOf("Sum")
    const predStatusIndex = predHeaders.indexOf("Paid off?")
    const predDateIndex = predHeaders.indexOf("Date")
    predLogsArray.forEach((item, index) => predLogsArray[index][predDateIndex] = new Date(toUsersTimezone(item[predDateIndex], ss, timezone, "iso8601")));  

    let sumsToFillWith = [];
    sumsToFillWith.length = dateDiff + 1;
    sumsToFillWith.fill("");
    let visualsToFillWith = [];
    visualsToFillWith.length = dateDiff + 1;
    visualsToFillWith.fill("");

    for (let y = 0; y <= dateDiff; y++) { // iterating through range dates
      // const currDate = new Date(dateStart).addDays(y).clearTime();
      const currDate = dateStart.addDays(y);
      let currDateSum = "";

      const predLogsArrayFilteredByDate = predLogsArray.filter(x => diffInDays(x[predDateIndex], currDate) == 0);
      const predLogsArrayFilteredByStatus = predLogsArrayFilteredByDate.filter(x => !x[predStatusIndex]);

      if (predLogsArrayFilteredByStatus) { // processing pred for the first time: for predicted budget sums
        for (x in predLogsArrayFilteredByStatus) {
          const predName = predLogsArrayFilteredByStatus[x][predNameIndex];
          const currentPredSettings = plannedSettingsValues.filter(i => i[predSettingsNameIndex] == predName).flat();
          const currentPredType = currentPredSettings[predSettingsCatIndex];
          const currentSum = predLogsArrayFilteredByStatus[x][predSumIndex];

          if (currentPredType == "Income") {
            currDateSum = Number(currDateSum + currentSum);
          } else if (currentPredType == "Expense") {
            currDateSum = Number(currDateSum - currentSum);
          }
        }
        sumsToFillWith[y] = [currDateSum];
      }
      if (predLogsArrayFilteredByDate) {
        let currVisualsToBuild = [];
        for (x in predLogsArrayFilteredByDate) {
          const predName = predLogsArrayFilteredByDate[x][predNameIndex];
          const predSum = predLogsArrayFilteredByDate[x][predSumIndex];
          const predStatus = predLogsArrayFilteredByDate[x][predStatusIndex];

          if (predName) {
            currVisualsToBuild.push([predName, predSum, predStatus]);
          }
        }
        visualsToFillWith[y] = [buildRichTextPredictions(currVisualsToBuild, obj)];
      }

    }
    console.log("Applying predictions")
    budgetSheet.getRange("BudgetPredictionsSum").offset(startDateIndex, 0, dateDiff + 1).setValues(sumsToFillWith);
    budgetSheet.getRange("BudgetPredictions").offset(startDateIndex, 0, dateDiff + 1).setRichTextValues(visualsToFillWith);
    console.log("Predictions applied")

    if (!spreadSheet) {
      rebuildCache(budgetSheetName, "BudgetPredictionsSum");
      rebuildCache(budgetSheetName, "BudgetPredictions");
    }
  }

  console.log("Finishing reCalcByDateRange")

}

function reCalcAllBudget(cat) {
  if (!cat) {cat = "all"}
  reCalcByDateRange(cat, getSettingValue("First date").simpleToDate(), getLastDate())
}

function addNewDailyColToBudget() {

  const ss = getSpreadSheet();
  const budgetSheet = ss.getSheetByName(budgetSheetName);
  const dailyRange = budgetSheet.getRange("DailyExpenses");
  const dailyFirstCol = dailyRange.getColumn();
  const dailyValues = tryCache(budgetSheetName, "DailyExpenses");
  const dailyColsAmount = dailyValues[0].length;
  const dailyLastCol = dailyFirstCol + dailyColsAmount - 1; // -1 due to index
 
  budgetSheet.insertColumnBefore(dailyLastCol); 
  
  const rowsQ = dailyValues.length;
  const lastColWithValues = dailyRange.offset(0, dailyColsAmount, rowsQ, 1);
  lastColWithValues.copyTo(dailyRange.offset(0, dailyColsAmount - 1, rowsQ, 1), SpreadsheetApp.CopyPasteType.PASTE_VALUES);
  dailyRange.offset(0, dailyColsAmount - 2, rowsQ, 1).copyTo(dailyRange.offset(0, dailyColsAmount - 1, rowsQ, 1), SpreadsheetApp.CopyPasteType.PASTE_FORMAT); // ugly workaround to preserve formatting
  lastColWithValues.clearContent();

  const formulasRange = ss.getRange(makeRangeName(budgetSheetName, "DailyStats"));
  const rows = formulasRange.getNumRows();
  formulasRange.offset(0, 0, rows, 1).copyTo(formulasRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false)

}

function removeDailyCol() {

  const ss = getSpreadSheet();
  const dailyRange = ss.getRange(makeRangeName(budgetSheetName, "DailyExpenses"));
  const dailyFirstCol = dailyRange.getColumn();

  console.log("Removing column " + dailyFirstCol)
  ss.getSheetByName(budgetSheetName).deleteColumn(dailyFirstCol);

}

function applyNewDailyTitlesToBudget(dailyCatsFiltered, skipReCalc) {

  const ss = getSpreadSheet();
  dailyCatsFiltered = dailyCatsFiltered.flat().filter(Boolean);
  let emojiArr = [];
  dailyCatsFiltered.forEach((x, y) => {emojiArr[y] = removeEmoji(x)[1];})
  const finalArr = [];
  finalArr.push(emojiArr);
  const budgetTitles = ss.getRange(makeRangeName(budgetSheetName, "DailyHeaders"));
  budgetTitles.setValues([emojiArr]);
  setProperty(budgetSheetName, "DailyHeaders");
  setProperty(budgetSheetName, "DailyExpenses");

  let noteArr = [[]]
  dailyCatsFiltered.forEach(x => noteArr[0].push(x));
  budgetTitles.setNotes(noteArr);

  if (!skipReCalc) {reCalcAllBudget("daily")};

  return;
}


function getBudgetStats(id) {

  const ss = SpreadsheetApp.openById(id);
  const timezone = ss.getSpreadsheetTimeZone();
  const sheet = ss.getSheetByName(budgetSheetName);
  const dailyRange = sheet.getRange("DailyExpensesTitlesSums").getValues();
  dailyRange.forEach((x, i) => dailyRange[i][0] = new Date(toUsersTimezone(dailyRange[i][0], ss, timezone, "iso8601")))
  const headers = dailyRange[0];
  const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))
  const scriptTimeZone = Session.getScriptTimeZone()

  const todayExpSumIndex = headers.findIndex(x => x == "Daily expenses");
  const todayAccountSumIndex = headers.findIndex(x => x == 'ACCOUNT SUM');
  const todayPredictedSum = headers.findIndex(x => x == 'Predicted sum');
  const todayBigsSum = headers.findIndex(x => x == 'Bigs sum');

  const todayRow = dailyRange.find(x => diffInDays(x[0], todayForUser) == 0);

  const lowestSum = sheet.getRange("LowestSum").getValues();
  const lowestSumSecond = sheet.getRange("LowestSumSecond").getValues();
  const predStatus = sheet.getRange("BudgetPredStatus").getValue();
  const coverageStatus = sheet.getRange("ExpensesCoverage").getDisplayValues();

  const obj = {};
  obj.dailyExpenses = todayRow[todayExpSumIndex];
  obj.sum = todayRow[todayAccountSumIndex];
  obj.bigsSum = todayRow[todayBigsSum];
  obj.predictedSum = todayRow[todayPredictedSum];
  obj.lowestSum = {};
  obj.lowestSum.date = lowestSum[0][0] == "-" ? "-" : toUsersTimezone(lowestSum[0][0], ss, scriptTimeZone);
  obj.lowestSum.sum = lowestSum[0][2];
  obj.lowestSumSecond = {};
  obj.lowestSumSecond.date = lowestSumSecond[0][0] == "-" ? "-" : toUsersTimezone(lowestSumSecond[0][0], ss, scriptTimeZone);
  obj.lowestSumSecond.sum = lowestSumSecond[0][2];
  obj.predStatus = predStatus;
  obj.coverageFirst = coverageStatus[0][0];
  obj.coverageSecond = coverageStatus[1][0];

  return JSON.stringify(obj);

}