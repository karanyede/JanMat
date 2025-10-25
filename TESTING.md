# Testing Guide for JanMat

This guide covers the testing infrastructure and best practices for the JanMat civic engagement platform.

## Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Coverage](#code-coverage)
- [Best Practices](#best-practices)

## Overview

JanMat uses a modern testing stack to ensure code quality and reliability:

- **Vitest** - Fast unit test framework
- **React Testing Library** - Component testing
- **jsdom** - Browser environment simulation
- **GitHub Actions** - Automated CI/CD

## Test Stack

### Dependencies

```json
{
  "vitest": "^4.0.3",
  "@vitest/ui": "^4.0.3",
  "@testing-library/react": "^latest",
  "@testing-library/jest-dom": "^latest",
  "@testing-library/user-event": "^latest",
  "jsdom": "^latest"
}
```

### Configuration

Tests are configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

## Running Tests

### Available Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Watch Mode

Watch mode is useful during development:

```bash
npm run test:watch
```

Features:

- Auto-runs tests on file changes
- Smart re-run (only affected tests)
- Filter by filename or test name
- Press 'h' for help menu

### UI Mode

Visual test interface:

```bash
npm run test:ui
```

Opens a browser with:

- Test results visualization
- Coverage reports
- Test file explorer
- Interactive filtering

## Writing Tests

### Component Tests

Location: `src/test/components/`

Example:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders with correct text', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Utility Function Tests

Location: `src/test/lib/`

Example:

```typescript
import { describe, it, expect } from "vitest";
import { formatDate } from "../../lib/utils";

describe("formatDate", () => {
  it("formats date correctly", () => {
    const date = new Date("2024-01-15");
    expect(formatDate(date)).toBe("Jan 15, 2024");
  });

  it("handles invalid dates", () => {
    expect(formatDate(null)).toBe("Invalid date");
  });
});
```

### Validation Tests

Location: `src/test/lib/validation.test.ts`

Example:

```typescript
import { validateIssue } from "../../lib/validation";

describe("validateIssue", () => {
  it("validates correct issue", () => {
    const issue = {
      title: "Test Issue",
      description: "This is a test description",
      category: "infrastructure",
      priority: "high",
      location: "Test Location",
    };

    const result = validateIssue(issue);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Mocking Supabase

Use the provided mocks:

```typescript
import { vi } from "vitest";
import { mockSupabase, mockUser } from "../test/mocks";

// Mock the supabase module
vi.mock("../lib/supabase", () => ({
  supabase: mockSupabase,
}));

// Mock the auth hook
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));
```

## CI/CD Pipeline

### GitHub Actions Workflow

Location: `.github/workflows/ci.yml`

The automated pipeline runs on:

- Push to `master`, `main`, or `develop` branches
- Pull requests to these branches

### Pipeline Jobs

#### 1. Test Job

```yaml
test:
  - Checkout code
  - Setup Node.js (18.x, 20.x)
  - Install dependencies
  - Run linter
  - Run type check
  - Run unit tests
  - Generate coverage report
  - Upload to Codecov
```

#### 2. Build Job

```yaml
build:
  - Checkout code
  - Setup Node.js 20.x
  - Install dependencies
  - Build production bundle
  - Verify build output
```

#### 3. Security Job

```yaml
security:
  - Checkout code
  - Run npm audit
  - Generate security report
```

#### 4. Quality Job

```yaml
quality:
  - Checkout code
  - Check code formatting
  - Run quality checks
```

### Viewing Results

1. **GitHub UI**: Check the "Actions" tab in your repository
2. **Pull Request Checks**: See status badges on PRs
3. **Coverage Reports**: View on Codecov (if configured)

## Code Coverage

### Generating Reports

```bash
npm run test:coverage
```

Output formats:

- **Terminal**: Summary in console
- **HTML**: `coverage/index.html` (open in browser)
- **JSON**: `coverage/coverage-final.json`

### Coverage Thresholds

Currently, there are no enforced thresholds. Consider adding them:

```typescript
// In vitest.config.ts
coverage: {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
}
```

### Viewing Coverage

```bash
# Generate and open HTML report
npm run test:coverage
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

## Best Practices

### 1. Test Structure

Follow the AAA pattern:

```typescript
it("does something", () => {
  // Arrange - Set up test data
  const input = "test";

  // Act - Perform the action
  const result = doSomething(input);

  // Assert - Verify the result
  expect(result).toBe("expected");
});
```

### 2. Descriptive Names

```typescript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('validates email format correctly', () => { ... });
it('shows error message when form is invalid', () => { ... });
```

### 3. One Assertion Per Test

```typescript
// ❌ Bad - Multiple concepts
it("validates user", () => {
  expect(validateEmail(email)).toBe(true);
  expect(validatePassword(password)).toBe(true);
  expect(validatePhone(phone)).toBe(true);
});

// ✅ Good - Separate tests
it("validates email format", () => {
  expect(validateEmail(email)).toBe(true);
});

it("validates password strength", () => {
  expect(validatePassword(password)).toBe(true);
});
```

### 4. Test Edge Cases

```typescript
describe("divide", () => {
  it("divides two numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("handles division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Cannot divide by zero");
  });

  it("handles negative numbers", () => {
    expect(divide(-10, 2)).toBe(-5);
  });
});
```

### 5. Clean Up After Tests

```typescript
import { afterEach, vi } from "vitest";

afterEach(() => {
  // Reset mocks
  vi.clearAllMocks();

  // Clean up DOM
  cleanup();
});
```

### 6. Use Testing Library Queries

```typescript
// ✅ Good - Semantic queries
screen.getByRole("button", { name: /submit/i });
screen.getByLabelText("Email");
screen.getByText("Welcome");

// ❌ Avoid - Implementation details
screen.getByClassName("submit-btn");
screen.getByTestId("email-input");
```

### 7. Async Testing

```typescript
it('loads data asynchronously', async () => {
  render(<DataComponent />);

  // Wait for element to appear
  const element = await screen.findByText('Data loaded');
  expect(element).toBeInTheDocument();
});
```

### 8. Mock External Dependencies

```typescript
import { vi } from "vitest";

// Mock API calls
vi.mock("../lib/api", () => ({
  fetchData: vi.fn().mockResolvedValue({ data: [] }),
}));

// Mock timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

## Common Issues

### Issue: Tests timeout

**Solution**: Increase timeout or use `waitFor`

```typescript
it('waits for async operation', async () => {
  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Done')).toBeInTheDocument();
  }, { timeout: 5000 });
});
```

### Issue: Module not found

**Solution**: Check path aliases in `vitest.config.ts`

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Issue: Supabase errors in tests

**Solution**: Use mocks from `src/test/mocks.ts`

```typescript
vi.mock("../lib/supabase", () => ({
  supabase: mockSupabase,
}));
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [GitHub Actions](https://docs.github.com/en/actions)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass locally
3. Check coverage hasn't decreased
4. Update this guide if needed

---

**Happy Testing! 🧪✨**
