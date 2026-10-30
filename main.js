// Image Describer - Task 1
// Grab the page elements we will work with in the next steps.
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const describeBtn = document.getElementById("describeBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

// Holds the selected image as a data URL ("data:image/png;base64,....").
// We keep it so the next step can send the image to Ollama.
let imageDataUrl = null;

// When the user picks a file, read it and show it in the preview box.
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) {
    imageDataUrl = null;
    preview.innerHTML = '<p class="placeholder">No image selected yet.</p>';
    return;
  }

  if (!file.type.startsWith("image/")) {
    imageDataUrl = null;
    preview.innerHTML = '<p class="placeholder">That file is not an image.</p>';
    return;
  }

  // FileReader turns the file into a data URL the <img> tag can display.
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl = reader.result;
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = imageDataUrl;
    img.alt = file.name;
    preview.appendChild(img);
  };
  reader.readAsDataURL(file);
});
