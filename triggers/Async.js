/*
* Async.gs
*
* Manages asyncronous execution via time-based triggers.
*
* Note that execution normally takes 30-60s due to scheduling of the trigger.
*
* @see https://developers.google.com/apps-script/reference/script/clock-trigger-builder.html
*/

var Async = Async || {};
var GLOBAL = this;

// Triggers asynchronous execution of a function (with arguments as extra parameters)
Async.call = function(handlerName) {
  return Async.apply(handlerName, Array.prototype.slice.call(arguments, 1));
};

// Triggers asynchronous execution of a function (with arguments as an array)
Async.apply = function(handlerName, args) {
  var trigger = ScriptApp
  .newTrigger('Async_handler')
  .timeBased()
  .after(1)
  .create();
  CacheService.getScriptCache().put(String(trigger.getUniqueId()), JSON.stringify({ handlerName: handlerName, args: args }));
  return { 
    triggerUid: trigger.getUniqueId(),
    source: String(trigger.getTriggerSource()), 
    eventType: String(trigger.getEventType()), 
    handlerName: handlerName,
    args: args
  };
};

// GENERIC HANDLING BELOW
// 
function Async_handler(e) {
  var triggerUid = e && e.triggerUid;
  var cache = CacheService.getScriptCache().get(triggerUid);
  if (cache) {
    try {
      var event = JSON.parse(cache);
      var handlerName = event && event.handlerName;
      var args = event && event.args;
      if (handlerName) {
        var context, fn = handlerName.split('.').reduce(function(parent, prop) {
          context = parent;
          return parent && parent[prop];
        }, GLOBAL);
        if (!fn || !fn.apply) throw "Handler `" + handlerName + "` does not exist! Exiting..";
        // Execute with arguments
        fn.apply(context, args || []);
      }
    } catch (e) {
      console.error(e);
    }
  }
  // Delete the trigger, it only needs to be executed once
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getUniqueId() === triggerUid) {
      ScriptApp.deleteTrigger(t);
    }
  });
};