import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, LogOut, Printer, Trees, Calendar as CalIcon, GanttChart } from "lucide-react";
import {
  createBooking,
  deleteBooking,
  listBookings,
  signOutPassword,
  updateBooking,
} from "@/lib/firebase";
import OccupancyToday from "@/components/OccupancyToday";
import CalendarView from "@/components/CalendarView";
import TimelineView from "@/components/TimelineView";
import BookingDialog from "@/components/BookingDialog";

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const loadBookings = async () => {
    setLoading(true);
    try {
      setBookings(await listBookings());
    } catch (e) {
      toast.error("Could not load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleSave = async (payload) => {
    try {
      if (editing) {
        await updateBooking(editing.id, payload);
        toast.success("Booking updated");
      } else {
        await createBooking(payload);
        toast.success("Booking added");
      }
      setDialogOpen(false);
      setEditing(null);
      loadBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBooking(id);
      toast.success("Booking removed");
      setDialogOpen(false);
      setEditing(null);
      loadBookings();
    } catch {
      toast.error("Could not delete");
    }
  };

  const openEdit = (b) => { setEditing(b); setDialogOpen(true); };
  const openNew = () => { setEditing(null); setDialogOpen(true); };

  const logout = async () => {
    await signOutPassword();
    navigate("/login");
  };

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => a.check_in.localeCompare(b.check_in)),
    [bookings]
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      {/* Header */}
      <header
        className="no-print sticky top-0 z-30 backdrop-blur-md border-b"
        style={{ background: "rgba(235, 230, 223, 0.9)", borderColor: "var(--border-soft)" }}
        data-testid="main-nav"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <Trees className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="uppercase-label leading-none">The Cottage</div>
              <div className="font-display text-xl leading-tight" style={{ color: "var(--text-primary)" }}>
                Logbook
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              data-testid="print-btn"
              className="hidden sm:inline-flex rounded-full"
              style={{ color: "var(--text-secondary)" }}
            >
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button
              onClick={openNew}
              data-testid="add-booking-btn"
              className="rounded-full font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Booking
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="logout-btn"
              className="rounded-full"
              style={{ color: "var(--text-secondary)" }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-12 space-y-8">
        {/* Hero */}
        <div className="animate-in">
          <div className="uppercase-label mb-2">Cottage Schedule</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light leading-tight" style={{ color: "var(--text-primary)" }}>
            Who&apos;s at Stagger Inn
          </h1>
        </div>

        {/* Occupancy */}
        <OccupancyToday bookings={bookings} loading={loading} />

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList
            className="no-print rounded-full p-1 h-auto"
            style={{ background: "#EBE6DF" }}
            data-testid="view-tabs"
          >
            <TabsTrigger
              value="timeline"
              data-testid="tab-timeline"
              className="rounded-full px-5 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <GanttChart className="h-4 w-4 mr-2" /> Timeline
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              data-testid="tab-calendar"
              className="rounded-full px-5 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <CalIcon className="h-4 w-4 mr-2" /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-6">
            <TimelineView bookings={sortedBookings} onEdit={openEdit} loading={loading} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-6">
            <CalendarView bookings={sortedBookings} onEdit={openEdit} />
          </TabsContent>
        </Tabs>
      </main>

      <BookingDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        booking={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
