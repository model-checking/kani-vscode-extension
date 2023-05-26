// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT

export const rustFileWithUnitTestsOnly = `
#[cfg(test)]
mod test {
    #[test]
    fn insert_test() {
        assert!(1==2);
    }

    #[test]
    fn insert_test_2() {
        assert!(1==1);
    }

    #[test]
    fn random_name() {
        assert!(1==1);
    }
}

#[test]
fn kani_concrete_playback_check_estimate_size_14615086421508420155() {
    let concrete_vals: Vec<Vec<u8>> = vec![
        // 1023
        vec![255, 3, 0, 0],
    ];
    kani::concrete_playback_run(concrete_vals, check_estimate_size);
}

#[test]
fn kani_concrete_playback_harness_1664386709067937259() {
    let concrete_vals: Vec<Vec<u8>> = vec![
        // -9223372036854775808
        vec![0, 0, 0, 0, 0, 0, 0, 128],
        // -101
        vec![155, 255, 255, 255, 255, 255, 255, 255],
        // 0
        vec![0, 0, 0, 0, 0, 0, 0, 0],
        // 101
        vec![101, 0, 0, 0, 0, 0, 0, 0],
        // 9223372036854775807
        vec![255, 255, 255, 255, 255, 255, 255, 127],
    ];
    kani::concrete_playback_run(concrete_vals, harness);
}

#[test]
fn kani_concrete_playback_harness_2_1490343813496395367() {
    let concrete_vals: Vec<Vec<u8>> = vec![
        // -128
        vec![128],
        // -101
        vec![155],
        // 0
        vec![0],
        // 'e'
        vec![101],
        // 127
        vec![123],
    ];
    kani::concrete_playback_run(concrete_vals, harness_2);
}
`;

export const kaniConcreteTestsMetaData: any[] = [
	[
		'kani_concrete_playback_check_estimate_size_14615086421508420155',
		{
			row: 20,
			column: 0,
		},
	],
	[
		'kani_concrete_playback_harness_1664386709067937259',
		{
			row: 29,
			column: 0,
		},
	],
	[
		'kani_concrete_playback_harness_2_1490343813496395367',
		{
			row: 46,
			column: 0,
		},
	],
];
