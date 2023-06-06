// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
export const allProofSamples: string = `
mod other;

fn estimate_size(x: u32) -> u32 {
    if x < 256 {
        if x < 128 {
            return 1;
        } else {
            return 3;
        }
    } else if x < 1024 {
        if x > 1022 {
            panic!("Oh no, a failing corner case!");
        } else {
            return 5;
        }
    } else {
        if x < 2048 {
            return 7;
        } else {
            return 9;
        }
    }
}

#[cfg(kani)]
#[kani::proof]
fn random_function() {
    assert!(1==1);
}

#[cfg(kani)]
#[kani::proof]
pub fn harness_abc() {
    let i64_1: i64 = kani::any();
    let i64_2: i64 = kani::any();
    let i64_3: i64 = kani::any();
    let i64_4: i64 = kani::any();
    let i64_5: i64 = kani::any();
    assert!(
        !(i64_1 == i64::MIN && i64_2 == -101 && i64_3 == 0 && i64_4 == 101 && i64_5 == i64::MAX)
    );
}
#[test]
fn kani_concrete_playback_harness_abc_16680040827885731949() {
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
    kani::concrete_playback_run(concrete_vals, harness_abc);
}

#[cfg(kani)]
#[kani::proof]
pub fn harness_i64() {
    let i64_1: i64 = kani::any();
    let i64_2: i64 = kani::any();
    let i64_3: i64 = kani::any();
    let i64_4: i64 = kani::any();
    let i64_5: i64 = kani::any();
    assert!(
        !(i64_1 == i64::MIN && i64_2 == -101 && i64_3 == 0 && i64_4 == 101 && i64_5 == i64::MAX)
    );
}
#[test]
fn kani_concrete_playback_harness_i64_13477596495325479973() {
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
    kani::concrete_playback_run(concrete_vals, harness_i64);
}

#[cfg(kani)]
#[kani::proof]
pub fn harness_i8() {
    let i8_1: i8 = kani::any();
    let i8_2: i8 = kani::any();
    let i8_3: i8 = kani::any();
    let i8_4: i8 = kani::any();
    let i8_5: i8 = kani::any();
    assert!(!(i8_1 == i8::MIN && i8_2 == -101 && i8_3 == 0 && i8_4 == 101 && i8_5 == i8::MAX));
}
#[test]
fn kani_concrete_playback_harness_i8_10415494690275622521() {
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
        vec![127],
    ];
    kani::concrete_playback_run(concrete_vals, harness_i8);
}

#[cfg(kani)]
mod harnesses_2 {
    #[kani::proof]
    pub fn my_harness_xyz() {
        let result_1: Result<u8, u8> = kani::any();
        let result_2: Result<u8, u8> = kani::any();
        assert!(!(result_1 == Ok(101) && result_2 == Err(102)));
    }
    #[test]
    fn kani_concrete_playback_my_harness_xyz_7654471078049085112() {
        let concrete_vals: Vec<Vec<u8>> = vec![
            // 1
            vec![1],
            // 101
            vec![101],
            // 0
            vec![0],
            // 102
            vec![102],
        ];
        kani::concrete_playback_run(concrete_vals, my_harness_xyz);
    }
}

#[cfg(kani)]
mod outer_2 {
    mod middle_2 {
        mod inner_2 {
            #[kani::proof]
            fn inner_harness_2() {
                let result_1: Result<u8, u8> = kani::any();
                let result_2: Result<u8, u8> = kani::any();
                assert!(!(result_1 == Ok(101) && result_2 == Err(102)));
            }
            #[test]
            fn kani_concrete_playback_inner_harness_2_1813670088948964341() {
                let concrete_vals: Vec<Vec<u8>> = vec![
                    // 1
                    vec![1],
                    // 101
                    vec![101],
                    // 0
                    vec![0],
                    // 102
                    vec![102],
                ];
                kani::concrete_playback_run(concrete_vals, inner_harness_2);
            }
        }
    }
}

#[cfg(kani)]
mod outer {
    mod middle {
        mod inner {
            #[kani::proof]
            pub fn inner_harness_abc() {
                let result_1: Result<u8, u8> = kani::any();
                let result_2: Result<u8, u8> = kani::any();
                assert!(!(result_1 == Ok(101) && result_2 == Err(102)));
            }
            #[test]
            fn kani_concrete_playback_inner_harness_abc_8145410238797813641() {
                let concrete_vals: Vec<Vec<u8>> = vec![
                    // 1
                    vec![1],
                    // 101
                    vec![101],
                    // 0
                    vec![0],
                    // 102
                    vec![102],
                ];
                kani::concrete_playback_run(concrete_vals, inner_harness_abc);
            }

            #[kani::proof]
            fn inner_harness_xyz() {
                let result_1: Result<u8, u8> = kani::any();
                let result_2: Result<u8, u8> = kani::any();
                assert!(!(result_1 == Ok(101) && result_2 == Err(102)));
            }
        }

        #[kani::proof]
        fn middle_harness_xyz() {
            assert!(1==1);
        }
    }
}

fn main() {
    // println!("Hello, world!");
}
`;

export const sortedHarnessMapForAllProofs = [
	{
		harnessName: 'random_function',
		fullLine: 'fn random_function() {',
		endPosition: {
			row: 27,
			column: 18,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'harness_abc',
		fullLine: 'pub fn harness_abc() {',
		endPosition: {
			row: 33,
			column: 18,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'harness_i64',
		fullLine: 'pub fn harness_i64() {',
		endPosition: {
			row: 62,
			column: 18,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'harness_i8',
		fullLine: 'pub fn harness_i8() {',
		endPosition: {
			row: 91,
			column: 17,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'my_harness_xyz',
		fullLine: 'pub fn my_harness_xyz() {',
		endPosition: {
			row: 119,
			column: 25,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: 'harnesses_2',
	},
	{
		harnessName: 'inner_harness_2',
		fullLine: 'fn inner_harness_2() {',
		endPosition: {
			row: 145,
			column: 30,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: 'outer_2::middle_2::inner_2',
	},
	{
		harnessName: 'inner_harness_abc',
		fullLine: 'pub fn inner_harness_abc() {',
		endPosition: {
			row: 173,
			column: 36,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: 'outer::middle::inner',
	},
	{
		harnessName: 'inner_harness_xyz',
		fullLine: 'fn inner_harness_xyz() {',
		endPosition: {
			row: 194,
			column: 32,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: 'outer::middle::inner',
	},
	{
		harnessName: 'middle_harness_xyz',
		fullLine: 'fn middle_harness_xyz() {',
		endPosition: {
			row: 202,
			column: 29,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: 'outer::middle',
	},
];

export const sortedMapForAllTests = [
	{
		args: {
			proof: true,
			stub: false,
			test: true,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(0))]'],
		endPosition: {
			column: 27,
			row: 5,
		},
		fullLine: 'fn insert_test_80978342() {',
		harnessName: 'insert_test_80978342',
		module: 'test',
	},
	{
		args: {
			proof: true,
			stub: false,
			test: true,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		endPosition: {
			column: 20,
			row: 11,
		},
		fullLine: 'fn insert_test_2() {',
		harnessName: 'insert_test_2',
		module: 'test',
	},
	{
		args: {
			proof: true,
			stub: false,
			test: true,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		endPosition: {
			column: 18,
			row: 17,
		},
		fullLine: 'fn random_name() {',
		harnessName: 'random_name',
		module: 'test',
	},
];

export const fileName: string = '';
