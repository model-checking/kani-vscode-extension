// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
export interface FileMetaData {
	fileName: string;
	filePath: string;
	crateName: string;
	cratePath: string;
	harnesses: HarnessMetadata[];
}

export interface HarnessMetadata {
	name: string;
	fullLine: string;
	endPosition: Position;
	attributes: string[];
	args: AttributeMetaData;
}

export interface AttributeMetaData {
	/// Whether the harness has been annotated with proof.
	proof: boolean;
	/// Whethere the harness has been annotated with test (bolero cases)
	test: boolean;
}

interface Position {
	column: number;
	row: number;
}
