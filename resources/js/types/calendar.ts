export const CALENDAR_VIEWS = ['month', 'week', 'day', 'agenda'] as const;

export const CALENDAR_EVENT_TYPES = [
    'Call',
    'WhatsApp',
    'Meeting',
    'Email',
    'Visit',
    'Task',
    'Deadline',
] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarEvent = {
    id: string;
    source: 'task' | 'follow_up' | 'deadline';
    type: CalendarEventType;
    title: string;
    subtitle: string | null;
    /** Business-local date, Y-m-d. */
    date: string;
    /** Business-local time, HH:mm; null for all-day items. */
    time: string | null;
    status: string | null;
    href: string;
};

export type CalendarQuery = {
    start: string;
    end: string;
    mine: 0 | 1;
};

export type CalendarResponse = {
    data: CalendarEvent[];
    today: string;
};
