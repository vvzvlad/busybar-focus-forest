# Focus Forest

Focus sessions grow trees on your BUSY Bar, and a little pet roams the forest you have grown.

A JavaScript app for [BUSY Bar](https://busy.app). Work in progress.

## What it does

- Turn the wheel to pick a session of 15, 25, 50 or 90 minutes and press Start. A tree grows on the screen while the countdown runs.
- Finish the session and a small tree takes the slot of the day it began in the row of days, today on the right. Leave early with Back or the mode switch and the tree dies: a day with dead trees only shows a dry one. A day without a session stays an empty slot.
- While no session runs, a little fox walks along the row of days and gets sad next to the dry trees.
- The back display shows your forest for the week or the month, your streak of days and your total focus hours.
- New tree species unlock as your focus hours add up: spruce, birch, oak, sakura, autumn maple, palm, cactus, sunflower, and a snowy fir in December.

## Data

None: it works offline and keeps your sessions on the BUSY Bar.

## Build

Node 24 and npm:

```sh
npm ci
npm run build         # dist/io.github.vvzvlad.forest.tgz
npm run app:install   # install it on a BUSY Bar connected over USB
npm run app:run       # start it
```

## License

[MIT](LICENSE)
