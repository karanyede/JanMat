import { describe, it, expect } from "vitest";
import {
  validateIssue,
  validatePoll,
  validateNews,
} from "../../lib/validation";

describe("Validation Utilities", () => {
  describe("validateIssue", () => {
    it("validates a correct issue", () => {
      const issue = {
        title: "Pothole on Main Street",
        description:
          "Large pothole causing damage to vehicles and creating safety hazards",
        category: "infrastructure",
        priority: "high",
        location: "Main Street, City Center",
      };
      const result = validateIssue(issue);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects issue with missing title", () => {
      const issue = {
        description: "Large pothole causing damage to vehicles",
        category: "roads",
        priority: "high",
        location: "Main Street, City",
      };
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "title",
        message: expect.stringContaining("required"),
      });
    });

    it("rejects issue with short title", () => {
      const issue = {
        title: "Test",
        description: "Large pothole causing damage to vehicles",
        category: "roads",
        priority: "high",
        location: "Main Street, City",
      };
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "title")).toBe(true);
    });

    it("rejects issue with missing description", () => {
      const issue = {
        title: "Pothole on Main Street",
        category: "roads",
        priority: "high",
        location: "Main Street, City",
      };
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "description",
        message: expect.stringContaining("required"),
      });
    });
  });

  describe("validatePoll", () => {
    it("validates a correct poll", () => {
      const poll = {
        title: "Should we build a new park?",
        description: "Vote for your preferred option",
        options: [{ text: "Yes" }, { text: "No" }, { text: "Maybe" }],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const result = validatePoll(poll);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects poll with missing title", () => {
      const poll = {
        description: "Vote for your preferred option",
        options: [{ text: "Yes" }, { text: "No" }],
      };
      const result = validatePoll(poll);
      expect(result.isValid).toBe(false);
    });

    it("rejects poll with insufficient options", () => {
      const poll = {
        title: "Should we build a new park?",
        options: [{ text: "Yes" }],
      };
      const result = validatePoll(poll);
      expect(result.isValid).toBe(false);
    });
  });

  describe("validateNews", () => {
    it("validates correct news article", () => {
      const news = {
        title: "New Road Construction Begins",
        content:
          "The city has started construction on the new bypass road connecting downtown.",
        category: "development",
        priority: "medium",
      };
      const result = validateNews(news);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects news with missing title", () => {
      const news = {
        content: "The city has started construction on the new bypass road.",
        category: "infrastructure",
      };
      const result = validateNews(news);
      expect(result.isValid).toBe(false);
    });
  });
});
