// Image Describer - Task 2 (two images)
// Grab the page elements we will work with.
const describeBtn = document.getElementById("describeBtn");
const statusEl = document.getElementById("status");
// One result box per image, in the same order as imageDataUrls.
const resultEls = [document.getElementById("result1"), document.getElementById("result2")];

// Holds each selected image as a data URL ("data:image/png;base64,....").
// imageDataUrls[0] is Image 1 and imageDataUrls[1] is Image 2; null means not selected.
const imageDataUrls = [null, null];

// The same preview code works for both images, so we wire it up once per slot.
// slot is 0 for Image 1 and 1 for Image 2; the HTML ids use 1 and 2.
function setupImageSlot(slot) {
  const input = document.getElementById(`imageInput${slot + 1}`);
  const preview = document.getElementById(`preview${slot + 1}`);

  // When the user picks a file, read it and show it in this slot's preview box.
  input.addEventListener("change", () => {
    const file = input.files[0];

    if (!file) {
      imageDataUrls[slot] = null;
      preview.innerHTML = '<p class="placeholder">No image selected yet.</p>';
      return;
    }

    if (!file.type.startsWith("image/")) {
      imageDataUrls[slot] = null;
      preview.innerHTML = '<p class="placeholder">That file is not an image.</p>';
      return;
    }

    // FileReader turns the file into a data URL the <img> tag can display.
    const reader = new FileReader();
    reader.onload = () => {
      imageDataUrls[slot] = reader.result;
      preview.innerHTML = "";
      const img = document.createElement("img");
      img.src = reader.result;
      img.alt = file.name;
      preview.appendChild(img);
      setStatus(`Image ${slot + 1} selected: ${file.name}`, "info");
    };
    reader.readAsDataURL(file);
  });
}

setupImageSlot(0);
setupImageSlot(1);

// Ollama runs locally and listens on port 11434.
const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llava"; // a vision model, so it can understand images

// Large photos are too big for Ollama (it answers "413 Payload Too Large"),
// so we draw the image onto a canvas at a smaller size and export it as a JPEG.
const MAX_SIZE = 1024; // longest side in pixels

function resizeImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = dataUrl;
  });
}

// Show a message under the button. type is "info", "loading", "success" or "error",
// which picks the colour from style.css.
function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// Send ONE image to Ollama and return its description text.
// We call this once per image: if both images went in a single request,
// llava would mix them into one blended answer instead of two separate ones.
async function describeImage(imageDataUrl) {
  const smallDataUrl = await resizeImage(imageDataUrl);

  // Ollama wants only the base64 part, without the "data:image/...;base64," prefix.
  const base64Image = smallDataUrl.split(",")[1];

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: "Describe this image in detail.",
      images: [base64Image],
      stream: false, // get one complete answer instead of many small pieces
    }),
  });

  const data = await response.json();
  console.log("Ollama response:", data);

  // Ollama answered, but with an error code (e.g. 413 or model not found).
  if (!response.ok) {
    throw new Error(`Ollama returned an error (${response.status}): ${data.error}`);
  }

  // The description is in the "response" field.
  return data.response.trim();
}

// When the button is clicked, send each image to Ollama.
describeBtn.addEventListener("click", async () => {
  // Feedback 1: no image selected.
  if (!imageDataUrls[0] && !imageDataUrls[1]) {
    setStatus("Please choose an image first.", "error");
    return;
  }

  // Feedback 2: processing. Disable the button so it can't be clicked twice.
  describeBtn.disabled = true;
  resultEls.forEach((el) => (el.textContent = ""));

  // Remember which slot is being worked on, so an error can be shown in that slot's box.
  let currentSlot = null;

  try {
    // One request at a time: llava runs on this computer, so asking for both
    // at once would not be faster and could slow everything down.
    for (let slot = 0; slot < imageDataUrls.length; slot++) {
      // Only one image chosen: say so in the empty slot instead of leaving it blank.
      if (!imageDataUrls[slot]) {
        resultEls[slot].textContent = "No image selected, so nothing to describe.";
        continue;
      }
      currentSlot = slot;
      setStatus(`Describing Image ${slot + 1}... this can take 10-30 seconds.`, "loading");
      resultEls[slot].textContent = "Working on it...";
      // Each description goes into its own box, so it's clear which image it belongs to.
      resultEls[slot].textContent = await describeImage(imageDataUrls[slot]);
    }

    // Feedback 3: success. Mention it if only one of the two images was described.
    const missing = imageDataUrls.findIndex((url) => !url);
    if (missing === -1) {
      setStatus("Done! Here are the descriptions.", "success");
    } else {
      setStatus(`Done! Only one image was selected, so Image ${missing + 1} was skipped.`, "success");
    }
  } catch (error) {
    if (currentSlot !== null) {
      resultEls[currentSlot].textContent = "Could not describe this image.";
    }
    // Feedback 4: something went wrong. fetch throws a TypeError when it
    // can't reach Ollama at all (not running, or blocked by CORS).
    console.error(error);
    if (error instanceof TypeError) {
      setStatus("Could not reach Ollama. Is it running on localhost:11434?", "error");
    } else {
      setStatus(error.message, "error");
    }
  } finally {
    // Runs whether it worked or not, so the button is always usable again.
    describeBtn.disabled = false;
  }
});
