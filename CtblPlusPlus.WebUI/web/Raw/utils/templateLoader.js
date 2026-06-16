export var TemplateLoader = {
    loadComponentSync: function(componentPath, containerId) {
        try {
            var url = "http://localhost:58123/" + componentPath;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false); // false makes it synchronous
            xhr.send(null);

            if (xhr.status === 200) {
                var container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = xhr.responseText;
                } else {
                    console.error("Container with ID " + containerId + " not found.");
                }
            } else {
                console.error("Failed to load " + url + ": " + xhr.status + " " + xhr.statusText);
            }
        } catch (error) {
            console.error("TemplateLoader error: " + error.message);
        }
    },
    appendComponentSync: function(componentPath, containerId) {
        try {
            var url = "http://localhost:58123/" + componentPath;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false); // false makes it synchronous
            xhr.send(null);

            if (xhr.status === 200) {
                var container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML += xhr.responseText;
                } else {
                    console.error("Container with ID " + containerId + " not found.");
                }
            } else {
                console.error("Failed to load " + url + ": " + xhr.status + " " + xhr.statusText);
            }
        } catch (error) {
            console.error("TemplateLoader error: " + error.message);
        }
    }
};

