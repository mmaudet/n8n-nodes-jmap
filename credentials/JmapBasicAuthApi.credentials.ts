import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

/**
 * JMAP API Credentials for Basic Auth authentication
 */
export class JmapBasicAuthApi implements ICredentialType {
	name = 'jmapBasicAuthApi';
	displayName = 'JMAP Basic Auth API';
	documentationUrl = 'https://jmap.io/spec-core.html';

	icon: Icon = {
		light: 'file:../nodes/Jmap/jmap.svg',
		dark: 'file:../nodes/Jmap/jmap.svg',
	};

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
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'user@example.com',
			default: '',
			required: true,
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
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.email}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serverUrl}}',
			url: '/session',
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		},
	};
}
