function fillCatArray(arr, type, ss) {

  if (type == "category") {console.log("Starting fillCatArray")}

  const newArr = {};
  //console.log("Sending array: " + arr)
  for (let i = 0; i < arr.length; i++) {
    currVal = arr[i];
    currObj = makeCatObj(currVal, type, i, ss);
    newArr[currObj.shortName] = currObj;
  }
  
  if (type == "category") {console.log("Finishing fillCatArray")}
  return newArr;

}

function inputToDate(str) {
  const newStr = str.split("-")
  const newDate = new Date(newStr[0], newStr[1] - 1, newStr[2])
  return newDate
}

Date.prototype.dateToInput = function () {
  return this.getFullYear() + '-' + ('0' + (this.getMonth() + 1)).substr(-2, 2) + '-' + ('0' + this.getDate()).substr(-2, 2);
}


function makeCatObj(str, type, index, ss) {

  const obj = {};
  const emoji = removeEmoji(str)[1];
  const strNew = makeShortName(str);

  obj["fullName"] = str;
  obj["shortName"] = strNew;
  obj["type"] = type;
  emoji && (obj["emoji"] = emoji);


  if (strNew == "prediction") {
    const predCats = tryCache(catSheetName, "CataloguePlannedSubs", "", ss).flat().filter(Boolean);
    obj["catalogueRangeName"] = "CataloguePlannedSubs";
    obj["column"] = tryCache(budgetSheetName, "BudgetPredictions", "getColumn", ss);
    obj["sumsColumn"] = tryCache(budgetSheetName, "BudgetPredictionsSum", "getColumn", ss);
    obj["subCats"] = fillCatArray(predCats, "pred_subcat");

  } else if (strNew == "daily") {
    const dailyCats = tryCache(catSheetName, "CatalogueDailySubs", "", ss).flat().filter(Boolean);
    obj["catalogueRangeName"] = "CatalogueDailySubs";
    obj["subCats"] = fillCatArray(dailyCats, "daily_subcat", ss);
    obj["column"] = tryCache(budgetSheetName, "DailyExpenses", "getColumn", ss);

  } else if (strNew == "big_expense") {
    const bigExpCats = tryCache(catSheetName, "CatalogueBigExpSubs", "", ss).flat().filter(Boolean);
    obj["catalogueRangeName"] = "CatalogueBigExpSubs";
    obj["column"] = tryCache(budgetSheetName, "BigExpensesVisualsCol", "getColumn", ss);
    obj["sumsColumn"] = tryCache(budgetSheetName, "BigsSumHiddenCol", "getColumn", ss);
    obj["subCats"] = fillCatArray(bigExpCats, "bigexp_subcat", ss);

  } else if (strNew == "big_earning") {
    const bigEarnCats = tryCache(catSheetName, "CatalogueBigEarnSubs", "", ss).flat().filter(Boolean);
    obj["catalogueRangeName"] = "CatalogueBigEarnSubs";
    obj["column"] = tryCache(budgetSheetName, "BigExpensesVisualsCol", "getColumn", ss);
    obj["sumsColumn"] = tryCache(budgetSheetName, "BigsSumHiddenCol", "getColumn", ss);
    obj["subCats"] = fillCatArray(bigEarnCats, "bigearn_subcat", ss);

  } 
  
  if (type == "category") {
    const catsList = tryCache(catSheetName, "Categories", "", ss).flat().filter(Boolean);
    obj["listPosition"] = catsList.indexOf(str);
    const usageStats = getSubCatsUsage(str, ss);
    for (i in obj["subCats"]) {
      const currFullName = obj["subCats"][i].fullName;

      if (usageStats[currFullName]) { // subcat can be absent from the object for a variety of reasons
        obj.subCats[i]["amount"] = usageStats[currFullName].amount;
        obj.subCats[i]["lastUsed"] = DateToValue(new Date(usageStats[currFullName].lastUsed).clearTime());
      } else {
        obj.subCats[i]["amount"] = 0;
        obj.subCats[i]["lastUsed"] = 0;
      }
    }


  } else if (type == "daily_subcat") {
    obj["column"] = index + tryCache(budgetSheetName, "DailyExpenses", "getColumn", ss);
  } else if ((type == "bigexp_subcat") || (type == "bigearn_subcat") || (type == "pred_subcat")) {
    //
  }

  // console.log(JSON.stringify(obj))
  return obj;
}



function getCatInfoByFullName(name, type, output, catsObject) {
  if (!catsObject) {catsObject = tryCache("CategoryObjects")};
  for (i in catsObject) {
    if (catsObject[i].type == type && catsObject[i].fullName == name) {
      return catsObject[i][output];
    }
    for (x in catsObject[i].subCats) {
      if (catsObject[i].subCats[x].type == type && catsObject[i].subCats[x].fullName == name) {
        return catsObject[i].subCats[x][output];
      }
    }
  }
}

function makeRangeName(sheetName, rangeName) {
  return sheetName + "!" + rangeName;
}

function ValueToDate(GoogleDateValue) {
  return new Date(new Date(1899, 11, 30 + Math.floor(GoogleDateValue), 0, 0, 0, 0).getTime() + (GoogleDateValue % 1) * 86400000);
}

function DateToValue(dt) {
  return 25569 + (dt.getTime() - dt.getTimezoneOffset() * 60000) / 86400000;
}

function diffInDays(date1, date2) {

  const Difference_In_Time = new Date(date2).getTime() - new Date(date1).getTime();
  const Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);

  return Math.round(Difference_In_Days);
}

function transposeArray(arr) {
  return arr[0].map((_, colIndex) => arr.map(row => row[colIndex]));
}

Date.prototype.clearTime = function () {
  var date = new Date(this.valueOf());
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toUsersTimezone(date, spreadsheet, timezone, type) {

  if (!date) {return null};
  date = new Date(date);
  if (!timezone) {
    const ss = spreadsheet? spreadsheet : getSpreadSheet();
    timezone = ss.getSpreadsheetTimeZone();
  }

  if (type == "iso") {return Utilities.formatDate(date, timezone, "yyyy-MM-dd")}
  else if (type == "iso8601") {return Utilities.formatDate(date, timezone, "yyyy-MM-dd")+"T00:00:00"}
  else if (type == true) {return Utilities.formatDate(date, timezone, "dd/MM/yyyy HH:mm:ss")} 
  else {return Utilities.formatDate(date, timezone, "dd/MM/yyyy")}
  
}

Date.prototype.simplify = function () {
  var date = new Date(this.valueOf());
  date = Utilities.formatDate(date, 'GMT+3', 'dd/MM/yyyy');
  return date;
}

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

Date.prototype.addMinutes = function(h) {
  this.setTime(this.getTime() +  h * 60000);
  return this;
}

function getTimezoneOffset(date, scriptTimeZone, userTimeZone) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: scriptTimeZone }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone:  userTimeZone}));
  return (tzDate.getTime() - utcDate.getTime()) / 6e4;
}

Date.prototype.getWeek = function() {
  var onejan = new Date(this.getFullYear(),0,1);
  var today = new Date(this.getFullYear(),this.getMonth(),this.getDate());
  var dayOfYear = ((today - onejan + 86400000)/86400000);
  return Math.ceil(dayOfYear/7)
};

Number.prototype.isDivBy = function (num) {
  return (this % num == 0)
}

String.prototype.simpleToDate = function () {

  const string = this.split("/");
  const day = string[0];
  const month = string[1];
  const year = string[2];

  return new Date(year, month - 1, day)
}


function transliterate(word) {
  var a = { "Ё": "YO", "Й": "I", "Ц": "TS", "У": "U", "К": "K", "Е": "E", "Н": "N", "Г": "G", "Ш": "SH", "Щ": "SCH", "З": "Z", "Х": "H", "Ъ": "'", "ё": "yo", "й": "i", "ц": "ts", "у": "u", "к": "k", "е": "e", "н": "n", "г": "g", "ш": "sh", "щ": "sch", "з": "z", "х": "h", "ъ": "'", "Ф": "F", "Ы": "I", "В": "V", "А": "A", "П": "P", "Р": "R", "О": "O", "Л": "L", "Д": "D", "Ж": "ZH", "Э": "E", "ф": "f", "ы": "i", "в": "v", "а": "a", "п": "p", "р": "r", "о": "o", "л": "l", "д": "d", "ж": "zh", "э": "e", "Я": "Ya", "Ч": "CH", "С": "S", "М": "M", "И": "I", "Т": "T", "Ь": "'", "Б": "B", "Ю": "YU", "я": "ya", "ч": "ch", "с": "s", "м": "m", "и": "i", "т": "t", "ь": "'", "б": "b", "ю": "yu" };

  return word.split('').map(function (char) {
    return a[char] || char;
  }).join("");
}

function omit(key, obj) {

  for (let i = 0; i < key.length; i++) {
    const currKey = key[i];
    if (obj[currKey]) {
      const { [currKey]: omitted, ...rest } = obj;
      obj = rest;
    }
  }
  return obj;
}

function removeEmoji(str) {

 // console.log("removeEmoji received " + str + ", caller: " + removeEmoji.caller.name);
  str = String(str);

  const emojiRegExp = new RegExp(/(\p{EPres}|\p{ExtPict})(\u200d(\p{EPres}|\p{ExtPict}))*/gu);
  const emoji = str.match(emojiRegExp) ? str.match(emojiRegExp)[0] : null;
  const cleanStr = str.replaceAll(emojiRegExp, "").trim();

  return [cleanStr, emoji, str]
}

function makeShortName(str) {

  const strLow = transliterate(String(str).toLowerCase());
  const specialRegExp = new RegExp(/[^a-zA-Z0-9 ]/g);
  const strNoEmoji = removeEmoji(strLow)[0];
  const strNoSpec = strNoEmoji.replaceAll(specialRegExp, "");
  const strNew = strNoSpec.trim().replaceAll(" ", "_");

  return strNew;
}