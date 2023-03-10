// // Copyright Kani Contributors
// // SPDX-License-Identifier: Apache-2.0 OR MIT
// import * as parser from '../../ui/sourceCodeParser';

// const proofRe = /kani::proof.*((.|\n)*?){/gm;
// const testRe = /#\[test].*((.|\n)*?){/gm;

// const parseRustfile = (text: string): any => {
// 	const allProofs = text.matchAll(proofRe);
// 	const allTests = text.matchAll(testRe);
// 	const harnessMap = new Map<string, string>();
// 	const map = new Map<string, string>();
// 	const harnessList: Set<string> = new Set<string>([]);
// 	const testList: Set<string> = new Set<string>([]);
// 	const testMap = new Map<string, string>();
// 	const unwindMap = new Map<string, number>();

// 	for (const test of allTests) {
// 		const [harnessLineRaw, mapLineValue] = parser.getHarnessInformationFromTest(test);
// 		const unwindValue = parser.extractUnwindValueFromTest(harnessLineRaw);
// 		let harnessLine = parser.extractFunctionLineFromTest(harnessLineRaw);
// 		const harnessName = parser.getHarnessNameFromHarnessLine(harnessLine);
// 		harnessLine = harnessLine.replace(/\s+/g, '').concat('{');
// 		testList.add(harnessName);
// 		harnessList.add(harnessName);
// 		testMap.set(harnessLine, harnessName);
// 		if (!unwindMap.has(harnessLine)) {
// 			unwindMap.set(harnessLine, unwindValue);
// 		}
// 		map.set(harnessLine, mapLineValue);
// 	}

// 	for (const test of allProofs) {
// 		const [harnessLineRaw, mapLineValue] = parser.getHarnessInformationFromTest(test);
// 		const unwindValue = parser.extractUnwindValueFromLine(harnessLineRaw);
// 		let harnessLine = parser.extractFunctionLine(harnessLineRaw);
// 		const harnessName = parser.getHarnessNameFromHarnessLine(harnessLine);
// 		harnessLine = harnessLine.replace(/\s+/g, '');
// 		harnessList.add(harnessName);
// 		harnessMap.set(harnessLine, harnessName);
// 		if (!unwindMap.has(harnessLine)) {
// 			unwindMap.set(harnessLine, unwindValue);
// 		}
// 		map.set(harnessLine, mapLineValue);
// 	}
// 	return [harnessList, unwindMap];
// };

// export function getHarnessListFromParsing(text: string): Set<string> {
// 	return parseRustfile(text).at(0);
// }

// export function getUnwindMapFromParsing(text: string): Map<string, number> {
// 	return parseRustfile(text).at(1);
// }
