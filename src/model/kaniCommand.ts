// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execFile } from "child_process";
import * as fs from 'fs';
import * as path from 'path';

export interface CommandArgs {
    command: 'kani' | 'cargo kani';
    args: string[];
}

// Disable the "Shell" option
export const options = {
	shell: false,
};

// Get the path to the cargo command
export function getKaniPath(): Promise<any>{
    return new Promise((resolve, reject) => {
        execFile('which', ['kani'], (error, stdout, stderr) => {
            if (error) {
              console.error(`execFile error: ${error}`);
              return;
            }
            if (stderr) {
              console.error(`stderr: ${stderr}`);
              return;
            }
            const cargoPath = stdout.trim();
            console.log(`Cargo is located at: ${cargoPath}`);

            // Check if cargo path is valid
            try {
                const stats = fs.statSync(cargoPath);
                if (stats.isFile() && path.basename(cargoPath) === 'kani') {
                    resolve(cargoPath);
                } else {
                    reject(new Error(`Invalid kani path: ${cargoPath}`));
                }
            } catch (err) {
                reject(err);
            }
        })
    })
}
