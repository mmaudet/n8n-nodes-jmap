import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

/**
 * JMAP API Credentials for Bearer Token authentication
 */
export class JmapBearerTokenApi implements ICredentialType {
	name = 'jmapBearerTokenApi';
	displayName = 'JMAP Bearer Token API';
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
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The access token (e.g., from OAuth2/OIDC)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
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
