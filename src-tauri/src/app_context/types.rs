use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub process_name: String,
    #[serde(default)]
    pub process_path: String,
    #[serde(default)]
    pub window_class: String,
    #[serde(default)]
    pub browser_url: Option<String>,
    #[serde(default)]
    pub detected_app: Option<String>,
}

impl Default for ActiveWindowInfo {
    fn default() -> Self {
        Self {
            app_name: String::new(),
            window_title: String::new(),
            process_name: String::new(),
            process_path: String::new(),
            window_class: String::new(),
            browser_url: None,
            detected_app: None,
        }
    }
}

impl ActiveWindowInfo {
    pub fn extract_browser_url(&mut self) {
        let browsers = [
            "chrome", "firefox", "msedge", "brave", "opera", "vivaldi", "arc", "safari",
        ];
        let app_lower = self.app_name.to_lowercase();

        if browsers.iter().any(|b| app_lower.contains(b)) {
            let title = &self.window_title;

            if let Some(url) = extract_url_from_title(title) {
                self.browser_url = Some(url);
            } else if let Some(domain) = extract_domain_from_title(title) {
                self.browser_url = Some(domain);
            }
        }

        self.detect_native_app();
    }

    fn detect_native_app(&mut self) {
        let process_lower = self.process_name.to_lowercase();

        if let Some(app) = detect_app_from_process(&process_lower) {
            self.detected_app = Some(app.to_string());
            return;
        }

        let title_lower = self.window_title.to_lowercase();
        if let Some(app) = detect_app_from_title(&title_lower) {
            self.detected_app = Some(app.to_string());
        }
    }

    pub fn is_browser(&self) -> bool {
        let browsers = [
            "chrome", "firefox", "msedge", "brave", "opera", "vivaldi", "arc", "safari",
        ];
        let app_lower = self.app_name.to_lowercase();
        browsers.iter().any(|b| app_lower.contains(b))
    }
}

fn extract_url_from_title(title: &str) -> Option<String> {
    let url_patterns = [r"https?://[^\s\-–—|]+", r"www\.[^\s\-–—|]+"];

    for pattern in url_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(m) = re.find(title) {
                return Some(m.as_str().to_string());
            }
        }
    }
    None
}

fn extract_domain_from_title(title: &str) -> Option<String> {
    let known_sites = [
        ("ChatGPT", "chatgpt.com"),
        ("Claude", "claude.ai"),
        ("Gemini", "gemini.google.com"),
        ("Gmail", "mail.google.com"),
        ("YouTube", "youtube.com"),
        ("Twitter", "twitter.com"),
        ("X -", "x.com"),
        ("LinkedIn", "linkedin.com"),
        ("Facebook", "facebook.com"),
        ("Instagram", "instagram.com"),
        ("Reddit", "reddit.com"),
        ("GitHub", "github.com"),
        ("GitLab", "gitlab.com"),
        ("Stack Overflow", "stackoverflow.com"),
        ("Notion", "notion.so"),
        ("Slack", "slack.com"),
        ("Discord", "discord.com"),
        ("WhatsApp", "web.whatsapp.com"),
        ("Telegram", "web.telegram.org"),
        ("Google Docs", "docs.google.com"),
        ("Google Sheets", "sheets.google.com"),
        ("Google Drive", "drive.google.com"),
        ("Figma", "figma.com"),
        ("Trello", "trello.com"),
        ("Jira", "atlassian.net"),
        ("Confluence", "atlassian.net"),
        ("Asana", "asana.com"),
        ("Monday", "monday.com"),
        ("Airtable", "airtable.com"),
        ("Miro", "miro.com"),
        ("Canva", "canva.com"),
        ("Vercel", "vercel.com"),
        ("Netlify", "netlify.com"),
        ("AWS Console", "aws.amazon.com"),
        ("Azure Portal", "portal.azure.com"),
        ("Google Cloud", "console.cloud.google.com"),
        ("Perplexity", "perplexity.ai"),
        ("Midjourney", "midjourney.com"),
        ("OpenAI", "openai.com"),
        ("Anthropic", "anthropic.com"),
        ("Hugging Face", "huggingface.co"),
        ("Google Meet", "meet.google.com"),
        ("Zoom", "zoom.us"),
        ("Microsoft Teams", "teams.microsoft.com"),
        ("Dropbox", "dropbox.com"),
        ("OneDrive", "onedrive.live.com"),
        ("iCloud", "icloud.com"),
        ("Pinterest", "pinterest.com"),
        ("TikTok", "tiktok.com"),
        ("Twitch", "twitch.tv"),
        ("Spotify", "open.spotify.com"),
    ];

    let title_lower = title.to_lowercase();

    for (site_name, domain) in known_sites {
        if title_lower.contains(&site_name.to_lowercase()) {
            return Some(domain.to_string());
        }
    }

    None
}

fn detect_app_from_process(process_name: &str) -> Option<&'static str> {
    let native_apps: &[(&[&str], &str)] = &[
        (&["discord.exe", "discord"], "Discord"),
        (&["whatsapp.exe", "whatsapp"], "WhatsApp"),
        (&["messenger.exe", "facebookmessenger"], "Messenger"),
        (&["telegram.exe", "telegram"], "Telegram"),
        (&["signal.exe", "signal"], "Signal"),
        (&["slack.exe", "slack"], "Slack"),
        (&["teams.exe", "msteams.exe", "ms-teams"], "Microsoft Teams"),
        (&["zoom.exe", "zoom"], "Zoom"),
        (&["skype.exe", "skype"], "Skype"),
        (&["winword.exe", "word"], "Microsoft Word"),
        (&["excel.exe"], "Microsoft Excel"),
        (&["powerpnt.exe", "powerpoint"], "Microsoft PowerPoint"),
        (&["onenote.exe"], "Microsoft OneNote"),
        (&["outlook.exe"], "Microsoft Outlook"),
        (&["msaccess.exe"], "Microsoft Access"),
        (&["mspub.exe"], "Microsoft Publisher"),
        (&["visio.exe"], "Microsoft Visio"),
        (&["notepad.exe"], "Notepad"),
        (&["notepad++.exe"], "Notepad++"),
        (&["code.exe", "code - insiders"], "Visual Studio Code"),
        (&["devenv.exe"], "Visual Studio"),
        (&["rider64.exe", "rider.exe"], "JetBrains Rider"),
        (&["idea64.exe", "idea.exe"], "IntelliJ IDEA"),
        (&["pycharm64.exe", "pycharm.exe"], "PyCharm"),
        (&["webstorm64.exe", "webstorm.exe"], "WebStorm"),
        (&["phpstorm64.exe", "phpstorm.exe"], "PhpStorm"),
        (&["goland64.exe", "goland.exe"], "GoLand"),
        (&["clion64.exe", "clion.exe"], "CLion"),
        (&["datagrip64.exe", "datagrip.exe"], "DataGrip"),
        (&["sublime_text.exe", "subl"], "Sublime Text"),
        (&["atom.exe"], "Atom"),
        (&["windowsterminal.exe", "wt.exe"], "Windows Terminal"),
        (&["powershell.exe", "pwsh.exe"], "PowerShell"),
        (&["cmd.exe"], "Command Prompt"),
        (&["git-bash.exe", "bash.exe"], "Git Bash"),
        (&["explorer.exe"], "File Explorer"),
        (&["spotify.exe"], "Spotify"),
        (&["itunes.exe"], "iTunes"),
        (&["vlc.exe"], "VLC Media Player"),
        (&["wmplayer.exe"], "Windows Media Player"),
        (&["photoshop.exe"], "Adobe Photoshop"),
        (&["illustrator.exe"], "Adobe Illustrator"),
        (&["premiere pro.exe", "adobe premiere pro.exe"], "Adobe Premiere Pro"),
        (&["afterfx.exe", "after effects.exe"], "Adobe After Effects"),
        (&["indesign.exe"], "Adobe InDesign"),
        (&["acrobat.exe", "acrord32.exe"], "Adobe Acrobat"),
        (&["lightroom.exe"], "Adobe Lightroom"),
        (&["xd.exe"], "Adobe XD"),
        (&["figma.exe"], "Figma"),
        (&["sketch.exe"], "Sketch"),
        (&["blender.exe"], "Blender"),
        (&["unity.exe", "unityhub.exe"], "Unity"),
        (&["unrealengine.exe", "ue4editor.exe", "ue5editor.exe"], "Unreal Engine"),
        (&["obs64.exe", "obs32.exe", "obs.exe"], "OBS Studio"),
        (&["streamlabs obs.exe", "streamlabs.exe"], "Streamlabs"),
        (&["audacity.exe"], "Audacity"),
        (&["fl64.exe", "fl.exe"], "FL Studio"),
        (&["ableton live.exe", "live.exe"], "Ableton Live"),
        (&["steam.exe"], "Steam"),
        (&["epicgameslauncher.exe"], "Epic Games Launcher"),
        (&["gog galaxy.exe", "galaxyclient.exe"], "GOG Galaxy"),
        (&["origin.exe"], "EA Origin"),
        (&["battle.net.exe"], "Battle.net"),
        (&["filezilla.exe"], "FileZilla"),
        (&["winscp.exe"], "WinSCP"),
        (&["putty.exe"], "PuTTY"),
        (&["postman.exe"], "Postman"),
        (&["insomnia.exe"], "Insomnia"),
        (&["docker desktop.exe", "docker.exe"], "Docker Desktop"),
        (&["vmware.exe", "vmplayer.exe"], "VMware"),
        (&["virtualbox.exe", "virtualboxvm.exe"], "VirtualBox"),
        (&["notion.exe"], "Notion"),
        (&["obsidian.exe"], "Obsidian"),
        (&["evernote.exe"], "Evernote"),
        (&["todoist.exe"], "Todoist"),
        (&["ticktick.exe"], "TickTick"),
        (&["trello.exe"], "Trello"),
        (&["1password.exe"], "1Password"),
        (&["bitwarden.exe"], "Bitwarden"),
        (&["lastpass.exe"], "LastPass"),
        (&["keepass.exe", "keepassxc.exe"], "KeePass"),
        (&["calculator.exe", "calc.exe"], "Calculator"),
        (&["mspaint.exe"], "Paint"),
        (&["snippingtool.exe", "screenclippinghost.exe"], "Snipping Tool"),
        (&["mstsc.exe"], "Remote Desktop"),
        (&["taskmgr.exe"], "Task Manager"),
        (&["systemsettings.exe", "ms-settings"], "Windows Settings"),
        (&["control.exe"], "Control Panel"),
        (&["regedit.exe"], "Registry Editor"),
        (&["7zfm.exe", "7zg.exe"], "7-Zip"),
        (&["winrar.exe"], "WinRAR"),
        (&["thunderbird.exe"], "Mozilla Thunderbird"),
        (&["mailspring.exe"], "Mailspring"),
        (&["grammarly.exe", "grammarlydeskto.exe"], "Grammarly"),
        (&["dropbox.exe"], "Dropbox"),
        (&["onedrive.exe"], "OneDrive"),
        (&["googledrive.exe", "googledrivesync.exe"], "Google Drive"),
        (&["icloud.exe"], "iCloud"),
        (&["anydesk.exe"], "AnyDesk"),
        (&["teamviewer.exe"], "TeamViewer"),
        (&["parsec.exe"], "Parsec"),
    ];

    for (processes, app_name) in native_apps {
        for proc in *processes {
            if process_name.contains(proc) {
                return Some(app_name);
            }
        }
    }

    None
}

fn detect_app_from_title(title: &str) -> Option<&'static str> {
    let title_patterns: &[(&[&str], &str)] = &[
        (&["- discord"], "Discord"),
        (&["whatsapp"], "WhatsApp"),
        (&["messenger"], "Messenger"),
        (&["telegram"], "Telegram"),
        (&["- word", "microsoft word"], "Microsoft Word"),
        (&["- excel", "microsoft excel"], "Microsoft Excel"),
        (&["- powerpoint", "microsoft powerpoint"], "Microsoft PowerPoint"),
        (&["- onenote", "microsoft onenote"], "Microsoft OneNote"),
        (&["- outlook", "microsoft outlook"], "Microsoft Outlook"),
        (&["- visual studio code", "- vs code"], "Visual Studio Code"),
        (&["- visual studio"], "Visual Studio"),
        (&["- intellij idea"], "IntelliJ IDEA"),
        (&["- pycharm"], "PyCharm"),
        (&["- webstorm"], "WebStorm"),
        (&["- rider"], "JetBrains Rider"),
        (&["- sublime text"], "Sublime Text"),
        (&["- notepad++"], "Notepad++"),
        (&["spotify"], "Spotify"),
        (&["vlc media player"], "VLC Media Player"),
        (&["adobe photoshop"], "Adobe Photoshop"),
        (&["adobe illustrator"], "Adobe Illustrator"),
        (&["adobe premiere"], "Adobe Premiere Pro"),
        (&["after effects"], "Adobe After Effects"),
        (&["- figma"], "Figma"),
        (&["- notion"], "Notion"),
        (&["- obsidian"], "Obsidian"),
        (&["- postman"], "Postman"),
        (&["docker desktop"], "Docker Desktop"),
        (&["microsoft teams"], "Microsoft Teams"),
        (&["zoom meeting", "zoom cloud meetings"], "Zoom"),
        (&["- slack"], "Slack"),
    ];

    for (patterns, app_name) in title_patterns {
        for pattern in *patterns {
            if title.contains(pattern) {
                return Some(app_name);
            }
        }
    }

    None
}
