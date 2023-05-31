// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
class GlobalConfig {
	private static instance: GlobalConfig;
	private filePath: string;

	private constructor() {
		this.filePath = '';
	}

	public static getInstance(): GlobalConfig {
		if (!GlobalConfig.instance) {
			GlobalConfig.instance = new GlobalConfig();
		}
		return GlobalConfig.instance;
	}

	public setFilePath(filePath: string): void {
		this.filePath = filePath;
	}

	public getFilePath(): string {
		return this.filePath;
	}
}

export default GlobalConfig;
