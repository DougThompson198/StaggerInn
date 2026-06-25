import { useMemo, useState } from "react";
import { CABINS, CABIN_STYLES, familyColor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;
const COL_WIDTH = 44; // px per day
const ROW_HEIGHT = 80; // px per cabin row

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtIso(d) {
  return d.toISOString().slice(0, 10);
}
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / DAY_MS);
}

export default function TimelineView({ bookings, onEdit, loading }) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const totalDays = 42; // 6 weeks visible

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(anchor, i));
  }, [anchor]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const shift = (n) => setAnchor((d) => addDays(d, n));
  const goToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    setAnchor(d);
  };

  const anchorIso = fmtIso(anchor);
  const endIso = fmtIso(addDays(anchor, totalDays));

  const visibleBookings = (cabin) =>
    bookings.filter(
      (b) => b.cabin === cabin && b.check_out >= anchorIso && b.check_in < endIso
    );

  // group days by month for a header row
  const monthHeaders = useMemo(() => {
    const groups = [];
    let cur = null;
    days.forEach((d, i) => {
      const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!cur || cur.key !== key) {
        cur = { key, start: i, count: 1 };
        groups.push(cur);
      } else {
        cur.count++;
      }
    });
    return groups;
  }, [days]);

  return (
    <section className="card-soft animate-in" data-testid="timeline-view">
      {/* Toolbar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b" style={{ borderColor: "var(--border-soft)" }}>
        <div>
          <div className="uppercase-label">View</div>
          <div className="font-display text-2xl font-light">Timeline</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-14)} data-testid="timeline-prev" className="rounded-full" style={{ borderColor: "var(--border-soft)" }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} data-testid="timeline-today" className="rounded-full" style={{ borderColor: "var(--border-soft)" }}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(14)} data-testid="timeline-next" className="rounded-full" style={{ borderColor: "var(--border-soft)" }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="timeline-scroll overflow-x-auto p-4">
        <div className="timeline-container relative" style={{ minWidth: `${totalDays * COL_WIDTH + 220}px` }}>
          {/* Month header */}
          <div className="flex" style={{ marginLeft: 200 }}>
            {monthHeaders.map((m, idx) => (
              <div
                key={idx}
                className="font-display text-sm border-l first:border-l-0 pl-2 pb-1"
                style={{ width: m.count * COL_WIDTH, color: "var(--text-secondary)", borderColor: "var(--border-soft)" }}
              >
                {m.key}
              </div>
            ))}
          </div>

          {/* Day header */}
          <div className="flex" style={{ marginLeft: 200 }}>
            {days.map((d, i) => {
              const iso = fmtIso(d);
              const isToday = iso === todayIso;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  data-testid={`timeline-day-${iso}`}
                  className="text-center pb-2 border-b"
                  style={{
                    width: COL_WIDTH,
                    borderColor: "var(--border-soft)",
                    background: isToday ? "rgba(194,109,92,0.08)" : isWeekend ? "rgba(235,230,223,0.5)" : "transparent",
                  }}
                >
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                  </div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: isToday ? "var(--accent)" : "var(--text-primary)" }}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cabin rows */}
          {CABINS.map((cabin) => {
            const cs = CABIN_STYLES[cabin];

            return (
              <div key={cabin} className="relative border-b" style={{ height: ROW_HEIGHT, borderColor: "var(--border-soft)" }}>
                {/* Cabin label */}
                <div
                  className="absolute left-0 top-0 bottom-0 flex items-center pr-4"
                  style={{ width: 200 }}
                >
                  <div className="rounded-2xl px-3 py-2 border w-full" style={{ background: cs.bg, borderColor: cs.border }}>
                    <div className="uppercase-label" style={{ color: cs.text, opacity: 0.7 }}>Cabin</div>
                    <div className="font-display text-base leading-tight" style={{ color: cs.text }}>{cabin}</div>
                  </div>
                </div>

                {/* Background day cells */}
                <div className="absolute top-0 bottom-0 flex" style={{ left: 200 }}>
                  {days.map((d, i) => {
                    const iso = fmtIso(d);
                    const isToday = iso === todayIso;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className="border-l h-full"
                        style={{
                          width: COL_WIDTH,
                          borderColor: "rgba(229,224,216,0.6)",
                          background: isToday ? "rgba(194,109,92,0.06)" : isWeekend ? "rgba(235,230,223,0.35)" : "transparent",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Booking bars */}
                {visibleBookings(cabin).map((b) => {
                  const startOffset = Math.max(0, diffDays(anchorIso, b.check_in));
                  const startCap = Math.max(diffDays(anchorIso, b.check_in), 0);
                  const endCap = Math.min(diffDays(anchorIso, b.check_out) + 1, totalDays);
                  const width = (endCap - startCap) * COL_WIDTH;
                  if (width <= 0) return null;
                  const fc = familyColor(b.guest_name);
                  return (
                    <button
                      key={b.id}
                      data-testid={`timeline-item-${b.id}`}
                      onClick={() => onEdit(b)}
                      className="absolute rounded-full border text-left px-3 py-1.5 hover:shadow-md transition-all hover:-translate-y-0.5"
                      style={{
                        left: 200 + startOffset * COL_WIDTH + 4,
                        width: width - 8,
                        top: 18,
                        height: ROW_HEIGHT - 36,
                        background: fc.bg,
                        borderColor: fc.border,
                        color: fc.text,
                      }}
                      title={`${b.guest_name} · ${b.check_in} → ${b.check_out}`}
                    >
                      <div className="flex items-center gap-2 h-full">
                        <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ background: fc.dot }} />
                        <span className="font-medium text-sm truncate">{b.guest_name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {!loading && bookings.length === 0 && (
            <div className="text-center py-10" style={{ color: "var(--text-muted)" }}>
              No bookings yet. Add your first one with the button above.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
