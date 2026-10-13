# Wireframes — Agentic AI Debate Coach & Presentation Analysis Platform

> All wireframes below use Mermaid block diagrams or ASCII art.
> Actual visual polish is in the React frontend (Tailwind CSS).

---

## 1. Login Page (`/login`)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         🎤  Debate Coach                                    │
│             AI-Powered Coaching Platform                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Sign In                             │   │
│  │                                                      │   │
│  │  Email ──────────────────────────────────────────    │   │
│  │  [user@example.com                              ]    │   │
│  │                                                      │   │
│  │  Password ────────────────────────────────────────   │   │
│  │  [••••••••                                      ]    │   │
│  │                                                      │   │
│  │  [        Sign In with Email        ]                │   │
│  │                                                      │   │
│  │  ─────────────── or ───────────────                  │   │
│  │                                                      │   │
│  │  [  🔵  Continue with Google  ]                      │   │
│  │                                                      │   │
│  │  Don't have an account? [Register]                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Register Page (`/register`)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         🎤  Debate Coach                                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                Create Account                        │   │
│  │                                                      │   │
│  │  Full Name ─────────────────────────────────────     │   │
│  │  [Jane Smith                                    ]    │   │
│  │                                                      │   │
│  │  Email ──────────────────────────────────────────    │   │
│  │  [jane@example.com                              ]    │   │
│  │                                                      │   │
│  │  Password ────────────────────────────────────────   │   │
│  │  [••••••••                                      ]    │   │
│  │                                                      │   │
│  │  I am a: ( ) Learner  ( ) Coach  ( ) Educator       │   │
│  │                                                      │   │
│  │  [        Create Account        ]                    │   │
│  │                                                      │   │
│  │  Already have an account? [Sign In]                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Dashboard — Learner (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │   Welcome back, Jane!                                │
│ 👤 Profile    │                                                      │
│ 🎯 Goals      │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ 📊 Skills     │  │Sessions  │  │ Avg Score│  │  Goals   │           │
│ 🗣 Topics     │  │   12     │  │   7.4    │  │  3 / 5   │           │
│ 📅 Sessions   │  └──────────┘  └──────────┘  └──────────┘           │
│               │                                                      │
│               │  Skill Radar                                         │
│               │  ┌────────────────────────────┐                     │
│               │  │  Clarity ████████░░  8.0   │                     │
│               │  │  Logic   ██████░░░░  6.0   │                     │
│               │  │  Pace    ███████░░░  7.0   │                     │
│               │  │  ...                       │                     │
│               │  └────────────────────────────┘                     │
│               │                                                      │
│               │  Upcoming Sessions                                   │
│               │  ┌────────────────────────────────────────────┐     │
│               │  │ 📅 Climate Policy Debate — Fri 3pm  [View] │     │
│               │  │ 📅 AI Ethics Oxford Round — Sat 10am [View]│     │
│               │  └────────────────────────────────────────────┘     │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 4. Dashboard — Coach (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                           👤 Coach Alex  [Logout]  │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │  Coach Overview                                      │
│ 👥 Learners   │                                                      │
│ 📊 Skills     │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ 🗣 Topics     │  │Learners  │  │Sessions  │  │Avg Score │           │
│ 📅 Sessions   │  │   8      │  │  24 tot  │  │  6.9     │           │
│               │  └──────────┘  └──────────┘  └──────────┘           │
│               │                                                      │
│               │  Learner Performance                                 │
│               │  ┌────────────────────────────────────────────┐     │
│               │  │ Name       | Clarity | Logic | Sessions    │     │
│               │  │ Jane Smith |  8.0    |  6.0  |   12        │     │
│               │  │ Bob Jones  |  5.5    |  7.2  |    8        │     │
│               │  └────────────────────────────────────────────┘     │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 5. Dashboard — Educator (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                           👤 Prof. Kim  [Logout]   │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │  Class Overview                                      │
│ 👥 Class      │                                                      │
│ 🗣 Topics     │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ 📅 Sessions   │  │Students  │  │Scheduled │  │Completed │           │
│ ➕ New Topic  │  │  24      │  │    3     │  │  18      │           │
│               │  └──────────┘  └──────────┘  └──────────┘           │
│               │                                                      │
│               │  [+ Schedule New Session]   [+ Add Topic]            │
│               │                                                      │
│               │  Recent Sessions                                     │
│               │  ┌────────────────────────────────────────────┐     │
│               │  │ AI Ethics — completed — 2026-10-10  [View] │     │
│               │  │ Climate Policy — scheduled — 2026-10-15    │     │
│               │  └────────────────────────────────────────────┘     │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 6. Dashboard — Administrator (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                              👤 Admin  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │  System Overview                                     │
│ 👥 All Users  │                                                      │
│ 🗣 Topics     │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ 📅 Sessions   │  │ Users    │  │Sessions  │  │ Topics   │           │
│ ⚙  System    │  │  128     │  │  342     │  │   47     │           │
│               │  └──────────┘  └──────────┘  └──────────┘           │
│               │                                                      │
│               │  User Management                                     │
│               │  ┌────────────────────────────────────────────┐     │
│               │  │ Search: [____________] [Filter by role ▼]  │     │
│               │  │ Jane Smith — learner  — active  [Edit]     │     │
│               │  │ Alex Ray  — coach     — active  [Edit]     │     │
│               │  │ Prof. Kim — educator  — active  [Edit]     │     │
│               │  └────────────────────────────────────────────┘     │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 7. Profile & Skills (`/profile`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │  My Profile                                          │
│ 👤 Profile ◄  │                                                      │
│ 🎯 Goals      │  ┌──────────────────────────────────────────────┐   │
│ 📊 Skills     │  │  👤  Jane Smith                              │   │
│ 🗣 Topics     │  │      jane@example.com  |  Learner             │   │
│ 📅 Sessions   │  │      Experience: Intermediate                │   │
│               │  │                                              │   │
│               │  │  Bio: [                                    ] │   │
│               │  │  Preferred Topics: [AI] [Ethics] [+Add]     │   │
│               │  │  Presentation Domains: [Tech] [+Add]        │   │
│               │  │                                              │   │
│               │  │  [Save Profile]                             │   │
│               │  └──────────────────────────────────────────────┘   │
│               │                                                      │
│               │  Skill Summary                                       │
│               │  ┌──────────────────────────────────────────────┐   │
│               │  │ Clarity      ████████░░  8.0  (+0.5 ↑)      │   │
│               │  │ Relevance    ███████░░░  7.0  (→ stable)    │   │
│               │  │ Evidence     █████░░░░░  5.5  (-0.2 ↓)      │   │
│               │  │ Logic        ██████░░░░  6.2  (+1.1 ↑)      │   │
│               │  │ Persuasion   ███████░░░  7.3  (+0.3 ↑)      │   │
│               │  │ Pace         ████████░░  8.1  (+0.1 ↑)      │   │
│               │  │ Confidence   ██████░░░░  6.5  (→ stable)    │   │
│               │  │ Engagement   ███████░░░  7.8  (+0.6 ↑)      │   │
│               │  └──────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 8. Learning Goals (`/goals`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │  Learning Goals                   [+ Add Goal]       │
│ 🎯 Goals ◄    │                                                      │
│               │  ┌──────────────────────────────────────────────┐   │
│               │  │ 🎯 Improve Logic Score to 8.0                │   │
│               │  │    Target: 2026-12-01  |  Status: In Progress│   │
│               │  │    [Edit] [Mark Complete] [Delete]           │   │
│               │  ├──────────────────────────────────────────────┤   │
│               │  │ 🎯 Complete 5 Oxford Format Sessions         │   │
│               │  │    Target: 2026-11-15  |  Status: Not Started│   │
│               │  │    [Edit] [Mark Complete] [Delete]           │   │
│               │  ├──────────────────────────────────────────────┤   │
│               │  │ 🎯 Achieve Persuasiveness score ≥ 8          │   │
│               │  │    Target: —           |  Status: Completed ✓│   │
│               │  └──────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 9. Debate Topics (`/topics`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 🏠 Dashboard  │  Debate Topics                   [+ New Topic]       │
│ 🗣 Topics ◄   │                                                      │
│               │  Search: [_______________]  Filter: [All ▼]          │
│               │                                                      │
│               │  ┌──────────────────────────────────────────────┐   │
│               │  │ 💬 AI will replace 50% of jobs by 2035       │   │
│               │  │    Category: Technology  |  Created by: Admin │   │
│               │  │    [View] [Use in Session]                   │   │
│               │  ├──────────────────────────────────────────────┤   │
│               │  │ 💬 Climate change requires immediate policy  │   │
│               │  │    Category: Politics  |  Created by: Prof.Kim│   │
│               │  │    [View] [Use in Session]                   │   │
│               │  ├──────────────────────────────────────────────┤   │
│               │  │ 💬 Universal Basic Income is inevitable       │   │
│               │  │    Category: Economics  |  Created by: Admin  │   │
│               │  │    [View] [Use in Session]                   │   │
│               │  └──────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 10. Session List (`/sessions`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 📅 Sessions ◄ │  My Sessions                  [+ Create Session]     │
│               │                                                      │
│               │  Filter: [All Status ▼]  [All Formats ▼]  [Search]  │
│               │                                                      │
│               │  ┌──────────────────────────────────────────────┐   │
│               │  │ 🟢 ACTIVE   AI Ethics — Oxford               │   │
│               │  │    Position: For  |  Started: 18:30 today    │   │
│               │  │    [Join Session]                            │   │
│               │  ├──────────────────────────────────────────────┤   │
│               │  │ 🟡 SCHEDULED  Climate Policy — Parliamentary │   │
│               │  │    Fri Oct 15 3:00 PM  |  Position: Against  │   │
│               │  │    [View Details]                            │   │
│               │  ├──────────────────────────────────────────────┤   │
│               │  │ ⚫ COMPLETED  Tech Regulation — One-on-One   │   │
│               │  │    Oct 10  |  Scores: Clarity 8.0, Logic 7.2 │   │
│               │  │    [View Recap]                              │   │
│               │  └──────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 11. Create Session (`/sessions/new`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 📅 Sessions   │  ← Back to Sessions                                  │
│               │                                                      │
│               │  Create New Debate Session                           │
│               │  ┌──────────────────────────────────────────────┐   │
│               │  │ Topic ────────────────────────────────────── │   │
│               │  │ [Select a topic...                       ▼]  │   │
│               │  │                                              │   │
│               │  │ Format ───────────────────────────────────── │   │
│               │  │ ( ) One-on-One  ( ) Parliamentary  ( ) Oxford│   │
│               │  │ ( ) Policy      ( ) Public Forum   ( ) AI    │   │
│               │  │                                              │   │
│               │  │ Scheduled At ─────────────────────────────── │   │
│               │  │ [2026-10-15]  [15:00]                        │   │
│               │  │                                              │   │
│               │  │ My Position ──────────────────────────────── │   │
│               │  │ ( ) For  ( ) Against  ( ) Judge  ( ) Observer│   │
│               │  │                                              │   │
│               │  │ [    Cancel    ]  [  Create Session  ]       │   │
│               │  └──────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 12. Session Detail (`/sessions/:id`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡]  Debate Coach                               👤 Jane  [Logout]    │
├───────────────┬──────────────────────────────────────────────────────┤
│ 📅 Sessions   │  ← Back                                              │
│               │                                                      │
│               │  AI Ethics: Is AI dangerous? [🟢 ACTIVE]            │
│               │  Format: Oxford  |  Scheduled: Oct 15, 3:00 PM      │
│               │                                                      │
│               │  ┌─────────────────────┐  ┌─────────────────────┐   │
│               │  │  Participants        │  │  Actions             │  │
│               │  │  FOR                │  │                      │   │
│               │  │  • Jane Smith ✓     │  │  [Join as For]       │   │
│               │  │                    │  │  [Join as Against]   │   │
│               │  │  AGAINST           │  │  [Join as Observer]  │   │
│               │  │  • (empty)         │  │                      │   │
│               │  │                    │  │  [Start Session]     │   │
│               │  │  JUDGE             │  │  [Cancel Session]    │   │
│               │  │  • Prof. Kim       │  │                      │   │
│               │  └─────────────────────┘  └─────────────────────┘   │
│               │                                                      │
│               │  Skill Scores (post-session)                        │
│               │  ┌──────────────────────────────────────────────┐   │
│               │  │  No scores yet — session in progress         │   │
│               │  └──────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```
