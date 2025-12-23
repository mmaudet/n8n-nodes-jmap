import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getPrimaryAccountId,
	getMailboxes,
	queryEmails,
	getEmails,
	sendEmail,
	createDraft,
	getIdentities,
	updateEmailKeywords,
	moveEmail,
	addLabel,
	removeLabel,
	getLabels,
	deleteEmails,
	getThreads,
	getAttachments,
	IAttachmentOptions,
} from './GenericFunctions';

export class Jmap implements INodeType {
	// @ts-ignore - usableAsTool not in type definitions
	description: INodeTypeDescription = {
		displayName: 'JMAP',
		name: 'jmap',
		icon: 'file:jmap.svg',
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with JMAP email servers (Apache James, Twake Mail, etc.)',
		defaults: {
			name: 'JMAP',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jmapApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['jmapApi'],
					},
				},
			},
			{
				name: 'jmapOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['jmapOAuth2Api'],
					},
				},
			},
		],
		properties: [
			// Authentication selection
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'OAuth2',
						value: 'jmapOAuth2Api',
					},
					{
						name: 'Basic Auth / Bearer Token',
						value: 'jmapApi',
					},
				],
				default: 'jmapOAuth2Api',
				description: 'Authentication method to use',
			},
			// Resource selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Mailbox',
						value: 'mailbox',
					},
					{
						name: 'Thread',
						value: 'thread',
					},
				],
				default: 'email',
			},

			// ==================== EMAIL OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['email'],
					},
				},
				options: [
					{
						name: 'Add Label',
						value: 'addLabel',
						description: 'Add a label (mailbox) to an email',
						action: 'Add a label to an email',
					},
					{
						name: 'Create Draft',
						value: 'createDraft',
						description: 'Create a draft email without sending',
						action: 'Create a draft email',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an email',
						action: 'Delete an email',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an email by ID',
						action: 'Get an email',
					},
					{
						name: 'Get Attachments',
						value: 'getAttachments',
						description: 'Download attachments from an email',
						action: 'Get attachments from an email',
					},
					{
						name: 'Get Labels',
						value: 'getLabels',
						description: 'Get all labels (mailboxes) for an email',
						action: 'Get labels for an email',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get multiple emails',
						action: 'Get many emails',
					},
					{
						name: 'Mark as Read',
						value: 'markAsRead',
						description: 'Mark an email as read',
						action: 'Mark an email as read',
					},
					{
						name: 'Mark as Unread',
						value: 'markAsUnread',
						description: 'Mark an email as unread',
						action: 'Mark an email as unread',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move an email to a different mailbox',
						action: 'Move an email',
					},
					{
						name: 'Remove Label',
						value: 'removeLabel',
						description: 'Remove a label (mailbox) from an email',
						action: 'Remove a label from an email',
					},
					{
						name: 'Reply',
						value: 'reply',
						description: 'Reply to an email',
						action: 'Reply to an email',
					},
					{
						name: 'Send',
						value: 'send',
						description: 'Send an email',
						action: 'Send an email',
					},
				],
				default: 'send',
			},

			// ==================== MAILBOX OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['mailbox'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a mailbox by ID',
						action: 'Get a mailbox',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all mailboxes',
						action: 'Get many mailboxes',
					},
				],
				default: 'getMany',
			},

			// ==================== THREAD OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['thread'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a thread by ID',
						action: 'Get a thread',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get emails in a thread',
						action: 'Get many threads',
					},
				],
				default: 'get',
			},

			// ==================== EMAIL PARAMETERS ====================

			// Email ID (for get, delete, markAsRead, markAsUnread, move, reply, addLabel, removeLabel, getLabels, getAttachments)
			{
				displayName: 'Email ID',
				name: 'emailId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['get', 'delete', 'markAsRead', 'markAsUnread', 'move', 'reply', 'addLabel', 'removeLabel', 'getLabels', 'getAttachments'],
					},
				},
				default: '',
				description: 'The ID of the email',
			},

			// Label (mailbox) selection for addLabel/removeLabel
			{
				displayName: 'Label',
				name: 'label',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMailboxes',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['addLabel', 'removeLabel'],
					},
				},
				default: '',
				description: 'The label (mailbox) to add or remove',
			},

			// Mailbox selection for getMany
			{
				displayName: 'Mailbox',
				name: 'mailbox',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMailboxes',
				},
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['getMany'],
					},
				},
				default: '',
				description: 'The mailbox to get emails from',
			},

			// Target mailbox for move
			{
				displayName: 'Target Mailbox',
				name: 'targetMailbox',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMailboxes',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['move'],
					},
				},
				default: '',
				description: 'The mailbox to move the email to',
			},

			// From (sender identity) for send/reply
			{
				displayName: 'From',
				name: 'fromIdentity',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIdentities',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['send', 'reply'],
					},
				},
				default: '',
				description: 'The sender identity to use',
			},

			// To recipients
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['send', 'createDraft'],
					},
				},
				default: '',
				placeholder: 'recipient@example.com',
				description: 'Recipient email addresses (comma-separated)',
			},

			// Subject
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['send', 'createDraft'],
					},
				},
				default: '',
				description: 'The email subject',
			},

			// Email body type
			{
				displayName: 'Email Type',
				name: 'emailType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['send', 'reply', 'createDraft'],
					},
				},
				options: [
					{
						name: 'Text',
						value: 'text',
					},
					{
						name: 'HTML',
						value: 'html',
					},
				],
				default: 'text',
			},

			// Message body
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['send', 'reply', 'createDraft'],
					},
				},
				default: '',
				description: 'The email body content',
			},

			// Additional options for send/createDraft
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['send', 'createDraft'],
					},
				},
				options: [
					{
						displayName: 'CC',
						name: 'cc',
						type: 'string',
						default: '',
						description: 'CC recipients (comma-separated)',
					},
					{
						displayName: 'BCC',
						name: 'bcc',
						type: 'string',
						default: '',
						description: 'BCC recipients (comma-separated)',
					},
				],
			},

			// Options for getAttachments
			{
				displayName: 'Options',
				name: 'attachmentOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['getAttachments'],
					},
				},
				options: [
					{
						displayName: 'Include Inline Images',
						name: 'includeInline',
						type: 'boolean',
						default: false,
						description: 'Whether to include inline images (embedded in the email body) in addition to regular attachments',
					},
					{
						displayName: 'Filter by MIME Type',
						name: 'mimeTypeFilter',
						type: 'string',
						default: '',
						placeholder: 'application/pdf, image/*',
						description: 'Comma-separated list of MIME types to include. Supports wildcards (e.g., image/*). Leave empty to include all.',
					},
				],
			},

			// Limit for getMany
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['getMany'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// Options for getMany (search filters)
			{
				displayName: 'Options',
				name: 'getManyOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['email'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Flagged Only',
						name: 'flaggedOnly',
						type: 'boolean',
						default: false,
						description: 'Whether to return only flagged/starred emails',
					},
					{
						displayName: 'From Contains',
						name: 'from',
						type: 'string',
						default: '',
						placeholder: 'sender@example.com',
						description: 'Filter emails where the From address contains this text',
					},
					{
						displayName: 'Full Text Search',
						name: 'text',
						type: 'string',
						default: '',
						placeholder: 'search terms',
						description: 'Search in subject, body, and addresses',
					},
					{
						displayName: 'Has Attachment',
						name: 'hasAttachment',
						type: 'boolean',
						default: false,
						description: 'Whether to return only emails with attachments',
					},
					{
						displayName: 'Received After',
						name: 'after',
						type: 'dateTime',
						default: '',
						description: 'Filter emails received after this date',
					},
					{
						displayName: 'Received Before',
						name: 'before',
						type: 'dateTime',
						default: '',
						description: 'Filter emails received before this date',
					},
					{
						displayName: 'Subject Contains',
						name: 'subject',
						type: 'string',
						default: '',
						placeholder: 'Invoice',
						description: 'Filter emails where the subject contains this text',
					},
					{
						displayName: 'To Contains',
						name: 'to',
						type: 'string',
						default: '',
						placeholder: 'recipient@example.com',
						description: 'Filter emails where the To address contains this text',
					},
					{
						displayName: 'Unread Only',
						name: 'unreadOnly',
						type: 'boolean',
						default: false,
						description: 'Whether to return only unread emails',
					},
				],
			},

			// ==================== MAILBOX PARAMETERS ====================

			{
				displayName: 'Mailbox ID',
				name: 'mailboxId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['mailbox'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'The ID of the mailbox',
			},

			// ==================== THREAD PARAMETERS ====================

			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['get', 'getMany'],
					},
				},
				default: '',
				description: 'The ID of the thread',
			},
		],
	};

	methods = {
		loadOptions: {
			async getMailboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const accountId = await getPrimaryAccountId.call(this);
				const mailboxes = await getMailboxes.call(this, accountId);

				return mailboxes.map((mailbox) => ({
					name: `${mailbox.name} (${mailbox.totalEmails} emails)`,
					value: mailbox.id as string,
				}));
			},

			async getIdentities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const accountId = await getPrimaryAccountId.call(this);
				const identities = await getIdentities.call(this, accountId);

				return identities.map((identity) => ({
					name: `${identity.name} <${identity.email}>`,
					value: identity.id as string,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const accountId = await getPrimaryAccountId.call(this);

		// Operations that should only run once, regardless of input items
		const singleExecutionOperations = [
			'getMany', // Email/Mailbox/Thread getMany - query with filters, not per-item
		];

		const itemsToProcess = singleExecutionOperations.includes(operation) ? 1 : items.length;

		for (let i = 0; i < itemsToProcess; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};

				// ==================== EMAIL ====================
				if (resource === 'email') {
					if (operation === 'send') {
						const fromIdentity = this.getNodeParameter('fromIdentity', i) as string;
						const to = this.getNodeParameter('to', i) as string;
						const subject = this.getNodeParameter('subject', i) as string;
						const emailType = this.getNodeParameter('emailType', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						// Parse recipients
						const toAddresses = to.split(',').map((addr) => ({
							email: addr.trim(),
						}));

						const email: IDataObject = {
							to: toAddresses,
							subject,
							bodyValues: {
								body: { value: message, isEncodingProblem: false, isTruncated: false },
							},
						};

						if (emailType === 'html') {
							email.htmlBody = [{ partId: 'body', type: 'text/html' }];
						} else {
							email.textBody = [{ partId: 'body', type: 'text/plain' }];
						}

						if (options.cc) {
							email.cc = (options.cc as string).split(',').map((addr) => ({
								email: addr.trim(),
							}));
						}

						if (options.bcc) {
							email.bcc = (options.bcc as string).split(',').map((addr) => ({
								email: addr.trim(),
							}));
						}

						responseData = await sendEmail.call(this, accountId, email, fromIdentity);
					}

					if (operation === 'createDraft') {
						const to = this.getNodeParameter('to', i) as string;
						const subject = this.getNodeParameter('subject', i) as string;
						const emailType = this.getNodeParameter('emailType', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						// Parse recipients
						const toAddresses = to.split(',').map((addr) => ({
							email: addr.trim(),
						}));

						const email: IDataObject = {
							to: toAddresses,
							subject,
							bodyValues: {
								body: { value: message, isEncodingProblem: false, isTruncated: false },
							},
						};

						if (emailType === 'html') {
							email.htmlBody = [{ partId: 'body', type: 'text/html' }];
						} else {
							email.textBody = [{ partId: 'body', type: 'text/plain' }];
						}

						if (options.cc) {
							email.cc = (options.cc as string).split(',').map((addr) => ({
								email: addr.trim(),
							}));
						}

						if (options.bcc) {
							email.bcc = (options.bcc as string).split(',').map((addr) => ({
								email: addr.trim(),
							}));
						}

						responseData = await createDraft.call(this, accountId, email);
					}

					if (operation === 'get') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const emails = await getEmails.call(this, accountId, [emailId]);
						responseData = emails[0] || {};
					}

					if (operation === 'getLabels') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const labels = await getLabels.call(this, accountId, emailId);
						responseData = {
							emailId,
							labels,
							count: labels.length,
						};
					}

					if (operation === 'getAttachments') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const attachmentOptions = this.getNodeParameter('attachmentOptions', i) as IAttachmentOptions;

						const attachmentResults = await getAttachments.call(
							this,
							accountId,
							emailId,
							attachmentOptions,
						);

						// getAttachments returns INodeExecutionData[] directly with binary data
						// Add them directly to returnData instead of using responseData
						for (const result of attachmentResults) {
							returnData.push({
								...result,
								pairedItem: { item: i },
							});
						}
						continue; // Skip the normal responseData handling
					}

					if (operation === 'getMany') {
						const mailbox = this.getNodeParameter('mailbox', i) as string;
						const limit = this.getNodeParameter('limit', i) as number;
						const options = this.getNodeParameter('getManyOptions', i) as IDataObject;

						const filter: IDataObject = {};

						// Mailbox filter
						if (mailbox) {
							filter.inMailbox = mailbox;
						}

						// Date filters
						if (options.after) {
							filter.after = new Date(options.after as string).toISOString();
						}
						if (options.before) {
							filter.before = new Date(options.before as string).toISOString();
						}

						// Content filters
						if (options.from) {
							filter.from = options.from;
						}
						if (options.to) {
							filter.to = options.to;
						}
						if (options.subject) {
							filter.subject = options.subject;
						}
						if (options.text) {
							filter.text = options.text;
						}

						// Boolean filters
						if (options.hasAttachment) {
							filter.hasAttachment = true;
						}
						if (options.unreadOnly) {
							filter.notKeyword = '$seen';
						}
						if (options.flaggedOnly) {
							filter.hasKeyword = '$flagged';
						}

						const { ids } = await queryEmails.call(
							this,
							accountId,
							filter,
							[{ property: 'receivedAt', isAscending: false }],
							limit,
						);

						if (ids.length > 0) {
							responseData = await getEmails.call(this, accountId, ids);
						} else {
							responseData = [];
						}
					}

					if (operation === 'delete') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						responseData = await deleteEmails.call(this, accountId, [emailId]);
					}

					if (operation === 'markAsRead') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						responseData = await updateEmailKeywords.call(this, accountId, emailId, {
							$seen: true,
						});
					}

					if (operation === 'markAsUnread') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						responseData = await updateEmailKeywords.call(this, accountId, emailId, {
							$seen: false,
						});
					}

					if (operation === 'move') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const targetMailbox = this.getNodeParameter('targetMailbox', i) as string;
						responseData = await moveEmail.call(this, accountId, emailId, targetMailbox);
					}

					if (operation === 'addLabel') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const label = this.getNodeParameter('label', i) as string;
						responseData = await addLabel.call(this, accountId, emailId, label);
					}

					if (operation === 'removeLabel') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const label = this.getNodeParameter('label', i) as string;
						responseData = await removeLabel.call(this, accountId, emailId, label);
					}

					if (operation === 'reply') {
						const emailId = this.getNodeParameter('emailId', i) as string;
						const fromIdentity = this.getNodeParameter('fromIdentity', i) as string;
						const emailType = this.getNodeParameter('emailType', i) as string;
						const message = this.getNodeParameter('message', i) as string;

						// Get the original email
						const [originalEmail] = await getEmails.call(this, accountId, [emailId]);
						if (!originalEmail) {
							throw new NodeOperationError(this.getNode(), 'Original email not found', {
								itemIndex: i,
							});
						}

						// Build reply
						const replyTo = (originalEmail.replyTo as IDataObject[]) ||
							(originalEmail.from as IDataObject[]);

						const email: IDataObject = {
							to: replyTo,
							subject: `Re: ${originalEmail.subject}`,
							inReplyTo: originalEmail.id,
							references: originalEmail.id,
							threadId: originalEmail.threadId,
							bodyValues: {
								body: { value: message, isEncodingProblem: false, isTruncated: false },
							},
						};

						if (emailType === 'html') {
							email.htmlBody = [{ partId: 'body', type: 'text/html' }];
						} else {
							email.textBody = [{ partId: 'body', type: 'text/plain' }];
						}

						responseData = await sendEmail.call(this, accountId, email, fromIdentity);
					}
				}

				// ==================== MAILBOX ====================
				if (resource === 'mailbox') {
					if (operation === 'getMany') {
						responseData = await getMailboxes.call(this, accountId);
					}

					if (operation === 'get') {
						const mailboxId = this.getNodeParameter('mailboxId', i) as string;
						const mailboxes = await getMailboxes.call(this, accountId);
						const mailbox = mailboxes.find((mb) => mb.id === mailboxId);
						responseData = mailbox || {};
					}
				}

				// ==================== THREAD ====================
				if (resource === 'thread') {
					if (operation === 'get') {
						const threadId = this.getNodeParameter('threadId', i) as string;
						const threads = await getThreads.call(this, accountId, [threadId]);
						responseData = threads[0] || {};
					}

					if (operation === 'getMany') {
						const threadId = this.getNodeParameter('threadId', i) as string;
						const threads = await getThreads.call(this, accountId, [threadId]);
						if (threads.length > 0 && threads[0].emailIds) {
							const emailIds = threads[0].emailIds as string[];
							responseData = await getEmails.call(this, accountId, emailIds);
						} else {
							responseData = [];
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
