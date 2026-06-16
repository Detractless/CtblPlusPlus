/**
 * @file urlValidation.js
 * @layer Utils
 */

export function validateAndCleanUrl(url) {
  try {
    url = decodeURIComponent(url).toLowerCase();
  } catch (error) {
    url = url.toLowerCase();
  }
  if (url.indexOf("file://") != 0 && url.indexOf("chrome://") != 0 && url.indexOf("brave://") != 0 && url.indexOf("vivaldi://") != 0 && url.indexOf("edge://") != 0 && url.indexOf("opera://") != 0 && url.indexOf("sidekick://") != 0 && url.indexOf("arc://") != 0 && url.indexOf("chrome-extension://") != 0 && url.indexOf("moz-extension://") != 0 && url.indexOf("extension://") != 0) {
    if (url.indexOf("://") > -1) {
      url = url.split("://")[1];
    }
  }
  if (url.indexOf("www.") == 0) {
    url = url.substring(4);
  }
  if (url.indexOf("youtube.com/@") == 0) {
    url = url.replace("youtube.com/@", "youtube.com/");
  } else if (url.indexOf("youtube.com/user/") == 0) {
    url = url.replace("youtube.com/user/", "youtube.com/");
  }
  url = url.replace(/^\s+|\s+$/g, "");
  url = url.replace(/\/$/, "");
  url = url.replace(/[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  if (url.indexOf("*") > -1) {
    return url.replace(/\\/g, "/");
  } else if (/^([^\s\.`~!@#$%^&\[\]()\\,<>\|\/\?;"'=+:]+\.)+[^\s\.`~!@#$%^&\[\]()\\,<>\|\/\?;"'=+\-]+(\/[^\\]*)?$/.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^localhost(:[*\d]+)?(\/[^\\]*|\/?)$/.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^file\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^chrome\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^brave\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^vivaldi\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^edge\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^opera\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^sidekick\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^arc\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^chrome-extension\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^moz-extension\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^extension\:\/\//.test(url)) {
    return url.replace(/\\/g, "/");
  } else if (/^about\:/.test(url)) {
    return url.replace(/\\/g, "/");
  } else {
    return "null";
  }
}