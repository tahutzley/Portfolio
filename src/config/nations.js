/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  NATIONS — this is the only file you need to touch to add work.      ║
   ║                                                                      ║
   ║  Add a project: drop an object into the right nation's `projects`.   ║
   ║  Every field except `title` is optional; blanks just don't render.   ║
   ║                                                                      ║
   ║  COPY-PASTE TEMPLATES — paste any of these straight into a           ║
   ║  project's or timeline entry's `links: [ ]` array:                   ║
   ║                                                                      ║
   ║    { label: "Live",     href: "https://your-deployed-url.com" },     ║
   ║    { label: "Source",   href: "https://github.com/you/repo" },       ║
   ║    { label: "Demo",     href: "https://youtube.com/watch?v=..." },   ║
   ║    { label: "Write-up", href: "https://..." },                       ║
   ║                                                                      ║
   ║  Every project can also take an `image` field. Files live in         ║
   ║  /public and are referenced by bare filename — "MakeNCents.png"      ║
   ║  resolves to /public/MakeNCents.png. Leave it out and the slot       ║
   ║  stays blank paper. Timeline entries take the same `links` field.    ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

export const NATIONS = {
  water: {
    name    : "Water",
    kicker  : "Data Science & Analytics",
    title   : "Work that moves data from one shape to another",
    blurb   : "Waterbending is redirection — taking what's already there and giving it a direction. Analysis, modeling, pipelines, and the unglamorous cleaning that makes any of it possible.",
    projects: [
      {
        title  : "Financial Literacy Learning Platform",
        meta   : "August 2025 – May 2026 · Senior Capstone",
        summary: "An interactive learning platform using financial simulations, user research, and A/B testing to improve financial comprehension.",
        tags   : ["D3.js", "Firebase", "Prolific", "A/B Testing"],
        problem: "Financial concepts such as budgeting, compound interest, and portfolio diversification are difficult to understand from static explanations alone.",
        decisions: [
          "Built interactive D3.js simulations that accepted sample or user-entered data, making the underlying concepts explorable instead of purely descriptive.",
          "Used five usability studies and two 12-participant A/B-test waves to evaluate a state-aware AI coach with a custom engagement rubric."
        ],
        outcome: "Higher-engagement participants averaged 1.1 points better on a 10-point financial-literacy assessment; owned Firebase authentication, Firestore, and storage end to end.",
        image  : "MakeNCents.png",
        links  : [
          { label: "Live", href: "https://makencents.web.app/" },
          { label: "WPI Published Report", href: "Financial Literacy Learning Platform Write Up.pdf" }
        ]
      },
      {
        title  : "Airline Customer Experience Dashboard",
        meta   : "November 2025 · Business Intelligence Final Project",
        summary: "A Tableau dashboard that turns 129,880 passenger surveys into service and satisfaction insights.",
        tags   : ["Tableau", "SQL", "Data Modeling", "KPI Design"],
        problem: "The survey data scattered 14 service-rating fields across a wide table, making it difficult to compare customer experience across passenger segments.",
        decisions: [
          "Pivoted the ratings into a 1.8M-row long-format extract so the dashboard could support flexible dimensions and service-level comparisons.",
          "Defined calculated KPIs for overall, total, and digital experience, then connected filter actions across class, loyalty, travel purpose, age, and distance."
        ],
        outcome: "Business-class satisfaction measured 69.4% versus 18.8% for Economy; online boarding was the widest service gap at 0.90/5.",
        image  : "Tableau.png",
        links  : [
          { label: "Dashboard Live", href: "https://public.tableau.com/app/profile/timothy.hutzley/viz/AirlinePassengerSatisfactionDashboard_17724052429950/Dashboard1" },
          { label: "Write Up", href: "Airline Passenger Satisfaction Write Up.pdf" }
        ]
      },
      {
        title  : "German Traffic Sign Classification",
        meta   : "November - December 2024 · Machine Learning Final Project",
        summary: "A computer-vision study comparing a custom CNN with fine-tuned ResNet50 and VGG16 models on 43 classes of German traffic signs.",
        tags   : ["Python", "PyTorch", "CNNs", "Transfer Learning", "Computer Vision"],
        problem: "Traffic-sign images vary in size, lighting, orientation, and appearance, so the task was to build a classifier that could recognize 43 German traffic-sign categories from image data.",
        decisions: [
          "Resized and normalized images for each model family, then used random flips, 15-degree rotations, and color jitter to improve generalization across visual conditions.",
          "Compared a lightweight two-block custom CNN against ImageNet-pretrained ResNet50 and VGG16 models, using Adam, learning-rate scheduling, and ten training epochs."
        ],
        outcome: "VGG16 achieved the highest test accuracy at 97.40%, followed by ResNet50 at 97.22% and the custom CNN at 96.96%. The custom model offered a much lighter, faster alternative while remaining highly competitive.",
        image  : "Image Classification.png",
        links  : [
          { label: "Source Code", href: "https://github.com/tahutzley/German-Traffic-Sign-Recognition" },
          { label: "Write Up", href: "German Traffic Sign Classification Write Up.pdf" }
        ]
      },
      {
        title  : "March Madness SelfieCity-Style Visualization",
        meta   : "March 2026 · Data Visualization Final Project",
        summary: "An interactive visualization for exploring every March Madness team from 2013–2023 through five linked filters and a dynamic bubble chart.",
        tags   : ["D3.js", "Data Visualization", "SVG", "Team Project"],
        problem: "College basketball statistics are usually locked in dense spreadsheets, making it hard for casual fans to explore trends or understand what separates winning teams from the rest.",
        decisions: [
          "Built five interconnected filters (bracket round, win % range, year, court shooting stats, and seed) that all narrow the same underlying dataset, inspired by SelfieCity's non-traditional filtering interactions.",
          "Designed a bottom-half bubble chart of basketballs that clusters and animates in response to the active filters, giving immediate visual feedback on how many teams match."
        ],
        outcome: "Delivered a fully interactive site covering 10 seasons of tournament data across 4 team members, pairing custom D3 court and bracket visualizations with a cohesive, low-clutter design.",
        image  : "March Madness.png",
        links  : [
          { label: "Live", href: "https://data-visualization-final-project-three.vercel.app/" }
        ]
      }
    ]
  },

  earth: {
    name    : "Earth",
    kicker  : "Full-Stack Applications",
    title   : "Systems built to hold weight",
    blurb   : "Earthbending is substance and stance — you don't move until you're sure. Full-stack applications, backends, infrastructure, and the mobile app.",
    projects: [
      {
        title  : "OmniLead Mobile Sales Platform",
        meta   : "Oct 2025 - Present · Full-stack Developer",
        summary: "A full-stack sales platform combining geospatial parcel data, team workflows, performance analytics, and AI-driven insights in a live iOS app.",
        tags   : ["React", "TypeScript", "FastAPI", "Python", "PostgreSQL", "PostGIS"],
        problem: "Field sales teams needed a reliable way to work address-level data, coordinate activity, and turn sales-session behavior into actionable performance insights.",
        decisions: [
          "Built a Python ETL pipeline to decode, normalize, validate, and load public parcel releases, scaling coverage from 400K Jacksonville addresses to 1.4M Tennessee parcels.",
          "Designed the PostgreSQL/PostGIS schema and source-to-target mappings, tested the stack in Docker, and deployed it to Render behind a FastAPI service."
        ],
        outcome: "Defined KPIs with a 14-person field team; the three-week Jacksonville pilot lifted appointments set, held, and converted by roughly 12%, leading to mobile port for testing in Tennessee Summer of 2026.",
        /* Filename case matters: the file on disk is "Omnilead.png" with a
           lowercase L. Windows and macOS don't care; a Linux static host
           will 404 it. */
        image  : "Omnilead.png",
        links  : [
          { label: "App Store Link", href: "https://apps.apple.com/us/app/omnilead/id6774981944" }
        ]
      },
      {
        title  : "Hospital Navigation System",
        meta   : "March - May 2025 · Team of 11 · Brigham and Women's Hospital Collaboration",
        summary: "A multi-floor hospital navigation system with graph-based routing, text directions, and elevator/stair controls.",
        tags   : ["React", "TypeScript", "Express", "Graph Algorithms", "Agile/Scrum"],
        problem: "Visitors needed a clearer way to navigate a complex hospital across floors and choose routes involving elevators or stairs.",
        decisions: [
          "Modeled the hospital as graph-based node and edge data so the backend could compute and serve routes across floors.",
          "Led the 11-person team as Scrum Master, coordinating sprint planning, standups, retrospectives, and delivery around a live client collaboration."
        ],
        outcome: "Delivered a working multi-floor UI with visual pathfinding, text directions, and explicit elevator/stair routing.",
        image  : "Navigation Website.png",
        links  : [
          { label: "Live", href: "https://navweb-frontend.onrender.com/" },
          { label: "Source Code", href: "https://github.com/tahutzley/Navigational-Website" }
        ]
      }
    ]
  },

  fire: {
    name    : "Fire",
    kicker  : "Personal Projects",
    title   : "Things made because they were interesting",
    blurb   : "Fire is the element of drive — it goes where you point it and it burns things down when you don't. Side projects, prototypes, and work that had no deadline but got finished anyway.",
    projects: [
      {
        title  : "Aimilytics — KovaaK's Performance Analytics Platform",
        meta   : "June - July 2026 · Personal Project",
        summary: "A performance-analysis platform that turns high-frequency mouse telemetry, event data, and video detections into technique feedback.",
        tags   : ["Python", "Next.js", "Telemetry", "3D Visualization"],
        problem: "Aim-training sessions produce a lot of raw telemetry, but the useful technique issues are hard to isolate, rank, and verify by hand.",
        decisions: [
          "Built a Python pipeline to time-align 1,000 Hz mouse telemetry, event CSVs, and video-derived detections, auto-segmenting runs while retaining 90–95% of records after quality checks.",
          "Ranked technique issues by prevalence, correlation, estimated cost, and confidence using reaction, path-efficiency, and overshoot metrics."
        ],
        outcome: "Mapped telemetry and target centroids into 3D space with sensitivity and field-of-view adjustments, hand-validating trajectory overlays before trusting derived metrics.",
        links  : []
      },
      {
        title  : "Billy Big Mouth Bass Alexa / Chatbot",
        meta   : "June 2023 - August 2025 · Personal project",
        summary: "A conversational full-stack system that gives an animated Billy Big Mouth Bass voice interaction through Alexa and chat.",
        tags   : ["React", "TypeScript", "Flask", "OpenAI API", "Azure Speech"],
        problem: "The project needed to connect conversational AI with real-time speech interaction and a physical, voice-driven character experience.",
        decisions: [
          "Connected a React TypeScript frontend to a Flask backend so the system could coordinate chat, speech services, and the character interface.",
          "Integrated OpenAI APIs with Azure speech-to-text and text-to-speech, while handling asynchronous wake-word detection for hands-free interaction."
        ],
        outcome: "Built a working conversational system supporting real-time speech-to-text, generated responses, text-to-speech, and asynchronous wake-word detection.",
        links  : []
      }
    ]
  },

  air: {
    name    : "Air",
    kicker  : "Who am I?",
    title   : "How I think, and where I've been",
    blurb   : "Air is the element of freedom — and of paying attention. This is the part where I tell you what I actually care about, in my own voice, without adjectives I'd be embarrassed to say out loud.",
    /* The second section on this page reads "Education" instead of the
       default "Work" — that's what `sectionLabel` controls. */
    sectionLabel: "Education",
    timeline: [
      {
        when : "June 2025 — Present",
        what : "AI Trainer (Freelance) · DataAnnotation",
        note : "Wrote evaluation criteria for code generation tasks, produced golden outputs, and stress-tested model responses against those rubrics. In practice: rubric design, edge-case reasoning, and holding a consistent quality bar across a lot of ambiguous work.",
        links: []
      },
      {
        when : "March 2025 - May 2025",
        what : "Study Abroad Research Intern · Taiwanese Institute of Economic Research",
        note : "Lived in Taiwan for three months, conducting research on the impact that the new U.S. president Donald Trump would have on the future direction of U.S. and Taiwanese economics. In a team of 4, Presented these findings through tailored policy briefs to a panel of economists.",
        links: [
          { label: "WPI Published Report", href: "Taiwan Research Report.pdf" },
          { label: "Policy Briefs", href: "Taiwan Policy Briefs.pdf" }
        ]
      },
      {
        when : "May 2024 — August 2024",
        what : "Marketing Assistant · T&R Services",
        note : "Conducted market research to identify partnership opportunities with affiliated businesses and designed a React TypeScript testimonial page to present client feedback.",
        links: []
      }
    ],
    projects: [
      {
        title  : "B.S. Computer Science + Data Science",
        meta   : "May 2026 · Worcester Polytechnic Institute",
        summary: "3.9/4.0 GPA — Dean's List every semester.",
        tags   : ["Computer Science", "Data Science"],
        image  : "Degree.png",
        links  : [
          { label: "Official Degree", href: "https://www.parchment.com/lp/award/bc851b54-c559-4d6b-9672-626c1a6f6503" },
          { label: "Transcript", href: "TR5AGB1F.pdf" }
        ]
      }
    ]
  }
};

/* Order used by the panel grid and the All Work page.
   Re-exported from data/skin.js rather than redeclared — keeping two
   literal arrays in sync by hand is how the map's draw order silently
   drifts away from the panel grid's. */
export { ORDER as PANEL_ORDER } from "../data/skin.js";

/* Cartouche copy. `lines` is pre-broken because SVG <text> does not wrap —
   see the interior-layout block in map/cartouche.js. Name comes from
   NATIONS[k].name so it can't drift. */
export const CARTOUCHE = {
  air  : { lines: ["About, background,",      "and approach"] },
  water: { lines: ["Data, research, and",      "analytical systems"] },
  fire : { lines: ["Experiments, games,",      "and personal builds"] },
  earth: { lines: ["Production applications",  "and full-stack systems"] }
};
