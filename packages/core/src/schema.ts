import { z } from "zod";

export const testStepSchema = z.object({
  name: z.string(),
  status: z.enum(["passed", "failed", "skipped", "error"]),
  duration: z.number().nonnegative(),
  screenshot: z.string().optional(),
});

export const testCaseSchema = z.object({
  name: z.string(),
  className: z.string(),
  status: z.enum(["passed", "failed", "skipped", "error"]),
  duration: z.number().nonnegative(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  steps: z.array(testStepSchema).optional(),
});

export const testSuiteSchema = z.object({
  name: z.string(),
  status: z.enum(["passed", "failed", "skipped", "error"]),
  duration: z.number().nonnegative(),
  timestamp: z.string().optional(),
  tests: z.array(testCaseSchema),
});

export const testRunSchema = z.object({
  metadata: z.object({
    tool: z.string(),
    framework: z.string(),
    source: z.string(),
    timestamp: z.string(),
    duration: z.number().nonnegative(),
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
  }),
  suites: z.array(testSuiteSchema),
});

export type TestStep = z.infer<typeof testStepSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestSuite = z.infer<typeof testSuiteSchema>;
export type TestRun = z.infer<typeof testRunSchema>;
