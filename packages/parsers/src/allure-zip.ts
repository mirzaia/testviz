import JSZip from "jszip";
import type { TestCase, TestRun, TestStep, TestSuite } from "@testviz/core";
import { buildMetadata, suiteStatusFromTests } from "./metadata";

type AllureStatus = "passed" | "failed" | "broken" | "skipped" | "unknown" | string;

interface AllureTime {
  start?: number;
  stop?: number;
  duration?: number;
}

interface AllureNode {
  uid?: string;
  name?: string;
  status?: AllureStatus;
  time?: AllureTime;
  children?: AllureNode[];
  parentUid?: string;
}

interface AllureStep {
  name?: string;
  status?: AllureStatus;
  time?: AllureTime;
  steps?: AllureStep[];
}

interface AllureTestCase {
  uid?: string;
  name?: string;
  fullName?: string;
  status?: AllureStatus;
  statusMessage?: string;
  statusTrace?: string;
  time?: AllureTime;
  steps?: AllureStep[];
  testStage?: { steps?: AllureStep[]; status?: AllureStatus; statusMessage?: string; statusTrace?: string };
  beforeStages?: Array<{ steps?: AllureStep[] }>;
  afterStages?: Array<{ steps?: AllureStep[] }>;
}

function mapStatus(status: AllureStatus | undefined): TestCase["status"] {
  const value = (status ?? "").toLowerCase();
  if (value === "failed") return "failed";
  if (value === "broken" || value === "unknown") return "error";
  if (value === "skipped") return "skipped";
  return "passed";
}

function durationMs(time?: AllureTime): number {
  if (!time) return 0;
  if (typeof time.duration === "number" && Number.isFinite(time.duration)) return Math.max(0, time.duration);
  if (typeof time.start === "number" && typeof time.stop === "number") return Math.max(0, time.stop - time.start);
  return 0;
}

function flattenSteps(steps: AllureStep[] | undefined): TestStep[] {
  if (!steps?.length) return [];
  const result: TestStep[] = [];
  for (const step of steps) {
    result.push({
      name: step.name ?? "step",
      status: mapStatus(step.status),
      duration: durationMs(step.time),
    });
    result.push(...flattenSteps(step.steps));
  }
  return result;
}

function collectZipEntries(zip: JSZip): string[] {
  return Object.keys(zip.files).filter((name) => !zip.files[name].dir && !name.includes("__MACOSX") && !/(^|\/)\./.test(name));
}

function findBySuffix(zip: JSZip, suffix: string) {
  const normalized = suffix.replace(/^\//, "");
  const entries = collectZipEntries(zip);
  const match =
    entries.find((name) => name === normalized) ??
    entries.find((name) => name.endsWith(`/${normalized}`)) ??
    entries.find((name) => name.endsWith(normalized));
  return match ? zip.file(match) : null;
}

async function readJson<T>(zip: JSZip, path: string): Promise<T | null> {
  const file = zip.file(path) ?? findBySuffix(zip, path);
  if (!file) return null;
  const text = await file.async("string");
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isLeaf(node: AllureNode): boolean {
  return Boolean(node.uid) && (!node.children || node.children.length === 0);
}

function collectLeaves(node: AllureNode, path: string[] = []): Array<{ suitePath: string[]; leaf: AllureNode }> {
  const name = node.name?.trim();
  const nextPath = name && name.toLowerCase() !== "suites" ? [...path, name] : path;
  if (isLeaf(node)) {
    return [{ suitePath: path.length ? path : ["Default Suite"], leaf: node }];
  }
  if (!node.children?.length) return [];
  return node.children.flatMap((child) => collectLeaves(child, nextPath));
}

function suiteNameFromPath(suitePath: string[]): string {
  // Company Allure trees: [env metadata, feature/suite, scenario]
  // Prefer the feature/suite folder (second-to-last when available).
  if (suitePath.length >= 2) return suitePath[suitePath.length - 1] ?? "Default Suite";
  return suitePath[0] ?? "Default Suite";
}

function classNameFromDetail(detail: AllureTestCase | null, suiteName: string): string {
  if (detail?.fullName) {
    const parts = detail.fullName.split(".");
    if (parts.length > 1) return parts.slice(0, -1).join(".");
  }
  return suiteName;
}

async function enrichCase(zip: JSZip, leaf: AllureNode, suiteName: string): Promise<TestCase> {
  const detail = leaf.uid ? await readJson<AllureTestCase>(zip, `data/test-cases/${leaf.uid}.json`) : null;
  const status = mapStatus(detail?.status ?? leaf.status);
  const stageSteps = [
    ...(detail?.beforeStages?.flatMap((stage) => stage.steps ?? []) ?? []),
    ...(detail?.testStage?.steps ?? detail?.steps ?? []),
    ...(detail?.afterStages?.flatMap((stage) => stage.steps ?? []) ?? []),
  ];
  const steps = flattenSteps(stageSteps);
  return {
    name: detail?.name ?? leaf.name ?? "Unnamed test",
    className: classNameFromDetail(detail, suiteName),
    status,
    duration: durationMs(detail?.time ?? leaf.time),
    errorMessage: detail?.statusMessage || detail?.testStage?.statusMessage || undefined,
    stackTrace: detail?.statusTrace || detail?.testStage?.statusTrace || undefined,
    steps: steps.length ? steps : undefined,
  };
}

export async function parseAllureZip(input: ArrayBuffer | Uint8Array | Buffer, source = "local"): Promise<TestRun> {
  const zip = await JSZip.loadAsync(input);
  const suitesRoot = await readJson<AllureNode>(zip, "data/suites.json");
  if (!suitesRoot) {
    throw new Error("Allure ZIP is missing data/suites.json — expected an Allure 2 report archive");
  }

  const leaves = collectLeaves(suitesRoot);
  const bySuite = new Map<string, TestCase[]>();

  for (const { suitePath, leaf } of leaves) {
    const suiteName = suiteNameFromPath(suitePath);
    const test = await enrichCase(zip, leaf, suiteName);
    const existing = bySuite.get(suiteName) ?? [];
    existing.push(test);
    bySuite.set(suiteName, existing);
  }

  const suites: TestSuite[] = [...bySuite.entries()].map(([name, tests]) => ({
    name,
    status: suiteStatusFromTests(tests),
    duration: tests.reduce((total, test) => total + test.duration, 0),
    tests,
  }));

  const summary = await readJson<{ time?: AllureTime; statistic?: Record<string, number> }>(zip, "data/widgets/summary.json");
  const metadata = buildMetadata(suites, source, "allure", "Allure");
  if (summary?.time?.start) {
    metadata.timestamp = new Date(summary.time.start).toISOString();
  } else {
    const firstStart = leaves.map((item) => item.leaf.time?.start).find((value) => typeof value === "number");
    if (firstStart) metadata.timestamp = new Date(firstStart).toISOString();
  }
  if (summary?.time?.duration != null && Number.isFinite(summary.time.duration)) {
    metadata.duration = summary.time.duration;
  }

  return { metadata, suites };
}
