function processTimedTrigger() { 

  console.log("Starting processTimedTrigger")

  const ss = getSpreadSheet();
  const id = ss.getId();


  // preparing the object
  let obj = getUserScriptPropertyByValue("docId", id);
  if (!obj) {return false} else {obj = JSON.parse(obj)};
  let email = obj[0];
  obj = obj[1];

  // refreshing token
  var token = ScriptApp.getOAuthToken();
  setUserScriptPropertyValue(email, "accessToken", token)
  console.log("Token updated: " + [email, token]);

  // finding out current hour
  var scriptTimeZone = Session.getScriptTimeZone();
  const userTimeZone = ss.getSpreadsheetTimeZone();
  const hour = today.addMinutes(getTimezoneOffset(today, scriptTimeZone, userTimeZone)).getHours()

  // maintenance
  const maintenanceHour = 02;
  if (hour == maintenanceHour) {nightlyMaintenance()};

  // prediction reminder
  const predictionHour = 20;
  if (hour == predictionHour) {predictionReminder()};

}

function nightlyMaintenance() {

  reBuildSubCatsInCatalogue();
  setProperties();
  addNewDates();
  reCalcAllBudget();
  hideRows();
  refreshStatStartDate();

}


function predictionReminder(predsObj, timezone, chatId) {

  console.log("Checking overdue predictions")
  const preds = getActualPreds(predsObj, timezone);
  const todayPreds = preds[0];
  const overduePreds = preds[1];
  const todayPredsValues = Object.values(todayPreds);
  const overduePredsValues = Object.values(overduePreds);

  const state = todayPredsValues.length + overduePredsValues.length;
  if (!state) {console.log("No predictions to remind about"); return};

  let text = "☝🏻 You have some <b>predictions</b> to pay off!\n"
  if (todayPredsValues.length) {
    text = text + "\nSome predictions are due today:\n"
    for (let i = 0; i < todayPredsValues.length; i++) {
      const currPred = todayPreds[i];
      text = text + "• <b>" + currPred.name + "</b>: " + currPred.sum + "\n";
  }
}
  if (overduePredsValues.length) {
    text = text + "\nSome predictions are overdue:\n"
    for (let i = 0; i < overduePredsValues.length; i++) {
      const currPred = overduePreds[i];
      text = text + "• <b>" + currPred.name + "</b>: " + currPred.sum + " (" + currPred.date + ")\n";
    }
  }

  text = text + "\nBetter get to it! To start, just provide a sum."

  console.log("Today: " + todayPredsValues.length)
  console.log("Overdue: " + overduePredsValues.length)
  console.log(text)

  globalChatId = chatId ? chatId : getSettingValue("Telegram chat ID")
  sendText(globalChatId, text);
  return true;
  
}

function hideRows() {

  const ss = getSpreadSheet();
  let cutOffDate = today.clearTime().addDays(-Number(getSettingValue("Days to build stats on")));
  // const firstDate = new Date(getSettingValue("First date")).clearTime();
  const firstDate = getSettingValue("First date").simpleToDate();
  if (diffInDays(cutOffDate, firstDate) > 0) {cutOffDate = firstDate}

  // budget
  const budgetStartRow = tryCache(budgetSheetName, "DateColumn", "getRow");
  const budgetEndRow = getRowNumByDate(cutOffDate);
  const budgetSheet = ss.getSheetByName(budgetSheetName);
  if (budgetEndRow - budgetStartRow > 0) {  budgetSheet.hideRows(budgetStartRow, budgetEndRow - budgetStartRow);}
  else (console.log("Budget sheet: no rows to hide " + [cutOffDate, budgetEndRow]))

  // logs
  const logSheet = ss.getSheetByName(logSheetName);
  const logRangeVals = sortLogs().getDisplayValues();
  const logStartRow = tryCache(logSheetName, "LogSheetLogValues", "getRow");
  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat().filter(Boolean);
  const dateIndex = logHeaders.indexOf("Date");
  const logAmount = logRangeVals.findIndex(x => diffInDays(cutOffDate, x[dateIndex].simpleToDate().clearTime()) >= 0);
  if (logAmount > 0) {  logSheet.hideRows(logStartRow, logAmount)}
  else (console.log("Log sheet: no rows to hide"))

  // preds
  const predSheet = ss.getSheetByName(predSheetName);
  const predVals = sortPredictions().getDisplayValues();
  const predStartRow = tryCache(predSheetName, "Predictions", "getRow");
  const predHeaders = tryCache(predSheetName, "PredictionListLogHeaders").flat().filter(Boolean);
  const predDateIndex = predHeaders.indexOf("Date");
  const predStatusIndex = predHeaders.indexOf("Paid off?");
  const predAmount = predVals.findIndex(x => diffInDays(cutOffDate, x[predDateIndex].simpleToDate().clearTime()) >= 0 && x[predStatusIndex]);
  if (predAmount > 0) {predSheet.hideRows(predStartRow, predAmount)}
  else (console.log("Pred sheet: no rows to hide"))

}


