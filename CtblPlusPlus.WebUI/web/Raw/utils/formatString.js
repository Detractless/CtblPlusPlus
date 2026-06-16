export function capitalizeFirstLetter(stringToCapitalize) {
  return stringToCapitalize.charAt(0).toUpperCase() + stringToCapitalize.slice(1);
}
export function toTitleCase(text) {
  return text.replace(/(?:^|\s)\w/g, function (match) {
    return match.toUpperCase();
  });
}
export function toHtml(rawText) {
  return rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export function fromHtml(htmlText) {
  return htmlText.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#039;/g, "'");
}
export function escapeRegExp(inputString) {
  var escapedString = inputString.replace(/[\-\[\]\/\{\}\(\)\+\?\^\$\|]/g, "\\$&");
  var stringParts = escapedString.replace(/\.\*/g, "*").split(".");
  var finalString = stringParts.join("\\.").replace(/\*/g, ".*");
  return finalString;
}
export function makeTitleWithBlockName(prefix, blockName, suffix, width) {
  var maxBlockNameLength = Math.floor(width / 10.5) - prefix.length - suffix.length;
  if (maxBlockNameLength > 3) {
    if (blockName.length > maxBlockNameLength) {
      return prefix + blockName.substring(maxBlockNameLength - 3, 0) + "..." + suffix;
    } else {
      return prefix + blockName + suffix;
    }
  } else {
    return prefix + "This Block" + suffix;
  }
}
export function shortenOverviewBlockName(blockName) {
  var maxBlockNameLength = Math.floor(width / 10) - prefix.length - suffix.length;
  if (maxBlockNameLength > 3) {
    if (blockName.length > maxBlockNameLength) {
      return prefix + blockName.substring(maxBlockNameLength - 3, 0) + "..." + suffix;
    } else {
      return prefix + blockName + suffix;
    }
  } else {
    return prefix + "This Block" + suffix;
  }
}
String.prototype.trimEnd = function () {
  return this.replace(/\s+$/, "");
};
String.prototype.normalizeOnlyHiddenChars = function () {
  var str = this;
  str = str.replace(/[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  return str;
};
String.prototype.normalizePassword = function () {
  var str = this;
  str = str.replace(/[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  str = str.replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, " ");
  str = str.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-");
  str = str.replace(/[\u2018\u2019\u201A\u201B\u2039\u203A\u275B\u275C\u2032\u2035\u0060]/g, "'");
  str = str.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u301D\u301E\uFF02\u275D\u275E\u300C-\u300F]/g, "\"");
  str = str.replace(/\u00AB/g, "<");
  str = str.replace(/\u00BB/g, ">");
  str = str.replace(/[\u2022\u2023\u2043\u204C-\u204F\u2219]/g, "*");
  str = str.replace(/[\u2020\u2021]/g, "+");
  str = str.replace(/[\u00D7\u2715\u2716\u2717]/g, "x");
  str = str.replace(/[\u00F7\u2797]/g, "/");
  str = str.replace(/\u2248/g, "~");
  str = str.replace(/[\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF]/g, "*");
  return str;
};
String.prototype.normalizeCustomText = function () {
  var str = this;
  str = str.replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, " ");
  str = str.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-");
  str = str.replace(/\u2026/g, "...");
  str = str.replace(/[\u2018\u2019\u201A\u201B\u2039\u203A\u275B\u275C\u2032\u2035\u0060]/g, "'");
  str = str.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u301D\u301E\uFF02\u275D\u275E\u300C-\u300F]/g, "\"");
  str = str.replace(/\u00AB/g, "<");
  str = str.replace(/\u00BB/g, ">");
  str = str.replace(/[\u2022\u2023\u2043\u204C-\u204F\u2219]/g, "*");
  str = str.replace(/[\u2020\u2021]/g, "+");
  str = str.replace(/\u203D/g, "!?");
  str = str.replace(/[\u00D7\u2715\u2716\u2717]/g, "x");
  str = str.replace(/[\u00F7\u2797]/g, "/");
  str = str.replace(/\u2264/g, "<=");
  str = str.replace(/\u2265/g, ">=");
  str = str.replace(/\u2260/g, "!=");
  str = str.replace(/\u2248/g, "~");
  str = str.replace(/\u00B1/g, "+/-");
  str = str.replace(/[\u2190-\u21FF]/g, "<->");
  str = str.replace(/\u20AC/g, "EUR").replace(/\u00A3/g, "GBP").replace(/\u00A5/g, "JPY").replace(/\u20B9/g, "INR").replace(/\u20BD/g, "RUB").replace(/\u20BF/g, "BTC");
  str = str.replace(/\u2122/g, "(TM)").replace(/\u00A9/g, "(C)").replace(/\u00AE/g, "(R)").replace(/\u2116/g, "No.");
  str = str.replace(/[\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF]/g, "*");
  str = str.replace(/[^A-Za-z0-9\u00C0-\u02AF\u0370-\u052F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\s.,!?;:'"\(\)\[\]\{\}\-_=+@#$%&*\/\\|<>~^\n]/g, "");
  str = str.replace(/ {2,}/g, " ").trim();
  return str;
};
export function emojiToText(rawText) {
  return rawText.replace(/left, /g, "left").replace(/^Unlocked.*/g, "Unlocked").replace(/\<a.*\/a\>/g, "").replace(/<i class="fa fa-random"><\/i>/g, "random").replace(/<i class="fa fa-hourglass-half"><\/i>/g, "delay").replace(/<i class="fa fa-coffee"><\/i>/g, "break").replace(/<i class="fa fa-shield"><\/i>/g, "block").replace(/<i class="fa fa-lock"><\/i>/g, "locked").replace(/<i class="fa fa-unlock"><\/i>/g, "unlocked").replace(/<i class="fa fa-sign-in"><\/i>/g, "device use").replace(/<i class="fa fa-sign-out"><\/i>/g, "device block").replace(/password unlocked/, "password locked").replace(/chars unlocked/, "chars locked").replace(/text unlocked/, "text locked").replace(/break, /g, "break").trim();
}
export function createTextTable(tableName, tableData) {
  var colWidths = [];
  for (var colIndex = 0; colIndex < tableData[0].length; colIndex++) {
    var maxColWidth = 0;
    for (var rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      var cellLength = (tableData[rowIndex][colIndex] || "").length;
      if (cellLength > maxColWidth) {
        maxColWidth = cellLength;
      }
    }
    colWidths.push(maxColWidth);
  }
  var separator = "+";
  for (var sepColIndex = 0; sepColIndex < colWidths.length; sepColIndex++) {
    var dashString = "";
    for (var dashIndex = 0; dashIndex < colWidths[sepColIndex] + 2; dashIndex++) {
      dashString += "-";
    }
    separator += dashString + "+";
  }
  var tableString = "";
  tableString += "  " + tableName.toUpperCase() + "\n";
  tableString += separator + "\n";
  for (var rowRenderIndex = 0; rowRenderIndex < tableData.length; rowRenderIndex++) {
    var rowString = "|";
    for (var colRenderIndex = 0; colRenderIndex < tableData[rowRenderIndex].length; colRenderIndex++) {
      var cellContent = tableData[rowRenderIndex][colRenderIndex];
      var paddedCell = cellContent;
      while (paddedCell.length < colWidths[colRenderIndex]) {
        paddedCell += " ";
      }
      rowString += " " + paddedCell + " |";
    }
    tableString += rowString + "\n";
  }
  tableString += separator + "\n";
  return tableString;
}
