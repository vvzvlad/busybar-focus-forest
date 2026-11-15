# Focus Forest

Focus sessions grow trees on your BUSY Bar, and a little pet roams the forest you have grown.

A JavaScript app for [BUSY Bar](https://busy.app). Work in progress.

## What it does

- Turn the wheel to pick a session of 15, 25, 50 or 90 minutes and press Start. A tree grows on the screen while the countdown runs.
- Finish the session and a small tree takes the slot of the day it began in the row of days, today on the right. Leave early with Back or the mode switch and the tree dies: a day with dead trees only shows a dry one. A day without a session stays an empty slot.
- While no session runs, a little fox walks along the row of days and gets sad next to the dry trees. When a tree grows, the fox jumps for joy and a short sound plays.
- The back display shows your forest for today, the week, the month or the year (OK turns the pages), your streak of days, your total focus hours and the fox's name. During a session it says BUSY and the minutes left, large, for the people around you.
- New tree species unlock as your focus hours add up: spruce, then birch at 4 hours, oak at 10, sakura at 25, autumn maple at 50, palm at 75, cactus at 100 and sunflower at 150, and a snowy fir in December. Each tree is a random species among the ones you have.
- Settings: the default session length, the sound on or off, the fox's name.

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
