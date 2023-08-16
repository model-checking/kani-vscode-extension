//! This package is intended to assist in manually testing the features of the
//! extension. The tests to be performed are the following:
//!
//! 1. Run verification for `test_success` and check that it passes.
//! 2. Run verification for `test_failure` and check that it fails with
//!    "assertion failed: x < 4096".
//! 3. Click on "Generate concrete test for test_failure" and check that a new
//!    Rust unit test is added after "test_failure".
//! 4. Check that the actions "Run Test (Kani)" and "Debug Harness (Kani)"
//!    appear above the Rust unit test that was generated in the previous step.
//! 5. Click on the "Run Test (Kani)" action. Check that the test runs on a
//!    terminal and it panics as expected.
//! 6. Click on the "Debug Harness (Kani)" action. Check that the debugging mode
//!    is started (debugging controls should appear on the top) and stop it by
//!    clicking on the red square button.
//! 7. Toggle on the "Codelens-kani: Highlight" option in "Settings > Kani".
//! 8. Check that the "Get coverage info" action appears for the "test_success"
//!    and "test_failure" harnesses.
//! 9. Run the "Get coverage info" action for "test_coverage". Check that all
//!    lines in "test_coverage" are green. In addition, check that in
//!    "funs::find_index":
//!     - The first and last highlighted lines are yellow.
//!     - The second and third highlighted lines are green.
//!     - The remaining highlighted line is red.
//!    Comments indicating the correct colors are available in "funs::find_index".
mod funs;

#[kani::proof]
fn test_success() {
    let x: u32 = kani::any();
    kani::assume(x < 4096);
    let y = funs::estimate_size(x);
    assert!(y < 10);
}

#[kani::proof]
fn test_failure() {
    let x: u32 = kani::any();
    let y = funs::estimate_size(x);
    assert!(y < 10);
}

#[kani::proof]
fn test_coverage() {
    let numbers = [10, 20, 30, 40, 50];
    let target = 30;
    let result = funs::find_index(&numbers, target);
    assert_eq!(result, Some(2));
}
