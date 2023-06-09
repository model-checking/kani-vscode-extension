# User Guide

## Workflows

## Verify Kani harnesses

### View Kani harnesses

As soon as the Rust package containing the harnesses is opened using the Kani extension in a VSCode instance, you should see the Kani harnesses loaded as regular unit tests in the testing panel on the left border of the VSCode window.

This is how the VSCode window looks like when you click on the panel:

![Verify Proofs](../resources/screenshots/first.png)

### Run Kani harnesses

You can then run your harnesses using the harness tree view by clicking the play button beside the harness that was automatically picked up by the Kani VSCode Extension.
Once you run the harness using the extension, you are shown an error message if the verification fails.
You are then presented with two options:
 1. Generate the report for the harness.
 2. Run concrete playback to generate unit tests.

![Image: run harness.gif](../resources/screenshots/run-proof.gif)


## Use Concrete Playback to debug a Kani harness

### Generate a counterexample unit test

You can generate the unit test with the counterexample by clicking on the **`Run Concrete Playback for (your harness name)`** option that appears through a blue link on the error banner.

![Image: generate counter example.gif](../resources/screenshots/generate-counter-example.gif)

You can see that the source is annotated with two buttons that hover over the generated unit test called `Run Test (Kani)` and `Debug Test (Kani)` which allow you to run and debug the test just like any other Rust unit test.

### Run Kani-generated unit test

Clicking the `Run Test (Kani)` button on top of a unit test, runs the unit test generated via concrete playback.

![Run Concrete Test](../resources/screenshots/third.png)

### Debug Kani-generated unit test

By setting breakpoints and clicking the `Debug Test (Kani)` button, you are taken into the debugger panel which allows you to inspect the trace using the counterexample.

![Image: show debugging.gif](../resources/screenshots/show-debugging.gif)


You can then use the debugger controller to step through, into, out of, replay and also change values on the trace panel on the left for interactive debugging.


## View trace report

### Generate trace report

By clicking the `Generate report for (your harness)` option in the error banner, you can view the trace for the harness in an HTML report.

![Generate Report](../resources/screenshots/generate-report.png)

### View trace report in window

You can click on the `Preview in Editor` button to view the HTML trace within VSCode. It should look like this:

![Generate Report](../resources/screenshots/view-report.png)


## Kani output logging

### View full Kani output

For every test run, you can view the full output from Kani logged into the output channel as a text file. To view the log, open the output channel, and click on the channel drop down list to view a channel called `Output (Kani): ...`

![Generate Report](../resources/screenshots/view-output.png)
