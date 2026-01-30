// Shared time utility functions for countdown and time display

export interface TimeUntil {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
}

// Get time until an event starts
export function getTimeUntilEvent(startTime: Date): TimeUntil | null {
  const now = new Date();
  const start = new Date(startTime);

  if (start <= now) {
    return null; // Event has started or passed
  }

  const diffMs = start.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Return in the most appropriate unit
  if (diffHours < 1) {
    return { value: diffMinutes, unit: 'minutes' };
  } else if (diffHours < 24) {
    return { value: diffHours, unit: 'hours' };
  } else {
    return { value: diffDays, unit: 'days' };
  }
}

// Format countdown for display
export function formatCountdown(timeUntil: TimeUntil | null): string {
  if (!timeUntil) return '';

  const { value, unit } = timeUntil;

  if (unit === 'minutes') {
    if (value < 1) return 'Starting soon';
    if (value === 1) return '1 minute';
    if (value < 60) return `${value} minutes`;
    return `${value} min`;
  } else if (unit === 'hours') {
    if (value === 1) return '1 hour';
    if (value < 24) return `${value} hours`;
    return `${value} hrs`;
  } else {
    if (value === 0) return 'Today';
    if (value === 1) return 'Tomorrow';
    if (value <= 7) return `${value} days`;
    if (value <= 30) {
      const weeks = Math.ceil(value / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    }
    return `${value} days`;
  }
}

// Check if event is live (started but not ended)
export function isEventLive(startTime: Date, endTime: Date): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  return start <= now && end >= now;
}

// Get remaining time until a live event ends
export function getTimeUntilEventEnds(endTime: Date): TimeUntil | null {
  const now = new Date();
  const end = new Date(endTime);

  if (end <= now) {
    return null; // Event has ended
  }

  const diffMs = end.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Return in the most appropriate unit
  if (diffHours < 1) {
    return { value: diffMinutes, unit: 'minutes' };
  } else if (diffHours < 24) {
    return { value: diffHours, unit: 'hours' };
  } else {
    return { value: diffDays, unit: 'days' };
  }
}

// Format remaining time for live events
export function formatRemainingTime(timeUntil: TimeUntil | null): string {
  if (!timeUntil) return '';

  const { value, unit } = timeUntil;

  if (unit === 'minutes') {
    if (value < 1) return 'Ending soon';
    if (value === 1) return '1 min left';
    return `${value} min left`;
  } else if (unit === 'hours') {
    if (value === 1) return '1 hour left';
    return `${value} hrs left`;
  } else {
    if (value === 1) return '1 day left';
    return `${value} days left`;
  }
}

// Check if event has ended
export function isEventEnded(endTime: Date): boolean {
  const now = new Date();
  const end = new Date(endTime);
  return end < now;
}
