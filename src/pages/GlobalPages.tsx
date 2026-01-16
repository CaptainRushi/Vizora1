
import { Settings as SettingsComponent } from './Settings';

// Re-export the Settings component as GlobalSettings for global routes
export function GlobalSettings() {
    return <SettingsComponent />;
}
