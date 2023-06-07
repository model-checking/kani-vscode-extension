// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
export const fullProgramSource = `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(0))]
    fn insert_test_80978342() {
        assert!(1==3);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    fn insert_test_2() {
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
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
    fn insert_test_80978342() {
        assert!(1==3);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    fn insert_test_2() {
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
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
fn mock_random<T: kani::Arbitrary>() -> T {
    kani::any()
}

#[cfg(kani)]
#[kani::proof]
#[kani::stub(rand::random, mock_random)]
fn encrypt_then_decrypt_is_identity() {
    let data: u32 = kani::any();
    let encryption_key: u32 = rand::random();
    let encrypted_data = data ^ encryption_key;
    let decrypted_data = encrypted_data ^ encryption_key;
    assert_eq!(data, decrypted_data);
}

#[cfg(kani)]
#[kani::proof]
#[kani::stub(rand::random, mock_random)]
#[kani::unwind(2)]
#[kani::solver(kissat)]
#[kani::should_panic]
fn function_2() {
    assert_eq!(1, 1);
}

#[test]
#[cfg_attr(kani, kani::proof, kani::unwind(1), kani::stub(rand::random, mock_random), kani::solver(kissat))]
fn function_3() {
    assert_eq!(1, 1);
}
`;

export const rustFileWithoutProof = `
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
`;

export const findHarnessesResultKani = [
	{
		harnessName: 'function_abc',
		fullLine: 'fn function_abc() {',
		endPosition: {
			row: 4,
			column: 15,
		},
		attributes: ['#[kani::unwind(0)]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
	},
	{
		harnessName: 'function_xyz',
		fullLine: 'pub fn function_xyz() {',
		endPosition: {
			row: 11,
			column: 19,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
	},
	{
		harnessName: 'function_xyz_2',
		fullLine: 'unsafe fn function_xyz_2() {',
		endPosition: {
			row: 20,
			column: 24,
		},
		attributes: ['#[kani::unwind(2)]', '#[kani::solver(kissat)]', '#[kani::should_panic]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
	},
	{
		harnessName: 'function_xyz_3',
		fullLine: 'pub unsafe fn function_xyz_3() {',
		endPosition: {
			row: 26,
			column: 28,
		},
		attributes: [],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
	},
	{
		harnessName: 'function_xyz_7',
		fullLine: 'fn function_xyz_7() {',
		endPosition: {
			row: 34,
			column: 17,
		},
		attributes: ['#[kani::unwind(0)]', '#[kani::solver(kissat)]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
	},
];

export const findHarnessesResultBolero = [
	{
		harnessName: 'insert_test_80978342',
		fullLine: 'fn insert_test_80978342() {',
		endPosition: {
			row: 5,
			column: 27,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(0))]'],
		args: {
			proof: true,
			test: true,
			stub: false,
		},
	},
	{
		harnessName: 'insert_test_2',
		fullLine: 'fn insert_test_2() {',
		endPosition: {
			row: 11,
			column: 20,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
			stub: false,
		},
	},
	{
		harnessName: 'random_name',
		fullLine: 'fn random_name() {',
		endPosition: {
			row: 17,
			column: 18,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
			stub: false,
		},
	},
];

export const harnessMetadata = [
	{
		harnessName: 'insert_test_80978342',
		fullLine: 'fn insert_test_80978342() {',
		endPosition: {
			row: 5,
			column: 27,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(0))]'],
		args: {
			proof: true,
			test: true,
			stub: false,
		},
		module: 'test',
	},
	{
		harnessName: 'insert_test_2',
		fullLine: 'fn insert_test_2() {',
		endPosition: {
			row: 11,
			column: 20,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
			stub: false,
		},
		module: 'test',
	},
	{
		harnessName: 'random_name',
		fullLine: 'fn random_name() {',
		endPosition: {
			row: 17,
			column: 18,
		},
		attributes: ['#[cfg_attr(kani, kani::proof, kani::unwind(1))]'],
		args: {
			proof: true,
			test: true,
			stub: false,
		},
		module: 'test',
	},
	{
		harnessName: 'function_abc',
		fullLine: 'fn function_abc() {',
		endPosition: {
			row: 25,
			column: 15,
		},
		attributes: ['#[kani::unwind(0)]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'function_xyz',
		fullLine: 'pub fn function_xyz() {',
		endPosition: {
			row: 32,
			column: 19,
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
		harnessName: 'function_xyz_2',
		fullLine: 'unsafe fn function_xyz_2() {',
		endPosition: {
			row: 41,
			column: 24,
		},
		attributes: ['#[kani::unwind(2)]', '#[kani::solver(kissat)]', '#[kani::should_panic]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'function_xyz_3',
		fullLine: 'pub unsafe fn function_xyz_3() {',
		endPosition: {
			row: 47,
			column: 28,
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
		harnessName: 'function_xyz_7',
		fullLine: 'fn function_xyz_7() {',
		endPosition: {
			row: 55,
			column: 17,
		},
		attributes: ['#[kani::unwind(0)]', '#[kani::solver(kissat)]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
];

export const attributeMetadataUnsupported = [
	{
		harnessName: 'function_1',
		fullLine: 'fn function_1() {',
		endPosition: {
			row: 6,
			column: 13,
		},
		attributes: ['#[kani::unwind(0)]', '#[kani::should_panic]', '#[kani::cover]'],
		args: {
			proof: true,
			test: false,
			stub: false,
		},
		module: undefined,
	},
	{
		harnessName: 'encrypt_then_decrypt_is_identity',
		fullLine: 'fn encrypt_then_decrypt_is_identity() {',
		endPosition: {
			row: 18,
			column: 35,
		},
		attributes: ['#[kani::stub(rand::random, mock_random)]'],
		args: {
			proof: true,
			test: false,
			stub: true,
		},
		module: undefined,
	},
	{
		harnessName: 'function_2',
		fullLine: 'fn function_2() {',
		endPosition: {
			row: 32,
			column: 13,
		},
		attributes: [
			'#[kani::stub(rand::random, mock_random)]',
			'#[kani::unwind(2)]',
			'#[kani::solver(kissat)]',
			'#[kani::should_panic]',
		],
		args: {
			proof: true,
			test: false,
			stub: true,
		},
		module: undefined,
	},
	{
		harnessName: 'function_3',
		fullLine: 'fn function_3() {',
		endPosition: {
			row: 38,
			column: 13,
		},
		attributes: [
			'#[cfg_attr(kani, kani::proof, kani::unwind(1), kani::stub(rand::random, mock_random), kani::solver(kissat))]',
		],
		args: {
			proof: true,
			test: true,
			stub: true,
		},
		module: undefined,
	},
];
