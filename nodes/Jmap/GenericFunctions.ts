import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	IBinaryData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export interface IJmapSession {
	accounts: { [key: string]: IJmapAccount };
	primaryAccounts: { [key: string]: string };
	username: string;
	apiUrl: string;
	downloadUrl: string;
	uploadUrl: string;
	eventSourceUrl: string;
	state: string;
	capabilities: { [key: string]: IDataObject };
}

export interface IJmapAccount {
	name: string;
	isPersonal: boolean;
	isReadOnly: boolean;
	accountCapabilities: { [key: string]: IDataObject };
}

export interface IJmapRequest {
	using: string[];
	methodCalls: [string, IDataObject, string][];
}

export interface IJmapResponse {
	methodResponses: [string, IDataObject, string][];
	sessionState: string;
}

// Standard JMAP capabilities
export const JMAP_CAPABILITIES = {
	CORE: 'urn:ietf:params:jmap:core',
	MAIL: 'urn:ietf:params:jmap:mail',
	SUBMISSION: 'urn:ietf:params:jmap:submission',
	VACATION_RESPONSE: 'urn:ietf:params:jmap:vacationresponse',
	JAMES_SHARES: 'urn:apache:james:params:jmap:mail:shares',
	JAMES_QUOTA: 'urn:apache:james:params:jmap:mail:quota',
};

/**
 * Get the authentication type from node parameters
 */
function getAuthType(context: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions): string {
	try {
		return context.getNodeParameter('authentication', 0) as string;
	} catch {
		return 'jmapOAuth2Api'; // Default to OAuth2
	}
}

/**
 * Get JMAP server URL based on credential type
 */
async function getServerUrl(
	context: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<string> {
	const authType = getAuthType(context);

	if (authType === 'jmapOAuth2Api') {
		const credentials = await context.getCredentials('jmapOAuth2Api');
		return (credentials.jmapServerUrl as string).replace(/\/$/, '');
	} else {
		const credentials = await context.getCredentials('jmapApi');
		return (credentials.serverUrl as string).replace(/\/$/, '');
	}
}

/**
 * Make an authenticated JMAP request
 */
async function makeJmapRequest(
	context: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const authType = getAuthType(context);
	const serverUrl = await getServerUrl(context);
	const url = endpoint.startsWith('http') ? endpoint : `${serverUrl}${endpoint}`;

	if (authType === 'jmapOAuth2Api') {
		// Use n8n's built-in OAuth2 authentication
		const response = await context.helpers.httpRequestWithAuthentication.call(
			context,
			'jmapOAuth2Api',
			{
				method,
				url,
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body,
				json: true,
			} as IHttpRequestOptions,
		);
		return response as IDataObject;
	} else {
		// Use Basic Auth or Bearer Token
		const credentials = await context.getCredentials('jmapApi');
		const authMethod = (credentials.authMethod as string) || 'basicAuth';

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		};

		if (authMethod === 'basicAuth') {
			const authString = Buffer.from(
				`${credentials.email as string}:${credentials.password as string}`,
			).toString('base64');
			headers.Authorization = `Basic ${authString}`;
		} else if (authMethod === 'bearerToken') {
			headers.Authorization = `Bearer ${credentials.accessToken as string}`;
		}

		const options: IHttpRequestOptions = {
			method,
			url,
			headers,
			body,
			json: true,
		};

		const response = await context.helpers.httpRequest(options);
		return response as IDataObject;
	}
}

/**
 * Get JMAP session from the server
 */
export async function getJmapSession(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<IJmapSession> {
	try {
		const response = await makeJmapRequest(this, 'GET', '/session');
		return response as unknown as IJmapSession;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Failed to get JMAP session',
		});
	}
}

/**
 * Make a JMAP API request
 */
export async function jmapApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	methodCalls: [string, IDataObject, string][],
	using: string[] = [JMAP_CAPABILITIES.CORE, JMAP_CAPABILITIES.MAIL],
): Promise<IJmapResponse> {
	const body: IJmapRequest = {
		using,
		methodCalls,
	};

	try {
		const response = await makeJmapRequest(this, 'POST', '', body as unknown as IDataObject);
		return response as unknown as IJmapResponse;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'JMAP API request failed',
		});
	}
}

/**
 * Get the primary account ID for mail
 */
export async function getPrimaryAccountId(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<string> {
	const session = await getJmapSession.call(this);
	const mailCapability = JMAP_CAPABILITIES.MAIL;

	if (session.primaryAccounts && session.primaryAccounts[mailCapability]) {
		return session.primaryAccounts[mailCapability];
	}

	const accountIds = Object.keys(session.accounts);
	if (accountIds.length > 0) {
		return accountIds[0];
	}

	throw new Error('No JMAP account found');
}

/**
 * Get all mailboxes for an account
 */
export async function getMailboxes(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
): Promise<IDataObject[]> {
	const response = await jmapApiRequest.call(
		this,
		[['Mailbox/get', { accountId }, 'c1']],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Mailbox/get') {
		return (methodResponse[1] as IDataObject).list as IDataObject[];
	}

	throw new Error('Failed to get mailboxes');
}

/**
 * Find a mailbox by name
 */
export async function findMailboxByName(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
	name: string,
): Promise<IDataObject | undefined> {
	const mailboxes = await getMailboxes.call(this, accountId);
	return mailboxes.find((mb) => mb.name === name);
}

/**
 * Find a mailbox by role
 */
export async function findMailboxByRole(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
	role: string,
): Promise<IDataObject | undefined> {
	const mailboxes = await getMailboxes.call(this, accountId);
	return mailboxes.find((mb) => mb.role === role);
}

/**
 * Query emails with filters
 */
export async function queryEmails(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
	filter: IDataObject = {},
	sort: IDataObject[] = [{ property: 'receivedAt', isAscending: false }],
	limit: number = 50,
	position: number = 0,
): Promise<{ ids: string[]; total: number }> {
	const response = await jmapApiRequest.call(
		this,
		[
			[
				'Email/query',
				{ accountId, filter, sort, limit, position },
				'c1',
			],
		],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/query') {
		const result = methodResponse[1] as IDataObject;
		return {
			ids: result.ids as string[],
			total: result.total as number,
		};
	}

	throw new Error('Failed to query emails');
}

/**
 * Get emails by IDs
 */
export async function getEmails(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
	ids: string[],
	properties: string[] = [
		'id', 'blobId', 'threadId', 'mailboxIds', 'keywords', 'size',
		'receivedAt', 'from', 'to', 'cc', 'bcc', 'replyTo', 'subject',
		'sentAt', 'hasAttachment', 'preview', 'bodyStructure', 'bodyValues',
		'textBody', 'htmlBody', 'attachments',
	],
	fetchTextBodyValues: boolean = true,
	fetchHTMLBodyValues: boolean = true,
): Promise<IDataObject[]> {
	const response = await jmapApiRequest.call(
		this,
		[
			[
				'Email/get',
				{
					accountId,
					ids,
					properties,
					fetchTextBodyValues,
					fetchHTMLBodyValues,
					maxBodyValueBytes: 1048576,
				},
				'c1',
			],
		],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/get') {
		return (methodResponse[1] as IDataObject).list as IDataObject[];
	}

	throw new Error('Failed to get emails');
}

/**
 * Create and send an email
 */
export async function sendEmail(
	this: IExecuteFunctions,
	accountId: string,
	email: IDataObject,
	identityId: string,
): Promise<IDataObject> {
	const draftsMailbox = await findMailboxByRole.call(this, accountId, 'drafts');
	if (!draftsMailbox) {
		throw new Error('Drafts mailbox not found');
	}

	const emailCreate = {
		...email,
		mailboxIds: { [draftsMailbox.id as string]: true },
		keywords: { $draft: true },
	};

	const response = await jmapApiRequest.call(
		this,
		[
			['Email/set', { accountId, create: { draft: emailCreate } }, 'c1'],
			[
				'EmailSubmission/set',
				{
					accountId,
					create: { send: { emailId: '#draft', identityId } },
					onSuccessDestroyEmail: ['#send'],
				},
				'c2',
			],
		],
		[JMAP_CAPABILITIES.CORE, JMAP_CAPABILITIES.MAIL, JMAP_CAPABILITIES.SUBMISSION],
	);

	for (const methodResponse of response.methodResponses) {
		if (methodResponse[0] === 'error') {
			throw new Error(`JMAP error: ${JSON.stringify(methodResponse[1])}`);
		}
	}

	return response.methodResponses[1][1] as IDataObject;
}

/**
 * Create a draft email
 */
export async function createDraft(
	this: IExecuteFunctions,
	accountId: string,
	email: IDataObject,
): Promise<IDataObject> {
	const draftsMailbox = await findMailboxByRole.call(this, accountId, 'drafts');
	if (!draftsMailbox) {
		throw new Error('Drafts mailbox not found');
	}

	const emailCreate = {
		...email,
		mailboxIds: { [draftsMailbox.id as string]: true },
		keywords: { $draft: true },
	};

	const response = await jmapApiRequest.call(
		this,
		[['Email/set', { accountId, create: { draft: emailCreate } }, 'c1']],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'error') {
		throw new Error(`JMAP error: ${JSON.stringify(methodResponse[1])}`);
	}

	if (methodResponse[0] === 'Email/set') {
		const result = methodResponse[1] as IDataObject;
		const created = result.created as IDataObject;
		if (created && created.draft) {
			return created.draft as IDataObject;
		}
	}

	return methodResponse[1] as IDataObject;
}

/**
 * Get identities
 */
export async function getIdentities(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
): Promise<IDataObject[]> {
	const response = await jmapApiRequest.call(
		this,
		[['Identity/get', { accountId }, 'c1']],
		[JMAP_CAPABILITIES.CORE, JMAP_CAPABILITIES.SUBMISSION],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Identity/get') {
		return (methodResponse[1] as IDataObject).list as IDataObject[];
	}

	throw new Error('Failed to get identities');
}

/**
 * Update email keywords
 */
export async function updateEmailKeywords(
	this: IExecuteFunctions,
	accountId: string,
	emailId: string,
	keywords: IDataObject,
): Promise<IDataObject> {
	const response = await jmapApiRequest.call(
		this,
		[['Email/set', { accountId, update: { [emailId]: { keywords } } }, 'c1']],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/set') {
		return methodResponse[1] as IDataObject;
	}

	throw new Error('Failed to update email');
}

/**
 * Move email to a different mailbox
 */
export async function moveEmail(
	this: IExecuteFunctions,
	accountId: string,
	emailId: string,
	targetMailboxId: string,
): Promise<IDataObject> {
	const response = await jmapApiRequest.call(
		this,
		[
			[
				'Email/set',
				{
					accountId,
					update: { [emailId]: { mailboxIds: { [targetMailboxId]: true } } },
				},
				'c1',
			],
		],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/set') {
		return methodResponse[1] as IDataObject;
	}

	throw new Error('Failed to move email');
}

/**
 * Add a label (mailbox) to an email
 */
export async function addLabel(
	this: IExecuteFunctions,
	accountId: string,
	emailId: string,
	mailboxId: string,
): Promise<IDataObject> {
	const response = await jmapApiRequest.call(
		this,
		[
			[
				'Email/set',
				{
					accountId,
					update: { [emailId]: { [`mailboxIds/${mailboxId}`]: true } },
				},
				'c1',
			],
		],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/set') {
		return methodResponse[1] as IDataObject;
	}

	throw new Error('Failed to add label');
}

/**
 * Remove a label (mailbox) from an email
 */
export async function removeLabel(
	this: IExecuteFunctions,
	accountId: string,
	emailId: string,
	mailboxId: string,
): Promise<IDataObject> {
	const response = await jmapApiRequest.call(
		this,
		[
			[
				'Email/set',
				{
					accountId,
					update: { [emailId]: { [`mailboxIds/${mailboxId}`]: null } },
				},
				'c1',
			],
		],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/set') {
		return methodResponse[1] as IDataObject;
	}

	throw new Error('Failed to remove label');
}

/**
 * Get labels (mailboxes) for an email with their names
 */
export async function getLabels(
	this: IExecuteFunctions,
	accountId: string,
	emailId: string,
): Promise<IDataObject[]> {
	const emails = await getEmails.call(this, accountId, [emailId], ['id', 'mailboxIds']);

	if (emails.length === 0) {
		throw new Error('Email not found');
	}

	const email = emails[0];
	const mailboxIds = email.mailboxIds as IDataObject;

	if (!mailboxIds || Object.keys(mailboxIds).length === 0) {
		return [];
	}

	const allMailboxes = await getMailboxes.call(this, accountId);

	const labels: IDataObject[] = [];
	for (const mailboxId of Object.keys(mailboxIds)) {
		const mailbox = allMailboxes.find((mb) => mb.id === mailboxId);
		if (mailbox) {
			labels.push({
				id: mailbox.id,
				name: mailbox.name,
				role: mailbox.role || null,
				totalEmails: mailbox.totalEmails,
				unreadEmails: mailbox.unreadEmails,
			});
		} else {
			labels.push({ id: mailboxId, name: null, role: null });
		}
	}

	return labels;
}

/**
 * Delete emails
 */
export async function deleteEmails(
	this: IExecuteFunctions,
	accountId: string,
	emailIds: string[],
): Promise<IDataObject> {
	const response = await jmapApiRequest.call(
		this,
		[['Email/set', { accountId, destroy: emailIds }, 'c1']],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Email/set') {
		return methodResponse[1] as IDataObject;
	}

	throw new Error('Failed to delete emails');
}

/**
 * Get threads
 */
export async function getThreads(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	accountId: string,
	ids: string[],
): Promise<IDataObject[]> {
	const response = await jmapApiRequest.call(
		this,
		[['Thread/get', { accountId, ids }, 'c1']],
	);

	const methodResponse = response.methodResponses[0];
	if (methodResponse[0] === 'Thread/get') {
		return (methodResponse[1] as IDataObject).list as IDataObject[];
	}

	throw new Error('Failed to get threads');
}

/**
 * Download an attachment blob
 */
export async function downloadBlob(
	this: IExecuteFunctions,
	accountId: string,
	blobId: string,
	name: string,
	type: string,
): Promise<Buffer> {
	const session = await getJmapSession.call(this);
	const authType = getAuthType(this);

	let downloadUrl = session.downloadUrl
		.replace('{accountId}', accountId)
		.replace('{blobId}', blobId)
		.replace('{name}', encodeURIComponent(name))
		.replace('{type}', encodeURIComponent(type));

	if (authType === 'jmapOAuth2Api') {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'jmapOAuth2Api',
			{
				method: 'GET',
				url: downloadUrl,
				encoding: 'arraybuffer',
			} as IHttpRequestOptions,
		);
		return Buffer.from(response as ArrayBuffer);
	} else {
		const credentials = await this.getCredentials('jmapApi');
		const authMethod = (credentials.authMethod as string) || 'basicAuth';

		const headers: Record<string, string> = {};

		if (authMethod === 'basicAuth') {
			const authString = Buffer.from(
				`${credentials.email as string}:${credentials.password as string}`,
			).toString('base64');
			headers.Authorization = `Basic ${authString}`;
		} else if (authMethod === 'bearerToken') {
			headers.Authorization = `Bearer ${credentials.accessToken as string}`;
		}

		const options: IHttpRequestOptions = {
			method: 'GET' as IHttpRequestMethods,
			url: downloadUrl,
			headers,
			encoding: 'arraybuffer',
		};

		const response = await this.helpers.httpRequest(options);
		return Buffer.from(response as ArrayBuffer);
	}
}

/**
 * Interface for attachment options
 */
export interface IAttachmentOptions {
	includeInline?: boolean;
	mimeTypeFilter?: string;
}

/**
 * Interface for attachment metadata from JMAP
 */
interface IJmapAttachment {
	blobId: string;
	type: string;
	name: string;
	size: number;
	cid?: string;
	isInline?: boolean;
	partId?: string;
}

/**
 * Check if a MIME type matches a filter pattern
 */
function matchesMimeType(mimeType: string, filter: string): boolean {
	const normalizedMime = mimeType.toLowerCase();
	const normalizedFilter = filter.toLowerCase().trim();

	if (normalizedFilter.endsWith('/*')) {
		const prefix = normalizedFilter.slice(0, -1);
		return normalizedMime.startsWith(prefix);
	}

	return normalizedMime === normalizedFilter;
}

/**
 * Get attachments from an email and return them as binary data.
 * Each attachment is returned as a separate item with binary data in the 'file' field.
 * To extract archives (ZIP, tar.gz), chain with the n8n Compression node.
 */
export async function getAttachments(
	this: IExecuteFunctions,
	accountId: string,
	emailId: string,
	options: IAttachmentOptions = {},
): Promise<INodeExecutionData[]> {
	const { includeInline = false, mimeTypeFilter = '' } = options;

	// Get email with attachments metadata
	const emails = await getEmails.call(this, accountId, [emailId], [
		'id',
		'subject',
		'attachments',
	]);

	if (emails.length === 0) {
		throw new Error(`Email with ID ${emailId} not found`);
	}

	const email = emails[0];
	const attachments = (email.attachments as IJmapAttachment[]) || [];

	if (attachments.length === 0) {
		return [];
	}

	// Parse MIME type filters
	const mimeFilters = mimeTypeFilter
		? mimeTypeFilter.split(',').map((f) => f.trim()).filter((f) => f)
		: [];

	const results: INodeExecutionData[] = [];
	let attachmentIndex = 0;

	for (const attachment of attachments) {
		// Filter by inline status
		if (attachment.isInline && !includeInline) {
			continue;
		}

		// Filter by MIME type
		if (mimeFilters.length > 0) {
			const matches = mimeFilters.some((filter) => matchesMimeType(attachment.type, filter));
			if (!matches) {
				continue;
			}
		}

		// Download the attachment
		const buffer = await downloadBlob.call(
			this,
			accountId,
			attachment.blobId,
			attachment.name,
			attachment.type,
		);

		// Prepare binary data for n8n
		const binaryData: IBinaryData = await this.helpers.prepareBinaryData(
			buffer,
			attachment.name,
			attachment.type,
		);

		results.push({
			json: {
				emailId: email.id,
				emailSubject: email.subject,
				attachmentIndex,
				fileName: attachment.name,
				mimeType: attachment.type,
				fileSize: attachment.size,
				isInline: attachment.isInline || false,
			},
			binary: {
				file: binaryData,
			},
		});
		attachmentIndex++;
	}

	return results;
}
