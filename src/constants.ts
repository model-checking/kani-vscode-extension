// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
export interface KaniResponse {
	failedProperty: string;
	failedMessages: string;
}

export namespace KaniConstants {
	export const KaniExecutableName: string = `kani`;
	export const CargoKaniExecutableName: string = `cargo kani`;
}

export namespace KaniArguments {
	export const packageFlag: string = `-p`;
	export const unwindFlag: string = `--unwind`;
	export const harnessFlag: string = `--harness`;
	export const testsFlag: string = `--tests`;
	export const outputFormatFlag: string = `--output-format`;
	export const unstableFormatFlag: string = `--enable-unstable`;
	export const stubbingFlag: string = `-Z=stubbing`;
}
