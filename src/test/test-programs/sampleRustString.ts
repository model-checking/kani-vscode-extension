// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
export const fullProgramSource = `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(0))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_80978342() {
        assert!(1==3);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_2() {
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn random_name() {
        assert!(1==2);
    }
}

#[cfg(kani)]
#[kani::proof]
#[kani::unwind(0)]
fn function_abc() {
    assert!(1 == 2);
}


#[cfg(kani)]
#[kani::proof]
pub fn function_xyz() {
    assert!(1 == 2);
}

#[cfg(kani)]
#[kani::proof]
#[kani::unwind(2)]
#[kani::solver(kissat)]
#[kani::should_panic]
unsafe fn function_xyz_2() {
    assert!(1 == 2);
}

#[cfg(kani)]
#[kani::proof]
pub unsafe fn function_xyz_3() {
    assert!(1 == 2);
}

#[cfg(kani)]
#[kani::proof]
#[kani::unwind(0)]
#[kani::solver(kissat)]
fn function_xyz_7() {
    assert!(1 == 2);
}
`;

export const boleroProofs = `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(0))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_80978342() {
        assert!(1==3);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_2() {
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn random_name() {
        assert!(1==2);
    }
}`;

export const kaniProofs = `
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(0)]
fn function_abc() {
    assert!(1 == 2);
}


#[cfg(kani)]
#[kani::proof]
pub fn function_xyz() {
    assert!(1 == 2);
}

#[cfg(kani)]
#[kani::proof]
#[kani::unwind(2)]
#[kani::solver(kissat)]
#[kani::should_panic]
unsafe fn function_xyz_2() {
    assert!(1 == 2);
}

#[cfg(kani)]
#[kani::proof]
pub unsafe fn function_xyz_3() {
    assert!(1 == 2);
}

#[cfg(kani)]
#[kani::proof]
#[kani::unwind(0)]
#[kani::solver(kissat)]
fn function_xyz_7() {
    assert!(1 == 2);
}
`;

export const kaniProofsUnsupported = `
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(0)]
#[kani::should_panic]
#[kani::cover]
fn function_1() {
    assert!(1 == 2);
}


#[cfg(kani)]
#[kani::proof]
#[kani::stub]
pub fn function_2() {
    assert!(1 == 2);
}
`;

export const rustFileWithoutProof = `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test() {
        assert!(1==2);
    }

    #[test]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_2() {
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn random_name() {
        assert!(1==1);
    }
}
`;

export const findHarnessesResultKani = [
	{
		name: 'function_abc',
		fullLine: 'fn function_abc() {',
		endPosition: {
			row: 4,
			column: 15,
		},
		attributes: ['#[kani::unwind(0)]'],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz',
		fullLine: 'pub fn function_xyz() {',
		endPosition: {
			row: 11,
			column: 19,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz_2',
		fullLine: 'unsafe fn function_xyz_2() {',
		endPosition: {
			row: 20,
			column: 24,
		},
		attributes: ['#[kani::unwind(2)]', '#[kani::solver(kissat)]','#[kani::should_panic]'],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz_3',
		fullLine: 'pub unsafe fn function_xyz_3() {',
		endPosition: {
			row: 26,
			column: 28,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz_7',
		fullLine: 'fn function_xyz_7() {',
		endPosition: {
			row: 34,
			column: 17,
		},
		attributes: ['#[kani::unwind(0)]', '#[kani::solver(kissat)]'],
		args: {
			proof: true,
			test: false,
		},
	},
];

export const findHarnessesResultBolero = [
	{
		name: 'insert_test_80978342',
		fullLine: 'fn insert_test_80978342() {',
		endPosition: {
			row: 6,
			column: 27,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(0))]'],
		args: {
			proof: true,
			test: true,
		},
	},
	{
		name: 'insert_test_2',
		fullLine: 'fn insert_test_2() {',
		endPosition: {
			row: 13,
			column: 20,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
		},
	},
	{
		name: 'random_name',
		fullLine: 'fn random_name() {',
		endPosition: {
			row: 20,
			column: 18,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
		},
	},
];

export const harnessMetadata = [
	{
		name: 'insert_test_80978342',
		fullLine: 'fn insert_test_80978342() {',
		endPosition: {
			row: 6,
			column: 27,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(0))]'],
		args: {
			proof: true,
			test: true,
		},
	},
	{
		name: 'insert_test_2',
		fullLine: 'fn insert_test_2() {',
		endPosition: {
			row: 13,
			column: 20,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
		},
	},
	{
		name: 'random_name',
		fullLine: 'fn random_name() {',
		endPosition: {
			row: 20,
			column: 18,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
		},
	},
	{
		name: 'function_abc',
		fullLine: 'fn function_abc() {',
		endPosition: {
			row: 28,
			column: 15,
		},
		attributes: ['#[kani::unwind(0)]'],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz',
		fullLine: 'pub fn function_xyz() {',
		endPosition: {
			row: 35,
			column: 19,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz_2',
		fullLine: 'unsafe fn function_xyz_2() {',
		endPosition: {
			row: 44,
			column: 24,
		},
		attributes: ['#[kani::unwind(2)]', '#[kani::solver(kissat)]', '#[kani::should_panic]'],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz_3',
		fullLine: 'pub unsafe fn function_xyz_3() {',
		endPosition: {
			row: 50,
			column: 28,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_xyz_7',
		fullLine: 'fn function_xyz_7() {',
		endPosition: {
			row: 58,
			column: 17,
		},
		attributes: ['#[kani::unwind(0)]', '#[kani::solver(kissat)]'],
		args: {
			proof: true,
			test: false,
		},
	},
];

export const attributeMetadataUnsupported = [
	{
		name: 'function_1',
		fullLine: 'fn function_1() {',
		endPosition: {
			row: 6,
			column: 13,
		},
		attributes: ["#[kani::unwind(0)]", "#[kani::should_panic]", "#[kani::cover]"],
		args: {
			proof: true,
			test: false,
		},
	},
	{
		name: 'function_2',
		fullLine: 'pub fn function_2() {',
		endPosition: {
			row: 14,
			column: 17,
		},
		attributes: ["#[kani::stub]"],
		args: {
			proof: true,
			test: false,
		},
	}
];
