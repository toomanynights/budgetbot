function getLastDate(timezone) { 

  const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))
  const days = Number(getSettingValue("Days to generate"));
  const last = todayForUser.addDays(days);

  console.log("Current last date is " + last + " (today + " + days + " days)");
  return last;
}

function getActualStatDate() {

  console.log("Starting getActualStatDate")
  const ss = getSpreadSheet();
  const timezone = ss.getSpreadsheetTimeZone();
  const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))
  const days = Number(getSettingValue("Days to build stats on"));
  
  const dateRangeVals = ss.getRange(makeRangeName(budgetSheetName, "DateColumnWithCheckboxes")).getDisplayValues();
  dateRangeVals.forEach(x => x[0] = x[0].simpleToDate())
  const valsPast = dateRangeVals.filter(x => diffInDays(todayForUser, x[0]) < 0 && x[1] != "TRUE");
  valsPast.sort((x, y) => diffInDays(x[0], y[0]));
  let statDate;

  if (valsPast.length > days) {
    console.log("There is enough days for statistics: " + valsPast[days - 1][0])
    statDate = valsPast[days - 1][0];
  } else {
    const diff = days - valsPast.length;
    console.log("There is NOT enough days for statistics! Returning the OOB date: " + valsPast[valsPast.length - 1][0].addDays(-diff))
    statDate = valsPast[valsPast.length - 1][0].addDays(-diff)
  }

  return DateToValue(statDate);

}

function extendRangeByEmptyRows(sheetName, rangeName, howMany, spreadsheet) {

  const ss = spreadsheet ? spreadsheet : getSpreadSheet();

  const sheet = ss.getSheetByName(sheetName);
  const range = sheet.getRange(rangeName);
  const firstRow = range.getRow();
  const lastRow = sheet.getMaxRows(); // always returns the very last row of the sheet, even if empty
  const lastCol = sheet.getLastColumn(); // from sheet because I may put something after big exps

  function copyto(target, source) {
    sheet.getRange(source, 1, 1, lastCol).copyTo(sheet.getRange(target, 1, 1, lastCol), SpreadsheetApp.CopyPasteType.PASTE_NORMAL);
  }

  const vals = range.getValues();
  const rows = vals.length;
  const nonEmptyRows = vals.filter(x => x[0]).length;
  const emptyRows = rows - nonEmptyRows;
  const emptyRequired = howMany - emptyRows;
  const lastNonEmptyRow = lastRow - emptyRows;

  if (rows == nonEmptyRows) { // all rows have content
    console.log("All rows in range " + rangeName + " are non-empty");
    // console.log([lastNonEmptyRow, emptyRequired])
    sheet.insertRowsBefore(lastNonEmptyRow, emptyRequired);
    copyto(lastNonEmptyRow, lastNonEmptyRow + emptyRequired);
    sheet.getRange(lastNonEmptyRow + emptyRequired, 1, 1, lastCol).clearContent();
    return sheet.getRange(lastNonEmptyRow + 1, 1, 1, lastCol);
  }

  if (rows == emptyRows) { // all rows are empty
    console.log("All rows in range " + rangeName + " are empty");
    if (emptyRequired > 0) {sheet.insertRowsAfter(firstRow, emptyRequired)};
    return sheet.getRange(firstRow, 1, 1, lastCol);
  }

  // some rows are empty
  console.log("Empty rows: " + emptyRows + ", need to add " + emptyRequired)
  if (emptyRequired > 0) {
    console.log("Inserting empty rows after last one with values: " + lastNonEmptyRow)
    sheet.insertRowsAfter(lastNonEmptyRow, emptyRequired);
  }
  return sheet.getRange(lastNonEmptyRow + 1, 1, 1, lastCol);
}

function applyCurrency(curr) {
  
  const rangesArr = [];
  const ss = getSpreadSheet();

  rangesArr.push(ss.getRange(makeRangeName(budgetSheetName, "AllBudgetNumbers")));
  rangesArr.push(ss.getRange(makeRangeName(budgetSheetName, "HeaderNumbers")));
  rangesArr.push(ss.getRange(makeRangeName(budgetSheetName, "LowestNumbers")));

  const logValuesRange = ss.getRange(makeRangeName(logSheetName, "LogSheetLogValues"));
  const logValues = logValuesRange.getValues();
  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat();
  const logSumIndex = logHeaders.indexOf("Sum");
  const logSumsCol = logValuesRange.offset(0, logSumIndex, logValues.length, 1);
  rangesArr.push(logSumsCol);

  const predSettingsRange =  ss.getRange(makeRangeName(predSheetName, "PredictionSettingsValues"));
  const predSettingsHeaders = tryCache(predSheetName, "PredictionSettingsHeaders").flat();
  const predSettingsSumIndex = predSettingsHeaders.indexOf("Sum");
  const predSettingsSumRow = predSettingsRange.offset(predSettingsSumIndex, 0, 1);
  rangesArr.push(predSettingsSumRow);

  const predValuesRange = ss.getRange(makeRangeName(predSheetName, "Predictions"));
  const predValues = predValuesRange.getValues();
  const predValuesHeaders = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);
  const predValuesSumIndex = predValuesHeaders.indexOf("Sum");
  const predValuesSumFactIndex = predValuesHeaders.indexOf("Sum (fact.)");
  const predValuesSumColRange = predValuesRange.offset(0, predValuesSumIndex, predValues.length, 1);
  rangesArr.push(predValuesSumColRange);
  const predValuesSumFactColRange = predValuesRange.offset(0, predValuesSumFactIndex, predValues.length, 1);
  rangesArr.push(predValuesSumFactColRange);

  rangesArr.forEach(x => x.setNumberFormat("[$" + curr + "]#,##0"))

}