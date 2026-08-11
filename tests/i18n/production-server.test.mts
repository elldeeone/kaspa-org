import assert from "node:assert/strict";
import test from "node:test";

import { hasProcessExited } from "../../scripts/i18n/production-server.mts";

test("process lifecycle treats signal termination as an exit", () => {
  assert.equal(hasProcessExited({ exitCode: null, signalCode: null }), false);
  assert.equal(hasProcessExited({ exitCode: 0, signalCode: null }), true);
  assert.equal(
    hasProcessExited({ exitCode: null, signalCode: "SIGTERM" }),
    true,
  );
  assert.equal(
    hasProcessExited({ exitCode: null, signalCode: "SIGKILL" }),
    true,
  );
});
