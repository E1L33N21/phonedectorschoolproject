const URL = "https://teachablemachine.withgoogle.com/models/duUQ2eofC/";
const statusBox = document.getElementById("status");
    let model, webcam, labelContainer, maxPredictions;
    let alreadyCaptured = false;
    let warning = new Audio("audio/warning.mp3");
    let phone_first_seen = null;
    let warning_played = false;
    let snapshot_cooldown = false;
    let phone_stable_count = 0;
    let phoneInBox = false;
    let port;
    let reader;
    console.log("serial" in navigator)
    // Load the image model and setup the webcam
    async function init() {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // load the model and metadata
        // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
        // or files from your local hard drive
        // Note: the pose library adds "tmImage" object to your window (window.tmImage)
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Convenience function to setup a webcam
        const flip = true; // whether to flip the webcam
        webcam = new tmImage.Webcam(500, 500, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        window.requestAnimationFrame(loop);

        // append elements to the DOM
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) { // and class labels
            labelContainer.appendChild(document.createElement("div"));
        }
    }
    async function loop() {
        console.log("loop running");
        webcam.update(); // update the webcam frame
        await predict();
        window.requestAnimationFrame(loop);
    }
function takeSnapshot() {
    console.log("SNAPSHOT TRIGGERED");

    statusBox.innerText = "📸 Taking picture...";

    const canvas = document.createElement("canvas");

canvas.width = webcam.canvas.width;
canvas.height = webcam.canvas.height;

const ctx = canvas.getContext("2d");


ctx.drawImage(webcam.canvas, 0, 0);

console.log("SNAPSHOT TRIGGERED");

    const image = canvas.toDataURL("image/png");
    let images = JSON.parse(localStorage.getItem("evidenceImages")) || [];

images.push(image);

localStorage.setItem(
    "evidenceImages",
    JSON.stringify(images)
);
    // ------------------------
    // DOWNLOAD IMAGE
    // ------------------------
    const link = document.createElement("a");
    link.href = image;
    link.download = "hall_monitor_violation.png";
    link.click();

    // ------------------------
    // SHOW ON WEBPAGE
    // ------------------------
    const container = document.getElementById("photoContainer");

    if (container) {
        const img = document.createElement("img");
        img.src = image;
        img.style.width = "200px";
        img.style.margin = "5px";
        img.style.border = "2px solid red";

        container.prepend(img);
    }

    statusBox.innerText = "📸 Photo captured!";
}
    // run the webcam image through the image model
async function predict() {
    console.log("predict running");
    const prediction = await model.predict(webcam.canvas);

    // show labels
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }

    // find highest prediction
    let highest = prediction[0];

    for (let i = 1; i < maxPredictions; i++) {
        if (prediction[i].probability > highest.probability) {
            highest = prediction[i];
        }
    }

    // debug (IMPORTANT)
    console.log("FINAL:", highest.className, highest.probability);

    // phone detection (0.90 threshold)
    const isPhone =
        highest.className === "phone" &&
        highest.probability >= 0.90;

    console.log("isPhone:", isPhone);

    // ----------------------------
    // TIMER SYSTEM
    // ----------------------------

    if (isPhone) {

        // start timer once
        if (phone_first_seen === null) {
            phone_first_seen = Date.now();
            console.log("Timer started");
        }

        let elapsed = Date.now() - phone_first_seen;

        console.log("Elapsed:", elapsed);

        if (elapsed >= 2500 && !warning_played) {
            warning.play();
            warning_played = true;
            statusBox.innerText = "⚠️ Warning played!";
            console.log("WARNING PLAYED");
            setTimeout(() => {

                console.log("Checking Arduino:", phoneInBox);

                if (!phoneInBox) {
                    console.log("VIOLATION → taking photos");
                    console.log("ABOUT TO CALL takeSnapshot()");
                    statusBox.innerText = "VIOLATION DETECTED - Taking Photos...";
                    takeSnapshot();
                    setTimeout(takeSnapshot, 500);
                    setTimeout(takeSnapshot, 1000);
                } else {
                    console.log("SAFE → phone in box");
                    statusBox.innerText = "Phone in box - Safe";
                }

            }, 10000);
            }
        }
          else {
        // reset when phone disappears
        phone_first_seen = null;
        warning_played = false;
        statusBox.innerText = "👀 Monitoring...";
    }

    // ----------------
    // SNAPSHOT SYSTEM 
    // ----------------

if (highest.className === "phone" && highest.probability >= 0.90) {
    phone_stable_count++;

} else {
    phone_stable_count = 0;
}

if (phone_stable_count >= 5 && !snapshot_cooldown) {

    snapshot_cooldown = true;

    setTimeout(() => {
        snapshot_cooldown = false;
    }, 15000);

    phone_stable_count = 0;
}
}
async function connectArduino() {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 57600 });

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();

    readArduino();
}
async function readArduino() {
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (!value) continue;

        const clean = value.trim();

        console.log("Arduino RAW:", JSON.stringify(clean));

        if (clean.includes("phoneInBox")) {
            phoneInBox = true;
        }

        if (clean.includes("empty_box")) {
            phoneInBox = false;
        }
        if (phoneInBox) {
    statusBox.innerText = "✅ Phone in box - Safe";
} else {
    statusBox.innerText = "👀 Monitoring...";
}
    }
}
init();
