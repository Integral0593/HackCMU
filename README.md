# SlotSync
*Built at HackCMU 2025*

## 🚀 Overview

A one-page H5 + Flask app that shows who's **in class vs free right now** and recommends **study partners** from shared classes—optimized for the campus context. It nails the ultra-simple MVP: a single page that just works.

## 🎯 Inspiration

Students often want to study *now* but can't easily find classmates who are free at the same time. We focused on the **on-campus context** (schedules, majors, common locations) so recommendations feel natural and timely rather than artificial.

## 🛠 What it does

* **Live status board**: "📚 In Class" and "✅ Free Now," auto-refreshing every 30 seconds.
* **One-tap manual status**: `free / studying / help / busy / tired / social`.
* **Schedule input**: add or replace your courses (day + time range).
* **Match (study partner)**: same-class classmates who are **currently free**, ranked with simple, explainable reasons.
* **Endpoints**: `POST /add_schedule`, `GET /current_status`, `POST /update_status`, `GET /recommendations`.

## ⚡ How we built it

**Tech Stack:**
- Frontend: HTML/CSS/JS/TS (single H5 page)
- Backend: Python/Flask
- Database: In-memory (MVP), optional JSON files for persistence
- APIs: — (none required for MVP)
- Other tools: GitHub

We intentionally kept the architecture tiny for a **24h demo**: H5 served by Flask, minimal endpoints, and in-memory data for speed. This follows our plan to use **HTML/CSS/JS + Python Flask + JSON files** so we can iterate quickly and still upgrade to JSON persistence later.

## 🎨 Design

Mobile-first single page with two list columns (in-class / free-now) and a compact form for schedule input. Recommendation cards show shared classes, score, and a short reason. We prioritized **readability** and **fast scanning** for judges; responsive tweaks are included.

## 💪 Challenges we ran into

* **Time parsing & edge cases** (start==now, end==now, no classes today).
* **Field naming alignment** between front/back/algorithm to avoid "works on my machine."
* **Cold-start data** for demos (ensuring at least two users share a class and overlap free time).
* **Keeping it simple**: resisting feature creep while leaving room for growth.

## 🏆 Accomplishments that we're proud of

* A smooth **live status board** with 30s polling and manual status updates.
* **Explainable matching** that feels smart without heavy ML.
* Clear **API contracts** that made 3-person parallelization fast.

## 📚 What we learned

* Focusing on **context** (same campus, same classes) dramatically boosts recommendation quality.
* "Rules that feel smart" + good UX often beat over-engineering for hackathon demos.
* Small, well-scoped APIs speed up cross-role collaboration.

## 🔮 What's next for SlotSync

* **JSON persistence** (atomic writes, reload on change) and "time-travel" param `?now=` for demo replays.
* **Class connections** boosting (currently in same class / next class together).
* **Location buckets** (UC/Library/Dorm) and proximity scoring.
* Social discovery and insights (e.g., "You study best with Alice on Tuesdays") as data accumulates.

## 🚀 Try it out

**Live Demo:** (TBD)

**GitHub Repository:** https://github.com/Integral0593/HackCMU

### Running locally

```bash
# Clone your repo
git clone https://github.com/Integral0593/HackCMU
cd HackCMU

# Backend
pip install flask
python app.py
# Open http://127.0.0.1:5000

# (Optional) Frontend is served from /static/index.html by Flask
```

## 📱 Screenshots

*Add 2–3 screenshots or GIFs here (status board, add schedule, recommendations).*

## 👥 Team

* **Sine** – Frontend (H5) – https://github.com/sinewave0201
* **Tabris** – Backend (Flask) – https://github.com/psychovia
* **Vera** – Algorithm (Matching) – https://github.com/Integral0593

## 🙏 Acknowledgments

* Thanks to HackCMU 2025 and ACM@CMU for organizing this event.
* Shout-out to mentors and peers who gave feedback.
* Open-source love to Flask and the broader Python/JS ecosystem.

---

*Made with ❤️ in 24 hours at Carnegie Mellon University*
