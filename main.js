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

// Ollama runs locally and listens on port 11434.
const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llava"; // a vision model, so it can understand images

// When the button is clicked, send the image to Ollama.
describeBtn.addEventListener("click", async () => {
  // Ollama wants only the base64 part, without the "data:image/...;base64," prefix.
  const base64Image = imageDataUrl.split(",")[1];

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
});
