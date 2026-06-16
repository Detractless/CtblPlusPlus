// ============================================================
// Chunk 26 of 28
// Original lines: 11702 - 12168 (467 lines)
// Contains: toggleStatisticsFeature, deleteStats, toHtml, fromHtml, addUrl, lastCustomSelectedIndex, customSelect, customSelectEdit, ...
// ============================================================
import { getMaxZ } from '../Modal/Modal';
import { updateSettings} from '../../pages/SettingsPage/SettingsPage';
import { escapeRegExp} from '../../utils/formatString';
import { AppState } from '../../store/AppState';
import { validateAndCleanUrl } from '../../utils/validateUrl';

export function toggleStatisticsFeature(settingKey) {
  var $dialogStatisticsFeatureWarning = $("#dialog-settings-toggle-locked-statistics-warning");
  $dialogStatisticsFeatureWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Are you sure?",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogStatisticsFeatureWarning.dialog("close");
      });
      $dialogStatisticsFeatureWarning.parent().focus();
    },
    close: function () {
      $dialogStatisticsFeatureWarning.dialog("destroy");
      $dialogStatisticsFeatureWarning.hide();
    },
    buttons: {
      "No, don't enable": {
        class: "btn-grey-dialog",
        text: "No, don't enable",
        click: function () {
          $dialogStatisticsFeatureWarning.dialog("close");
        }
      },
      "Yes, enable": {
        class: "btn-green-dialog",
        text: "Yes, enable",
        click: function () {
          $dialogStatisticsFeatureWarning.dialog("close");
          settings.settings[settingKey] = "true";
          updateSettings(true);
          save();
        }
      }
    }
  }).show();
}
export function deleteStats() {
  var $dialogDeleteStats = $("#dialog-settings-delete-statistics");
  $dialogDeleteStats.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Delete All Statistics?",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogDeleteStats.dialog("close");
      });
      $dialogDeleteStats.parent().focus();
    },
    close: function () {
      $dialogDeleteStats.dialog("destroy");
      $dialogDeleteStats.hide();
    },
    buttons: {
      "No, keep statistics": {
        class: "btn-grey-dialog",
        text: "No, keep statistics",
        click: function () {
          $dialogDeleteStats.dialog("close");
        }
      },
      "Yes, delete": {
        class: "btn-red-dialog",
        text: "Yes, delete",
        click: function () {
          $dialogDeleteStats.dialog("close");
          window.external.DeleteStats();
        }
      }
    }
  }).show();
}
export function toHtml(rawText) {
  return rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export function fromHtml(htmlText) {
  return htmlText.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#039;/g, "'");
}
export function addUrl(listType, url, isBatch) {
  var cleanedUrl = validateAndCleanUrl(url);
  lastCustomSelectedIndex = null;
  if (cleanedUrl != "" && cleanedUrl != "null") {
    if ($("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").length < 1) {
      if (listType == "exceptions") {
        var hasConflict = false;
        AppState.lockedBlockList.forEach(function (lockedUrl) {
          var lockedDomainPart = "";
          var normalizedLockedUrl = lockedUrl.replace(/\/$/, "").toLowerCase();
          var lockedDomain = normalizedLockedUrl.split("/")[0];
          var lockedDomainParts = lockedDomain.split(".");
          if ((lockedDomain.indexOf("localhost") != 0 || lockedDomain.indexOf("file") != 0 || lockedDomain.indexOf("chrome-extension") != 0 || lockedDomain.indexOf("moz-extension") != 0 || lockedDomain.indexOf("extension") != 0) && lockedDomainParts.length > 1) {
            lockedDomainPart = lockedDomainParts[lockedDomainParts.length - 2] + "." + lockedDomainParts[lockedDomainParts.length - 1];
          } else {
            lockedDomainPart = lockedDomain;
          }
          var newDomainPart = "";
          var normalizedNewUrl = cleanedUrl.replace(/\/$/, "").toLowerCase();
          var newDomain = normalizedNewUrl.split("/")[0];
          var newDomainParts = newDomain.split(".");
          if ((newDomain.indexOf("localhost") != 0 || newDomain.indexOf("file") != 0 || newDomain.indexOf("chrome-extension") != 0 || newDomain.indexOf("moz-extension") != 0 || newDomain.indexOf("extension") != 0) && newDomainParts.length > 1) {
            newDomainPart = newDomainParts[newDomainParts.length - 2] + "." + newDomainParts[newDomainParts.length - 1];
          } else {
            newDomainPart = newDomain;
          }
          var lockedHasPath = normalizedLockedUrl.indexOf("/") > 0 ? true : false;
          var newHasPath = normalizedNewUrl.indexOf("/") > 0 ? true : false;
          if (cleanedUrl.indexOf("*") >= 0 || lockedUrl.indexOf(".") < 0 && lockedUrl.indexOf("*") >= 0) {
            hasConflict = true;
          }
          if (newDomain == lockedDomain) {
            if (lockedHasPath && newHasPath) {
              if (normalizedNewUrl.match(new RegExp("^" + escapeRegExp(normalizedLockedUrl) + "$"))) {
                hasConflict = true;
              } else if (normalizedLockedUrl == "youtube.com/watch" && normalizedNewUrl.match(new RegExp(/^youtube\.com\/(?!accounts(?:\/|$)|shorts(?:\/|$)|premium(?:\/|$)|live(?:\/|$)|channel(?:\/|$)|user(?:\/|$)|playlist(?:\/|$)|feed(?:\/|$)|results(?:\/|$)|embed(?:\/|$))[^\/?]+$/gm))) {
                hasConflict = true;
              }
            } else if (newDomainPart.match(new RegExp("^" + escapeRegExp(lockedDomainPart) + "$"))) {
              hasConflict = true;
            }
          } else if (lockedDomain.match(new RegExp("^(.*\\.)?" + escapeRegExp(newDomain) + "$"))) {
            if (!newHasPath) {
              hasConflict = true;
            }
          } else if (newDomain.match(new RegExp("^(.*\\.)?" + escapeRegExp(lockedDomain) + "$"))) {
            if (!lockedHasPath) {
              hasConflict = true;
            }
          }
        });
        if (hasConflict) {
          if (!isBatch) {
            var $dialogBlockErrorExceptionConflict = $("#dialog-edit-block-error-exception-conflict");
            $dialogBlockErrorExceptionConflict.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "350px",
              draggable: false,
              title: "This Isn't Allowed",
              open: function () {
                var maxZ = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZ;
                }).off("click").on("click", function () {
                  $dialogBlockErrorExceptionConflict.dialog("close");
                });
                $dialogBlockErrorExceptionConflict.parent().focus().off("keypress").on("keypress", function (event) {
                  if (event.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogBlockErrorExceptionConflict.dialog("destroy");
                $dialogBlockErrorExceptionConflict.hide();
                $("#blocklist-" + listType + "-add").focus().select();
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogBlockErrorExceptionConflict.dialog("close");
                  }
                }
              }
            }).show();
          }
          return false;
        }
      }
      $("#blocklist-" + listType + "-list").append("<div class=\"custom-option\" ondblclick=\"customSelectEdit(this, '" + listType + "');\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(cleanedUrl) + "\">" + toHtml(cleanedUrl) + "</div>");
      if (!isBatch) {
        var $listDivs = $("#blocklist-" + listType + "-list div");
        var mappedDivs = $listDivs.map(function (divIndex, divElement) {
          return {
            t: $(divElement).text(),
            v: $(divElement).attr("data-value"),
            l: $(divElement).attr("data-locked")
          };
        }).get();
        mappedDivs.sort(function (divA, divB) {
          if (divA.t > divB.t) {
            return 1;
          } else if (divA.t < divB.t) {
            return -1;
          } else {
            return 0;
          }
        });
        $listDivs.each(function (eachIndex, eachElement) {
          $(eachElement).attr("data-value", mappedDivs[eachIndex].v);
          $(eachElement).attr("data-locked", mappedDivs[eachIndex].l);
          $(eachElement).text(mappedDivs[eachIndex].t);
        });
      }
    }
    $("#blocklist-" + listType + "-list div").removeClass("selected");
    $("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").addClass("selected");
    $("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").focus();
    $("#blocklist-" + listType + "-add").val("");
    if (!isBatch) {
      var offsetTop = $("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").get(0).offsetTop - 295;
      $("#blocklist-" + listType + "-list").scrollTop(offsetTop);
    }
  }
  $("#blocklist-" + listType + "-add").select().focus();
  return true;
}
export var lastCustomSelectedIndex = null;
export function customSelect(element, event) {
  var parentElement = element.parentElement;
  var parentId = parentElement.id;
  var $childrenDivs = $("#" + parentId + " > div");
  var elementIndex = $childrenDivs.index(element);
  if (event.shiftKey && lastCustomSelectedIndex !== null) {
    var minIndex = Math.min(lastCustomSelectedIndex, elementIndex);
    var maxIndex = Math.max(lastCustomSelectedIndex, elementIndex);
    $childrenDivs.slice(minIndex, maxIndex + 1).addClass("selected");
    lastCustomSelectedIndex = elementIndex;
  } else if (event.ctrlKey) {
    $(element).toggleClass("selected");
    lastCustomSelectedIndex = elementIndex;
  } else {
    $childrenDivs.removeClass("selected");
    $(element).addClass("selected");
    lastCustomSelectedIndex = elementIndex;
  }
  $("#" + parentId).focus();
}
export function customSelectEdit(element, listType) {
  $("#blocklist-" + listType + "-list div.custom-option").removeClass("selected");
  $(element).addClass("selected");
  $("#blocklist-" + listType + "-add").val($(element).attr("data-value"));
  if ($(element).attr("data-locked") == "false") {
    removeEntry(listType);
  }
  $("#blocklist-" + listType + "-add").focus();
}
export function removeEntry(listType) {
  lastCustomSelectedIndex = null;
  if ($("#blocklist-" + listType + "-list div.custom-option.selected").length > 0) {
    var lockedStatuses = $("#blocklist-" + listType + "-list div.custom-option.selected").map(function () {
      if (typeof $(this).attr("data-locked") != "undefined" && $(this).attr("data-locked") == "true") {
        return true;
      } else {
        return false;
      }
    }).get();
    if (listType != "exceptions" && lockedStatuses.indexOf(true) != -1) {
      var $dialogBlockErrorExceptionConflict = $("#dialog-edit-block-error-delete-conflict");
      $dialogBlockErrorExceptionConflict.dialog({
        modal: true,
        position: {
          my: "center",
          at: "center",
          of: $(".page-content-wrapper")
        },
        width: "350px",
        draggable: false,
        title: "This Isn't Allowed",
        open: function () {
          var maxZ = getMaxZ($(".ui-widget-overlay"));
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZ;
          }).off("click").on("click", function () {
            $dialogBlockErrorExceptionConflict.dialog("close");
          });
          $dialogBlockErrorExceptionConflict.parent().focus().off("keypress").on("keypress", function (event) {
            if (event.which == 13) {
              $(this).find(".btn-green-dialog").click();
            }
          });
        },
        close: function () {
          $dialogBlockErrorExceptionConflict.dialog("destroy");
          $dialogBlockErrorExceptionConflict.hide();
        },
        buttons: {
          Close: {
            class: "btn-green-dialog",
            text: "Close",
            click: function () {
              $dialogBlockErrorExceptionConflict.dialog("close");
            }
          }
        }
      }).show();
      return;
    }
    var selectedIndex = $("#blocklist-" + listType + "-list div.custom-option.selected").index();
    $("#blocklist-" + listType + "-list").find("div.selected").remove();
    $("#blocklist-" + listType + "-list div").removeClass("selected");
    if (typeof selectedIndex != "undefined" && selectedIndex < $("#blocklist-" + listType + "-list div.custom-option").length - 1) {
      $("#blocklist-" + listType + "-list div").eq(selectedIndex).addClass("selected");
      $("#blocklist-" + listType + "-list div").eq(selectedIndex).focus();
    } else {
      $("#blocklist-" + listType + "-list div").last().addClass("selected");
      $("#blocklist-" + listType + "-list div").last().focus();
    }
  }
}
export function selectList(listType) {
  $("#blocklist-" + listType + "-list div").addClass("selected");
  $("#blocklist-" + listType + "-list").focus();
}
export function deselectList(listType) {
  $("#blocklist-" + listType + "-list div").removeClass("selected");
  $("#blocklist-" + listType + "-list").focus();
}
export function selectUsersList() {
  $("#dialog-edit-users-list div").addClass("selected");
  $("#dialog-edit-users-list").focus();
}
export function deselectUsersList() {
  $("#dialog-edit-users-list div").removeClass("selected");
  $("#dialog-edit-users-list").focus();
}
export function selectNetworksList() {
  $("#dialog-edit-networks-list div").addClass("selected");
  $("#dialog-edit-networks-list").focus();
}
export function deselectNetworksList() {
  $("#dialog-edit-networks-list div").removeClass("selected");
  $("#dialog-edit-networks-list").focus();
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
