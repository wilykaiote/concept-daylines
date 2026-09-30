import { DayWheelChart, type DayWheelSlice } from "./DayWheelChart";

const ENERGY_DIVIDER_PCT = 62;

const NEXT_MEAL = {
  label: "Next meal",
  title: "Lunch · Turkey bowl",
  when: "12:30",
};

const NEXT_FITNESS = {
  label: "Next fitness",
  title: "Upper body · 45m",
  when: "6:00 PM",
};

type HomeFeedPost = {
  id: string;
  author: string;
  handle: string;
  routine: string;
  body: string;
  likes: number;
  following: boolean;
};

const HOME_FEED_POSTS: HomeFeedPost[] = [
  {
    id: "1",
    author: "Maya Chen",
    handle: "@maya.moves",
    routine: "Morning mobility",
    body: "Ten minutes of hips and thoracic openers before coffee. Keeps my desk day from locking up.",
    likes: 128,
    following: false,
  },
  {
    id: "2",
    author: "Jordan Blake",
    handle: "@jb.lifts",
    routine: "Push day A",
    body: "Bench, incline DB, lateral raises, tricep finishers. Logged 3×8 at the working weight.",
    likes: 86,
    following: true,
  },
  {
    id: "3",
    author: "Sam Ortiz",
    handle: "@sam.eats",
    routine: "Prep Sunday bowls",
    body: "Batch rice, roasted veg, and two proteins. Lunches sorted through Wednesday.",
    likes: 204,
    following: false,
  },
  {
    id: "4",
    author: "Riley Nguyen",
    handle: "@rn.zone2",
    routine: "Easy 40",
    body: "Zone 2 jog on the river path. Nose breathing the whole way — dialed, not dramatic.",
    likes: 61,
    following: false,
  },
  {
    id: "5",
    author: "Alex Rivera",
    handle: "@alex.recover",
    routine: "Wind-down circuit",
    body: "Foam roll, light stretch, lights low. Same sequence every night so sleep comes easier.",
    likes: 143,
    following: true,
  },
  {
    id: "6",
    author: "Chris Patel",
    handle: "@cp.strength",
    routine: "Lower hypertrophy",
    body: "Squat focus plus RDLs and walking lunges. Added a slow eccentric on the last sets.",
    likes: 97,
    following: false,
  },
];

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-6.5-4.2-9-7.6C1.2 10 2.2 6.8 5.2 5.6c1.8-.7 3.7-.2 4.9 1.2C11.3 5.4 13.2 4.9 15 5.6c3 1.2 4 4.4 2.2 6.8C18.5 15.8 12 20 12 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type HomeViewProps = {
  wheelLabel: string;
  wheelSlices: DayWheelSlice[];
  wheelElapsedEndMin: number | null;
};

export function HomeView({
  wheelLabel,
  wheelSlices,
  wheelElapsedEndMin,
}: HomeViewProps) {
  return (
    <div className="home-view">
      <div className="home-chrome">
        <header className="home-header">
          <div className="home-header-wheel-col">
            <div className="home-wheel">
              <DayWheelChart
                label={wheelLabel}
                slices={wheelSlices}
                elapsedEndMin={wheelElapsedEndMin}
                showLegend={false}
                showLabel={false}
                compact
              />
            </div>
            <div
              className="home-energy"
              role="img"
              aria-label={`Energy balance, marker at ${ENERGY_DIVIDER_PCT}% toward out`}
            >
              <div className="home-energy-labels">
                <span>IN</span>
                <span>OUT</span>
              </div>
              <div className="home-energy-track">
                <span
                  className="home-energy-divider"
                  style={{ left: `${ENERGY_DIVIDER_PCT}%` }}
                />
              </div>
            </div>
          </div>

          <div className="home-header-side">
            <div className="home-next-slot">
              <p className="home-next-label">{NEXT_MEAL.label}</p>
              <p className="home-next-title">{NEXT_MEAL.title}</p>
              <p className="home-next-when">{NEXT_MEAL.when}</p>
            </div>
            <div className="home-next-slot">
              <p className="home-next-label">{NEXT_FITNESS.label}</p>
              <p className="home-next-title">{NEXT_FITNESS.title}</p>
              <p className="home-next-when">{NEXT_FITNESS.when}</p>
            </div>
          </div>
        </header>
      </div>

      <section className="home-feed" aria-label="Routine feed">
        {HOME_FEED_POSTS.map((post) => (
          <article key={post.id} className="home-feed-post">
            <div className="home-feed-post-top">
              <div className="home-feed-avatar" aria-hidden="true">
                {post.author.slice(0, 1)}
              </div>
              <div className="home-feed-meta">
                <p className="home-feed-author">{post.author}</p>
                <p className="home-feed-handle">{post.handle}</p>
              </div>
              <button type="button" className="home-feed-follow" disabled>
                {post.following ? "Following" : "Follow"}
              </button>
            </div>
            <p className="home-feed-routine">{post.routine}</p>
            <p className="home-feed-body">{post.body}</p>
            <div className="home-feed-actions">
              <button type="button" className="home-feed-like" disabled>
                <HeartIcon />
                <span>{post.likes}</span>
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
