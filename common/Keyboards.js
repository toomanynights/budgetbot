function fillKb(obj) {

  console.log("fillKb received " + JSON.stringify(obj));
  const newArr = [];

  for (i in obj) {
    console.log(obj[i])

    let dataObj = {
      type: obj[i].type
    }
    if (obj[i].type == "prediction") {
      dataObj.row = obj[i].id
    } else {
      dataObj.name = obj[i].shortName
    }
    const x = {
      text: obj[i].fullName,
      callback_data: JSON.stringify(dataObj)
    };
    newArr.push([x]);
  }

  const kb = {};
  kb.inline_keyboard = newArr;

  return kb;
}

function fillKbWithDates(offset, timezone) {

  const todayForUser = new Date(toUsersTimezone(today, "", timezone, "iso8601"))
  // const currDay = new Date(today).clearTime().addDays(-offset);
  const currDay = todayForUser.addDays(-offset);
  const currWeek = currDay.getWeek();
  const currDayOfWeek = currDay.getDay() == 0 ? 7 : currDay.getDay();
  const thisWeekMonday = currDay.addDays(1 - currDayOfWeek);
  const thisWeekSunday = currDay.addDays(7 - currDayOfWeek);
  const mondaysWeek = new Date(thisWeekMonday).getWeek();
  const mondaysYear = new Date(thisWeekMonday).getFullYear();

  const kbArr = [];

  let counter = thisWeekMonday;
  while (diffInDays(counter, todayForUser) >= 0 && diffInDays(counter, thisWeekSunday) >= 0) {

    const diffFromToday = diffInDays(counter, todayForUser)
    const fluffText = diffFromToday == 0 ? " (today)" : diffFromToday == 1 ? " (yesterday)" : (diffFromToday > 1 && diffFromToday < 7) ? " (" + diffFromToday + " days ago)" : diffFromToday == 7 ? " (a week ago)" : "";
    const month = counter.toLocaleString('en-US', { month: 'short' });
    const weekday = counter.toLocaleString('en-US', { weekday: 'short' });
    const day = counter.getDate();

    let buttonObj = {
      text: day + " " + month + ", " + weekday + fluffText,
      callback_data: JSON.stringify("date_" + DateToValue(counter))
    }
    kbArr.push([buttonObj]);
    counter = counter.addDays(1);
  }

  kbArr.push("");
  kbArr.reverse();

  // creating service buttons
  let centralButton = {
    text: "Week " + mondaysWeek + ", " + mondaysYear,
    callback_data: "false"
  };
  let pageForward = {
    text: offset ? "▶️" : " ",
    callback_data: offset ? JSON.stringify(["dates", "page_forward", offset]) : "false"
  };
  let pageBack = {
    text: "◀️",
    callback_data: JSON.stringify(["dates", "page_back", offset])
  };

  kbArr[0] = ([pageBack, centralButton, pageForward]);

  const kb = {};
  kb.inline_keyboard = kbArr;

  return kb;

}

function fillKbWithSortedSubCats(cat, offset, obj) {

  console.log("fillKbWithSortedSubCats received " + cat);
  let newArr = [];
  const itemsOnPage = 10;
  //const itemsInCol = 2;

  // 3 in a col
  // let arrCompact = [];
  // let counter = 0;
  // for (let i = 0; i < newArr.length; i++) {
  //   const iCount = i + 1;
  //   if (iCount.isDivBy(itemsInCol) && i > 0) {
  //     arrCompact.push([newArr[i - 2], newArr[i - 1], newArr[i]]);
  //     counter = 0;
  //   };
  //   if (!iCount.isDivBy(itemsInCol) && (i == (newArr.length - 1))) {
  //     for (let x = 0; x <= counter; x++) {
  //       arrCompact.push([newArr[i - x]]);
  //       counter = counter - 1;
  //     }
  //   };
  //   if (!iCount.isDivBy(itemsInCol)) {counter = counter + 1};
  // }


  // cat buttons
  const preparedCats = getMostUsedSubCats(cat, itemsOnPage, offset, obj)
  const subCatsArr = preparedCats[0];
  const remaining = preparedCats[1];

  if (subCatsArr.length > 0) {

    for (let i = 0; i < subCatsArr.length; i++) {
      let dataObj = {
        type: subCatsArr[i].type,
        name: subCatsArr[i].shortName // can't even add third property here, because 64 byte limit (FY TG)
      }
      let tempObj = {
        text: subCatsArr[i].fullName,
        callback_data: JSON.stringify(dataObj)
      };
      newArr.push(tempObj)
    }
  }

  let newSubCatButton = {
    text: "✏️ ADD NEW",
    callback_data: JSON.stringify([cat, "add_new_subcat"])
  };
  let pageForward = {
    text: remaining ? "▶️" : " ",
    callback_data: remaining ? JSON.stringify([cat, "page_forward", offset, itemsOnPage]) : "false"
  };
  let pageBack = {
    text: offset ? "◀️" : " ",
    callback_data: offset ? JSON.stringify([cat, "page_back", offset, itemsOnPage]) : "false"
  };


  let arrCompact = [];
  arrCompact.push([pageBack, newSubCatButton, pageForward]);
  for (let i = 1; i <= newArr.length; i++) {
    if (i.isDivBy(2) && i >= 2) { arrCompact.push([newArr[i - 2], newArr[i - 1]]) }
    if (!i.isDivBy(2) && (i == (newArr.length))) { arrCompact.push([newArr[i - 1]]) }
  }
  console.log(newArr)
  console.log(arrCompact)

  const kb = {};
  kb.inline_keyboard = arrCompact;
  console.log(arrCompact)

  return kb;
}


const forceReply = {
  "force_reply": true
}

function getAllActivePredsAsObj(sheetId) {

  console.log("Starting getAllActivePredsAsObj")
  const spreadsheet = getSpreadSheet(sheetId);
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  let predLogsFreshValues;
  predLogsFreshValues = getSpreadSheet(sheetId).getRange(makeRangeName(predSheetName, "Predictions")).getValues()
  console.log("Pred values: " + predLogsFreshValues )

  const predOffset = tryCache(predSheetName, "Predictions", "getRow", spreadsheet);
  var uniqueCheckArray = {};

  const predListLogHeaders = tryCache(predSheetName, "PredictionListLogHeaders", "", spreadsheet).flat();
  const statusIndex = predListLogHeaders.indexOf("Paid off?");
  const dateIndex = predListLogHeaders.indexOf("Date");
  const nameIndex = predListLogHeaders.indexOf("Name");
  const sumIndex = predListLogHeaders.indexOf("Sum");
  predLogsFreshValues.forEach(x => x[dateIndex] = toUsersTimezone(x[dateIndex], spreadsheet, timezone))

  for (var i = 0; i < predLogsFreshValues.length; i++) {
 
    if ((!predLogsFreshValues[i][statusIndex]) && (predLogsFreshValues[i][dateIndex])) { // check that it's not deleted and that there's a date

      // console.log("Checking undeleted pred: " + [i + predOffset, predLogsFreshValues[i]])
      const predDate = predLogsFreshValues[i][dateIndex];
      //const predDateForm = toUsersTimezone(predDate.clearTime());
      const predName = predLogsFreshValues[i][nameIndex];
      const predSum = predLogsFreshValues[i][sumIndex];
      const predRow = i + predOffset;
      const predId = predRow;
      

      if (!(Object.values(uniqueCheckArray).some(v => v.shortName == predName))) {
        // console.log("This one fits")
        //const finalDate = toUsersTimezone(predDate, spreadsheet, timezone);
        const predFullName = predDate + ", " + predName + ", " + predSum;
        uniqueCheckArray[predId] = {
          date: predDate,
          dateForm: predDate,
          sum: predSum,
          id: predRow,
          shortName: predName,
          fullName: predFullName,
          type: "prediction"
        };
        console.log(uniqueCheckArray[predId])
      }
    }
  }
  console.log("Returning preds: " + JSON.stringify(uniqueCheckArray))
  return uniqueCheckArray;
}



/*
const keyboard = {
  "inline_keyboard": [
    [{
      "text": "🍞 Groceries",
      "callback_data": "eatin"
    }],
    [{
      "text": "🥂 Restaurants",
      "callback_data": "eatout"
    }],
    [{
      "text": "🕺 Entertainment",
      "callback_data": "fun"
    }],
    [{
      "text": "🗄️ House & personal",
      "callback_data": "house"
    }],
    [{
      "text": "🚗 Transportation",
      "callback_data": "car"
    }],
    [{
      "text": "🤷 Other",
      "callback_data": "other"
    }]
  ]
};

{
    "inline_keyboard": [
        [
            {
                "text": "💸 Daily",
                "callback_data": "daily"
            }
        ],
        [
            {
                "text": "📉 Big expense",
                "callback_data": "big_expense"
            }
        ],
        [
            {
                "text": "📈 Big earning",
                "callback_data": "big_earning"
            }
        ],
        [
            {
                "text": "🔮 Prediction",
                "callback_data": "prediction"
            }
        ]
    ]
}const yesNoKeyboard = {
  "inline_keyboard": [
    [{
      "text": "✔️",
      "callback_data": "yes"
    }],
    [{
      "text": "❌",
      "callback_data": "no"
    }]
  ]
}
*/