function onSheetEdit(e) {

  const id = e.source.getId();
  const changedSheet = e.range.getSheet();
  const changedSheetName = changedSheet.getName();
  const changedRow = Number(e.range.getRow());
  const changedColumn = Number(e.range.getColumn());

  const oldValue = e.oldValue;
  const newValue = e.value;
  //const changedCell = e.range;
  console.log("Some data was changed: \n" + [changedSheetName, changedRow, changedColumn] + "\nOld value: " + oldValue + "\nNew value: " + newValue)

  if (changedSheetName == logSheetName) {

    // processLogChanges(changedRow, changedColumn, oldValue, newValue, spreadsheet);

  } else if (changedSheetName == predSheetName) {

    //processPredSheetChanges(changedRow, changedColumn, oldValue, newValue);
    processPredSheetChangesNew(changedRow, changedColumn, oldValue, newValue, changedSheet, id);

  } else if (changedSheetName == budgetSheetName && changedColumn == tryCache(budgetSheetName, "DateColumnWithCheckboxes", "getLastColumn")) {
    refreshStatStartDate();
  }
  
  else {
    console.log(changedSheetName + " sheet not supported. Halt")
  }

}
