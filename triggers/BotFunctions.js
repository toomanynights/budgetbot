function sendText(chatId, text, kb, replyid) {

  const token = PropertiesService.getScriptProperties().getProperty("token");
  const url = "https://api.telegram.org/bot" + token;

  var kbString;
  if (kb) {
    kbString = JSON.stringify(kb);
  }
  var data = {
    method: "post",
    payload:
    {
      method: "sendMessage",
      chat_id: String(chatId),
      text: text,
      parse_mode: "HTML",
      reply_markup: kbString,
      reply_to_message_id: replyid,
      allow_sending_without_reply: true
    }
  }
  UrlFetchApp.fetch(url + "/", data);
  console.log(JSON.stringify(data))
}

function deleteMessage(mid, cid) {

  const token = PropertiesService.getScriptProperties().getProperty("token");
  const url = "https://api.telegram.org/bot" + token;

  var data = {
    method: "post",
    payload:
    {
      method: "deleteMessage",
      chat_id: String(cid),
      message_id: String(mid)
    }
  }

  UrlFetchApp.fetch(url + "/", data)

}

function updateMessage(message, chat, kb) {

  const token = PropertiesService.getScriptProperties().getProperty("token");
  const url = "https://api.telegram.org/bot" + token;

  var data = {
    method: "post",
    payload:
    {
      method: "editMessageReplyMarkup",
      chat_id: String(chat),
      message_id: String(message),
      reply_markup: JSON.stringify(kb)
    }
  }

  UrlFetchApp.fetch(url + "/", data)

}

function updateMessageText(message, chat, text, kb) {

  const token = PropertiesService.getScriptProperties().getProperty("token");
  const url = "https://api.telegram.org/bot" + token;

  var data = {
    method: "post",
    payload:
    {
      method: "editMessageText",
      chat_id: String(chat),
      message_id: String(message),
      parse_mode: "HTML",
      text: text,
      reply_markup: JSON.stringify(kb)
    }
  }

  UrlFetchApp.fetch(url + "/", data)

}


function doPost(e) {

  const contents = JSON.parse(e.postData.contents);
  let chatId;

  if (contents.callback_query) { // in case of reaction, chat ID is stored somewhere else
    chatId = contents.callback_query.message.chat.id;
  } else {
    chatId = contents.message.chat.id;
  }

  let userObj = getUserScriptPropertyByValue("chatId", chatId);
  if (userObj) { userObj = JSON.parse(userObj)[1] };
  let sheetId; // do not remove!

  if (!userObj || !userObj.docId) {
    sendText(chatId, "🕵️ Your chat ID is: \n\n<code>" + chatId + "</code>\n\nCopy&paste it in the appropriate field in your sheet settings.");
    return;
  } else { sheetId = userObj.docId }

  // const ss = SpreadsheetApp.openById(sheetId); 
  // const scriptProps = PropertiesService.getScriptProperties();
  // const catsObject = JSON.parse(scriptProps.getProperty(sheetId + "_" + "CategoryObjects"));
  const catsObject = userObj.catsObject;
  const token = userObj.accessToken;
  const timezone = userObj.timezone;

  if (contents.callback_query) { // Received reaction

    let button = JSON.parse(contents.callback_query.data);
    console.log("Button was pressed: " + JSON.stringify(button))
    const messageId = contents.callback_query.message.message_id;
    //const chatId = contents.callback_query.message.chat.id;
    const text = contents.callback_query.message.text;

    const textObj = convTextToObj(text);
    // const textObj = requestExec(token, "convTextToObj", [text]);

    let dateLine = textObj?.body?.Date;
    if (!dateLine) { dateLine = "" } else { dateLine = "\nDate: " + dateLine }

    if (button.type == "category") { // Reaction is one of categories

      const catLongName = catsObject[button.name].fullName;
      const repliedMessageText = contents?.callback_query?.message?.reply_to_message?.text;
      let sum;
      if (repliedMessageText) {
        sum = repliedMessageText;
      } else {
        sum = textObj.body.Sum;
      }
      deleteMessage(messageId, chatId);

      console.log("Button is " + button.name)

      if (button.name == "daily") {

        const dailyCatsObj = catsObject[button.name].subCats;
        const keyboard = fillKb(dailyCatsObj);
        sendText(chatId, "<b>Submitting daily expense</b>\n\n" + "Type: " + catLongName + "\nSum: " + sum + dateLine + "\n\n🤨 What's the category?", keyboard);

      } else if (button.name == "big_expense") {

        // sendText(chatId, "<b>Submitting big expense</b>\n\n" + "Type: " + catLongName + "\nSum: " + repliedMessageText + "\n\n😒 What's the category?", forceReply);
        const kb = fillKbWithSortedSubCats(button.name, 0, catsObject)
        sendText(chatId, "<b>Submitting big expense</b>\n\n" + "Type: " + catLongName + "\nSum: " + sum + dateLine + "\n\n😒 What's the category? Pick one of existing ones or add a new one.", kb);

      } else if (button.name == "big_earning") {

        const kb = fillKbWithSortedSubCats(button.name, 0, catsObject)
        // sendText(chatId, "<b>Submitting big income</b>\n\n" + "Type: " + catLongName + "\nSum: " + repliedMessageText + "\n\n🤗 What's the category? Pick one of existing ones or add a new one.", forceReply);
        sendText(chatId, "<b>Submitting big income</b>\n\n" + "Type: " + catLongName + "\nSum: " + sum + dateLine + "\n\n🤗 What's the category? Pick one of existing ones or add a new one.", kb);

      } else if (button.name == "prediction") {

        const predictionsPredListKeyboard = fillKb(userObj.predsObject);

        if (userObj.predsObject) {
          sendText(chatId, "<b>Submitting prediction</b>\n\n" + "Type: " + catLongName + "\nSum: " + sum + dateLine + "\n\n😏 Which one is it?", predictionsPredListKeyboard);
        } else {
          sendText(chatId, "😨 You don't seem to have any predictions yet! Maybe add one?");
        }
      }

    } else if (button.type == "prediction") { // This is a prediction and we received a prediction ID now

      const activePredictions = userObj.predsObject;
      const predId = activePredictions[button.row].id;
      const predSubtype = activePredictions[button.row].shortName;
      const date = textObj.body.Date ? textObj.body.Date : toUsersTimezone(today, "", timezone);

      updateMessageText(messageId, chatId, "<b>Submitting prediction</b>" + "\n\nID: " + predId + "\nType: " + predSubtype + "\nDate (planned): " + activePredictions[button.row].dateForm + "\nDate (factual): " + date + "\nSum (planned): " + activePredictions[button.row].sum + "\nSum (factual): " + textObj.body.Sum + "\n\nGot it chief 🧙‍♂️");
      // submitPrediction(predId, date, textObj.body.Sum, ss, "", catsObject);
      requestExec(token, "submitPrediction", [predId, date, textObj.body.Sum, sheetId, catsObject])


    } else if (button.type == "daily_subcat") { // This is a daily expense's category

      //button = button.split(";")[1];
      const catLongName = catsObject.daily.subCats[button.name].fullName;
      const date = textObj.body.Date ? textObj.body.Date : toUsersTimezone(today, "", timezone);
      updateMessageText(messageId, chatId, "<b>Submitting daily expense</b>\n\n" + textObj.bodyUnformatted + "\nCategory: " + catLongName + "\n\nNoted ✏️");
      // addExpense("daily", button.name, textObj.body.Sum, toUsersTimezone(date, "", timezone), ss, catsObject);
      requestExec(token, "addExpense", ["daily", button.name, textObj.body.Sum, date, sheetId, catsObject])

    } else if (button.type == "bigearn_subcat" || button.type == "bigexp_subcat") { // got one of big subcats

      const catShortName = button.type == "bigearn_subcat" ? "big_earning" : "big_expense"; // i know it's ugly, but I'm too tired
      const subCatObj = catsObject[catShortName].subCats[button.name];
      const subCatLongName = subCatObj.fullName;
      const textObj = convTextToObj(text);
      const date = textObj.body.Date ? textObj.body.Date : toUsersTimezone(today, "", timezone);

      deleteMessage(messageId, chatId);
      sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\nCategory: " + subCatLongName + "\n\nGotcha 😎");

      // addExpense(catShortName, subCatLongName, textObj.body.Sum, toUsersTimezone(date, "", timezone), ss, catsObject);
      requestExec(token, "addExpense", [catShortName, subCatLongName, textObj.body.Sum, date, sheetId, catsObject])

    } else if (button[1] == "add_new_subcat") { // adding new subcat of big expense or earning

      //const catLongName = catsObject[button[0]].fullName;
      const textObj = convTextToObj(text);
      deleteMessage(messageId, chatId);

      if (button[0] == "big_expense") {
        sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\n\n😒 What's the category?", forceReply);
      } else if (button[0] == "big_earning") {
        sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\n\n🤗 What's the category?", forceReply);
      }

    } else if (button[1].startsWith("page")) { // this is pagination

      if (button[0] == "dates") { // this is pagination for keyboard with dates

        const offset = button[2];
        const buttonAction = button[1];
        const newOffset = buttonAction == "page_forward" ? offset - 7 : offset + 7;

        const kb = fillKbWithDates(newOffset, timezone);
        updateMessage(messageId, chatId, kb);

      } else { // this is pagination for subcats

        const catFromButton = button[0];
        const buttonAction = button[1];
        const offset = button[2];
        const itemsOnPage = button[3];

        const newOffset = buttonAction == "page_forward" ? offset + itemsOnPage : offset - itemsOnPage;
        const kb = fillKbWithSortedSubCats(catFromButton, newOffset, catsObject);
        updateMessage(messageId, chatId, kb);

      }
    } else if (button.startsWith("date")) { // received a date to submit expense

      // const date = toUsersTimezone(ValueToDate(button.split("_")[1]), "", timezone);
      const date = ValueToDate(button.split("_")[1]).simplify();
      deleteMessage(messageId, chatId);
      sendText(chatId, "<b>Submitting expense</b>\n\n" + "Date: " + date + "\n\n😬 How many did you spend?", forceReply);

    }

    else if (button == "yes" || button == "no") { // Not used

      // Removed at 13.10 14:49. No more use for those yet

    }

  } else if (contents.message.reply_to_message) { // Received reply.

    const text = contents.message.text;
    //const chatId = contents.message.chat.id;
    const messageId = contents.message.message_id;
    const repliedMessageText = contents.message.reply_to_message.text;
    const repliedMessageId = contents.message.reply_to_message.message_id;
    const textObj = convTextToObj(repliedMessageText);

    deleteMessage(messageId, chatId);
    deleteMessage(repliedMessageId, chatId);

    if (repliedMessageText && (textObj.title.startsWith("Submitting big"))) {

      const typeShortName = getCatInfoByFullName(textObj.body.Type, "category", "shortName", catsObject);
      const checkExistence = checkIfCatExists(text, typeShortName, true, catsObject);
      let subCat = text;
      if (checkExistence[0] == "short_exists") { subCat = checkExistence[2] };

      if (!checkExistence[0]) {
        sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\nCategory: " + subCat + "\n\nGotcha 😎");
        console.log(subCat + " seems to be a new subcat. Rebuilding cat object")
        // addSubCatToCatalogue("", subCat, typeShortName, sheetId, catsObject)
        requestExec(token, "addSubCatToCatalogue", ["", subCat, typeShortName, sheetId, catsObject, true])
        //resetCatObject(true, sheetId);


      } else if (checkExistence[0] == "full_exists" || checkExistence[0] == "short_exists") {
        sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\nCategory: " + subCat + "\n\nProvided category <b>" + text + "</b> looked too much like existing <b>" + subCat + "</b>. I took the liberty of merging them 👌");

      } else if (checkExistence[0] == "other_exists") {
        sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\n\n😨 Oh, no! A category just like this one already exists in another expense type: <b>" + checkExistence[1] + "</b>. Having repeating categories in different expense types can lead to all sorts of trouble.\nTry again?", forceReply);
        return;
      }

      const date = textObj.body.Date ? textObj.body.Date : toUsersTimezone(today, "", timezone);
      // addExpense(typeShortName, subCat, textObj.body.Sum, toUsersTimezone(date, "", timezone), ss, catsObject);
      requestExec(token, "addExpense", [typeShortName, subCat, textObj.body.Sum, date, sheetId, catsObject])

    } else if (repliedMessageText && (textObj.title.startsWith("Submitting expense"))) {

      // const expenseTypesObj = tryCache("CategoryObjects", "", "", sheetId);
      const expenseTypesKeyboard = fillKb(catsObject);
      sendText(chatId, "<b>" + textObj.title + "</b>\n\n" + textObj.bodyUnformatted + "\nSum: " + text + "\n\n🤔 What is this?", expenseTypesKeyboard, messageId);
    }
  }

  else if (contents.message) { // Received a message

    const text = contents.message.text;
    //const chatId = contents.message.chat.id;
    const messageId = contents.message.message_id;

    if (text == "/expense") {

      const kb = fillKbWithDates(0, timezone)
      sendText(chatId, "🤓 Just write any number and we'll go from there. For today's expenses you don't even have to use this command!\nAnd here you can choose a date.", kb);

    } else if (Number(text)) {

      const expenseTypesKeyboard = fillKb(catsObject);
      sendText(chatId, "🤔 What is this?", expenseTypesKeyboard, messageId);

    } else if (text == "/stats") {

      let statsText = getStats(sheetId, token, timezone);
      if (statsText[0] && statsText[0] == "error") {
        statsText = JSON.stringify(statsText[1]);
      }
      // const statsText = requestExec(token, "getStats", [sheetId])
      sendText(chatId, statsText)

    } else if (text == "/predictions") {

      const preds = predictionReminder(userObj.predsObject, timezone, chatId);
      if (!preds) {
        const values = Object.values(userObj.predsObject);
        if (values.length > 0) {
          let text = "😎 You don't have any predictions for today or overdue ones. Here are the closest ones you have: \n"
          values.forEach(x => text = text + "\n• " + x.fullName)
          text = text + "\n\nWant to submit any of those prematurely? Just send a number and we'll go from there."
          sendText(chatId, text)
        } else {
          sendText(chatId, "😨 You don't seem to have any predictions yet! Maybe add one?")
        }
      }

    } else if (text == "/spreadsheet") {

      sendText(chatId, "https://docs.google.com/spreadsheets/d/" + sheetId + "/edit")

    } else if (text == "test") {

      const kb = fillKbWithDates(0, timezone)
      sendText(chatId, "Testing new features are ya now", kb)

    } else {
      sendText(chatId, "Wrong format");
    }
  }
}

function convTextToObj(msg) {

  const obj = {};
  obj.title = msg.split("\n\n")[0];
  var body;
  var bod = {};

  if (msg.split("\n\n")[2]) {
    obj.bodyUnformatted = msg.split("\n\n")[1];
    body = msg.split("\n\n")[1];
    body = body.split("\n");
    for (i = 0; i < body.length; i++) {
      body[i] = body[i].split(": ");
      bod[body[i][0]] = body[i][1];
    }
    obj.body = bod;
    obj.footer = msg.split("\n\n")[2];
  } else if (msg.split("\n\n")[1]) {
    obj.footer = msg.split("\n\n")[1];
  } else {
    console.log("ERROR! Trying to convert text to object but it is in wrong format. Text: " + msg)
    return null;
  }

  return obj;
}

function getStats(id, token, timezone) {

  // const dailyObj = getBudgetStats(id);
  const dailyObj = JSON.parse(requestExec(token, "getBudgetStats", [id]));
  if (dailyObj[0] && dailyObj[0] == "error") {
    return dailyObj;
  }
  console.log(dailyObj)
  const todayForUser = toUsersTimezone(today, "", timezone)

  let text = "📋 Your statistics for today, <b>" + todayForUser + "</b>:\n\n";

  text = text + "• <b>Spent on daily stuff</b>: " + Number(dailyObj.dailyExpenses).toFixed(2) + "\n";
  text = text + "• <b>Big expense balance</b>: " + Number(dailyObj.bigsSum).toFixed(2) + "\n";
  text = text + "• <b>Account sum</b>: " + Number(dailyObj.sum).toFixed(2) + "\n";
  text = text + "• <b>Predicted sum</b>: " + Number(dailyObj.predictedSum).toFixed(2) + "\n";
  text = text + "\n";

  if (dailyObj.lowestSum.date == "-") {
    text = text + "🤷🏻 Can't calculate your lowest sum at this time. Come back later";
  } else {
    text = text + "Your account will reach the lowest point at <b>" + dailyObj.lowestSum.date + "</b>, sum: <b>" + Number(dailyObj.lowestSum.sum).toFixed(2) + "</b>. "
    if (Number(dailyObj.lowestSum.sum).toFixed(2) > 0) {text = text + "You may consider it your 'free money'.\n"}
    else {text = text + "Looks like you're a bit low at the moment. 😞\n"}
    if (dailyObj.lowestSumSecond.date == "-") {
      text = text + "🤷🏻 Your second lowest sum is currently unknown.\n"
    } else {
      text = text + "The second lowest point will be reached at <b>" + dailyObj.lowestSumSecond.date + "</b>, sum: <b>" + Number(dailyObj.lowestSumSecond.sum).toFixed(2) + "</b>.\n"
    }
    text = text + "\n";
  }

  text = text + dailyObj.predStatus + "\n\n";

  if (dailyObj.coverageFirst == "You have enough money until:") {
    text = text + "❗ You will run out of money on <b>" + dailyObj.coverageSecond + "</b>! Consider cutting your expenses." + "\n\n";
  } else if (dailyObj.coverageFirst == "You are in debt since:") {
    text = text + "‼️ You are in debt since <b>" + dailyObj.coverageSecond + "</b>! Hold on there..." + "\n\n";
  } else if (dailyObj.coverageFirst == "All expenses covered.") {
    text = text + dailyObj.coverageFirst + " " + dailyObj.coverageSecond + "\n\n";
  }
  text = text + "Want to know about your current predictions? Use /predictions command."

  return text;

}

function doGet(e) {
  //const props = PropertiesService.getUserProperties();
  //const testData = debugTestExec()
  //return HtmlService.createHtmlOutput(testData + JSON.stringify(e));
}

function requestExec(token, fName, arguments) {

  const scriptProps = PropertiesService.getScriptProperties();
  const appId = scriptProps.getProperty("appId");
  const execUrl = "https://script.google.com/macros/s/" + appId + "/exec";

  var options = {
    "method": "POST",
    "headers": { "Authorization": "Bearer " + token },
    "contentType": "application/json",
    "payload": JSON.stringify({
      "function": fName,
      'parameters': arguments
    }),
    "muteHttpExceptions": true
  }
  var rest = UrlFetchApp.fetch(execUrl, options)
  console.log(rest.getContentText())

  const response = JSON.parse(rest.getContentText());
  if (response.error) {
    console.error(response.error)
    return ["error", response.error]
  } else {
    return response.response.result
  }

}


function setWebHook() {

  const scriptProps = PropertiesService.getScriptProperties();
  const appId = scriptProps.getProperty("appId");
  const token = PropertiesService.getScriptProperties().getProperty("token");
  const response = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/setWebhook?url=" + "https://script.google.com/macros/s/" + appId +  "/exec")
  console.log(response.getContentText())
}

function authorizeWebApp() {

  const scriptProps = PropertiesService.getScriptProperties();
  const appId = scriptProps.getProperty("appId");
  var token = ScriptApp.getOAuthToken();
  const scriptURL = "https://script.google.com/macros/s/" + appId + "AKfycbw05zjG6F4fc8ZwjN_EulozSjgpy0liBjR4Jtc-8V1A51qwS9I9zJI5dj8c4aaPgK-CXQ/exec";
  var response = UrlFetchApp.fetch(scriptURL, {
    headers: { Authorization: 'Bearer ' + token },
    method: 'GET',
    //    payload:'nothing',
    muteHttpExceptions: true
  });
  console.log(response.getContentText())

}