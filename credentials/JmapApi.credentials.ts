import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * @deprecated Use JmapBasicAuthApi or JmapBearerTokenApi instead.
 *
 * This credential type is kept for backward compatibility only.
 * It has been replaced by separate credential types that use
 * httpRequestWithAuthentication via IAuthenticateGeneric.
 */
export class JmapApi implements ICredentialType {
	name = 'jmapApi';
	displayName = 'JMAP API (Deprecated)';
	documentationUrl = 'https://jmap.io/spec-core.html';
	properties: INodeProperties[] = [
		{
			displayName: 'JMAP Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'https://jmap.example.com/jmap',
			placeholder: 'https://jmap.example.com/jmap',
			description: 'The base URL of the JMAP server. This credential type is deprecated. Please use "JMAP Basic Auth API" or "JMAP Bearer Token API" instead.',
			required: true,
		},
	];
}
