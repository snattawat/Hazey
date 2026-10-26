# SEA Weather 🌦️

A weather website for two cities in South-East Asia: **Bangkok** (Thailand) and **Singapore**.

It shows a big map that fills the whole screen. Each city has a little bubble on the map with its temperature. A glass-looking panel on the side tells you everything about the city you picked: how hot it is, if it will rain, how windy it is, how clean the air is, and what the next 5 days look like.

The whole thing is written in **TypeScript**. This guide walks through what happens from the moment you open the page to the moment you close it, and points at the code that does each part.

---

## Run
You need [Node.js](https://nodejs.org) installed. Node lets your computer run JavaScript outside the browser, and it comes with `npm`, which downloads the libraries this project uses.

**Step 1: download the libraries** (only the first time)

```bash
npm install
```

**Step 2: get a weather key.** The weather comes from a free service called [OpenWeatherMap](https://openweathermap.org). They want to know who is asking, so you sign up and get an **API key**: a long secret password just for your app. (Ask a grown-up to help you make the account.)

Copy the file `.env.example`, name the copy `.env`, and put your key in it:

```
VITE_API_KEY=paste_your_key_here
```

> 🤫 `.env` is secret. It is listed in `.gitignore`, so it never gets uploaded anywhere. Don't share your key.
> New keys can take a couple of hours to start working.

**Step 3: start the app**

```bash
npm run dev
```

It prints an address like `http://localhost:5173`. Open it in your browser. When you change a file and save it, the page updates by itself.

### All the commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app on your computer so you can try it |
| `npm test` | Runs all the tests once |
| `npm run test:watch` | Runs the tests again every time you save a file |
| `npm run lint` | Looks for mistakes and messy code |
| `npm run build` | Checks every type, then packs the app into the `dist/` folder, ready to put on the internet |
| `npm run preview` | Opens the packed `dist/` version to make sure it works |

---

## Folder Tree

```
my-weather-app/
├── index.html            the empty page the browser downloads first
├── package.json          the project's ID card: name, commands, libraries
├── .env                  Your secret API key (you create this)
├── .env.example          an example of what .env should look like
├── vite.config.ts        settings for Vite (runs the app) and Vitest (runs tests)
├── tsconfig*.json        settings for TypeScript (how strict to be)
├── .oxlintrc.json        settings for the linter (the tidiness checker)
├── public/               files copied as they are, like the tab icon
├── dist/                 the packed app made by `npm run build` (don't edit)
├── node_modules/         downloaded libraries (don't edit; npm manages it)
│
├── src/                  the code of the app itself
│   ├── main.tsx          the starting point
│   ├── App.tsx           the boss component
│   ├── App.css           layout of the whole screen
│   ├── index.css         colours and styles shared by everything
│   ├── vite-env.d.ts     tells TypeScript about VITE_API_KEY
│   │
│   ├── api/              talking to OpenWeatherMap
│   │   ├── openWeatherMap.ts   sends the questions, handles errors
│   │   └── types.ts            the shape of the answers
│   │
│   ├── hooks/            React logic you can reuse
│   │   └── useCityWeather.ts   loads both cities and refreshes every 10 min
│   │
│   ├── data/             facts that don't change
│   │   └── locations.ts        the two cities: names, time zones, positions
│   │
│   ├── utils/            helpers: numbers in, nice text out
│   │   ├── units.ts            °C/°F, km/h/mph
│   │   ├── time.ts             clocks, days, "Updated 5 min ago"
│   │   ├── forecast.ts         40 steps → 5 days, today's high/low
│   │   ├── alerts.ts           storm and heavy rain warnings
│   │   └── airQuality.ts       air score words and advice
│   │
│   └── components/       the LEGO bricks that draw the screen
│       ├── TopBar.tsx          the bar at the top
│       ├── map/                everything on the map
│       └── panel/              everything in the glass side panel
│
└── tests/                the tests, laid out the same way as src/
    ├── App.test.tsx            checks src/App.tsx
    ├── hooks/                  checks src/hooks/
    ├── utils/                  checks src/utils/
    ├── components/             checks src/components/ (map/ and panel/ too)
    └── support/          helpers shared by the tests
        ├── setup.ts            runs before every test
        ├── fixtures.ts         pretend weather data
        └── helpers.tsx         a pretend OpenWeatherMap
```

The folders inside `src/` follow the journey: `api/` fetches, `hooks/` organises, `utils/` translates, and `components/` draws. The `tests/` folder copies the same layout, so the test for `src/utils/time.ts` is at `tests/utils/time.test.ts`.

---
