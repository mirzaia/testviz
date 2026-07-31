import type { TestRun } from "@testviz/core";

export function TableView({ run }: { run: TestRun }) {
  return (
    <div className="table-wrap">
      <table className="results detailed-results">
        <thead>
          <tr><th>Suite</th><th>Test</th><th>Class</th><th>Status</th><th>Duration</th><th>Failure detail</th></tr>
        </thead>
        <tbody>
          {run.suites.flatMap((suite) => suite.tests.map((test) => (
            <tr key={`${suite.name}-${test.className}-${test.name}`}>
              <td>{suite.name}</td><td>{test.name}</td><td>{test.className || "—"}</td>
              <td><span className={`status ${test.status}`}>{test.status}</span></td>
              <td>{Math.round(test.duration)} ms</td><td>{test.errorMessage ?? test.stackTrace ?? "—"}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}
