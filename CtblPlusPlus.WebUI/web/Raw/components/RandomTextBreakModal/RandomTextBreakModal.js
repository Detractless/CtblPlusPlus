
import { getMaxZ } from '../Modal/Modal';
import { toHtml } from '../../utils/formatString';
import { updateOverview } from '../../pages/OverviewPage/OverviewPage';
import { AppState } from '../../store/AppState';

export function requestUnlockRandomText(correctText, showDiff, clearOnFail, unlockCallback, continueRestrictionsCallback, showRestrictionsButton) {
  var isEnterPressed = false;
  var isShaking = false;
  var $dialogRandomText = $("#dialog-randomText");
  $dialogRandomText.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "80%",
    draggable: false,
    title: "Random Text Required",
    open: function () {
      $dialogRandomText.off("keydown").on("keydown", function (event) {
        if (event.which == 27 && $("#dialog-randomText-text").val() != "") {
          return false;
        }
      });
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        if ($("#dialog-randomText-text").val() == "") {
          $dialogRandomText.dialog("close");
        }
      });
      $("#dialog-randomText-label").html(toHtml(correctText).replace(/\n/g, "<br>"));
      $("#dialog-randomText-text").prop("disabled", false);
      $("#dialog-randomText-text").val("").on("keypress", function (event) {
        if (correctText.indexOf("\n") < 0 && event.which == 13) {
          event.preventDefault();
          $("#dialog-randomText-unlock").click();
          isEnterPressed = true;
        }
      }).bind("copy paste", function (event) {
        event.preventDefault();
      }).on("keyup", function (event) {
        isEnterPressed = false;
        var maxZIndex = getMaxZ($(".ui-widget-overlay"));
        if ($("#dialog-randomText-text").val() == "") {
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZIndex;
          }).css({
            cursor: "pointer"
          });
        } else {
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZIndex;
          }).css({
            cursor: "default"
          });
        }
      });
      if (!showRestrictionsButton) {
        $("#btn-continue-randomText").hide();
      }
      $("#dialog-randomText-text").focus();
    },
    close: function () {
      $dialogRandomText.hide();
      $dialogRandomText.dialog("destroy");
      $("#dialog-randomText-text").off("keypress");
      $("#dialog-randomText-text").off("keyup");
    },
    buttons: {
      Cancel: {
        class: "btn-grey-dialog",
        text: "Cancel",
        click: function () {
          $dialogRandomText.dialog("close");
        }
      },
      "Continue with restrictions": {
        id: "btn-continue-randomText",
        class: "btn-grey-dialog",
        text: "Continue with restrictions",
        click: function () {
          $dialogRandomText.dialog("close");
          continueRestrictionsCallback();
        }
      },
      Unlock: {
        class: "btn-green-dialog",
        text: "Unlock",
        id: "dialog-randomText-unlock",
        click: function () {
          if (!isShaking && !isEnterPressed) {
            var enteredText = $("#dialog-randomText-text").val().replace(/(\r\n|\r|\n)/g, "\n").normalizeCustomText();
            if (enteredText == correctText) {
              $dialogRandomText.dialog("close");
              unlockCallback();
            } else {
              if (showDiff) {
                $("#dialog-randomText-label").html(toHtml(correctText).replace(/\n/g, "<br>"));
                var firstDiffIndex = findFirstDiff(correctText, enteredText);
                if (firstDiffIndex > 0) {
                  var diffOffset = correctText.length <= firstDiffIndex ? -1 : 0;
                  firstDiffIndex += diffOffset;
                }
                $("#dialog-randomText-label").html(toHtml(replaceAt(correctText, correctText[firstDiffIndex], "\\start\\" + correctText[firstDiffIndex].replace("\n", "_\\newline\\").replace(" ", "_") + "\\end\\", firstDiffIndex, firstDiffIndex + 1)).replace("\\start\\", "<span id=\"dialog-randomText-error\" class=\"red\">").replace("\\end\\", "</span>").replace("\\newline\\", "<br>").replace(/\n/g, "<br>"));
              }
              isShaking = true;
              $("#dialog-randomText").parent().effect("shake", function () {
                isShaking = false;
                if (showDiff) {
                  var scrollOffset = $("#dialog-randomText-error").position().top - $("#dialog-randomText-label").position().top - parseFloat($("#dialog-randomText-label").css("padding-top")) - parseFloat($("#dialog-randomText-label").css("margin-top"));
                  $("#dialog-randomText-label").scrollTop(scrollOffset);
                }
                if (clearOnFail) {
                  $("#dialog-randomText-text").val("");
                }
              });
            }
          }
        }
      }
    }
  }).show();
}

export function requestBreakRandomText(blockIndex, scheduleId) {
  var breakData;
  if (scheduleId == undefined) {
    breakData = settings.blocks[blockIndex].break;
  } else {
    $.each(settings.blocks[blockIndex].schedule, function (scheduleIndex, scheduleEntry) {
      if (scheduleEntry.id == scheduleId) {
        breakData = scheduleEntry.break;
        return false;
      }
    });
  }
  var breakParts = breakData.replace("randomText,", "").split(",");
  var fixedParts = breakParts.splice(0, 12);
  fixedParts.push(breakParts.join(","));
  var partLength = fixedParts[0];
  var partBreak = fixedParts[1];
  var partInterval = fixedParts[2];
  var partError = fixedParts[10];
  var partAction = fixedParts[11];
  var partText = fixedParts[12];
  var isShowError = fixedParts[10] == "show" ? true : false;
  var isClearAction = fixedParts[11] == "clear" ? true : false;
  var randomText = randomString(breakData);
  var isEnterPressed = false;
  var isShaking = false;
  var $dialogRandomText = $("#dialog-randomText");
  $dialogRandomText.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "80%",
    draggable: false,
    title: "Random Text Required",
    open: function () {
      $dialogRandomText.off("keydown").on("keydown", function (keydownEvent) {
        if (keydownEvent.which == 27 && $("#dialog-randomText-text").val() != "") {
          return false;
        }
      });
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        if ($("#dialog-randomText-text").val() == "") {
          $dialogRandomText.dialog("close");
        }
      });
      $("#dialog-randomText-label").html(toHtml(randomText).replace(/\n/g, "<br>"));
      $("#dialog-randomText-text").prop("disabled", false);
      $("#dialog-randomText-text").val("").on("keypress", function (keypressEvent) {
        if (randomText.indexOf("\n") < 0 && keypressEvent.which == 13) {
          keypressEvent.preventDefault();
          $("#dialog-randomText-unlock").click();
          isEnterPressed = true;
        }
      }).bind("copy paste", function (copyPasteEvent) {
        copyPasteEvent.preventDefault();
      }).on("keyup", function (keyupEvent) {
        isEnterPressed = false;
        var maxZKeyup = getMaxZ($(".ui-widget-overlay"));
        if ($("#dialog-randomText-text").val() == "") {
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZKeyup;
          }).css({
            cursor: "pointer"
          });
        } else {
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZKeyup;
          }).css({
            cursor: "default"
          });
        }
      });
      $("#dialog-randomText-text").focus();
    },
    close: function () {
      $dialogRandomText.hide();
      $dialogRandomText.dialog("destroy");
      $("#dialog-randomText-text").off("keypress");
      $("#dialog-randomText-text").off("keyup");
    },
    buttons: {
      Cancel: {
        class: "btn-grey-dialog",
        text: "Cancel",
        click: function () {
          $dialogRandomText.dialog("close");
        }
      },
      Unlock: {
        class: "btn-green-dialog",
        text: "Unlock",
        id: "dialog-randomText-unlock",
        click: function () {
          if (!isShaking && !isEnterPressed) {
            var inputText = $("#dialog-randomText-text").val().replace(/(\r\n|\r|\n)/g, "\n").normalizeCustomText();
            if (inputText == randomText) {
              $dialogRandomText.dialog("close");
              var newBreakData;
              var breakEndTime = moment().add(parseInt(partBreak), "minutes").toDate();
              var breakEndStr = breakEndTime.getFullYear().toString() + "," + (breakEndTime.getMonth() + 1).toString() + "," + breakEndTime.getDate().toString() + "," + breakEndTime.getHours().toString() + "," + breakEndTime.getMinutes().toString() + "," + breakEndTime.getSeconds().toString();
              newBreakData = "randomText," + partLength + "," + partBreak + "," + partInterval + ",break," + breakEndStr + "," + partError + "," + partAction + "," + partText;
              if (scheduleId == undefined) {
                settings.blocks[blockIndex].break = newBreakData;
              } else {
                $.each(settings.blocks[blockIndex].schedule, function (schedIndex, schedEntry) {
                  if (schedEntry.id == scheduleId) {
                    settings.blocks[blockIndex].schedule[schedIndex].break = newBreakData;
                    return false;
                  }
                });
              }
              save();
              updateOverview();
            } else {
              if (isShowError) {
                $("#dialog-randomText-label").html(toHtml(randomText).replace(/\n/g, "<br>"));
                var diffIndex = findFirstDiff(randomText, inputText);
                if (diffIndex > 0) {
                  var offset = randomText.length <= diffIndex ? -1 : 0;
                  diffIndex += offset;
                }
                $("#dialog-randomText-label").html(toHtml(replaceAt(randomText, randomText[diffIndex], "\\start\\" + randomText[diffIndex].replace("\n", "_\\newline\\").replace(" ", "_") + "\\end\\", diffIndex, diffIndex + 1)).replace("\\start\\", "<span id=\"dialog-randomText-error\" class=\"red\">").replace("\\end\\", "</span>").replace("\\newline\\", "<br>").replace(/\n/g, "<br>"));
              }
              isShaking = true;
              $("#dialog-randomText").parent().effect("shake", function () {
                isShaking = false;
                if (isShowError) {
                  var scrollPos = $("#dialog-randomText-error").position().top - $("#dialog-randomText-label").position().top - parseFloat($("#dialog-randomText-label").css("padding-top")) - parseFloat($("#dialog-randomText-label").css("margin-top"));
                  $("#dialog-randomText-label").scrollTop(scrollPos);
                }
                if (isClearAction) {
                  $("#dialog-randomText-text").val("");
                }
              });
            }
          }
        }
      }
    }
  }).show();
}
export function cancelBreakRandomText(blockIndex, scheduleId) {
  var breakData;
  if (scheduleId == undefined) {
    breakData = settings.blocks[blockIndex].break;
  } else {
    $.each(settings.blocks[blockIndex].schedule, function (scheduleIndex, scheduleEntry) {
      if (scheduleEntry.id == scheduleId) {
        breakData = scheduleEntry.break;
        return false;
      }
    });
  }
  var breakParts = breakData.replace("randomText,", "").split(",");
  var fixedParts = breakParts.splice(0, 12);
  fixedParts.push(breakParts.join(","));
  var partLength = fixedParts[0];
  var partBreak = fixedParts[1];
  var partInterval = fixedParts[2];
  var partError = fixedParts[10];
  var partAction = fixedParts[11];
  var partText = fixedParts[12];
  var newBreakData = "randomText," + partLength + "," + partBreak + "," + partInterval + ",none,0,0,0,0,0,0," + partError + "," + partAction + "," + partText;
  if (scheduleId == undefined) {
    settings.blocks[blockIndex].break = newBreakData;
  } else {
    $.each(settings.blocks[blockIndex].schedule, function (schedIndex, schedEntry) {
      if (schedEntry.id == scheduleId) {
        settings.blocks[blockIndex].schedule[schedIndex].break = newBreakData;
        return false;
      }
    });
  }
  save();
  updateOverview();
}
export function findFirstDiff(str1, str2) {
  var index = 0;
  while (str1[index] == str2[index]) {
    index++;
  }
  return index;
}
export function replaceAt(str, search, replace, start, end) {
  return str.slice(0, start) + str.slice(start, end).replace(search, replace) + str.slice(end);
}

export function updateRandomTextDisplay(lockId, textType, textLength, customText) {
  if (textType == "words") {
    if (!isNaN(textLength) && textLength > 0 && textLength < 5001) {
      var totalChars = Math.ceil(textLength / 6.75);
      var maxMinutes = Math.round(totalChars / 20);
      var minMinutes = Math.round(totalChars / 50);
      var maxSeconds = Math.round(totalChars / 20 * 60);
      var minSeconds = Math.round(totalChars / 50 * 60);
      if (minSeconds < 60) {
        if (maxSeconds == minSeconds) {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(maxSeconds).toString() + " seconds</span> to type and look like this:");
        } else {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(minSeconds).toString() + " - " + Math.round(maxSeconds).toString() + " seconds</span> to type and look like this:");
        }
      } else if (maxMinutes == minMinutes) {
        if (maxMinutes == 1) {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about a minute</span> to type and look like this:");
        } else {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(minMinutes).toString() + " minutes</span> to type and look like this:");
        }
      } else {
        $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(minMinutes).toString() + " - " + Math.round(maxMinutes).toString() + " minutes</span> to type and look like this:");
      }
      var generatedString = randomString(textLength, textType);
      $("#edit-" + lockId + "-randomText-example").val(generatedString);
      $("#edit-" + lockId + "-randomText-example").attr("readonly", true);
    } else {
      $("#edit-" + lockId + "-randomText-time").html("&nbsp;");
      $("#edit-" + lockId + "-randomText-example").val("Random text length must be between 1 (or locked value) and 5000.");
      $("#edit-" + lockId + "-randomText-example").attr("readonly", true);
    }
    $(".edit-" + lockId + "-randomTextLength-containerAlt").hide();
    $(".edit-" + lockId + "-randomTextLength-container").show();
    $("#edit-" + lockId + "-randomTextLength").focus();
  } else if (textType == "chars") {
    if (!isNaN(textLength) && textLength > 0 && textLength < 5001) {
      var maxMinutes = Math.round(textLength * 1.4 / 60);
      var minMinutes = Math.round(textLength * 0.7 / 60);
      var maxSeconds = Math.round(textLength * 1.4);
      var minSeconds = Math.round(textLength * 0.7);
      if (minSeconds < 60) {
        if (maxSeconds == minSeconds) {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(maxSeconds).toString() + " seconds</span> to type and look like this:");
        } else {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(minSeconds).toString() + " - " + Math.round(maxSeconds).toString() + " seconds</span> to type and look like this:");
        }
      } else if (maxMinutes == minMinutes) {
        if (maxMinutes == 1) {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about a minute</span> to type and look like this:");
        } else {
          $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(minMinutes).toString() + " minutes</span> to type and look like this:");
        }
      } else {
        $("#edit-" + lockId + "-randomText-time").html("The random text will take <span class=\"bold\">about " + Math.round(minMinutes).toString() + " - " + Math.round(maxMinutes).toString() + " minutes</span> to type and look like this:");
      }
      var generatedString = randomString(textLength, textType);
      $("#edit-" + lockId + "-randomText-example").val(generatedString);
      $("#edit-" + lockId + "-randomText-example").prop("readonly", true);
    } else {
      $("#edit-" + lockId + "-randomText-time").html("&nbsp;");
      $("#edit-" + lockId + "-randomText-example").val("Random text length must be between 1 (or locked value) and 5000.");
      $("#edit-" + lockId + "-randomText-example").prop("readonly", true);
    }
    $(".edit-" + lockId + "-randomTextLength-containerAlt").hide();
    $(".edit-" + lockId + "-randomTextLength-container").show();
    $("#edit-" + lockId + "-randomTextLength").focus();
  } else if (textType == "custom") {
    $("#edit-" + lockId + "-randomText-time").html("Enter custom text");
    $("#edit-" + lockId + "-randomText-example").val(customText);
    $("#edit-" + lockId + "-randomText-example").prop("readonly", false).focus();
    $(".edit-" + lockId + "-randomTextLength-container").hide();
    $(".edit-" + lockId + "-randomTextLength-containerAlt").show();
  } else {
    return "&nbsp;";
  }
}
export function randomString(configOrLength, typeParam) {
  var wordsList = ["ability", "access", "accident", "account", "act", "action", "activity", "actor", "ad", "addition", "address", "administration", "advantage", "advertising", "advice", "age", "agency", "agreement", "air", "airport", "ambition", "amount", "analysis", "analyst", "animal", "answer", "apartment", "appearance", "apple", "application", "appointment", "area", "argument", "arrival", "art", "article", "aspect", "assignment", "assistance", "assistant", "association", "assumption", "atmosphere", "attempt", "attention", "attitude", "audience", "aunt", "average", "awareness", "back", "bad", "balance", "ball", "bank", "baseball", "basis", "basket", "bath", "beer", "beginning", "benefit", "bird", "birthday", "bit", "board", "boat", "body", "bonus", "book", "boss", "bottom", "box", "bread", "breath", "building", "bus", "business", "buyer", "cabinet", "camera", "candidate", "capital", "car", "card", "care", "career", "case", "cash", "cat", "category", "cause", "celebration", "cell", "championship", "chance", "chapter", "charity", "cheek", "chemistry", "chest", "chicken", "child", "childhood", "chocolate", "choice", "church", "city", "class", "classroom", "client", "climate", "clothes", "coast", "coffee", "collection", "college", "combination", "committee", "communication", "community", "company", "comparison", "competition", "complaint", "computer", "concept", "conclusion", "condition", "confusion", "connection", "consequence", "construction", "contact", "context", "contract", "contribution", "conversation", "cookie", "country", "county", "courage", "course", "cousin", "craft", "credit", "criticism", "culture", "currency", "customer", "cycle", "data", "database", "date", "day", "dealer", "decision", "definition", "delivery", "demand", "department", "departure", "depth", "description", "design", "desk", "development", "device", "diamond", "difference", "difficulty", "dinner", "direction", "director", "dirt", "disaster", "discipline", "discussion", "disease", "disk", "distribution", "drama", "drawer", "drawing", "driver", "ear", "earth", "economics", "economy", "editor", "education", "effect", "efficiency", "effort", "egg", "election", "elevator", "emotion", "emphasis", "end", "energy", "engine", "entertainment", "enthusiasm", "entry", "environment", "equipment", "error", "estate", "event", "exam", "examination", "example", "exchange", "excitement", "exercise", "experience", "explanation", "expression", "extent", "eye", "face", "fact", "farmer", "feature", "feedback", "field", "figure", "film", "finding", "fire", "fish", "flight", "focus", "food", "football", "force", "form", "fortune", "foundation", "frame", "freedom", "friendship", "fun", "funeral", "future", "game", "garbage", "garden", "gate", "gene", "gift", "goal", "government", "grocery", "group", "growth", "guest", "guidance", "guide", "guitar", "hair", "half", "hall", "hand", "hat", "head", "health", "hearing", "heart", "heat", "height", "highway", "historian", "history", "home", "homework", "honey", "hope", "hospital", "hotel", "ice", "idea", "image", "imagination", "impact", "importance", "impression", "improvement", "income", "independence", "indication", "industry", "inflation", "information", "initiative", "injury", "insect", "inside", "inspection", "inspector", "instance", "instruction", "insurance", "intention", "interaction", "interest", "internet", "introduction", "investment", "issue", "item", "key", "kind", "king", "knowledge", "lab", "ladder", "lady", "lake", "language", "law", "leader", "leadership", "length", "level", "library", "life", "light", "line", "link", "list", "literature", "location", "machine", "magazine", "maintenance", "mall", "management", "manager", "manufacturer", "map", "market", "marketing", "material", "math", "matter", "meal", "meaning", "measurement", "meat", "media", "medicine", "medium", "member", "membership", "memory", "menu", "message", "metal", "method", "midnight", "mind", "mixture", "mode", "moment", "money", "month", "mood", "morning", "mouse", "movie", "mud", "music", "name", "nation", "nature", "negotiation", "network", "news", "newspaper", "night", "note", "nothing", "number", "object", "obligation", "office", "operation", "opinion", "opportunity", "orange", "order", "organization", "outcome", "outside", "oven", "page", "paint", "painting", "paper", "part", "passenger", "passion", "patience", "payment", "penalty", "people", "percentage", "perception", "performance", "period", "permission", "person", "personality", "perspective", "philosophy", "phone", "photo", "physics", "piano", "picture", "pie", "piece", "pizza", "place", "plan", "platform", "player", "poem", "poet", "poetry", "point", "policy", "politics", "pollution", "population", "position", "possession", "possibility", "post", "potato", "power", "practice", "preference", "preparation", "presence", "presentation", "president", "pressure", "price", "priority", "problem", "procedure", "process", "product", "profession", "professor", "profit", "program", "promotion", "property", "proposal", "protection", "psychology", "purpose", "quality", "quantity", "queen", "question", "radio", "range", "rate", "ratio", "reaction", "reality", "reason", "reception", "recipe", "recognition", "recommendation", "record", "recording", "reflection", "refrigerator", "region", "replacement", "republic", "reputation", "requirement", "research", "resolution", "resource", "response", "responsibility", "restaurant", "result", "revenue", "review", "revolution", "risk", "river", "road", "rock", "role", "room", "rule", "safety", "salad", "salt", "sample", "satisfaction", "scale", "scene", "school", "science", "screen", "secretary", "section", "sector", "security", "selection", "sense", "series", "service", "session", "setting", "shape", "share", "shirt", "side", "sign", "signature", "significance", "singer", "sister", "site", "situation", "size", "skill", "society", "software", "soil", "solution", "song", "sound", "soup", "source", "space", "speaker", "speech", "sport", "square", "standard", "star", "state", "statement", "steak", "step", "stock", "storage", "store", "story", "strategy", "structure", "student", "studio", "study", "style", "subject", "success", "suggestion", "sun", "supermarket", "surgery", "sympathy", "system", "table", "tale", "task", "tax", "tea", "teacher", "technology", "television", "temperature", "tennis", "tension", "term", "test", "thanks", "theory", "thing", "thought", "time", "top", "topic", "town", "trade", "tradition", "trainer", "training", "transportation", "truth", "type", "understanding", "union", "unit", "university", "user", "value", "variation", "variety", "vehicle", "version", "video", "view", "village", "voice", "volume", "warning", "water", "way", "weakness", "wealth", "weather", "web", "week", "while", "wind", "winner", "wood", "word", "work", "worker", "world", "writer", "writing", "year"];
  var charsList = "@#&+12346789ABCDEFGHJKLMNOPQRTUVWXTZabcdefghikmnopqrstuvwxyz";
  var parsedLength = 1;
  var parsedType = "words";
  var parsedCustomText = "";
  var resultString = "";
  if (typeof configOrLength == "string") {
    if (configOrLength.indexOf("randomText,") == 0) {
      var configParts = configOrLength.replace("randomText,", "").split(",");
      var splicedParts = configParts.splice(0, 12);
      splicedParts.push(configParts.join(","));
      parsedLength = parseInt(splicedParts[0]);
      parsedType = splicedParts[2];
      parsedCustomText = splicedParts[12];
    } else {
      var configParts = configOrLength.split(",");
      var splicedParts = configParts.splice(0, 4);
      splicedParts.push(configParts.join(","));
      parsedLength = parseInt(splicedParts[0]);
      parsedType = splicedParts[1];
      parsedCustomText = splicedParts[4];
    }
  } else {
    parsedLength = configOrLength;
    if (typeof typeParam == "string") {
      parsedType = typeParam;
    }
  }
  if (parsedType == "words") {
    while (resultString.length < parsedLength) {
      var randomIndex = Math.floor(Math.random() * wordsList.length);
      resultString += wordsList[randomIndex] + " ";
    }
  } else if (parsedType == "chars") {
    for (var charIndex = 0; charIndex < parsedLength; charIndex++) {
      var randomIndex = Math.floor(Math.random() * charsList.length);
      resultString += charsList.substring(randomIndex, randomIndex + 1);
    }
  } else {
    resultString = parsedCustomText;
  }
  return resultString.replace(/[\t\v\f ]+/g, " ").trimEnd();
}
