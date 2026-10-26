# SEA Weather 🌦️

A weather website for two cities in South-East Asia: **Bangkok** (Thailand) and **Singapore**.

It shows a big map that fills the whole screen. Each city has a little bubble on the map with its temperature. A glass-looking panel on the side tells you everything about the city you picked: how hot it is, if it will rain, how windy it is, how clean the air is, and what the next 5 days look like.

The whole thing is written in **TypeScript**. This guide walks through what happens from the moment you open the page to the moment you close it, and points at the code that does each part.

---

## Table of contents

1. [Run it on your computer](#1-run-it-on-your-computer)
2. [TypeScript in 1 minute](#2-typescript-in-1-minute)
3. [The journey: from opening the page to closing it](#3-the-journey-from-opening-the-page-to-closing-it)
4. [Where everything lives (the folders)](#4-where-everything-lives-the-folders)
5. [Tests: robots that check the code](#5-tests-robots-that-check-the-code)
6. [TypeScript cheat sheet](#6-typescript-cheat-sheet)
7. [Challenges to try](#7-challenges-to-try)

---

## 1. Run it on your computer

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

## 2. TypeScript in 1 minute

Browsers only understand **JavaScript**. TypeScript is JavaScript plus **types**: little labels that say what kind of thing each value is.

```ts
let temperature: number = 31      // a number
let city: string = 'Bangkok'      // text
let isRaining: boolean = false    // true or false
```

Why bother? Because TypeScript checks your code *before* it runs, like a spell-checker for programs. If you try to do something silly, such as adding a city name to a temperature, your editor puts a red squiggle under it right away, instead of the website breaking later.

When the app runs, a tool called **Vite** removes all the types and hands the browser plain JavaScript. The types are only there to help you while you write code.

---

## 3. The journey: from opening the page to closing it

Here is the whole trip in one picture. Follow the arrows.

```
   You type the address and press Enter
                  │
                  ▼
   ① index.html         an empty page with one empty box
                  │
                  ▼
   ② src/main.tsx       wakes React up and puts <App /> in the box
                  │
                  ▼
   ③ src/App.tsx        the boss: remembers your city and °C/°F
                  │
                  ▼
   ④ the screen appears, with grey "loading" shapes
                  │
                  ▼
   ⑤ src/hooks/useCityWeather.ts       "I need weather for both cities!"
                  │
                  ▼
   ⑥ src/api/openWeatherMap.ts  ──────► 🌍 OpenWeatherMap (on the internet)
                  │                         │
                  │ ◄───────────────────────┘  answers with lots of numbers
                  ▼
   ⑦ src/api/types.ts      TypeScript knows the shape of the answer
                  │
                  ▼
   ⑧ loading → ready (or error)
                  │
                  ▼
   ⑨ src/utils/          turn raw numbers into nice text ("31°C", "3 PM")
                  │
                  ▼
   ⑩ src/components/     draw the top bar, the map and the panel
                  │
                  ▼
   ⑪ you click things → the screen changes
   ⑫ every 10 minutes → fresh weather
   ⑬ you close the tab → your choices are remembered for next time
```

Now let's walk through each step.

### ① The browser downloads `index.html`

`index.html` is nearly empty. It has one empty box and one line saying "now run `main.tsx`":

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

Everything you see on the screen gets put inside that empty `root` box by the code.

### ② `src/main.tsx` starts React

[React](https://react.dev) is a library for building screens out of small pieces called **components**. `main.tsx` finds the empty box and tells React to draw the `App` component inside it:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

See the `!` after `getElementById('root')`? TypeScript worries: "What if there is no box called `root`? Then you'd get `null`!" The `!` means **"trust me, it's there."** We can promise that because we wrote `index.html` ourselves.

### ③ `src/App.tsx` is the boss

`App` decides **which city** is picked and **which units** (°C or °F) to show. It keeps them in **state**: React's memory. When state changes, React redraws the screen.

```tsx
const [selectedId, setSelectedId] = useState(() =>
  readSetting(CITY_KEY, CITY_IDS, 'bangkok'),
)
const [units, setUnits] = useState<Units>(() =>
  readSetting(UNITS_KEY, UNIT_VALUES, 'metric'),
)
```

`readSetting` checks the browser's **localStorage**, a small notebook the browser keeps for each website. If you picked Singapore last time, it's written there. If the notebook is empty, it starts with Bangkok and Celsius.

What is `Units`? It's defined in `src/utils/units.ts`:

```ts
export type Units = 'metric' | 'imperial'
```

The `|` means **"or"**. A `Units` value can only be the text `'metric'` **or** `'imperial'`, nothing else. If you write `'metrik'` by accident, TypeScript stops you straight away. This is called a **union type**, and this app uses lots of them.

The two cities are listed in `src/data/locations.ts`. An **interface** describes what every city must have:

```ts
export interface MapLocation {
  id: string          // 'bangkok'
  label: string       // 'Bangkok, Thailand'
  name: string        // 'Bangkok'
  countryCode: string // 'TH'
  country: string     // 'Thailand'
  timeZone: string    // 'Asia/Bangkok', for the city's clock
  lat: number         // where it is on Earth: latitude...
  lon: number         // ...and longitude
}
```

If you forgot `lat` for a city, TypeScript would complain: *"Property 'lat' is missing."*

`App` also checks how wide your screen is. If it's narrower than 900 pixels (a phone), the panel turns into a **bottom sheet** that you can pull up from the bottom of the screen.

### ④ The screen appears, even before the weather arrives

`App` draws three big pieces straight away:

- **`TopBar`**: the logo, the Bangkok / Singapore buttons, and the °C / °F switch
- **`WeatherMap`**: the full-screen map
- **`CityPanel`**: the glass panel with all the details

The weather hasn't arrived yet, so the panel shows grey shapes that gently shimmer. They're called **skeletons**, and they show where things will go.

### ⑤ `useCityWeather` asks for the weather

`src/hooks/useCityWeather.ts` is a **hook**: a reusable piece of React logic (hooks always start with `use`). As soon as the app starts, it asks for the weather of **both cities at the same time**.

For each city it asks OpenWeatherMap 3 questions:

1. **"What's the weather right now in Bangkok?"** The answer also includes the exact spot on the map.
2. **"What's the forecast for the next 5 days at that spot?"**
3. **"How clean is the air at that spot?"**

Questions 2 and 3 are sent **at the same time**, like sending two friends to two different shops instead of one friend to both:

```ts
const weather = await fetchCurrentWeather(locationQuery(location))

const { lat, lon } = weather.coord
const [forecast, air] = await Promise.allSettled([
  fetchForecast(lat, lon),
  fetchAirQuality(lat, lon),
])
```

`await` means **"wait here until the answer comes back."** Asking the internet takes time, maybe half a second, and `await` lets the code wait without freezing the page.

`Promise.allSettled` waits for both friends to come back, **even if one of them fails**. If the air quality shop is closed, you still get the forecast, and you still see the current weather. Only the missing card is left out.

### ⑥ `src/api/openWeatherMap.ts` talks to the internet

This file is the only one that actually talks to OpenWeatherMap. Its main helper looks like this:

```ts
async function getJson<T>(
  endpoint: string,
  params: Record<string, string>,
  notFoundMessage = 'No data found for this location.',
): Promise<T> {
```

That `<T>` is a **generic**. Think of it as a blank label on a box: "this function brings back a box of **something**, and you write what goes in it later." When we use it, we fill in the blank:

```ts
getJson<WeatherData>('weather', { q: city, units: 'metric' })
getJson<ForecastData>('forecast', { ... })
```

Same delivery service, different labels on the box. One function does the job of three.

It sends a web address like this one (the key is hidden here):

```
https://api.openweathermap.org/data/2.5/weather?q=Bangkok,TH&units=metric&appid=YOUR_KEY
```

Things can go wrong, and the code turns each problem into a message a person can understand:

| What happened | What you see |
|---|---|
| No key in `.env` | "Missing API key. Add VITE_API_KEY to the .env file…" |
| Wrong key (error 401) | "Invalid API key…" |
| City not found (error 404) | "Couldn't find …" |
| No internet | "Network error. Check your internet connection." |

### ⑦ `src/api/types.ts` describes the answer

The answer comes back as **JSON**, a way of writing data that looks a lot like JavaScript objects. A small part of it:

```json
{ "name": "Bangkok", "main": { "temp": 31.4, "humidity": 70 }, "wind": { "speed": 3.6, "deg": 220 } }
```

`types.ts` tells TypeScript what shape to expect:

```ts
export interface WeatherData {
  name: string
  main: {
    temp: number
    feels_like: number
    humidity: number
    // ...
  }
  visibility?: number   // the ? means "might be missing"
  wind: {
    speed: number
    deg: number
    gust?: number       // only sent when there are gusts
  }
  // ...
}
```

Now if you type `weather.main.tem` (oops, missing a `p`), TypeScript tells you right away that `tem` doesn't exist.

> 🧠 **Fun fact:** TypeScript can only check *your* code. It can't see what the internet will really send. `types.ts` is a **promise** we make about OpenWeatherMap's answers, based on their documentation. If they changed their answers one day, TypeScript wouldn't know. That's one reason the app also has tests.

### ⑧ Each city is `'loading'`, `'ready'` or `'error'`

```ts
export type CityStatus = 'loading' | 'ready' | 'error'
```

Another union type! Every city starts as `'loading'`. When its answer comes back, it becomes `'ready'`, or `'error'` if something went wrong.

There's a clever trick in how each answer is stored:

```ts
type CityResult =
  | { ok: true; weather: WeatherData; forecast: ForecastData | null; air: AirQualityData | null }
  | { ok: false; error: string }
```

A result is **either** a success (`ok: true`, with weather) **or** a failure (`ok: false`, with an error message). TypeScript is smart: after you check `if (result.ok)`, it *knows* `result.weather` exists. In the other branch it knows there's only `result.error`. This is called a **discriminated union**: the `ok` field "discriminates" (tells apart) the two kinds.

Notice `ForecastData | null`: "a forecast **or** nothing." `null` means "nothing here," and TypeScript makes you check for it before you use the forecast, so the app never crashes trying to read a forecast that never arrived.

When an answer arrives, React's state changes, and the screen redraws with real weather. The grey skeletons disappear.

### ⑨ `src/utils/` turns raw numbers into nice text

OpenWeatherMap sends raw numbers. The files in `utils/` are **helpers** that make them friendly. They don't draw anything; they just take numbers in and give text out.

| File | What it does | Example |
|---|---|---|
| `units.ts` | °C → °F, m/s → km/h or mph | `31.4` → `"31°C"` or `"89°F"` |
| `time.ts` | turns computer time into clock time | `1761030000` → `"2 PM"` in Bangkok |
| `forecast.ts` | squishes 40 forecast pieces into 5 days | 40 × 3-hour steps → Mon, Tue, Wed… |
| `alerts.ts` | looks for storms in the next 12 hours | ⚡ "Thunderstorm warning" |
| `airQuality.ts` | turns 1–5 into words and advice | `4` → "Poor" |

Here's the °F formula from `units.ts`. It's the same one you might learn at school:

```ts
function toFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32
}
```

**What's that big number for time?** Computers count time as **seconds since 1 January 1970**, called "Unix time." `1761030000` is 7 o'clock in the morning on 21 October 2025 on the world's standard clock (UTC). Bangkok is 7 hours ahead, so `time.ts` shows "2 PM". It always uses *the city's own time zone*, so Bangkok's sunrise shows Bangkok time even if you're in London.

**Why 40 forecast pieces?** The forecast gives one prediction every 3 hours for 5 days: 8 per day × 5 days = 40. `forecast.ts` groups them by day, finds each day's lowest and highest temperature, and picks the icon closest to noon.

**How does it spot a storm?** Every weather condition has a code number. Codes from 200 to 232 mean thunderstorm. `alerts.ts` checks the next 4 forecast steps (4 × 3 = 12 hours) for those codes, or for really heavy rain (10 mm or more in 3 hours).

### ⑩ `src/components/` draws everything

Components are like LEGO bricks. Each one draws one part of the screen, and bigger bricks are built from smaller ones.

```
App
├── TopBar                       logo, city buttons, °C/°F switch
├── WeatherMap  (components/map/)
│   ├── CityMarker  × 2          the temperature bubble for each city
│   ├── MapTools                 zoom +/−, show both, center, layers, full screen
│   ├── LayersPanel              pick the map style and weather overlay
│   └── MapLegend                the colour scale for the overlay
└── CityPanel   (components/panel/)
    ├── WeatherAlert             ⚡ storm or heavy rain warning
    ├── WeatherCard              big temperature, icon, feels like, high/low
    ├── (stats)                  humidity, wind, pressure, visibility, clouds, sunrise
    ├── (compare)                "Bangkok is 2° warmer than Singapore"
    ├── HourlyForecast           the next 24 hours
    ├── DailyOutlook             the next 5 days with coloured bars
    └── AirQuality               air score from 1 to 5
```

A parent gives information to a child through **props** (short for "properties"). Each component has an interface that lists exactly which props it needs. Here's `WeatherCard`'s:

```ts
interface WeatherCardProps {
  data: WeatherData
  units: Units
  range: { min: number; max: number }
}
```

If `CityPanel` forgot to pass `units`, TypeScript would complain before you even opened the browser.

**The map** uses a library called [Leaflet](https://leafletjs.com). The map is made of hundreds of small square pictures called **tiles**, fitted together like a puzzle. Zoom in, and Leaflet downloads more detailed tiles. The weather overlays (rain, clouds, temperature, wind) are see-through tiles from OpenWeatherMap, laid on top of the map like tracing paper.

Each component has its own `.css` file next to it. CSS is the language for colours, sizes and layout.

### ⑪ You click something

Say you click **Singapore** in the top bar (or its bubble on the map, or the compare card). This runs:

```ts
function selectCity(id: string) {
  setSelectedId(id)          // 1. change the state
  saveSetting(CITY_KEY, id)  // 2. write it in the browser's notebook
}
```

1. The state changes, so React redraws everything that depends on it.
2. The panel now shows Singapore's weather. It was already downloaded in step ⑤, so it appears instantly.
3. The map notices the new city and **flies** there in 0.8 seconds.

Click **°F** and something interesting happens: the app does **not** ask the internet again. It always gets Celsius from OpenWeatherMap and only converts when it shows a number. Switching units is pure maths, so it's instant.

### ⑫ Every 10 minutes: fresh weather

```ts
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000
```

That's 10 minutes × 60 seconds × 1000 milliseconds = 600,000 milliseconds. A timer (`setInterval`) runs the whole of step ⑤ again every 10 minutes. You can also press the 🔄 button in the panel.

While new weather is loading, **the old weather stays on screen**, so nothing flickers. If the refresh fails (say your Wi-Fi dropped), you keep seeing the last weather with a small note: "Couldn't refresh… Showing the last update."

The clock in the panel ticks forward every minute, and so does the "Updated 5 min ago" text.

### ⑬ You close the tab

React stops and the timers stop. But the browser's notebook (localStorage) remembers:

- which city you picked (`selectedCity`)
- °C or °F (`units`)
- your map style, overlay and how see-through it is (`mapBase`, `mapOverlay`, `mapOverlayOpacity`)

Next time you open the page, you're right back where you left off. 🎉

---

## 4. Where everything lives (the folders)

```
my-weather-app/
├── index.html            ① the empty page the browser downloads first
├── package.json          the project's ID card: name, commands, libraries
├── .env                  🤫 your secret API key (you create this)
├── .env.example          an example of what .env should look like
├── vite.config.ts        settings for Vite (runs the app) and Vitest (runs tests)
├── tsconfig*.json        settings for TypeScript (how strict to be)
├── .oxlintrc.json        settings for the linter (the tidiness checker)
├── public/               files copied as they are, like the tab icon
├── dist/                 the packed app made by `npm run build` (don't edit)
├── node_modules/         downloaded libraries (don't edit; npm manages it)
│
└── src/                  ⭐ all the code you write lives here
    ├── main.tsx          ② the starting point
    ├── App.tsx           ③ the boss component
    ├── App.css           layout of the whole screen
    ├── index.css         colours and styles shared by everything
    ├── vite-env.d.ts     tells TypeScript about VITE_API_KEY
    │
    ├── api/              ⑥⑦ talking to OpenWeatherMap
    │   ├── openWeatherMap.ts   sends the questions, handles errors
    │   └── types.ts            the shape of the answers
    │
    ├── hooks/            ⑤⑧ React logic you can reuse
    │   └── useCityWeather.ts   loads both cities and refreshes every 10 min
    │
    ├── data/             facts that don't change
    │   └── locations.ts        the two cities: names, time zones, positions
    │
    ├── utils/            ⑨ helpers: numbers in, nice text out
    │   ├── units.ts            °C/°F, km/h/mph
    │   ├── time.ts             clocks, days, "Updated 5 min ago"
    │   ├── forecast.ts         40 steps → 5 days, today's high/low
    │   ├── alerts.ts           storm and heavy rain warnings
    │   └── airQuality.ts       air score words and advice
    │
    ├── components/       ⑩ the LEGO bricks that draw the screen
    │   ├── TopBar.tsx          the bar at the top
    │   ├── map/                everything on the map
    │   └── panel/              everything in the glass side panel
    │
    └── test/             helpers shared by the tests
        ├── setup.ts            runs before every test
        ├── fixtures.ts         pretend weather data
        └── helpers.tsx         a pretend OpenWeatherMap
```

The folders inside `src/` follow the journey: `api/` fetches, `hooks/` organises, `utils/` translates, and `components/` draws.

---

## 5. Tests: robots that check the code

Next to many files there's a file with `.test` in its name, like `time.ts` and `time.test.ts`. Tests are little robots that use the code and check the answer is right. Here's one from `time.test.ts`:

```ts
// 05:30 UTC
expect(formatHour(OBSERVED_AT, BANGKOK_TZ)).toBe('12 PM')
expect(formatHour(OBSERVED_AT, SINGAPORE_TZ)).toBe('1 PM')
```

"At the same moment, expect Bangkok's clock to say 12 PM and Singapore's to say 1 PM." (Singapore is one hour ahead of Bangkok.) If someone breaks the time zone maths, this test turns red.

The tests never use the real internet. `src/test/helpers.tsx` has a **pretend OpenWeatherMap** that always answers with the made-up weather in `src/test/fixtures.ts`. That way the tests are fast, work offline, and give the same result every time, even when it's actually raining.

```bash
npm test
```

You should see something like `Tests  194 passed`. ✅

---

## 6. TypeScript cheat sheet

All of these are used somewhere in this project.

| You see | It means | Example in this project |
|---|---|---|
| `: number` | this is a number | `lat: number` |
| `interface X { … }` | a description of an object's shape | `MapLocation` in `data/locations.ts` |
| `type X = 'a' \| 'b'` | X can only be `'a'` or `'b'` (union type) | `Units` in `utils/units.ts` |
| `name?: string` | this field might be missing | `gust?: number` in `api/types.ts` |
| `X \| null` | an X, or nothing | `forecast: ForecastData \| null` |
| `value!` | "trust me, it's not null" | `getElementById('root')!` in `main.tsx` |
| `function f<T>()` | a generic: fill in the type later | `getJson<T>` in `api/openWeatherMap.ts` |
| `Promise<T>` | a T that will arrive later | `Promise<CityResult>` |
| `async` / `await` | wait for a Promise without freezing | `loadCity` in `hooks/useCityWeather.ts` |
| `import type { X }` | bring in a type only (it vanishes when the app runs) | top of most files |
| `as const` | "these exact values, never changed" | `LEVELS` in `panel/AirQuality.tsx` |

---

## 7. Challenges to try

Start `npm run dev` first so you can watch what happens.

**🟢 Easy: catch a mistake with TypeScript.**
Open `src/components/TopBar.tsx` and find `UNIT_OPTIONS`. Add a third button:

```ts
{ value: 'kelvin', label: 'K' },
```

Your editor shows a red squiggle, and `npm run build` refuses to finish. Why? Because `value` has to be a `Units`, and `Units` is only `'metric' | 'imperial'`. TypeScript just stopped a bug before it happened.

Want to really add Kelvin? Change the `Units` type in `utils/units.ts` to `'metric' | 'imperial' | 'kelvin'`. The red squiggle goes away... and TypeScript goes quiet. But the app is still wrong! The code only ever asks "is it imperial?" and treats everything else as Celsius, so the K button would show plain Celsius numbers with `°C` on them. You'd have to hunt down every spot yourself. Here are two to start with:

- `temperature()` and `formatTemp()` in `utils/units.ts` (Kelvin = °C + 273.15, and Kelvin is written `K`, not `°K`)
- `UNIT_VALUES` in `App.tsx`, so your choice is remembered next time

That's a real programmer lesson: types catch lots of mistakes, but not all of them.

**🟡 Medium: change when storms are noticed.**
In `src/utils/alerts.ts`, `LOOKAHEAD_STEPS = 4` means "look 12 hours ahead." Change it to `8` to look 24 hours ahead. Run `npm test`. Do any tests notice?

**🔴 Hard: add a third city.**
Add Kuala Lumpur to `MAP_LOCATIONS` in `src/data/locations.ts`:

```ts
{
  id: 'kuala-lumpur',
  label: 'Kuala Lumpur, Malaysia',
  name: 'Kuala Lumpur',
  countryCode: 'MY',
  country: 'Malaysia',
  timeZone: 'Asia/Kuala_Lumpur',
  lat: 3.139,
  lon: 101.6869,
},
```

A new button appears in the top bar, a new bubble lands on the map, and its weather loads by itself, because everything else reads from this one list. TypeScript is happy too, since the new city has every field `MapLocation` asks for.

Then run `npm test`. About 10 tests turn red, in `src/App.test.tsx` and `src/hooks/useCityWeather.test.tsx`. They were written expecting exactly two cities, and the pretend OpenWeatherMap only knows Bangkok and Singapore. The robots are doing their job: they noticed the app changed! Can you teach them about Kuala Lumpur? Start with `src/test/fixtures.ts` and `src/test/helpers.tsx`.

Have fun! 🚀
