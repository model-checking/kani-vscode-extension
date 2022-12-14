export interface KaniResponse {
	failedProperty: string,
	failedMessages: string,
}

export namespace KaniConstants {
	export const KaniExecutableName = `kani`;
	export const CargoKaniExecutableName = `cargo kani`;
}

export namespace KaniArguments {
	export const unwindFlag = `--unwind`;
	export const harnessFlag = `--harness`;
	export const testsFlag = `--tests`;
	export const outputFormatFlag = `--output-format`;
}
