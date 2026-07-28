import { testRunSchema, type TestRun } from "./schema";

export function validateTestRun(input: unknown): TestRun {
  return testRunSchema.parse(input);
}
