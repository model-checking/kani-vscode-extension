// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
class GlobalConfig {
	private static instance: GlobalConfig;
	private filePath: string;
	public coverageMap: any;

	private constructor() {
		this.filePath = '';
	}

	public static getInstance(): GlobalConfig {
		if (!GlobalConfig.instance) {
			GlobalConfig.instance = new GlobalConfig();
		}
		return GlobalConfig.instance;
	}

	// Store coverage as a cache to be accessed whenever a new text page is opened or switched
	public setCoverage(coverageMap: any): void {
		this.coverageMap = coverageMap;
	}

	// Retrieve coverage as a cache to be accessed whenever a new text page is opened or switched
	public getCoverage(): any {
		return this.coverageMap;
	}

	public setFilePath(filePath: string): void {
		this.filePath = filePath;
	}

	public getFilePath(): string {
		return this.filePath;
	}
}

export default GlobalConfig;
