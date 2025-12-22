import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * JMAP API Credentials for Basic Auth or Bearer Token authentication
 *
 * For OAuth2/OIDC with LemonLDAP, use the JmapOAuth2Api credentials instead.
 */
export class JmapApi implements ICredentialType {
	name = 'jmapApi';
	displayName = 'JMAP API';
	documentationUrl = 'https://jmap.io/spec-core.html';
	properties: INodeProperties[] = [
		{
			displayName: 'JMAP Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'https://jmap.example.com/jmap',
			placeholder: 'https://jmap.example.com/jmap',
			description: 'The base URL of the JMAP server',
			required: true,
		},
		{
			displayName: 'Authentication Method',
			name: 'authMethod',
			type: 'options',
			options: [
				{
					name: 'Basic Auth',
					value: 'basicAuth',
					description: 'Authenticate with email and password',
				},
				{
					name: 'Bearer Token',
					value: 'bearerToken',
					description: 'Authenticate with an existing access token',
				},
			],
			default: 'basicAuth',
		},
		// Basic Auth fields
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'user@example.com',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authMethod: ['basicAuth'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authMethod: ['basicAuth'],
				},
			},
		},
		// Bearer Token field
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The access token (e.g., from OAuth2/OIDC)',
			displayOptions: {
				show: {
					authMethod: ['bearerToken'],
				},
			},
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serverUrl}}',
			url: '/session',
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
			auth: {
				username: '={{$credentials.email}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}
