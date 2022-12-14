export const programWithProof = `
#[cfg(test)]
mod test {
    #[test]
    #[cfg_attr(kani, kani::proof, kani::unwind(0))]
    #[cfg_attr(miri, ignore)] // this test is too expensive for miri
    fn insert_test() {
        // Make sure the two packet numbers are not the same
        assert!(1==2);
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
        assert!(1==1);
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
`;

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
