import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';

import {
	getPrimaryAccountId,
	getMailboxes,
	queryEmails,
	getEmails,
} from './GenericFunctions';

export class JmapTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JMAP Trigger',
		name: 'jmapTrigger',
		icon: 'file:jmap.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Trigger workflow on new JMAP emails',
		defaults: {
			name: 'JMAP Trigger',
		},
		inputs: [],
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
		polling: true,
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
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Email',
						value: 'newEmail',
						description: 'Triggers when a new email is received',
					},
					{
						name: 'New Email in Mailbox',
						value: 'newEmailInMailbox',
						description: 'Triggers when a new email is received in a specific mailbox',
					},
				],
				default: 'newEmail',
				required: true,
			},
			{
				displayName: 'Mailbox',
				name: 'mailbox',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMailboxes',
				},
				displayOptions: {
					show: {
						event: ['newEmailInMailbox'],
					},
				},
				default: '',
				description: 'The mailbox to monitor for new emails',
			},
			{
				displayName: 'Simple Output',
				name: 'simple',
				type: 'boolean',
				default: true,
				description: 'Whether to return a simplified version of the email data',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Attachments Info',
						name: 'includeAttachments',
						type: 'boolean',
						default: false,
						description: 'Whether to include attachment information in the output',
					},
					{
						displayName: 'Mark as Read',
						name: 'markAsRead',
						type: 'boolean',
						default: false,
						description: 'Whether to mark fetched emails as read',
					},
				],
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
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event') as string;
		const simple = this.getNodeParameter('simple') as boolean;
		const options = this.getNodeParameter('options') as IDataObject;

		// Get the last processed email timestamp
		const lastProcessedTime = webhookData.lastProcessedTime as string | undefined;

		// Get account ID
		const accountId = await getPrimaryAccountId.call(this);

		// Build filter
		const filter: IDataObject = {};

		if (event === 'newEmailInMailbox') {
			const mailbox = this.getNodeParameter('mailbox') as string;
			filter.inMailbox = mailbox;
		}

		// If we have a last processed time, only get emails after that
		if (lastProcessedTime) {
			filter.after = lastProcessedTime;
		}

		// Query for new emails
		const { ids } = await queryEmails.call(
			this,
			accountId,
			filter,
			[{ property: 'receivedAt', isAscending: false }],
			100,
		);

		if (ids.length === 0) {
			return null;
		}

		// Get full email data
		let properties = [
			'id',
			'blobId',
			'threadId',
			'mailboxIds',
			'keywords',
			'receivedAt',
			'from',
			'to',
			'cc',
			'subject',
			'preview',
			'hasAttachment',
		];

		if (!simple) {
			properties = [
				...properties,
				'bodyValues',
				'textBody',
				'htmlBody',
				'bodyStructure',
			];
		}

		if (options.includeAttachments) {
			properties.push('attachments');
		}

		const emails = await getEmails.call(
			this,
			accountId,
			ids,
			properties,
			!simple,
			!simple,
		);

		if (emails.length === 0) {
			return null;
		}

		// Update the last processed time to the most recent email
		const mostRecentEmail = emails[0];
		webhookData.lastProcessedTime = mostRecentEmail.receivedAt as string;

		// Filter out already processed emails if we had a lastProcessedTime
		let newEmails = emails;
		if (lastProcessedTime) {
			newEmails = emails.filter((email) => {
				const emailTime = new Date(email.receivedAt as string).getTime();
				const lastTime = new Date(lastProcessedTime).getTime();
				return emailTime > lastTime;
			});
		}

		if (newEmails.length === 0) {
			return null;
		}

		// Transform output
		const returnData: INodeExecutionData[] = newEmails.map((email) => {
			let outputEmail: IDataObject;

			if (simple) {
				outputEmail = {
					id: email.id,
					threadId: email.threadId,
					from: email.from,
					to: email.to,
					cc: email.cc,
					subject: email.subject,
					preview: email.preview,
					receivedAt: email.receivedAt,
					hasAttachment: email.hasAttachment,
					isRead: !!(email.keywords as IDataObject)?.$seen,
					isFlagged: !!(email.keywords as IDataObject)?.$flagged,
				};
			} else {
				outputEmail = email;
			}

			return { json: outputEmail };
		});

		return [returnData];
	}
}
