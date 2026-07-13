# Fitness & Nutrition Dashboard

A local, single-page web app to track your nutrition, workout logs, daily habits, and read fitness research articles and video guides. 

It connects a vanilla JavaScript frontend to a FastAPI/SQLite backend, using live RSS feeds to keep your reading hub updated.

## Features

* **Calorie & Macro Calculator:** Update your profile (weight, body fat %, height, activity level) and get instant target macros and daily calorie limits for cutting, bulking, or maintenance.
* **Lift Tracker & 1RM Calculator:** Log your working sets, view your strength progression chart (Chart.js), and estimate your 1-rep max (1RM) using Epley and Brzycki formulas.
* **Habit Calendar & Todo List:** Track workouts, habits, and tasks on a weekly/monthly calendar and checklist.
* **Research Feed & Video Player:** Read articles and watch YouTube videos pulled dynamically from *Stronger by Science* and *Barbell Medicine* RSS feeds. Videos open directly in a custom modal player.

## Tech Stack

* **Frontend:** HTML5, CSS (glassmorphic styling, fully responsive sidebar layout), and JavaScript. Served with a custom Python helper that disables browser caching.
* **Backend:** FastAPI, SQLite, SQLAlchemy, and Uvicorn.
* **Feed Parser:** Python service that scans science feeds in real-time, extracts embedded YouTube videos, and filters them into your sidebar feed.

## Setup & Run

### 1. Install Dependencies
Make sure you have Python 3.8+ installed, then run:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start the Backend API (Port 8000)
```bash
uvicorn main:app --port 8000 --reload
```

### 3. Start the Frontend Server (Port 8080)
```bash
python run_frontend.py
```

Now open [http://localhost:8080](http://localhost:8080) in your browser.