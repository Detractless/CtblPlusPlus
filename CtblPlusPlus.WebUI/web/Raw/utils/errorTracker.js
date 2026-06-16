window.onerror = function(message, source, lineno, colno, error) {
    var errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.top = "0";
    errorDiv.style.left = "0";
    errorDiv.style.width = "100%";
    errorDiv.style.backgroundColor = "red";
    errorDiv.style.color = "white";
    errorDiv.style.zIndex = "999999";
    errorDiv.style.padding = "20px";
    errorDiv.style.fontSize = "16px";
    errorDiv.style.fontFamily = "sans-serif";
    errorDiv.innerHTML = "<b>Cold Turkey UI Error:</b><br/>" + message + "<br/>File: " + source + "<br/>Line: " + lineno;
    
    if (document.body) {
        document.body.appendChild(errorDiv);
        document.body.style.opacity = "1";
        if (document.querySelector(".container")) {
            document.querySelector(".container").style.opacity = "1";
        }
    } else {
        document.documentElement.appendChild(errorDiv);
    }
    return false;
};
