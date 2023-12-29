function reBuildSubCatsInCatalogue() {

  const catsObj = tryCache("CategoryObjects");
  const arr = Object.keys(catsObj);
  const ss = getSpreadSheet();
  const logValues = ss.getRange(makeRangeName(logSheetName, "LogSheetLogValues")).getValues();
  const logHeaders = tryCache(logSheetName, "LogSheetHeaders").flat();
  const statusIndex = logHeaders.indexOf("Delete");
  const catIndex = logHeaders.indexOf("Category");
  const subCatIndex = logHeaders.indexOf("Subcategory");
  const logValuesFiltered = logValues.filter(x => x[0] && !x[statusIndex]);

  for (let i = 0; i < arr.length; i++) {

    let subCatsArr = [];
    const currCatFullName = catsObj[arr[i]].fullName;

    if (arr[i].startsWith("big")) {
      const currLogValues = logValuesFiltered.filter(x => x[catIndex] == currCatFullName);
      const currSubCats = currLogValues.map(x => x[subCatIndex]).filter((value, index, array) => array.indexOf(value) === index);
      currSubCats.forEach(x => subCatsArr.push([x]));

    } else if (arr[i] == "prediction") {

      const preds = getAllPredTypesAsObj();
      for (x in preds) {
        if (preds[x]) {
          subCatsArr.push([preds[x].Name]);
        }
      }
    }

    if (subCatsArr.length > 0) {
      console.log("Current subcats of " + currCatFullName + ": ")
      console.log(subCatsArr)

      const currCatRangeName = catsObj[arr[i]].catalogueRangeName;
      const currCatRange = ss.getRange(makeRangeName(catSheetName, currCatRangeName));
      const rangeValues = currCatRange.getValues();
      for (let x = 0; x < rangeValues.length; x++) {
        if (!subCatsArr[x]) {
          subCatsArr[x] = [""];
        }
      }
      currCatRange.setValues(subCatsArr);
    }

  }
}

function reOrderDailyCats(arr) {
  
  const newArr = JSON.parse(arr);
  const oldArr = tryCache(catSheetName, "CatalogueDailySubs").flat().filter(Boolean);

  if (newArr.toString() != oldArr.toString()) {
    console.log("Arrays differ!")
    console.log(oldArr)
    console.log(newArr)

    const oldArrFull = tryCache(catSheetName, "CatalogueDailySubs");
    let transArr = transposeArray([newArr]);
    transArr.length = oldArrFull.length;
    const offset = newArr.length;
    transArr.fill([""], offset);

    let finalArr = [];
    newArr.forEach(x => finalArr.push([x]));
    finalArr.length =  tryCache(catSheetName, "CatalogueDailySubs").length;
    finalArr.fill([""], offset);
    console.log(finalArr)

    applyNewSubCatsInCatalogue(finalArr, "CatalogueDailySubs")
    applyNewDailyTitlesToBudget(transArr, false);

  } else {
    console.log("Arrays are similar")
  }
  return "Daily cats reordered"
}

function renameDailyCat(oldName, newName) {

  console.log("Starting renameDailyCat")
  const oldArrFull = tryCache(catSheetName, "CatalogueDailySubs");
  const catIndex = oldArrFull.findIndex(x => x == oldName);

  oldArrFull[catIndex] = [newName];
  applyNewSubCatsInCatalogue(oldArrFull, "CatalogueDailySubs");
  // resetCatObject();
  applyNewDailyTitlesToBudget(oldArrFull, true);

  if (findLogRowsQBySubCat(oldName)) {
    replaceSubCatInAllLogs(oldName, newName);
  }

  return true;
}

function addSubCatToCatalogue(rangeName, subCat, catShortName, id, obj, anon) {

  let ss = getSpreadSheet(id);
  if (catShortName) {
    const catsObj = obj ? obj : tryCache("CategoryObjects");
    rangeName = catsObj[catShortName].catalogueRangeName;
  }
  const oldArrFull = ss.getRange(makeRangeName(catSheetName, rangeName)).getValues();
  const firstEmptyIndex = oldArrFull.findIndex(x => x == "");
  oldArrFull[firstEmptyIndex] = [subCat];

  applyNewSubCatsInCatalogue(oldArrFull, rangeName, ss, anon);
  // if (anon) { resetCatObject(true, id) } else {}

  return oldArrFull;

}

function removeSubCatFromCatalogue(rangeName, subCat) {

  const oldArrFull = tryCache(catSheetName, rangeName);
  const catIndex = oldArrFull.flat().findIndex(x => x == [subCat])

  oldArrFull.splice(catIndex, 1);
  oldArrFull.push([""]);

  applyNewSubCatsInCatalogue(oldArrFull, rangeName);

  return oldArrFull;

}

function applyNewSubCatsInCatalogue(arr, rangeName, spreadsheet, anon) {

  const ss = spreadsheet ? spreadsheet : getSpreadSheet();
  const id = ss.getId();
  console.log("applyNewSubCatsInCatalogue received: " + [arr, rangeName, spreadsheet])
  const range = ss.getRange(makeRangeName(catSheetName, rangeName));
  range.setValues(arr);
  if (!anon) {setProperty(catSheetName, rangeName)} 
  resetCatObject(anon, id)
  // resetCatObject(spreadsheet, spreadsheet);

}

function addNewDailyCat(cat) {

  console.log("Starting addNewDailyCat");
  addNewDailyColToBudget();

  const newArr = addSubCatToCatalogue("CatalogueDailySubs", cat);
  applyNewDailyTitlesToBudget(newArr, false);

  return true;

}

function removeDailySubCat(cat) {

  console.log("Starting removeDailySubCat");
  removeDailyCol();

  const oldArrFull = removeSubCatFromCatalogue("CatalogueDailySubs", cat);
  applyNewDailyTitlesToBudget(oldArrFull, false);

  return true;
  
}

function checkIfCatExists(subcat, cat, skipEmoji, obj, ssid) {

  if (!cat) {cat = "daily"};
  //const catRange = tryCache(catSheetName, "CatalogueDailySubs").flat().filter(Boolean);

  if (!ssid) {

    const catsObject = obj ? obj : tryCache("CategoryObjects");
    const subCatsRange = [];
    const subCatsObj = catsObject[cat].subCats;
  
    for (i in catsObject[cat].subCats) {
      subCatsRange.push(catsObject[cat].subCats[i].fullName);
    }
    const pureName = makeShortName(subcat);

    const allCats = [];
    Object.values(catsObject).forEach(function (item) {
      allCats.push(item.fullName);
      const subcats = Object.values(item.subCats);
      subcats.forEach(function(i) {
        allCats.push(i.fullName);
      })
    });
    const allCatsShort = [];
    allCats.forEach((x, index) => allCatsShort[index] = makeShortName(x));
  
    if (!skipEmoji && !removeEmoji(subcat)[1]) {return ["no_emoji", subcat]};
    if (subCatsRange.includes(subcat)) {return ["full_exists", subcat]};
    if (Object.keys(subCatsObj).includes(pureName)) {return ["short_exists", subcat, subCatsRange[Object.keys(subCatsObj).indexOf(pureName)]]};
    let catIndex = allCatsShort.indexOf(pureName);
    if (catIndex >= 0) {return ["other_exists", allCats[catIndex]]};
    return [false, subcat];

  } else {

    let ss;
    if (ssid) {ss = getSpreadSheet(ssid)}

    const rangeName = obj[cat].catalogueRangeName;
    const fullSubCats = ss.getRange(makeRangeName(catSheetName, rangeName)).getValues().flat().filter(Boolean);
    const shortSubCats = [];
    fullSubCats.forEach(x => shortSubCats.push(makeShortName(x)));
    const pureName = makeShortName(subcat);

    let allCats = [];
    const allTypes = ["Categories", "CataloguePlannedSubs", "CatalogueDailySubs", "CatalogueBigExpSubs", "CatalogueBigEarnSubs"];
    allTypes.forEach(x => allCats.push(ss.getRange(makeRangeName(catSheetName, x)).getValues().flat().filter(Boolean)))
    allCats = allCats.flat();
    const allCatsShort = [];
    allCats.forEach((x, index) => allCatsShort[index] = makeShortName(x));

    console.log(allCats)
    console.log(allCatsShort)

    if (fullSubCats.includes(subcat)) {return ["full_exists", subcat]};
    if (shortSubCats.includes(pureName)) {
      const index = shortSubCats.indexOf(pureName);
      return ["short_exists", subcat, fullSubCats[index]]
    };
    let catIndex = allCatsShort.indexOf(pureName);
    if (catIndex >= 0) {return ["other_exists", allCats[catIndex]]};
    return [false, subcat];

  }


}

function checkIfFullSubCatExistsInObject(subCat) {
  
  const catObjects = tryCache("CategoryObjects");
  const cats = Object.keys(catObjects);

  for (let i = 0; i < cats.length; i++) {
    const currCat = catObjects[cats[i]];
    if (!currCat.subCats) { continue };
    for (x in currCat.subCats) {
      if (subCat == currCat.subCats[x].fullName) {
        return currCat.shortName;
      }
    }
  }
  return false;
}
