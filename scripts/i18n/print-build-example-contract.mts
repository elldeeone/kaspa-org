import { buildExampleContract } from "../../src/i18n/build-example-contract.ts";

process.stdout.write(
  [
    buildExampleContract.sdkVersion,
    ...buildExampleContract.examples.map(({ name }) => `${name}.html`),
  ].join("\n"),
);
