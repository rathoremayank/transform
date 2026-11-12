# Form

Form is a lightweight, responsive fitness transformation tracker that runs in your browser. It helps you plan movement and meals for the day, check them off, record body measurements and sleep, and review the last 30 days.

## Run locally

Open `index.html` in a modern browser, or serve this folder over HTTP:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Use the tracker

- Add or remove exercises and meals in **Your day**, then check them off as you go. The seven-day nutrition plan in `diet-plan.js` is transcribed from `diet_plan_7day.csv` and includes meal descriptions, calories, protein, daily totals, and the water target.
- The weekly workout schedule repeats automatically: Push Monday, Pull Tuesday, Rest with an 8-10k step target Wednesday through Friday, Legs Saturday, and Shoulders / Arms / Core Sunday. Each exercise includes its sets and reps.
- Use the date arrows to review or plan another day; select **Today** to return to the current date. Plans and check-ins are saved separately for each date.
- Use the moon/sun button in the header to switch between light and dark themes. Your theme preference is saved in this browser.
- Select **Log progress** to record weight, sleep, waist, hips, chest, and an optional note. Saving again on the same day updates that day's check-in.
- Review the 30-day weight trend, average sleep, plan completion, and recent consistency in **Insights**.
- Data is stored in this browser on this device. It is not synced to an account or backed up remotely.

Weight and sleep insights only appear after you record them.
