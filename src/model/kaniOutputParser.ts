// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { KaniResponse } from '../constants';

type ErrorName = 'KaniCompilationError' | 'NoHarnessesError';

export class KaniResponseError extends Error {
	name: ErrorName;
	message: string;
	cause: any;

	constructor({ name, message, cause }: { name: ErrorName; message: string; cause?: any }) {
		super();
		this.name = name;
		this.message = message;
		this.cause = cause;
	}
}

/**
 * Metadata about the property that needs to be processed before presenting to the UI
 *
 * @param checkNumber - Index of the property
 * @param propertyName - Name of property
 * @param status - verification status (i.e success|failure)
 * @param description - Description of failure from Kani
 * @param location - Location information from Kani on the failed property
 */
class CheckInstance {
	checkNumber: number;
	propertyName: string;
	status: string;
	description: string;
	location: string;

	constructor(
		checkNumber: number,
		propertyName: string,
		status: string,
		description: string,
		location: string,
	) {
		this.checkNumber = checkNumber;
		this.propertyName = propertyName;
		this.status = status;
		this.description = description;
		this.location = location;
	}

	/**
	 * Structured Response for the Diff Output
	 */
	public createFailureMessage(): string {
		const responseMessage: string = `Property - ${this.propertyName}\nMessage - ${this.description}\nStatus - ${this.status}\nLocation - ${this.location}\n`;
		return responseMessage;
	}

	/**
	 * Output text for the message
	 */
	public createDisplayMessage(): string {
		const responseMessage: string = `${this.description}`;
		return responseMessage;
	}
}

// Check if stderr and std out contain the error strings or the strings indicating successful compilation and verification
export function checkOutputForError(outString: string, errString: string): any {
	if (errString.includes('Finished dev') && outString.includes('VERIFICATION:-')) {
		return false;
	}

	// add multiple harnesses detection also error
	if (errString.includes('no harnesses matched the harness filter')) {
		throw new KaniResponseError({
			name: 'NoHarnessesError',
			message: 'No harnesses found with the request',
			cause: errString,
		});
	}

	// If by this point, we havent returned false, it usually happens only because there was an error with kani itself
	if (outString.includes('error') && errString.includes('error')) {
		throw new KaniResponseError({
			name: 'KaniCompilationError',
			message: 'Kani Compilation error found',
			cause: errString,
		});
	}

	return false;
}

// Expose output parser to other modules
export function responseParserInterface(responseString: string): KaniResponse {
	return responseParser(responseString);
}

function responseParser(responseString: string): KaniResponse {
	const splittedResponse: string[] = responseString.split('\n\n');
	const responseObject: KaniResponse = getResultsSubArray(splittedResponse);
	return responseObject;
}

// Search for specific results and return the diff messages
function getResultsSubArray(splittedResponse: string[]): KaniResponse {
	// Search for sub array containing only the results
	// and the summary sub array
	const a: any = splittedResponse.find((element) => element.includes('RESULTS'));
	const b: any = splittedResponse.find((element) => element.includes('SUMMARY'));

	const checkResponse: number = splittedResponse.indexOf(a);
	const summaryResponse: number = splittedResponse.indexOf(b);

	// Get a subarray of the checks together
	const checksArray: Array<string> = [];
	for (let i = checkResponse; i < summaryResponse; i++) {
		checksArray.push(splittedResponse[i]);
	}

	// Return the final diff message
	return captureChecksArray(checksArray);
}

function captureChecksArray(checksArray: Array<string>): KaniResponse {
	cleanChecksArray(checksArray);
	const responseMessage: KaniResponse = parseChecksArray(checksArray);
	return responseMessage;
}

function cleanChecksArray(checksArray: Array<string>): Array<string> {
	if (checksArray.length > 0 && checksArray[0].includes('RESULTS:\n')) {
		const cleanFirstCheck: string = checksArray[0].replace('RESULTS:\n', '');
		checksArray[0] = cleanFirstCheck;
	}
	return checksArray;
}

function parseChecksArray(checksArray: Array<string>): KaniResponse {
	let failureResponseMessage = ``;
	let failureDisplayMessage = ``;
	const failure_statuses = ['FAILURE', 'UNDETERMINED', 'UNREACHABLE', 'UNSATISFIABLE'];
	const success_statuses = ['SATISFIED', 'SUCCESS'];

	for (let i = 0; i < checksArray.length; i++) {
		const checkInstance: string[] = checksArray[i].split('\n');
		const checkInstanceObject: CheckInstance = convertChecktoObject(checkInstance);
		if (failure_statuses.includes(checkInstanceObject.status)) {
			failureResponseMessage += `${checkInstanceObject.createFailureMessage()}\n`;
			failureDisplayMessage = `${checkInstanceObject.createDisplayMessage()}\n`;
		} else if (!success_statuses.includes(checkInstanceObject.status)) {
			failureResponseMessage +=
				`${checkInstanceObject.createFailureMessage()}WARNING: unknown status returned from Kani.\n\n`;
			failureDisplayMessage = `${checkInstanceObject.createDisplayMessage()}\n`;
		}
	}
	const failureResponse: KaniResponse = {
		failedProperty: failureResponseMessage,
		failedMessages: failureDisplayMessage,
	};

	return failureResponse;
}

// Convert failed property into a process object
function convertChecktoObject(checkInstance: Array<string>): CheckInstance {
	let checkNumber: number;
	let propertyName: string;
	let status: string;
	let description: string;
	let location: string;

	for (let i = 0; i < checkInstance.length; i++) {
		if (i === 0) {
			const property: string[] = checkInstance[i].split(': ');
			checkNumber = parseInt(property[0].replace(/^\D+/gu, ''));
			propertyName = property[1];
		} else {
			const responseVariable: Variable = splitString(checkInstance[i]);
			switch (responseVariable.field) {
				case 'Status':
					status = responseVariable.message;
					break;
				case 'Description':
					description = responseVariable.message;
					break;
				case 'Location':
					location = responseVariable.message;
					break;
				default:
					break;
			}
		}
	}

	const checkInstanceObject: CheckInstance = new CheckInstance(
		checkNumber!,
		propertyName!,
		status!,
		description!,
		location!,
	);
	return checkInstanceObject;
}

// Store metadata
interface Variable {
	field: string;
	message: string;
}

// Return {field: message} from [..field: message]
function splitString(stringliteral: string): Variable {
	stringliteral = stringliteral.trim();
	const field: string = stringliteral.slice(0, stringliteral.indexOf(':')).split(' ')[1];
	const message: string = stringliteral.slice(stringliteral.indexOf(':') + 1).trim();
	return { field, message };
}
