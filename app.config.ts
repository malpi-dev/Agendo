import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json. The Firebase file is not committed: locally it lives at the repo root,
// and EAS supplies it through the GOOGLE_SERVICES_JSON file variable.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
