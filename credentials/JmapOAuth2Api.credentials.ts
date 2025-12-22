import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

/**
 * JMAP OAuth2 API Credentials for LemonLDAP::NG SSO
 *
 * Uses Authorization Code Flow with PKCE (public client, no secret required)
 */
export class JmapOAuth2Api implements ICredentialType {
	name = 'jmapOAuth2Api';
	displayName = 'JMAP OAuth2 API';
	documentationUrl = 'https://jmap.io/spec-core.html';
	extends = ['oAuth2Api'];

	icon: Icon = {
		light: 'file:../nodes/Jmap/jmap.svg',
		dark: 'file:../nodes/Jmap/jmap.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'my-client-id',
			hint: 'OIDC Client ID registered with your identity provider',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
			hint: 'Leave empty for public clients using PKCE',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://sso.example.com/oauth2/authorize',
			hint: 'OAuth2/OIDC authorization endpoint',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://sso.example.com/oauth2/token',
			hint: 'OAuth2/OIDC token endpoint',
		},
		{
			displayName: 'JMAP Server URL',
			name: 'jmapServerUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://jmap.example.com/jmap',
			hint: 'The JMAP API endpoint URL',
		},
		// OAuth2 configuration - hidden fields
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid email profile offline_access',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];

	// OAuth2 flow configuration
	oauth2 = {
		tokenExpiredStatusCode: 401,
		grantType: 'pkce',
		scope: 'openid email profile offline_access',
		tokenRequestMethod: 'POST' as const,
		authorizeUrl: { url: '={{ $credentials.authUrl }}' },
		accessTokenUrl: { url: '={{ $credentials.accessTokenUrl }}' },
		clientAuthentication: 'body' as const,
	};
}
