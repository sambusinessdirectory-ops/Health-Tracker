# Health Tracker

My private bilingual health and weight tracker, published as a GitHub Pages PWA and synced to a dedicated Supabase project.

## Included trackers

- Weight, water, cardio, strength, food, grocery, meal-prep and calorie records
- A separately installable PWA for every tracker card, plus the all-in-one main PWA
- Pre-exercise desire and post-exercise feeling surveys, each with a 1–7 dashboard
- Personal food preferences, food cut goals, sport preferences and sport focus goals
- Seven collapsible progress dashboards and PDF exports

The Supabase schema updates are versioned in `supabase/migrations/`. Apply database migrations before publishing the matching front-end release.

## Individual tracker PWAs

Each dashboard card has its own install identity, launch URL, icon and offline shell. All 15 PWAs connect to the same private Supabase account and records. Browsers that share same-origin app storage also reuse the cached settings and session; Apple Home Screen apps can use separate storage containers, so each installed icon includes its own cloud sign-in control.

| Tracker | Standalone route |
| --- | --- |
| Weight Record | `weight/` |
| Water Intake | `water/` |
| Cardio Exercise | `cardio/` |
| Weight Exercise | `strength/` |
| Food Taken | `food/` |
| Grocery Shopping | `groceries/` |
| Meal Prep | `meal-prep/` |
| Calories Calculation | `calories/` |
| All Dashboard Progress | `progress/` |
| Food Desire Tracker | `food-desire/` |
| My Food Preference | `food-preference/` |
| My Food Cut Goal | `food-cut-goal/` |
| My Sport Preference | `sport-preference/` |
| My Sport Focus Goal | `sport-focus-goal/` |

To install one tracker, open its card in the main app, choose **Open this tracker app**, and then choose **Install app**. On iPhone or iPad, open that standalone page in Safari, tap **Share**, then **Add to Home Screen**. Repeat only for the trackers you want as separate Home Screen apps.

When the catalog or standalone template changes, regenerate the routes and icon assets with:

```sh
node tools/generate-standalone-pwas.mjs
python3 tools/generate-pwa-icons.py
```

This individual-PWA release does not require a Supabase migration.
