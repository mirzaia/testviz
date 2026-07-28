import type { TestRun } from "@testviz/core";

export const sampleRun: TestRun = {
  metadata: {
    tool: "junit",
    framework: "JUnit 5",
    source: "local",
    timestamp: "2026-07-28T00:00:00.000Z",
    duration: 180,
    total: 3,
    passed: 1,
    failed: 1,
    skipped: 1,
    errors: 0,
  },
  suites: [
    {
      name: "LoginSuite",
      status: "failed",
      duration: 120,
      tests: [
        { name: "shouldLogin", className: "demo.LoginTest", status: "passed", duration: 40 },
        { name: "shouldRejectInvalidUser", className: "demo.LoginTest", status: "failed", duration: 80, errorMessage: "boom" },
      ],
    },
    {
      name: "CheckoutSuite",
      status: "skipped",
      duration: 60,
      tests: [
        { name: "shouldSkipWhenCartEmpty", className: "demo.CheckoutTest", status: "skipped", duration: 60 },
      ],
    },
  ],
};
