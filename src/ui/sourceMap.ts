// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT

export interface FileHarnessMetaData {
	fileMetaData: FileMetaData[];
	harnesses: HarnessMetadata[];
}

export interface FileMetaData {
	fileName: string;
	filePath: string;
	filePackage: string;
	crateName: string;
	cratePath: string;
}

export interface HarnessMetadata {
	harnessName: string;
	fullLine: string;
	endPosition: Position;
	attributes: string[];
	args: AttributeMetaData;
}

export interface AttributeMetaData {
	/// Whether the harness has been annotated with proof.
	proof: boolean;
	/// Whether the harness has been annotated with test (bolero cases)
	test: boolean;
	/// Stubbing metadata boolean
	stub: boolean;
}

interface Position {
	column: number;
	row: number;
}
