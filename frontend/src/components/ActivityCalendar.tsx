import { useState, useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

type Activity = {
  id: number;
  title: string;
  date: string;
  category_name: string;
  is_cancelled: boolean;
  location?: string;
};

export default function ActivityCalendar({
  activities,
  canManage,
}: {
  activities: Activity[];
  canManage: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const activitiesByDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const a of activities) {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    }
    return map;
  }, [activities]);

  const selectedActivities = selectedDate
    ? activitiesByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  const today = new Date();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs px-3 py-1.5 hover:bg-slate-100 rounded-lg font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 text-slate-500 text-xs uppercase font-medium">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayActivities = activitiesByDate[dateKey] || [];
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={`relative aspect-square border-b border-r border-slate-100 p-2 text-left transition
                  ${!inMonth ? "bg-slate-50/50" : "hover:bg-faith-50"}
                  ${isSelected ? "bg-faith-100" : ""}`}
              >
                <span className={`text-xs font-medium ${
                  !inMonth ? "text-slate-300"
                  : isToday ? "bg-faith-700 text-white rounded-full w-6 h-6 inline-flex items-center justify-center"
                  : "text-slate-700"
                }`}>
                  {format(day, "d")}
                </span>
                {dayActivities.length > 0 && (
                  <div className="mt-1 flex gap-0.5 flex-wrap">
                    {dayActivities.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          a.is_cancelled ? "bg-red-400" : "bg-faith-600"
                        }`}
                      />
                    ))}
                    {dayActivities.length > 3 && (
                      <span className="text-[9px] text-slate-500 ml-0.5">
                        +{dayActivities.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays size={16} />
            {selectedDate
              ? format(selectedDate, "EEEE, d MMM")
              : "Select a date"}
          </h3>
        </div>
        <div className="p-4">
          {!selectedDate ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Click any day on the calendar to see activities.
            </p>
          ) : selectedActivities.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No activities scheduled for this day.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedActivities.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    {a.is_cancelled && (
                      <span className="text-[9px] uppercase tracking-wide text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{a.category_name}</p>
                  {a.location && <p className="text-xs text-slate-400 mt-0.5">{a.location}</p>}
                  {canManage && !a.is_cancelled && (
                    <Link
                      to={`/activities/${a.id}/attendance`}
                      className="inline-block mt-2 text-xs font-medium text-faith-700 hover:text-faith-900"
                    >
                      Record Attendance →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
