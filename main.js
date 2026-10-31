// Image Describer - Task 2 (two images)
// Grab the page elements we will work with.
const describeBtn = document.getElementById("describeBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

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

// When the button is clicked, send the image to Ollama.
describeBtn.addEventListener("click", async () => {
  // For now this still only sends Image 1; sending both comes next.
  const imageDataUrl = imageDataUrls[0];

  // Feedback 1: no image selected.
  if (!imageDataUrl) {
    setStatus("Please choose an image first.", "error");
    return;
  }

  // Feedback 2: processing. Disable the button so it can't be clicked twice.
  setStatus("Describing image... this can take 10-30 seconds.", "loading");
  describeBtn.disabled = true;
  resultEl.textContent = "";

  try {
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

    // Feedback 3: success. The description is in the "response" field.
    resultEl.textContent = data.response.trim();
    setStatus("Done! Here is the description.", "success");
  } catch (error) {
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
