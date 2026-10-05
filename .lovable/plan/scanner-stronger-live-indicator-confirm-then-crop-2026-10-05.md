# Scanner: stronger live indicator + confirm-then-crop

## Goal
Clearer live detection preview, and after a page is captured the user reviews and approves the detected area; only the approved region is kept.

## Changes
1. Live preview indicator (camera screen)
   - Thicker animated outline with corner brackets, color shifts blue -> green as detection stabilizes.
   - Stability progress bar showing how close auto-capture is; confidence badge.
2. Review step after capture (manual or automatic)
   - Freeze the captured frame, show detected edges with four draggable corners.
   - Buttons: "إعادة الالتقاط", "إعادة الكشف", "الصورة كاملة", "تأكيد وقص المنطقة".
   - Detection pauses while reviewing.
3. On confirm, only the selected quad is perspective-cropped and added as a page; retake discards the frame.

## Technical details
- CameraCapture: `review` state {blob, image, size, quad}; shoot() loads image via `loadImage` and opens review instead of calling `onCapture`; confirm calls `onCapture(blob, quad)` (existing `renderPage` already crops to quad).
- Reuse `ScanCropper` for corner editing; `detectDocumentPrecise` for re-detect.
