import { useMemo, useState } from "react";

const DISCOVER_TYPES = ["All", "Fitness", "Nutrition", "Mobility", "Recovery"] as const;
type DiscoverType = (typeof DISCOVER_TYPES)[number];

const DISCOVER_TAGS = [
  "beginner",
  "home",
  "gym",
  "quick",
  "strength",
  "cardio",
  "meal-prep",
  "stretch",
] as const;

type DiscoverRoutine = {
  id: string;
  title: string;
  author: string;
  handle: string;
  type: Exclude<DiscoverType, "All">;
  tags: string[];
  blurb: string;
  saves: number;
  popular?: boolean;
};

const DISCOVER_ROUTINES: DiscoverRoutine[] = [
  {
    id: "d1",
    title: "Desk Reset 12",
    author: "Maya Chen",
    handle: "@maya.moves",
    type: "Mobility",
    tags: ["quick", "home", "stretch"],
    blurb: "Neck, hips, and thoracic openers you can do between meetings.",
    saves: 1840,
    popular: true,
  },
  {
    id: "d2",
    title: "Push Hypertrophy A",
    author: "Jordan Blake",
    handle: "@jb.lifts",
    type: "Fitness",
    tags: ["gym", "strength"],
    blurb: "Bench focus with laterals and a tricep finisher. 45–55 minutes.",
    saves: 2210,
    popular: true,
  },
  {
    id: "d3",
    title: "Bowl Prep Blueprint",
    author: "Sam Ortiz",
    handle: "@sam.eats",
    type: "Nutrition",
    tags: ["meal-prep", "home"],
    blurb: "Rice, two proteins, roasted veg — lunches through midweek.",
    saves: 1560,
    popular: true,
  },
  {
    id: "d4",
    title: "Zone 2 Easy 40",
    author: "Riley Nguyen",
    handle: "@rn.zone2",
    type: "Fitness",
    tags: ["cardio", "beginner"],
    blurb: "Conversational pace jog or bike. Nose breathing optional.",
    saves: 990,
  },
  {
    id: "d5",
    title: "Wind-Down Circuit",
    author: "Alex Rivera",
    handle: "@alex.recover",
    type: "Recovery",
    tags: ["stretch", "home", "quick"],
    blurb: "Foam roll + lights-low stretch sequence for sleep.",
    saves: 1340,
    popular: true,
  },
  {
    id: "d6",
    title: "Lower Strength B",
    author: "Chris Patel",
    handle: "@cp.strength",
    type: "Fitness",
    tags: ["gym", "strength"],
    blurb: "Squat emphasis, RDLs, and walking lunges with slow eccentrics.",
    saves: 1180,
  },
  {
    id: "d7",
    title: "Morning Mobility Flow",
    author: "Priya Shah",
    handle: "@priya.flow",
    type: "Mobility",
    tags: ["beginner", "home", "stretch"],
    blurb: "Fifteen minutes from floor to standing before the day starts.",
    saves: 870,
  },
  {
    id: "d8",
    title: "High-Protein Breakfasts",
    author: "Leo Kim",
    handle: "@leo.kitchen",
    type: "Nutrition",
    tags: ["meal-prep", "quick"],
    blurb: "Five rotate-able breakfasts over 30g protein, under 10 minutes.",
    saves: 1420,
    popular: true,
  },
  {
    id: "d9",
    title: "Post-Lift Cooldown",
    author: "Nina Brooks",
    handle: "@nina.recover",
    type: "Recovery",
    tags: ["gym", "stretch"],
    blurb: "Hip flexors, calves, and breathing to close a hard session.",
    saves: 640,
  },
  {
    id: "d10",
    title: "Bodyweight Circuit",
    author: "Dev Morales",
    handle: "@dev.moves",
    type: "Fitness",
    tags: ["home", "beginner", "quick"],
    blurb: "No equipment: squats, push-ups, rows, and a short finisher.",
    saves: 1510,
  },
  {
    id: "d11",
    title: "Grocery-to-Plate Week",
    author: "Harper Quinn",
    handle: "@harper.eats",
    type: "Nutrition",
    tags: ["meal-prep", "home"],
    blurb: "One haul, seven dinners mapped with leftover logic.",
    saves: 780,
  },
  {
    id: "d12",
    title: "Hip Opener Stack",
    author: "Casey Wu",
    handle: "@casey.stretch",
    type: "Mobility",
    tags: ["stretch", "home"],
    blurb: "Deep squat holds, 90/90, and pigeon variations — slow and steady.",
    saves: 920,
  },
];

export function DiscoverView() {
  const [activeType, setActiveType] = useState<DiscoverType>("All");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  const popular = useMemo(
    () => DISCOVER_ROUTINES.filter((r) => r.popular).sort((a, b) => b.saves - a.saves),
    [],
  );

  const feed = useMemo(() => {
    return DISCOVER_ROUTINES.filter((routine) => {
      if (activeType !== "All" && routine.type !== activeType) return false;
      if (activeTags.length > 0 && !activeTags.every((tag) => routine.tags.includes(tag))) {
        return false;
      }
      return true;
    });
  }, [activeType, activeTags]);

  return (
    <div className="discover-view">
      <div className="discover-chrome">
        <header className="discover-header">
          <div className="discover-title-row">
            <h1 className="discover-title">Discover</h1>
            <p className="discover-subtitle">Routines from other people</p>
          </div>

          <div className="discover-filters" aria-label="Routine types">
            {DISCOVER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`discover-filter-chip${activeType === type ? " is-active" : ""}`}
                aria-pressed={activeType === type}
                onClick={() => setActiveType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="discover-tags" aria-label="Tags">
            {DISCOVER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`discover-tag-chip${activeTags.includes(tag) ? " is-active" : ""}`}
                aria-pressed={activeTags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </header>
      </div>

      <section className="discover-popular" aria-label="Most popular">
        <div className="discover-section-head">
          <h2 className="discover-section-title">Most popular</h2>
        </div>
        <div className="discover-popular-rail">
          {popular.map((routine) => (
            <article key={routine.id} className="discover-popular-card">
              <p className="discover-card-type">{routine.type}</p>
              <h3 className="discover-card-title">{routine.title}</h3>
              <p className="discover-card-author">{routine.author}</p>
              <p className="discover-card-saves">{routine.saves.toLocaleString()} saves</p>
            </article>
          ))}
        </div>
      </section>

      <section className="discover-feed" aria-label="Routine feed">
        <div className="discover-section-head">
          <h2 className="discover-section-title">For you</h2>
          <p className="discover-feed-count">{feed.length} routines</p>
        </div>
        {feed.length === 0 ? (
          <p className="discover-feed-empty">No routines match these filters.</p>
        ) : (
          feed.map((routine) => (
            <article key={routine.id} className="discover-feed-card">
              <div className="discover-feed-media" aria-hidden="true">
                <span>{routine.type}</span>
              </div>
              <div className="discover-feed-body">
                <div className="discover-feed-top">
                  <div className="discover-feed-avatar" aria-hidden="true">
                    {routine.author.slice(0, 1)}
                  </div>
                  <div className="discover-feed-meta">
                    <p className="discover-feed-author">{routine.author}</p>
                    <p className="discover-feed-handle">{routine.handle}</p>
                  </div>
                  <button type="button" className="discover-feed-save" disabled>
                    Save
                  </button>
                </div>
                <h3 className="discover-feed-title">{routine.title}</h3>
                <p className="discover-feed-blurb">{routine.blurb}</p>
                <div className="discover-feed-tags">
                  {routine.tags.map((tag) => (
                    <span key={tag} className="discover-feed-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="discover-feed-saves">{routine.saves.toLocaleString()} saves</p>
              </div>
            </article>
          ))
        )}
        {feed.length > 0 && (
          <p className="discover-feed-end">End of prototype feed</p>
        )}
      </section>
    </div>
  );
}
