import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "../../lib/utils";

describe("Utils - formatRelativeTime", () => {
  it("formats time correctly for just now", () => {
    const now = new Date();
    const result = formatRelativeTime(now.toISOString());
    expect(result).toBe("just now");
  });

  it("formats time correctly for minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo.toISOString());
    expect(result).toBe("5m ago");
  });

  it("formats time correctly for hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo.toISOString());
    expect(result).toBe("2h ago");
  });

  it("formats time correctly for days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeDaysAgo.toISOString());
    expect(result).toBe("3d ago");
  });

  it("formats time correctly for weeks ago", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoWeeksAgo.toISOString());
    // After 7 days, the format changes to date format
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });
});
