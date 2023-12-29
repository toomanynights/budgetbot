function getSettingValue(sett, spreadsheet) { 

  // if (sett == "First date") { // if it does through cache, date gets broken
  //   const ss = spreadsheet ? spreadsheet : getSpreadSheet();
  //   const settings = ss.getRange(makeRangeName(settSheetName, "Settings")).getDisplayValues();

  //   const date = settings.find(x => x[0] == "First date")[1];
  //   return date ? date : false;
  // }

  let settArray = spreadsheet ? spreadsheet.getRange(makeRangeName(settSheetName, "Settings")).getDisplayValues() : tryCache(settSheetName, "Settings");
  settArray = settArray.filter(Boolean);
  const setting = settArray.find(x => x[0] == sett);
  return setting[1];

}

function getDefaultSettingValue(sett, spreadsheet) {

  let settArray = spreadsheet ? spreadsheet.getRange(makeRangeName(settSheetName, "Settings")).getDisplayValues() : tryCache(settSheetName, "Settings");
  settArray = settArray.filter(Boolean);
  const setting = settArray.find(x => x[0] == sett);
  return setting[4];

}

function processSettingsChanges(setts) {

  let isNotFirst = tryCache("launchSettingsApplied");
  isNotFirst = typeof isNotFirst == "boolean" ? isNotFirst : isNotFirst == "true" ? true : false;

  setts = JSON.parse(setts);
  console.log("Settings have been changed:")
  console.log(setts)
  const ss = getSpreadSheet();

  for (let i = 0; i < setts.length; i++) {
    if (setts[i][2] == "date") {

      const currDate = setts[i][1];
      setts[i][1] = DateToValue(inputToDate(currDate))

      const defDate = setts[i][4];
      setts[i][4] = DateToValue(inputToDate(defDate))

    } else if (setts[i][2] == "decimal" || setts[i][2] == "number") {
      setts[i][1] = Number(setts[i][1])
    }

    // setting defaults, if not present
    if (!setts[i][4] && setts[i][1]) {
      setts[i][4] = setts[i][1];
    }
  }

  const newFirstDate = setts.filter(x => x[0] == "First date")[0][1];
  const currFirstDate = getSettingValue("First date");
  const newDaysToGen = setts.filter(x => x[0] == "Days to generate")[0][1];
  const currnewDaysToGen = Number(getSettingValue("Days to generate"));
  const newStatDays = setts.filter(x => x[0] == "Days to build stats on")[0][1];
  const currStatDays = Number(getSettingValue("Days to build stats on"));
  const newCurrency = setts.filter(x => x[0] == "Currency")[0][1];
  const currCurrency = getSettingValue("Currency");
  const newId = setts.filter(x => x[0] == "Telegram chat ID")[0][1];

  const range = ss.getRange(makeRangeName(settSheetName, "Settings"));
  range.setValues(setts);
  setProperty(settSheetName, "Settings");

  if (!currFirstDate) {
    console.log("There was no first date! " + newFirstDate);
    addNewDates();
  } else {
    const dateDiff = diffInDays(newFirstDate, currFirstDate);
    console.log([dateDiff, newFirstDate, currFirstDate])

    if (dateDiff != 0) {
      console.log("First date changed! " + [dateDiff, currFirstDate]);
      addNewDates()
      refreshStatStartDate();
    } else if (newDaysToGen != currnewDaysToGen) {
      console.log("First date not changed, but 'Days to generate' was! " + currnewDaysToGen + " => " + newDaysToGen);
      addNewDates()
    }
  }

  if ((newStatDays != currStatDays) || !isNotFirst) {
    refreshStatStartDate();
  }

  const email = Session.getActiveUser().getEmail();
  setUserScriptPropertyValue(email, "chatId", newId);

  if (newCurrency && newCurrency != currCurrency) {
    applyCurrency(newCurrency);
  }

  if (!isNotFirst) {
    setPropertyObject("launchSettingsApplied", true); 
    onOpen();
    console.log("Initial settings applied")
  }
  return true;
}
