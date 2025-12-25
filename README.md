# Christmas Lottery Tool (Front-end, Offline)

A small **Christmas-themed lottery picker**. Paste a newline-separated list (e.g. Instagram handles) and draw 1 winner or multiple winners with a fun animation, falling snow, and confetti.

## Features

- Paste a list (one entry per line)
- Auto-ignore empty lines
- Optional dedupe
- Optional “exclude winners” mode (no repeats)
- Draw 1 winner or draw N winners at once
- Winner history + copy buttons
- Works offline (no backend, no dependencies)

## How to Run

### Option A: Just open the file

Open `index.html` in your browser.

### Option B: Run a local server (recommended)

From this folder:

```bash
python3 -m http.server 5173
```

Then open:

- `http://localhost:5173`

## Usage

1. Paste your list into the textarea (one per line)
2. Click **Draw 1** or set a number and click **Draw N**
3. Use **Copy last winner** / **Copy all winners** as needed

## Notes

- If “Exclude winners” is enabled, already-drawn winners will not be drawn again.
- If you disable it, the tool can draw from the full list again.


