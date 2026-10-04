# 🥜 Peanut Butter

GIF like JIF.

A tiny Electron experiment that records the primary display and turns
the recording into an animated GIF.

## Run

npm start

## Flow

RECORD
  ↓
screen capture
  ↓
STOP
  ↓
WebM decoded frame-by-frame
  ↓
frames scaled to GIF resolution
  ↓
GIF encoded
  ↓
preview
  ↓
SAVE GIF

## v0.1

- Cartoon Electron UI
- Primary-display capture
- 8 / 10 / 12 FPS
- 640 / 800 / 960 output widths
- Live recording timer
- Mouse-coordinate monitor
- GIF preview
- Save dialog

Keep recordings short while experimenting. GIF is gloriously
inefficient by nature.
