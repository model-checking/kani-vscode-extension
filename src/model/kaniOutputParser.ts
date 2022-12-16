// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { KaniResponse } from '../constants';

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
		const responseMessage: string = `Property - ${this.propertyName}\nMessage - ${this.description}\nLocation - ${this.location}`;
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
	let responseMessage = ``;
	let displayMessage = ``;
	for (let i = 0; i < checksArray.length; i++) {
		const checkInstance: string[] = checksArray[i].split('\n');
		const checkInstanceObject: CheckInstance = convertChecktoObject(checkInstance);
		if (checkInstanceObject.status !== 'SUCCESS') {
			responseMessage += checkInstanceObject.createFailureMessage();
			displayMessage = checkInstanceObject.createDisplayMessage();
		}
	}
	const failureResponse: KaniResponse = {
		failedProperty: responseMessage,
		failedMessages: displayMessage,
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
			checkNumber = parseInt(property[0].replace(/^\D+/g, ''));
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
