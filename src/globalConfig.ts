// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
class GlobalConfig {
	public static instance: GlobalConfig;
	public filePath: string;
	public KanifilePath = '';

	private constructor() {
		this.filePath = '';
		this.KanifilePath = '';
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

	public setKanifilePath(filePath: string): void {
		this.KanifilePath = filePath;
	}

	public getKanifilePath() {
		return this.KanifilePath;
	}
}

export default GlobalConfig;
