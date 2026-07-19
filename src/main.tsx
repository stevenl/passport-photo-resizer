import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./App.tsx"
import "./index.css";
import { getFaceLandmarker } from "./detection/faceDetector";

// Kick off the MediaPipe WASM + model download immediately, before the user
// has even chosen a photo. By the time they upload an image the model will
// likely already be cached / initialized, eliminating the visible delay.
getFaceLandmarker().catch(() => {
  // Silently swallow here — useFaceDetection surfaces the error to the UI
  // when detection is actually attempted after a photo is uploaded.
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
