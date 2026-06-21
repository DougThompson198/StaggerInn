import { CABINS, familyColor } from "@/lib/api";
import { CheckCircle2, MoonStar } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export default function OccupancyToday({ bookings, loading }) {
  const t = today();
  const occupants = (cabin) =>
    bookings.filter((b) => b.cabin === cabin && b.check_in <= t && b.check_out > t);

  return (
    <section
      data-testid="occupancy-widget"
      className="card-soft p-6 sm:p-8 animate-in"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-6">
        <div>
          <div className="uppercase-label">Tonight</div>
          <h2 className="font-display text-2xl sm:text-3xl font-light" style={{ color: "var(--text-primary)" }}>
            Who&apos;s staying over
          </h2>
        </div>
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CABINS.map((cabin) => {
          const here = occupants(cabin);
          const isPP = cabin === "PinePoint";
          const cBg = isPP ? "var(--pinepoint-bg)" : "var(--homestead-bg)";
          const cBorder = isPP ? "var(--pinepoint-border)" : "var(--homestead-border)";
          const cText = isPP ? "var(--pinepoint-text)" : "var(--homestead-text)";
          return (
            <div
              key={cabin}
              data-testid={`occupancy-${cabin.replace(/\s+/g, "-").replace("&","and").toLowerCase()}`}
              className="rounded-2xl p-5 border"
              style={{ background: cBg, borderColor: cBorder }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="uppercase-label" style={{ color: cText, opacity: 0.8 }}>Cabin</div>
                  <div className="font-display text-xl" style={{ color: cText }}>{cabin}</div>
                </div>
                {here.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: cText }} />
                ) : (
                  <MoonStar className="h-5 w-5" style={{ color: cText, opacity: 0.55 }} />
                )}
              </div>

              {loading ? (
                <div className="text-sm" style={{ color: cText, opacity: 0.7 }}>Loading…</div>
              ) : here.length === 0 ? (
                <div className="text-sm italic" style={{ color: cText, opacity: 0.7 }}>Empty tonight</div>
              ) : (
                <ul className="space-y-2">
                  {here.map((b) => {
                    const fc = familyColor(b.guest_name);
                    return (
                      <li key={b.id} className="flex items-center gap-2 text-sm" style={{ color: cText }}>
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: fc.dot }}
                        />
                        <span className="font-medium">{b.guest_name}</span>
                        <span className="opacity-70">
                          · until {new Date(b.check_out).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
