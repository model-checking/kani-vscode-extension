// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT

pub fn estimate_size(x: u32) -> u32 {
    assert!(x < 4096);

    if x < 256 {
        if x < 128 {
            return 1;
        } else {
            return 3;
        }
    } else if x < 1024 {
        if x > 1022 {
            return 4;
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

pub fn find_index(nums: &[i32], target: i32) -> Option<usize> {
    for (index, &num) in nums.iter().enumerate() { // coverage should be yellow
        if num == target { // coverage should be green
            return Some(index); // coverage should be green
        }
    }
    None // coverage should be red
} // coverage should be yellow
