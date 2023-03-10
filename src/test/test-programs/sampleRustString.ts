// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
export const fullProgramSource= `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(0))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_80978342() {
        // Make sure the two packet numbers are not the same
        assert!(1==3);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_2() {
        // Make sure the two packet numbers are not the same
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn random_name() {
        // Make sure the two packet numbers are not the same
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
        // Make sure the two packet numbers are not the same
        assert!(1==3);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_2() {
        // Make sure the two packet numbers are not the same
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(1))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn random_name() {
        // Make sure the two packet numbers are not the same
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
`

export const rustFileWithoutProof = `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test() {
        // Make sure the two packet numbers are not the same
        assert!(1==2);
    }

    #[test]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test_2() {
        // Make sure the two packet numbers are not the same
        assert!(1==1);
    }

    #[test]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn random_name() {
        // Make sure the two packet numbers are not the same
        assert!(1==1);
    }
}
`;


export const findHarnessesResultKani = [
    {
      "name": "function_abc",
      "fullLine": "fn function_abc() {",
      "endPosition": {
        "row": 4,
        "column": 15
      },
      "attributes": [
        "#[kani::unwind(0)]"
      ],
      "args": {
        "proof": true,
        "test": false
      }
    },
    {
      "name": "function_xyz",
      "fullLine": "pub fn function_xyz() {",
      "endPosition": {
        "row": 11,
        "column": 19
      },
      "attributes": [],
      "args": {
        "proof": true,
        "test": false
      }
    },
    {
      "name": "function_xyz_2",
      "fullLine": "unsafe fn function_xyz_2() {",
      "endPosition": {
        "row": 19,
        "column": 24
      },
      "attributes": [
        "#[kani::unwind(2)]",
        "#[kani::solver(kissat)]"
      ],
      "args": {
        "proof": true,
        "test": false
      }
    },
    {
      "name": "function_xyz_3",
      "fullLine": "pub unsafe fn function_xyz_3() {",
      "endPosition": {
        "row": 25,
        "column": 28
      },
      "attributes": [],
      "args": {
        "proof": true,
        "test": false
      }
    },
    {
      "name": "function_xyz_7",
      "fullLine": "fn function_xyz_7() {",
      "endPosition": {
        "row": 33,
        "column": 17
      },
      "attributes": [
        "#[kani::unwind(0)]",
        "#[kani::solver(kissat)]"
      ],
      "args": {
        "proof": true,
        "test": false
      }
    }
]


export const findHarnessesResultBolero =
[
    {
      "name": "insert_test_80978342",
      "fullLine": "fn insert_test_80978342() {",
      "endPosition": {
        "row": 6,
        "column": 27
      },
      "attributes": [
        "#[cfg_attr(kani, kani::proof, kani::unwind(0))]"
      ],
      "args": {
        "proof": true,
        "test": true
      }
    },
    {
      "name": "insert_test_2",
      "fullLine": "fn insert_test_2() {",
      "endPosition": {
        "row": 14,
        "column": 20
      },
      "attributes": [
        "#[cfg_attr(kani, kani::proof, kani::unwind(1))]"
      ],
      "args": {
        "proof": true,
        "test": true
      }
    },
    {
      "name": "random_name",
      "fullLine": "fn random_name() {",
      "endPosition": {
        "row": 22,
        "column": 18
      },
      "attributes": [
        "#[cfg_attr(kani, kani::proof, kani::unwind(1))]"
      ],
      "args": {
        "proof": true,
        "test": true
      }
    }
];

export const harnessMetadata = [
    {
      "name": "insert_test_80978342",
      "fullLine": "fn insert_test_80978342() {",
      "endPosition": {
        "row": 6,
        "column": 27
      },
      "attributes": [
        "#[cfg_attr(kani, kani::proof, kani::unwind(0))]"
      ],
      "args": {
        "proof": true,
        "test": true,
        "unwind_value": 0
      }
    },
    {
      "name": "insert_test_2",
      "fullLine": "fn insert_test_2() {",
      "endPosition": {
        "row": 14,
        "column": 20
      },
      "attributes": [
        "#[cfg_attr(kani, kani::proof, kani::unwind(1))]"
      ],
      "args": {
        "proof": true,
        "test": true,
        "unwind_value": 1
      }
    },
    {
      "name": "random_name",
      "fullLine": "fn random_name() {",
      "endPosition": {
        "row": 22,
        "column": 18
      },
      "attributes": [
        "#[cfg_attr(kani, kani::proof, kani::unwind(1))]"
      ],
      "args": {
        "proof": true,
        "test": true,
        "unwind_value": 1
      }
    },
    {
      "name": "function_abc",
      "fullLine": "fn function_abc() {",
      "endPosition": {
        "row": 31,
        "column": 15
      },
      "attributes": [
        "#[kani::unwind(0)]"
      ],
      "args": {
        "proof": true,
        "test": false,
        "unwind_value": 0
      }
    },
    {
      "name": "function_xyz",
      "fullLine": "pub fn function_xyz() {",
      "endPosition": {
        "row": 38,
        "column": 19
      },
      "attributes": [],
      "args": {
        "proof": true,
        "test": false
      }
    },
    {
      "name": "function_xyz_2",
      "fullLine": "unsafe fn function_xyz_2() {",
      "endPosition": {
        "row": 46,
        "column": 24
      },
      "attributes": [
        "#[kani::unwind(2)]",
        "#[kani::solver(kissat)]"
      ],
      "args": {
        "proof": true,
        "test": false,
        "unwind_value": 2,
        "solver": "kissat"
      }
    },
    {
      "name": "function_xyz_3",
      "fullLine": "pub unsafe fn function_xyz_3() {",
      "endPosition": {
        "row": 52,
        "column": 28
      },
      "attributes": [],
      "args": {
        "proof": true,
        "test": false
      }
    },
    {
      "name": "function_xyz_7",
      "fullLine": "fn function_xyz_7() {",
      "endPosition": {
        "row": 60,
        "column": 17
      },
      "attributes": [
        "#[kani::unwind(0)]",
        "#[kani::solver(kissat)]"
      ],
      "args": {
        "proof": true,
        "solver": "kissat",
        "test": false,
        "unwind_value": 0
      }
    }
]
